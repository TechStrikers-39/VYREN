import asyncio
import os
import sys
import unittest
from unittest import mock

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import BackgroundTasks
from app.api.learner import submit_onboarding
from app.schemas.auth import LearnerOnboardingRequest
from app.services.ai_assistant import AIAssistantService
from app.services.assessment_orchestrator import (
    AssessmentOrchestrationService,
    _IN_FLIGHT_GENERATIONS,
    _REGISTRY_LOCK,
)
from app.repositories.instance_repo import AssessmentInstanceRepository
from app.repositories.user_repo import UserRepository
from app.services.targeting_engine import FINAL_ASSESSMENT_SIZE


def _make_mock_candidates(count=12):
    return [
        {
            "id": f"gen-cand-{i}",
            "competency_id": "c1000000-0000-0000-0000-000000000001",
            "prompt": f"Test prompt {i} for official statistics competency diagnosis?",
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


class TestPregenerationConcurrency(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        # Clean in-flight registry before each test
        async with _REGISTRY_LOCK:
            _IN_FLIGHT_GENERATIONS.clear()

    async def test_01_onboarding_persists_profile_and_schedules_background_generation(self):
        """TEST 1: Onboarding persists profile and schedules background assessment generation."""
        user_id = "test-user-pregen-01"
        req = LearnerOnboardingRequest(
            department="National Accounts Division",
            designation="Senior Statistical Officer",
            responsibilities="Macroeconomic aggregation and GDP deflation analysis",
            tools_experience=["Python", "Excel", "R"],
            self_reported_level=2,
            target_competencies=["c1000000-0000-0000-0000-000000000001"],
        )
        bg = BackgroundTasks()
        current_user = {"id": user_id, "email": "test01@mospi.gov.in", "role": "learner"}

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        mock_profile = {
            "id": user_id,
            "email": "test01@mospi.gov.in",
            "full_name": "Test User",
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

            self.assertEqual(res.id, user_id)
            self.assertTrue(res.onboarding_completed)

            # Verify background tasks contains pre-generation task
            self.assertEqual(len(bg.tasks), 1)
            enqueued = bg.tasks[0]
            self.assertEqual(
                enqueued.func,
                AssessmentOrchestrationService.get_or_create_personalized_assessment,
            )
            self.assertEqual(enqueued.kwargs.get("user_id"), user_id)

    async def test_02_background_generation_produces_one_ready_instance(self):
        """TEST 2: Background generation produces one ready instance."""
        user_id = "test-user-pregen-02"
        mock_cands = _make_mock_candidates(12)

        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", return_value=mock_cands):
            assessment = await AssessmentOrchestrationService.get_or_create_personalized_assessment(
                user_id=user_id, force_regenerate=True
            )

            self.assertIn("id", assessment)
            self.assertEqual(assessment["status"], "ready")
            self.assertEqual(assessment["total_items"], FINAL_ASSESSMENT_SIZE)
            self.assertEqual(len(assessment["items"]), FINAL_ASSESSMENT_SIZE)

    async def test_03_concurrent_requests_produce_single_generation(self):
        """TEST 3: Two concurrent assessment requests for the same user produce only one generation."""
        user_id = "test-user-pregen-03"
        call_count = 0

        async def slow_mock_generate(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.05)
            return _make_mock_candidates(12)

        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", side_effect=slow_mock_generate):
            res1, res2 = await asyncio.gather(
                AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_id, force_regenerate=True),
                AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_id, force_regenerate=True),
            )

            # Assert Gemini candidate generator was called EXACTLY ONCE
            self.assertEqual(call_count, 1)
            # Both callers receive the identical instance ID
            self.assertEqual(res1["id"], res2["id"])
            self.assertEqual(len(res1["items"]), 18)
            self.assertEqual(len(res2["items"]), 18)

    async def test_04_concurrent_foreground_awaits_existing_generation(self):
        """TEST 4: Concurrent foreground request awaits the existing generation task."""
        user_id = "test-user-pregen-04"
        generation_started = asyncio.Event()

        async def delayed_generator(*args, **kwargs):
            generation_started.set()
            await asyncio.sleep(0.08)
            return _make_mock_candidates(12)

        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", side_effect=delayed_generator):
            task1 = asyncio.create_task(
                AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_id, force_regenerate=True)
            )

            await generation_started.wait()

            task2 = asyncio.create_task(
                AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_id, force_regenerate=False)
            )

            res1, res2 = await asyncio.gather(task1, task2)

            self.assertEqual(res1["id"], res2["id"])
            self.assertEqual(res1["blueprint"], res2["blueprint"])

    async def test_05_repeated_requests_reuse_same_instance(self):
        """TEST 5: Repeated requests after completion reuse the same instance."""
        user_id = "test-user-pregen-05"
        mock_cands = _make_mock_candidates(12)

        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", return_value=mock_cands) as mocked_gemini:
            res1 = await AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_id, force_regenerate=True)
            self.assertEqual(mocked_gemini.call_count, 1)

            res2 = await AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_id, force_regenerate=False)
            res3 = await AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_id, force_regenerate=False)

            self.assertEqual(mocked_gemini.call_count, 1)
            self.assertEqual(res1["id"], res2["id"])
            self.assertEqual(res2["id"], res3["id"])
            self.assertEqual(len(res2["items"]), 18)

    async def test_06_generation_failure_clears_inflight_registry(self):
        """TEST 6: Generation failure clears the in-flight registry."""
        user_id = "test-user-pregen-06"

        async def failing_generator(*args, **kwargs):
            raise RuntimeError("Database or cluster transient failure")

        with mock.patch.object(AssessmentOrchestrationService, "_generate_and_persist", side_effect=failing_generator):
            with self.assertRaises(RuntimeError):
                await AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_id, force_regenerate=True)

            async with _REGISTRY_LOCK:
                self.assertNotIn(user_id, _IN_FLIGHT_GENERATIONS)

    async def test_07_subsequent_request_after_failure_can_retry(self):
        """TEST 7: A subsequent request after failure can retry generation."""
        user_id = "test-user-pregen-07"
        should_fail = True

        async def intermittent_generate(user_id, locale="en"):
            nonlocal should_fail
            if should_fail:
                should_fail = False
                raise RuntimeError("Transient network timeout")
            return {
                "id": "inst-recovered-007",
                "title": "VYREN Personalized Baseline Skill Assessment",
                "version": "2.0-personalized",
                "time_limit_minutes": 20,
                "generation_mode": "ai_personalized",
                "status": "ready",
                "total_items": 18,
                "items": [{"id": f"item-{i}", "prompt": f"P{i}"} for i in range(18)],
                "blueprint": {},
            }

        with mock.patch.object(AssessmentOrchestrationService, "_generate_and_persist", side_effect=intermittent_generate):
            with self.assertRaises(RuntimeError):
                await AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_id, force_regenerate=True)

            res = await AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_id, force_regenerate=True)
            self.assertEqual(res["id"], "inst-recovered-007")
            self.assertEqual(res["status"], "ready")

    async def test_08_learner_response_never_contains_correct_index(self):
        """TEST 8: Learner response never contains correct_index."""
        user_id = "test-user-pregen-08"
        mock_cands = _make_mock_candidates(12)

        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", return_value=mock_cands):
            assessment = await AssessmentOrchestrationService.get_or_create_personalized_assessment(
                user_id=user_id, force_regenerate=True
            )

            for item in assessment["items"]:
                self.assertNotIn("correct_index", item, "SECURITY CRITICAL: correct_index leaked to learner!")
                self.assertIn("prompt", item)
                self.assertIn("options", item)
                self.assertEqual(len(item["options"]), 4)

    async def test_09_exactly_18_assessment_items_persisted(self):
        """TEST 9: Exactly 18 assessment items are persisted."""
        user_id = "test-user-pregen-09"
        mock_cands = _make_mock_candidates(12)

        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", return_value=mock_cands):
            assessment = await AssessmentOrchestrationService.get_or_create_personalized_assessment(
                user_id=user_id, force_regenerate=True
            )

            instance_id = assessment["id"]
            learner_items = AssessmentInstanceRepository.get_instance_items_for_learner(instance_id)
            self.assertEqual(len(learner_items), 18)

            raw_items = AssessmentInstanceRepository.get_raw_instance_items_for_scoring(instance_id)
            self.assertEqual(len(raw_items), 18)
            self.assertTrue(all("correct_index" in it for it in raw_items))

    async def test_10_different_users_can_generate_assessments_concurrently(self):
        """TEST 10: Different users can generate assessments concurrently (per-user, not global lock)."""
        user_A = "test-user-pregen-10-A"
        user_B = "test-user-pregen-10-B"

        active_users = []
        max_concurrent_users = 0

        async def tracking_generate(user_id, locale="en"):
            nonlocal max_concurrent_users
            active_users.append(user_id)
            if len(active_users) > max_concurrent_users:
                max_concurrent_users = len(active_users)
            await asyncio.sleep(0.04)
            active_users.remove(user_id)
            return {
                "id": f"inst-{user_id}",
                "title": "VYREN Personalized Baseline Skill Assessment",
                "version": "2.0-personalized",
                "time_limit_minutes": 20,
                "generation_mode": "ai_personalized",
                "status": "ready",
                "total_items": 18,
                "items": [{"id": f"item-{user_id}-{i}", "prompt": f"P{i}"} for i in range(18)],
                "blueprint": {},
            }

        with mock.patch.object(AssessmentOrchestrationService, "_generate_and_persist", side_effect=tracking_generate):
            res_A, res_B = await asyncio.gather(
                AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_A, force_regenerate=True),
                AssessmentOrchestrationService.get_or_create_personalized_assessment(user_id=user_B, force_regenerate=True),
            )

            self.assertEqual(max_concurrent_users, 2)
            self.assertEqual(res_A["id"], f"inst-{user_A}")
            self.assertEqual(res_B["id"], f"inst-{user_B}")
            self.assertNotEqual(res_A["id"], res_B["id"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
