import asyncio
import os
import sys
import unittest
from datetime import datetime, timezone
from unittest import mock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import BackgroundTasks, HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.api.learner import submit_onboarding
from app.core.dependencies import get_current_user
from app.schemas.auth import LearnerOnboardingRequest
from app.services.ai_assistant import AIAssistantService
from app.services.assessment_orchestrator import (
    AssessmentOrchestrationService,
    _IN_FLIGHT_GENERATIONS,
    _REGISTRY_LOCK,
)
from app.repositories.instance_repo import (
    AssessmentInstanceRepository,
    _MEMORY_INSTANCES,
    _MEMORY_INSTANCE_ITEMS,
)
from app.repositories.user_repo import UserRepository
from app.services.demo_service import DemoResetService, DEMO_USER_ID, DEMO_USER_EMAIL


class MockQueryResult:
    def __init__(self, data=None):
        self.data = data or []


class MockTableQuery:
    def __init__(self, table_name: str, db_state: dict, log: list):
        self.table_name = table_name
        self.db_state = db_state
        self.log = log
        self._action = "select"
        self._select_cols = "*"
        self._filters = []  # list of (op, col, val)
        self._update_data = None

    def select(self, cols="*"):
        self._action = "select"
        self._select_cols = cols
        return self

    def update(self, data: dict):
        self._action = "update"
        self._update_data = data
        return self

    def delete(self):
        self._action = "delete"
        return self

    def eq(self, col: str, val: any):
        self._filters.append(("eq", col, val))
        return self

    def in_(self, col: str, vals: list):
        self._filters.append(("in", col, vals))
        return self

    def limit(self, count: int):
        return self

    def _matches(self, row: dict) -> bool:
        for op, col, val in self._filters:
            if op == "eq" and row.get(col) != val:
                return False
            if op == "in" and row.get(col) not in val:
                return False
        return True

    def execute(self):
        self.log.append({
            "action": self._action,
            "table": self.table_name,
            "filters": list(self._filters),
            "update_data": self._update_data,
        })
        table_rows = self.db_state.setdefault(self.table_name, [])

        if self._action == "select":
            matched = [r for r in table_rows if self._matches(r)]
            return MockQueryResult(data=matched)

        elif self._action == "update":
            matched = []
            for r in table_rows:
                if self._matches(r):
                    r.update(self._update_data)
                    matched.append(r)
            return MockQueryResult(data=matched)

        elif self._action == "delete":
            remaining = [r for r in table_rows if not self._matches(r)]
            deleted = [r for r in table_rows if self._matches(r)]
            self.db_state[self.table_name] = remaining
            return MockQueryResult(data=deleted)

        return MockQueryResult(data=[])


class MockSupabaseClient:
    def __init__(self, db_state: dict):
        self.db_state = db_state
        self.call_log = []

    def table(self, name: str):
        return MockTableQuery(name, self.db_state, self.call_log)


def _make_mock_candidates(count=12):
    return [
        {
            "id": f"gen-cand-demo-{i}",
            "competency_id": "c1000000-0000-0000-0000-000000000001",
            "prompt": f"Demo assessment item {i} regarding statistical sample weight calibration?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_index": 0,
            "difficulty": "MEDIUM",
            "weight": 1.0,
            "question_type": "APPLIED",
            "rationale": "Option A is correct based on survey methodology.",
            "item_source": "gemini_generated",
        }
        for i in range(count)
    ]


class TestDemoReset(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.other_user_id = "user-other-9999-uuid"
        self.other_user_email = "other.learner@mospi.gov.in"

        # Initialize mock database state with both Demo user and Other user data
        self.db_state = {
            "profiles": [
                {
                    "id": DEMO_USER_ID,
                    "email": DEMO_USER_EMAIL,
                    "full_name": "Alex Vance (Demo)",
                    "role": "learner",
                    "department": "National Accounts Division",
                    "designation": "Statistical Investigator Grade II",
                    "onboarding_completed": True,
                    "responsibilities": "National Accounts Statistics",
                    "tools_experience": ["Python", "Excel"],
                    "self_reported_level": 3,
                    "target_competencies": ["c1000000-0000-0000-0000-000000000001"],
                    "igot_id": "IGOT-DEMO-001",
                },
                {
                    "id": self.other_user_id,
                    "email": self.other_user_email,
                    "full_name": "Other Learner",
                    "role": "learner",
                    "department": "Economic Statistics Division",
                    "designation": "Senior Statistical Officer",
                    "onboarding_completed": True,
                    "responsibilities": "Field survey auditing",
                    "tools_experience": ["R"],
                    "self_reported_level": 2,
                    "target_competencies": ["c1000000-0000-0000-0000-000000000002"],
                    "igot_id": "IGOT-OTHER-002",
                },
            ],
            "assessment_instances": [
                {
                    "id": "inst-demo-1",
                    "user_id": DEMO_USER_ID,
                    "status": "completed",
                    "result_id": "res-demo-1",
                },
                {
                    "id": "inst-other-1",
                    "user_id": self.other_user_id,
                    "status": "completed",
                    "result_id": "res-other-1",
                },
            ],
            "assessment_instance_items": [
                {"id": "item-demo-1", "instance_id": "inst-demo-1", "item_order": 1},
                {"id": "item-demo-2", "instance_id": "inst-demo-1", "item_order": 2},
                {"id": "item-other-1", "instance_id": "inst-other-1", "item_order": 1},
            ],
            "assessment_results": [
                {
                    "id": "res-demo-1",
                    "instance_id": "inst-demo-1",
                    "user_id": DEMO_USER_ID,
                    "overall_score": 75.0,
                },
                {
                    "id": "res-other-1",
                    "instance_id": "inst-other-1",
                    "user_id": self.other_user_id,
                    "overall_score": 82.0,
                },
            ],
            "competency_scores": [
                {"id": "cs-demo-1", "user_id": DEMO_USER_ID, "competency_id": "comp-1", "score": 75.0},
                {"id": "cs-other-1", "user_id": self.other_user_id, "competency_id": "comp-1", "score": 82.0},
            ],
            "skill_gaps": [
                {"id": "sg-demo-1", "user_id": DEMO_USER_ID, "gap": 1},
                {"id": "sg-other-1", "user_id": self.other_user_id, "gap": 0},
            ],
            "recommendations": [
                {"id": "rec-demo-1", "user_id": DEMO_USER_ID, "course_id": "course-1"},
                {"id": "rec-other-1", "user_id": self.other_user_id, "course_id": "course-2"},
            ],
            "course_enrollments": [
                {"id": "enr-demo-1", "user_id": DEMO_USER_ID, "course_id": "course-1", "progress": 50},
                {"id": "enr-other-1", "user_id": self.other_user_id, "course_id": "course-2", "progress": 80},
            ],
            "learning_paths": [
                {"id": "lp-demo-1", "user_id": DEMO_USER_ID, "title": "National Accounts Path"},
                {"id": "lp-other-1", "user_id": self.other_user_id, "title": "Economic Statistics Path"},
            ],
            # Static tables that must NEVER be mutated
            "assessments": [{"id": "a1000000-0000-0000-0000-000000000001", "title": "MoSPI Baseline Assessment"}],
            "questions": [{"id": "q-static-1", "prompt": "Static MoSPI anchor question 1"}],
            "competencies": [{"id": "c1000000-0000-0000-0000-000000000001", "name": "Survey Sampling"}],
            "courses": [{"id": "course-1", "title": "National Accounts Foundations"}],
        }

        self.mock_client = MockSupabaseClient(self.db_state)

        # Clear in-flight and in-memory caches
        _IN_FLIGHT_GENERATIONS.clear()
        _MEMORY_INSTANCES.clear()
        _MEMORY_INSTANCE_ITEMS.clear()

        # Seed in-memory instances
        _MEMORY_INSTANCES["inst-demo-mem"] = {
            "id": "inst-demo-mem",
            "user_id": DEMO_USER_ID,
            "title": "Demo Cached Instance",
        }
        _MEMORY_INSTANCE_ITEMS["inst-demo-mem"] = [{"id": "item-demo-mem-1"}]

        _MEMORY_INSTANCES["inst-other-mem"] = {
            "id": "inst-other-mem",
            "user_id": self.other_user_id,
            "title": "Other Cached Instance",
        }
        _MEMORY_INSTANCE_ITEMS["inst-other-mem"] = [{"id": "item-other-mem-1"}]

    async def asyncTearDown(self):
        _IN_FLIGHT_GENERATIONS.clear()
        _MEMORY_INSTANCES.clear()
        _MEMORY_INSTANCE_ITEMS.clear()

    # --------------------------------------------------------------------------
    # 1. Designated demo identity accepted
    # --------------------------------------------------------------------------
    async def test_01_designated_demo_identity_accepted(self):
        """VERIFICATION 1: Designated demo identity accepted."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            res = await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )
            self.assertEqual(res["status"], "reset_successful")
            self.assertFalse(res["onboarding_completed"])

    # --------------------------------------------------------------------------
    # 2. Wrong email rejected (403)
    # --------------------------------------------------------------------------
    async def test_02_wrong_email_rejected_403(self):
        """VERIFICATION 2: Wrong email rejected (403)."""
        with self.assertRaises(HTTPException) as ctx:
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email="impostor@gmail.com",
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("restricted to the designated demonstration account", ctx.exception.detail)

    # --------------------------------------------------------------------------
    # 3. Wrong user ID rejected (403)
    # --------------------------------------------------------------------------
    async def test_03_wrong_user_id_rejected_403(self):
        """VERIFICATION 3: Wrong user ID rejected (403)."""
        with self.assertRaises(HTTPException) as ctx:
            await DemoResetService.reset_demo_learner(
                user_id="11111111-2222-3333-4444-555555555555",
                email=DEMO_USER_EMAIL,
            )
        self.assertEqual(ctx.exception.status_code, 403)

    # --------------------------------------------------------------------------
    # 4. Unauthenticated request rejected (401/403)
    # --------------------------------------------------------------------------
    def test_04_unauthenticated_request_rejected(self):
        """VERIFICATION 4: Unauthenticated request rejected by FastAPI (401 or 403)."""
        client = TestClient(app)
        response = client.post("/learner/demo-reset")
        self.assertIn(response.status_code, [401, 403])

    # --------------------------------------------------------------------------
    # 5. Other learner cannot reset demo (403)
    # --------------------------------------------------------------------------
    def test_05_other_learner_cannot_reset_demo(self):
        """VERIFICATION 5: Other learner cannot reset demo (403)."""
        client = TestClient(app)
        other_user = {
            "id": self.other_user_id,
            "email": self.other_user_email,
            "role": "learner",
        }
        app.dependency_overrides[get_current_user] = lambda: other_user
        try:
            response = client.post("/learner/demo-reset")
            self.assertEqual(response.status_code, 403)
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # --------------------------------------------------------------------------
    # 6. Trainer cannot reset demo (403)
    # --------------------------------------------------------------------------
    def test_06_trainer_cannot_reset_demo(self):
        """VERIFICATION 6: Trainer cannot reset demo (403)."""
        client = TestClient(app)
        trainer_user = {
            "id": "trainer-uuid-001",
            "email": "trainer.head@mospi.gov.in",
            "role": "trainer",
        }
        app.dependency_overrides[get_current_user] = lambda: trainer_user
        try:
            response = client.post("/learner/demo-reset")
            self.assertEqual(response.status_code, 403)
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # --------------------------------------------------------------------------
    # 7. Admin cannot reset demo unless designated demo identity (403)
    # --------------------------------------------------------------------------
    def test_07_admin_cannot_reset_demo_unless_designated_identity(self):
        """VERIFICATION 7: Admin cannot reset demo unless designated demo identity (403)."""
        client = TestClient(app)
        admin_user = {
            "id": "admin-uuid-001",
            "email": "admin.system@mospi.gov.in",
            "role": "admin",
        }
        app.dependency_overrides[get_current_user] = lambda: admin_user
        try:
            response = client.post("/learner/demo-reset")
            self.assertEqual(response.status_code, 403)
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # --------------------------------------------------------------------------
    # 8. Demo learner's profile becomes un-onboarded
    # --------------------------------------------------------------------------
    async def test_08_demo_profile_becomes_unonboarded(self):
        """VERIFICATION 8: Demo learner's profile becomes un-onboarded."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            demo_profile = next(p for p in self.db_state["profiles"] if p["id"] == DEMO_USER_ID)
            self.assertFalse(demo_profile["onboarding_completed"])
            self.assertIsNone(demo_profile["responsibilities"])
            self.assertEqual(demo_profile["tools_experience"], [])
            self.assertIsNone(demo_profile["self_reported_level"])
            self.assertEqual(demo_profile["target_competencies"], [])
            self.assertIsNone(demo_profile["igot_id"])

    # --------------------------------------------------------------------------
    # 9. Demo assessment instances removed
    # --------------------------------------------------------------------------
    async def test_09_demo_assessment_instances_removed(self):
        """VERIFICATION 9: Demo assessment instances removed."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            demo_insts = [i for i in self.db_state["assessment_instances"] if i["user_id"] == DEMO_USER_ID]
            self.assertEqual(len(demo_insts), 0)

    # --------------------------------------------------------------------------
    # 10. Demo assessment instance items removed
    # --------------------------------------------------------------------------
    async def test_10_demo_assessment_instance_items_removed(self):
        """VERIFICATION 10: Demo assessment instance items removed."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            demo_items = [
                item for item in self.db_state["assessment_instance_items"]
                if item["instance_id"] == "inst-demo-1"
            ]
            self.assertEqual(len(demo_items), 0)

    # --------------------------------------------------------------------------
    # 11. Demo assessment results removed
    # --------------------------------------------------------------------------
    async def test_11_demo_assessment_results_removed(self):
        """VERIFICATION 11: Demo assessment results removed."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            demo_results = [r for r in self.db_state["assessment_results"] if r["user_id"] == DEMO_USER_ID]
            self.assertEqual(len(demo_results), 0)

    # --------------------------------------------------------------------------
    # 12. Demo competency scores removed
    # --------------------------------------------------------------------------
    async def test_12_demo_competency_scores_removed(self):
        """VERIFICATION 12: Demo competency scores removed."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            demo_scores = [s for s in self.db_state["competency_scores"] if s["user_id"] == DEMO_USER_ID]
            self.assertEqual(len(demo_scores), 0)

    # --------------------------------------------------------------------------
    # 13. Demo skill gaps removed
    # --------------------------------------------------------------------------
    async def test_13_demo_skill_gaps_removed(self):
        """VERIFICATION 13: Demo skill gaps removed."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            demo_gaps = [g for g in self.db_state["skill_gaps"] if g["user_id"] == DEMO_USER_ID]
            self.assertEqual(len(demo_gaps), 0)

    # --------------------------------------------------------------------------
    # 14. Demo recommendations removed
    # --------------------------------------------------------------------------
    async def test_14_demo_recommendations_removed(self):
        """VERIFICATION 14: Demo recommendations removed."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            demo_recs = [r for r in self.db_state["recommendations"] if r["user_id"] == DEMO_USER_ID]
            self.assertEqual(len(demo_recs), 0)

    # --------------------------------------------------------------------------
    # 15. Demo course progress removed
    # --------------------------------------------------------------------------
    async def test_15_demo_course_progress_removed(self):
        """VERIFICATION 15: Demo course progress removed."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            demo_enrs = [e for e in self.db_state["course_enrollments"] if e["user_id"] == DEMO_USER_ID]
            self.assertEqual(len(demo_enrs), 0)

            demo_lps = [lp for lp in self.db_state["learning_paths"] if lp["user_id"] == DEMO_USER_ID]
            self.assertEqual(len(demo_lps), 0)

    # --------------------------------------------------------------------------
    # 16. Other users' records remain untouched (mock verification)
    # --------------------------------------------------------------------------
    async def test_16_other_users_records_remain_untouched(self):
        """VERIFICATION 16: Other users' records remain completely untouched."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            # Other profile
            other_prof = next(p for p in self.db_state["profiles"] if p["id"] == self.other_user_id)
            self.assertTrue(other_prof["onboarding_completed"])
            self.assertEqual(other_prof["department"], "Economic Statistics Division")
            self.assertEqual(other_prof["tools_experience"], ["R"])

            # Other instances and items
            other_insts = [i for i in self.db_state["assessment_instances"] if i["user_id"] == self.other_user_id]
            self.assertEqual(len(other_insts), 1)
            other_items = [it for it in self.db_state["assessment_instance_items"] if it["instance_id"] == "inst-other-1"]
            self.assertEqual(len(other_items), 1)

            # Other results, scores, gaps, recommendations, enrollments, learning path
            other_results = [r for r in self.db_state["assessment_results"] if r["user_id"] == self.other_user_id]
            self.assertEqual(len(other_results), 1)

            other_scores = [s for s in self.db_state["competency_scores"] if s["user_id"] == self.other_user_id]
            self.assertEqual(len(other_scores), 1)

            other_gaps = [g for g in self.db_state["skill_gaps"] if g["user_id"] == self.other_user_id]
            self.assertEqual(len(other_gaps), 1)

            other_recs = [r for r in self.db_state["recommendations"] if r["user_id"] == self.other_user_id]
            self.assertEqual(len(other_recs), 1)

            other_enrs = [e for e in self.db_state["course_enrollments"] if e["user_id"] == self.other_user_id]
            self.assertEqual(len(other_enrs), 1)

            other_lps = [lp for lp in self.db_state["learning_paths"] if lp["user_id"] == self.other_user_id]
            self.assertEqual(len(other_lps), 1)

    # --------------------------------------------------------------------------
    # 17. Static assessment/question/course tables untouched
    # --------------------------------------------------------------------------
    async def test_17_static_tables_untouched(self):
        """VERIFICATION 17: Static assessment/question/course tables untouched."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            # Assert no calls logged for static tables
            mutated_tables = [
                entry["table"] for entry in self.mock_client.call_log
                if entry["action"] in ("delete", "update")
            ]
            self.assertNotIn("assessments", mutated_tables)
            self.assertNotIn("questions", mutated_tables)
            self.assertNotIn("competencies", mutated_tables)
            self.assertNotIn("courses", mutated_tables)

            # Static table contents intact
            self.assertEqual(len(self.db_state["assessments"]), 1)
            self.assertEqual(len(self.db_state["questions"]), 1)
            self.assertEqual(len(self.db_state["competencies"]), 1)
            self.assertEqual(len(self.db_state["courses"]), 1)

    # --------------------------------------------------------------------------
    # 18. In-memory demo assessment state cleared
    # --------------------------------------------------------------------------
    async def test_18_in_memory_demo_assessment_state_cleared(self):
        """VERIFICATION 18: In-memory demo assessment state cleared, others preserved."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            self.assertNotIn("inst-demo-mem", _MEMORY_INSTANCES)
            self.assertNotIn("inst-demo-mem", _MEMORY_INSTANCE_ITEMS)

            self.assertIn("inst-other-mem", _MEMORY_INSTANCES)
            self.assertIn("inst-other-mem", _MEMORY_INSTANCE_ITEMS)

    # --------------------------------------------------------------------------
    # 19. In-flight demo generation task safely cancelled and removed
    # --------------------------------------------------------------------------
    async def test_19_in_flight_demo_generation_cancelled_and_removed(self):
        """VERIFICATION 19: In-flight demo generation task safely cancelled and removed."""
        # Create mock background tasks
        async def long_running_coro():
            try:
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                pass

        task_demo = asyncio.create_task(long_running_coro())
        task_other = asyncio.create_task(long_running_coro())

        _IN_FLIGHT_GENERATIONS[DEMO_USER_ID] = task_demo
        _IN_FLIGHT_GENERATIONS[self.other_user_id] = task_other

        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )

            self.assertNotIn(DEMO_USER_ID, _IN_FLIGHT_GENERATIONS)
            self.assertTrue(task_demo.cancelled() or task_demo.done())

            # Other user's in-flight generation remains untouched
            self.assertIn(self.other_user_id, _IN_FLIGHT_GENERATIONS)
            self.assertFalse(task_other.cancelled())
            task_other.cancel()
            try:
                await task_other
            except asyncio.CancelledError:
                pass

    # --------------------------------------------------------------------------
    # 20. Route routing to onboarding after reset
    # --------------------------------------------------------------------------
    def test_20_route_response_returns_unonboarded_for_redirect(self):
        """VERIFICATION 20: POST /learner/demo-reset returns onboarding_completed=False for frontend redirect."""
        client = TestClient(app)
        demo_user = {
            "id": DEMO_USER_ID,
            "email": DEMO_USER_EMAIL,
            "role": "learner",
        }
        app.dependency_overrides[get_current_user] = lambda: demo_user
        try:
            with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
                response = client.post("/learner/demo-reset")
                self.assertEqual(response.status_code, 200)
                data = response.json()
                self.assertEqual(data["status"], "reset_successful")
                self.assertFalse(data["onboarding_completed"])
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # --------------------------------------------------------------------------
    # 21. Fresh onboarding triggers Phase 14C pre-generation
    # --------------------------------------------------------------------------
    async def test_21_fresh_onboarding_triggers_pregeneration(self):
        """VERIFICATION 21: Fresh onboarding for reset demo learner triggers pre-generation."""
        req = LearnerOnboardingRequest(
            department="National Accounts Division",
            designation="Statistical Investigator Grade II",
            responsibilities="National Accounts Statistics, GDP Deflators",
            tools_experience=["Python", "Excel", "R"],
            self_reported_level=2,
            target_competencies=["c1000000-0000-0000-0000-000000000001"],
        )
        bg = BackgroundTasks()
        current_user = {"id": DEMO_USER_ID, "email": DEMO_USER_EMAIL, "role": "learner"}

        now = datetime.now(timezone.utc)
        mock_profile = {
            "id": DEMO_USER_ID,
            "email": DEMO_USER_EMAIL,
            "full_name": "Alex Vance",
            "role": "learner",
            "department": req.department,
            "designation": req.designation,
            "onboarding_completed": True,
            "target_competencies": req.target_competencies,
            "created_at": now,
            "updated_at": now,
        }

        with mock.patch.object(UserRepository, "submit_onboarding", return_value=mock_profile):
            res = await submit_onboarding(req=req, background_tasks=bg, current_user=current_user)

            self.assertEqual(res.id, DEMO_USER_ID)
            self.assertTrue(res.onboarding_completed)

            # Pre-generation background task scheduled
            self.assertEqual(len(bg.tasks), 1)
            enqueued = bg.tasks[0]
            self.assertEqual(
                enqueued.func,
                AssessmentOrchestrationService.get_or_create_personalized_assessment,
            )
            self.assertEqual(enqueued.kwargs.get("user_id"), DEMO_USER_ID)

    # --------------------------------------------------------------------------
    # 22. Newly generated assessment contains 18 items
    # --------------------------------------------------------------------------
    async def test_22_newly_generated_assessment_contains_18_items(self):
        """VERIFICATION 22: Newly generated assessment contains exactly 18 items."""
        mock_cands = _make_mock_candidates(12)

        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", return_value=mock_cands):
            assessment = await AssessmentOrchestrationService.get_or_create_personalized_assessment(
                user_id=DEMO_USER_ID, force_regenerate=True
            )

            self.assertEqual(assessment["total_items"], 18)
            self.assertEqual(len(assessment["items"]), 18)

    # --------------------------------------------------------------------------
    # 23. correct_index remains hidden from learner responses
    # --------------------------------------------------------------------------
    async def test_23_correct_index_remains_hidden_from_learner_responses(self):
        """VERIFICATION 23: correct_index remains hidden from learner responses."""
        mock_cands = _make_mock_candidates(12)

        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", return_value=mock_cands):
            assessment = await AssessmentOrchestrationService.get_or_create_personalized_assessment(
                user_id=DEMO_USER_ID, force_regenerate=True
            )

            for item in assessment["items"]:
                self.assertNotIn(
                    "correct_index",
                    item,
                    "SECURITY CRITICAL: correct_index must never be exposed to learner!",
                )
                self.assertIn("prompt", item)
                self.assertIn("options", item)
                self.assertEqual(len(item["options"]), 4)

    # --------------------------------------------------------------------------
    # 24. Demo status reports existing session when data present
    # --------------------------------------------------------------------------
    async def test_24_demo_status_reports_existing_session(self):
        """VERIFICATION 24: Demo status reports existing session when onboarding/instances exist."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            status = await DemoResetService.get_demo_status(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )
            self.assertTrue(status["is_demo"])
            self.assertTrue(status["has_existing_session"])
            self.assertTrue(status["onboarding_completed"])
            self.assertTrue(status["assessment_exists"])

    # --------------------------------------------------------------------------
    # 25. Demo status reports no session after fresh reset
    # --------------------------------------------------------------------------
    async def test_25_demo_status_reports_no_session_after_reset(self):
        """VERIFICATION 25: Demo status reports no existing session when state is reset."""
        with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
            # First reset state
            await DemoResetService.reset_demo_learner(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )
            status = await DemoResetService.get_demo_status(
                user_id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
            )
            self.assertTrue(status["is_demo"])
            self.assertFalse(status["has_existing_session"])
            self.assertFalse(status["onboarding_completed"])
            self.assertFalse(status["assessment_exists"])

    # --------------------------------------------------------------------------
    # 26. Non-demo user demo status returns is_demo=False
    # --------------------------------------------------------------------------
    async def test_26_non_demo_user_demo_status_returns_not_demo(self):
        """VERIFICATION 26: Non-demo user cannot retrieve demo state; returns is_demo=False."""
        status = await DemoResetService.get_demo_status(
            user_id=self.other_user_id,
            email=self.other_user_email,
        )
        self.assertFalse(status["is_demo"])
        self.assertFalse(status["has_existing_session"])
        self.assertFalse(status["onboarding_completed"])
        self.assertFalse(status["assessment_exists"])

    # --------------------------------------------------------------------------
    # 27. GET /learner/demo-status endpoint returns status for demo user
    # --------------------------------------------------------------------------
    def test_27_get_demo_status_endpoint_for_demo_user(self):
        """VERIFICATION 27: GET /learner/demo-status endpoint returns status for authenticated demo user."""
        client = TestClient(app)
        demo_user = {
            "id": DEMO_USER_ID,
            "email": DEMO_USER_EMAIL,
            "role": "learner",
        }
        app.dependency_overrides[get_current_user] = lambda: demo_user
        try:
            with mock.patch("app.services.demo_service.get_supabase", return_value=self.mock_client):
                response = client.get("/learner/demo-status")
                self.assertEqual(response.status_code, 200)
                data = response.json()
                self.assertTrue(data["is_demo"])
                self.assertTrue(data["has_existing_session"])
                self.assertTrue(data["onboarding_completed"])
                self.assertTrue(data["assessment_exists"])
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    # --------------------------------------------------------------------------
    # 28. GET /learner/demo-status endpoint returns is_demo=False for normal learner
    # --------------------------------------------------------------------------
    def test_28_get_demo_status_endpoint_for_normal_learner(self):
        """VERIFICATION 28: GET /learner/demo-status returns is_demo=False for non-demo users."""
        client = TestClient(app)
        other_user = {
            "id": self.other_user_id,
            "email": self.other_user_email,
            "role": "learner",
        }
        app.dependency_overrides[get_current_user] = lambda: other_user
        try:
            response = client.get("/learner/demo-status")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertFalse(data["is_demo"])
            self.assertFalse(data["has_existing_session"])
        finally:
            app.dependency_overrides.pop(get_current_user, None)


if __name__ == "__main__":
    unittest.main(verbosity=2)
