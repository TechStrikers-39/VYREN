"""
Unit tests for RecommendationRanker and CourseSearchQueryBuilder.

Verifies:
1. Priority tier (HIGH > MEDIUM > LOW/NONE)
2. Gap magnitude tie-breaking (gap_size 3 > gap_size 2)
3. Confidence/evidence tie-breaking (higher confidence ranks higher)
4. Context relevance tie-breaking (target competencies, responsibilities, tools)
5. Stable final tie-breaker (canonical competency_id)
6. Course search query construction with competency name, designation, tools, and keywords
7. Query safety (no secrets/tokens/IDs included)
"""

import os
import sys
import unittest
import unittest.mock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.repositories.course_repo import CourseRepository
from app.services.recommendation_ranker import (
    rank_gaps_for_recommendation,
    build_course_search_query,
    get_tiered_search_queries,
)


class TestRecommendationRanker(unittest.TestCase):

    def setUp(self):
        self.stat_inf_id = "c1000000-0000-0000-0000-000000000001"
        self.data_pipe_id = "c1000000-0000-0000-0000-000000000002"
        self.mlops_id = "c1000000-0000-0000-0000-000000000003"
        self.data_gov_id = "c1000000-0000-0000-0000-000000000004"

    def test_priority_tier_order(self):
        """HIGH priority must always rank above MEDIUM priority regardless of gap size."""
        gap_matrix = [
            {
                "competency_id": self.data_pipe_id,
                "competency_name": "Data Pipeline Design",
                "priority": "MEDIUM",
                "gap_size": 3,
                "current_level": 0,
                "required_level": 3,
            },
            {
                "competency_id": self.stat_inf_id,
                "competency_name": "Statistical Inference",
                "priority": "HIGH",
                "gap_size": 1,
                "current_level": 2,
                "required_level": 3,
            },
        ]
        ranked = rank_gaps_for_recommendation(gap_matrix)
        self.assertEqual(len(ranked), 2)
        self.assertEqual(ranked[0]["competency_id"], self.stat_inf_id)
        self.assertEqual(ranked[1]["competency_id"], self.data_pipe_id)

    def test_gap_magnitude_order(self):
        """Larger gap size ranks above smaller gap size within the same priority tier."""
        gap_matrix = [
            {
                "competency_id": self.data_pipe_id,
                "competency_name": "Data Pipeline Design",
                "priority": "HIGH",
                "gap_size": 1,
                "current_level": 2,
                "required_level": 3,
            },
            {
                "competency_id": self.stat_inf_id,
                "competency_name": "Statistical Inference",
                "priority": "HIGH",
                "gap_size": 3,
                "current_level": 0,
                "required_level": 3,
            },
        ]
        ranked = rank_gaps_for_recommendation(gap_matrix)
        self.assertEqual(ranked[0]["competency_id"], self.stat_inf_id)
        self.assertEqual(ranked[1]["competency_id"], self.data_pipe_id)

    def test_confidence_evidence_tie_breaker(self):
        """When priority and gap size tie, higher measurement confidence ranks first."""
        gap_matrix = [
            {
                "competency_id": self.data_pipe_id,
                "competency_name": "Data Pipeline Design",
                "priority": "HIGH",
                "gap_size": 3,
                "current_level": 0,
                "required_level": 3,
            },
            {
                "competency_id": self.stat_inf_id,
                "competency_name": "Statistical Inference",
                "priority": "HIGH",
                "gap_size": 3,
                "current_level": 0,
                "required_level": 3,
            },
        ]
        # Stat Inf has higher confidence (0.95 vs 0.70)
        scores = {
            self.data_pipe_id: {"confidence": 0.70, "score": 10},
            self.stat_inf_id: {"confidence": 0.95, "score": 10},
        }
        ranked = rank_gaps_for_recommendation(gap_matrix, competency_scores=scores)
        self.assertEqual(ranked[0]["competency_id"], self.stat_inf_id)
        self.assertEqual(ranked[1]["competency_id"], self.data_pipe_id)

    def test_context_relevance_tie_breaker(self):
        """When priority, gap size, and confidence tie, target competency context ranks first."""
        gap_matrix = [
            {
                "competency_id": self.data_pipe_id,
                "competency_name": "Data Pipeline Design",
                "priority": "HIGH",
                "gap_size": 3,
                "current_level": 0,
                "required_level": 3,
            },
            {
                "competency_id": self.data_gov_id,
                "competency_name": "Data Governance",
                "priority": "HIGH",
                "gap_size": 3,
                "current_level": 0,
                "required_level": 3,
            },
        ]
        profile = {
            "target_competencies": [self.data_gov_id],  # Selected Data Governance
            "responsibilities": "Data privacy audit, compliance, metadata governance",
            "tools_experience": ["Collibra"],
        }
        scores = {
            self.data_pipe_id: {"confidence": 0.80},
            self.data_gov_id: {"confidence": 0.80},
        }
        ranked = rank_gaps_for_recommendation(gap_matrix, competency_scores=scores, profile=profile)
        self.assertEqual(ranked[0]["competency_id"], self.data_gov_id)
        self.assertEqual(ranked[1]["competency_id"], self.data_pipe_id)

    def test_stable_canonical_id_tie_breaker(self):
        """When all signals are equal, output order is deterministic by competency_id."""
        gap_matrix_a = [
            {
                "competency_id": self.data_pipe_id,
                "competency_name": "Data Pipeline Design",
                "priority": "HIGH",
                "gap_size": 3,
                "current_level": 0,
                "required_level": 3,
            },
            {
                "competency_id": self.stat_inf_id,
                "competency_name": "Statistical Inference",
                "priority": "HIGH",
                "gap_size": 3,
                "current_level": 0,
                "required_level": 3,
            },
        ]
        gap_matrix_b = list(reversed(gap_matrix_a))

        ranked_a = rank_gaps_for_recommendation(gap_matrix_a)
        ranked_b = rank_gaps_for_recommendation(gap_matrix_b)

        self.assertEqual(
            [g["competency_id"] for g in ranked_a],
            [g["competency_id"] for g in ranked_b],
        )

    def test_low_and_none_gaps_filtered(self):
        """LOW and NONE priority gaps are excluded from top recommendations."""
        gap_matrix = [
            {
                "competency_id": self.data_pipe_id,
                "competency_name": "Data Pipeline Design",
                "priority": "LOW",
                "gap_size": 0,
                "current_level": 3,
                "required_level": 3,
            },
            {
                "competency_id": self.stat_inf_id,
                "competency_name": "Statistical Inference",
                "priority": "HIGH",
                "gap_size": 2,
                "current_level": 1,
                "required_level": 3,
            },
        ]
        ranked = rank_gaps_for_recommendation(gap_matrix)
        self.assertEqual(len(ranked), 1)
        self.assertEqual(ranked[0]["competency_id"], self.stat_inf_id)


class TestCourseSearchQueryBuilder(unittest.TestCase):

    def test_query_includes_competency_name(self):
        query = build_course_search_query("Data Governance")
        self.assertIn("Data Governance", query)

    def test_query_includes_designation_and_tools(self):
        profile = {
            "designation": "Junior Statistical Officer",
            "responsibilities": "Field survey sampling design, hypothesis testing, survey estimation",
            "tools_experience": ["R", "Python", "Excel"],
        }
        query = build_course_search_query("Statistical Inference", profile=profile)
        self.assertIn("Statistical Inference", query)
        self.assertIn("Junior Statistical Officer", query)
        # Should include relevant tools for Statistical Inference domain (e.g. python, r)
        self.assertTrue("python" in query.lower() or "r" in query.lower())

    def test_query_safety_no_private_fields(self):
        profile = {
            "id": "user-secret-12345",
            "email": "private.officer@gov.in",
            "password": "secretpassword",
            "designation": "Assistant Director",
            "responsibilities": "Data pipeline design ETL batch",
            "tools_experience": ["SQL", "Kafka"],
        }
        query = build_course_search_query("Data Pipeline Design", profile=profile)
        self.assertNotIn("user-secret-12345", query)
        self.assertNotIn("private.officer@gov.in", query)
        self.assertNotIn("secretpassword", query)

    def test_get_tiered_search_queries_with_profile(self):
        """When profile is provided, returns Tier 1 (contextual) and Tier 2 (competency-only) fallback."""
        profile = {
            "designation": "Junior Statistical Officer",
            "responsibilities": "Field survey sampling design, hypothesis testing, survey estimation",
            "tools_experience": ["R", "Python"],
        }
        tiers = get_tiered_search_queries("Statistical Inference", profile=profile)
        self.assertEqual(len(tiers), 2)
        self.assertEqual(tiers[0][0], "Tier 1 (contextual)")
        self.assertIn("Statistical Inference", tiers[0][1])
        self.assertIn("Junior Statistical Officer", tiers[0][1])

        self.assertEqual(tiers[1][0], "Tier 2 (competency-only)")
        self.assertEqual(tiers[1][1], "Statistical Inference")

    def test_get_tiered_search_queries_without_profile_deduplicates(self):
        """When profile is empty, Tier 1 is already competency name; avoids duplicate Tier 2 call."""
        tiers = get_tiered_search_queries("Data Governance", profile=None)
        self.assertEqual(len(tiers), 1)
        self.assertEqual(tiers[0][0], "Tier 1 (contextual)")
        self.assertEqual(tiers[0][1], "Data Governance")


class TestCourseRepositoryDbDurability(unittest.TestCase):

    def setUp(self):
        from app.repositories.course_repo import CourseRepository
        CourseRepository._IGOT_COURSE_METADATA_CACHE.clear()

    # ------------------------------------------------------------------
    # TEST 1 — REAL iGOT course: provider and integration_mode preserved
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    def test_get_course_detail_reads_db_external_metadata_without_cache(self, mock_get_supabase):
        """
        A course with a verified external_url and real provider must resolve:
          integration_mode = "REAL / SUNBIRD"
          provider         = actual stored provider (not a fabricated fallback)
        """
        from app.repositories.course_repo import CourseRepository

        mock_supabase = unittest.mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase

        db_course = {
            "id": "1ac6bcb1-4d72-574a-8437-ca601beed9d8",
            "title": "Data Foundations for Governance",
            "is_active": True,
            "external_id": "do_11452980177757798411",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_11452980177757798411/overview",
            "provider": "Wadhwani Foundation / iGOT Karmayogi Bharat",
        }
        mock_supabase.table().select().eq().eq().single().execute.return_value.data = db_course
        mock_supabase.table().select().eq().order().execute.return_value.data = [
            {"id": "mod-1", "title": "Module 1", "order_index": 0}
        ]

        # In-memory cache is empty
        self.assertEqual(CourseRepository._IGOT_COURSE_METADATA_CACHE, {})

        detail = CourseRepository.get_course_detail("1ac6bcb1-4d72-574a-8437-ca601beed9d8")
        self.assertIsNotNone(detail)
        self.assertEqual(detail["external_id"], "do_11452980177757798411")
        self.assertEqual(
            detail["external_url"],
            "https://portal.igotkarmayogi.gov.in/public/toc/do_11452980177757798411/overview",
        )
        self.assertEqual(detail["provider"], "Wadhwani Foundation / iGOT Karmayogi Bharat")
        self.assertEqual(detail["integration_mode"], "REAL / SUNBIRD")

    # ------------------------------------------------------------------
    # TEST 1b — REAL iGOT course with UpGrad provider
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    def test_real_igot_course_with_upgrad_provider(self, mock_get_supabase):
        """
        A Sunbird course normalised with provider="UpGrad" must preserve that
        provider exactly — the stale "iGOT Karmayogi Bharat / NSSTA" fallback
        must never replace a real upstream provider.
        """
        from app.repositories.course_repo import CourseRepository

        mock_supabase = unittest.mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase

        db_course = {
            "id": "87f3985b-5f0e-5014-adc0-e724d71d13e0",
            "title": "Database Design and Introduction to MySQL",
            "is_active": True,
            "external_id": "do_1138884164974755841152",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_1138884164974755841152/overview",
            "provider": "UpGrad",
        }
        mock_supabase.table().select().eq().eq().single().execute.return_value.data = db_course
        mock_supabase.table().select().eq().order().execute.return_value.data = []

        detail = CourseRepository.get_course_detail("87f3985b-5f0e-5014-adc0-e724d71d13e0")
        self.assertIsNotNone(detail)
        self.assertEqual(detail["provider"], "UpGrad")
        self.assertEqual(detail["integration_mode"], "REAL / SUNBIRD")
        # Must NOT equal the old stale fallback
        self.assertNotEqual(detail["provider"], "iGOT Karmayogi Bharat / NSSTA")

    # ------------------------------------------------------------------
    # TEST 2 — LOCAL course: provider None, integration_mode FALLBACK
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    def test_unforced_local_course_metadata(self, mock_get_supabase):
        """
        A course with external_url=NULL and provider=NULL must resolve:
          integration_mode = "FALLBACK / LOCAL"
          provider         = None  (no fabricated iGOT label)
        """
        from app.repositories.course_repo import CourseRepository

        mock_supabase = unittest.mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase

        db_course = {
            "id": "c0100000-0000-0000-0000-000000000099",
            "title": "Local Custom Course",
            "is_active": True,
            "external_id": None,
            "external_url": None,
            "provider": None,
        }
        mock_supabase.table().select().eq().eq().single().execute.return_value.data = db_course
        mock_supabase.table().select().eq().order().execute.return_value.data = []

        detail = CourseRepository.get_course_detail("c0100000-0000-0000-0000-000000000099")
        self.assertIsNotNone(detail)
        self.assertIsNone(detail["external_id"])
        self.assertIsNone(detail["external_url"])
        self.assertIsNone(detail["provider"])
        self.assertEqual(detail["integration_mode"], "FALLBACK / LOCAL")
        # Confirm no stale string was injected
        self.assertNotEqual(detail["provider"], "iGOT Karmayogi Bharat / NSSTA")

    # ------------------------------------------------------------------
    # TEST 3 — Learning path integrity: mixed REAL + LOCAL steps
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.get_course_detail")
    def test_learning_path_uses_per_course_provider_and_mode(
        self, mock_get_detail, mock_get_supabase
    ):
        """
        A learning path containing one REAL / SUNBIRD course and one FALLBACK / LOCAL
        course must produce steps with the correct independent provider and
        integration_mode for each — not a single hardcoded value for all.
        """
        from app.repositories.course_repo import CourseRepository

        mock_supabase = unittest.mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase

        # Profile query
        mock_supabase.table().select().eq().single().execute.return_value.data = {
            "full_name": "Test Learner"
        }
        # Assessment results: has one result
        mock_supabase.table().select().eq().order().limit().execute.return_value.data = [
            {"id": "result-1", "overall_score": 60, "submitted_at": "2026-09-25T00:00:00Z"}
        ]
        # Enrollments: none
        mock_supabase.table().select().eq().execute.return_value.data = []

        # Two recommendations
        rec_real = {
            "competency_id": "c1000000-0000-0000-0000-000000000002",
            "course_id": "igot-course-uuid-real",
            "description": "Targeted gap: Data Pipeline Design",
            "competencies": {"name": "Data Pipeline Design", "category": "Data Engineering"},
        }
        rec_local = {
            "competency_id": "c1000000-0000-0000-0000-000000000004",
            "course_id": "local-course-uuid-fallback",
            "description": "Targeted gap: Data Governance",
            "competencies": {"name": "Data Governance", "category": "Data Management"},
        }

        # Recommendations query
        mock_supabase.table().select().eq().eq().order().execute.return_value.data = [
            rec_real, rec_local
        ]

        # Map course_id → simulated get_course_detail responses
        def _side_effect(cid):
            if cid == "igot-course-uuid-real":
                return {
                    "id": cid,
                    "title": "Database Design and Introduction to MySQL",
                    "duration_minutes": 390,
                    "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_99/overview",
                    "provider": "UpGrad",
                    "integration_mode": "REAL / SUNBIRD",
                }
            if cid == "local-course-uuid-fallback":
                return {
                    "id": cid,
                    "title": "Data Governance Fundamentals",
                    "duration_minutes": 90,
                    "external_url": None,
                    "provider": None,
                    "integration_mode": "FALLBACK / LOCAL",
                }
            return None

        mock_get_detail.side_effect = _side_effect

        result = CourseRepository.get_learning_path("user-test-mixed")

        course_steps = [s for s in result["steps"] if s.get("course_id")]
        self.assertEqual(len(course_steps), 2)

        real_step = next(s for s in course_steps if s["course_id"] == "igot-course-uuid-real")
        local_step = next(s for s in course_steps if s["course_id"] == "local-course-uuid-fallback")

        # REAL step must NOT be hardcoded — must reflect actual course metadata
        self.assertEqual(real_step["integration_mode"], "REAL / SUNBIRD")
        self.assertEqual(real_step["provider"], "UpGrad")

        # LOCAL step must NOT be labelled as REAL / SUNBIRD
        self.assertEqual(local_step["integration_mode"], "FALLBACK / LOCAL")
        self.assertNotEqual(local_step["integration_mode"], "REAL / SUNBIRD")
        # provider falls back to "VYREN Curriculum" when course.provider is None
        self.assertEqual(local_step["provider"], "VYREN Curriculum")
        self.assertNotEqual(local_step["provider"], "iGOT Karmayogi Bharat / NSSTA")

    # ------------------------------------------------------------------
    # TEST 4 — Dynamic recommendation: provider from DB, not hardcoded
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    def test_upsert_normalized_course_preserves_actual_provider_no_fabrication(
        self, mock_get_supabase
    ):
        """
        upsert_normalized_course() must preserve whatever provider is in the
        upstream normalized record. When provider is None (unknown upstream),
        the DB and cache must also store None — not a stale fallback string.
        """
        from app.repositories.course_repo import CourseRepository

        mock_supabase = unittest.mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase

        # Case A: real provider supplied by Sunbird normalisation
        course_with_provider = {
            "id": "igot-upgrad-001",
            "title": "Database Design and Introduction to MySQL",
            "external_id": "do_1138884164974755841152",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_1138884164974755841152/overview",
            "provider": "UpGrad",
            "integration_mode": "REAL / SUNBIRD",
        }
        CourseRepository.upsert_normalized_course(course_with_provider)
        cached_a = CourseRepository._IGOT_COURSE_METADATA_CACHE.get("igot-upgrad-001", {})
        self.assertEqual(cached_a["provider"], "UpGrad")
        self.assertNotEqual(cached_a["provider"], "iGOT Karmayogi Bharat / NSSTA")

        # Case B: no provider in upstream data → must NOT fabricate one
        course_no_provider = {
            "id": "igot-anon-002",
            "title": "Some Sunbird Course Without Provider",
            "external_id": "do_anonymous",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_anonymous/overview",
            "provider": None,
            "integration_mode": "REAL / SUNBIRD",
        }
        CourseRepository.upsert_normalized_course(course_no_provider)
        cached_b = CourseRepository._IGOT_COURSE_METADATA_CACHE.get("igot-anon-002", {})
        self.assertIsNone(cached_b["provider"])

    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    def test_upsert_normalized_course_includes_external_metadata(self, mock_get_supabase):
        """Regression: upsert payload must carry external_id and external_url correctly."""
        from app.repositories.course_repo import CourseRepository

        mock_supabase = unittest.mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase

        course_data = {
            "id": "test-crs-1",
            "title": "Test Upsert Course",
            "external_id": "do_test_123",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_test_123/overview",
            "provider": "iGOT Karmayogi Bharat",
        }

        CourseRepository.upsert_normalized_course(course_data)

        # Check payload passed to Supabase upsert
        mock_supabase.table("courses").upsert.assert_called()
        upsert_call_args = mock_supabase.table("courses").upsert.call_args[0][0]
        self.assertEqual(upsert_call_args["external_id"], "do_test_123")
        self.assertEqual(
            upsert_call_args["external_url"],
            "https://portal.igotkarmayogi.gov.in/public/toc/do_test_123/overview",
        )
        self.assertEqual(upsert_call_args["provider"], "iGOT Karmayogi Bharat")

    # ------------------------------------------------------------------
    # TEST 5 — No score mutation on module completion
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    @unittest.mock.patch.object(CourseRepository, "enroll_user")
    @unittest.mock.patch.object(CourseRepository, "get_course_detail")
    def test_complete_module_does_not_mutate_competency_scores(
        self, mock_get_detail, mock_enroll, mock_get_supabase
    ):
        """
        Module completion records learning-activity evidence only.
        It must NOT directly mutate competency_scores or recalibrate skill_gaps
        (those are assessment-driven, not completion-driven).
        """
        from app.repositories.course_repo import CourseRepository

        mock_get_detail.return_value = {
            "id": "b0100000-0000-0000-0000-000000000001",
            "modules": [{"id": "mod-1", "title": "Module 1", "competency_id": "comp-1"}],
        }
        mock_enroll.return_value = {
            "id": "enr-1",
            "completed_modules": [],
        }
        mock_supabase = unittest.mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase

        result = CourseRepository.complete_module(
            user_id="user1",
            course_id="b0100000-0000-0000-0000-000000000001",
            module_id="mod-1",
        )

        self.assertEqual(result["recalibrated_score"], None)
        self.assertEqual(result["recalibrated_level"], None)
        self.assertEqual(result["updated_gap_priority"], None)


class TestGenericTieredIgotSearch(unittest.TestCase):
    """
    Focused verification of the Generic Tiered iGOT/Sunbird Search Strategy:
      Tier 1: Contextually enriched query (competency + role + tools)
      Tier 2: Clean competency name fallback if Tier 1 returns 0 results
      Tier 3: Local catalog fallback only if both Tier 1 and Tier 2 return 0 results
    """

    def setUp(self):
        CourseRepository._IGOT_COURSE_METADATA_CACHE.clear()

    def _setup_assessment_mocks(
        self,
        mock_get_supabase,
        mock_evaluate_sub,
        mock_get_raw_items,
        mock_list_comps,
        mock_compute_gaps,
        mock_get_profile,
        comp_id="c1000000-0000-0000-0000-000000000002",
        comp_name="Data Pipeline Design",
    ):
        mock_supabase = unittest.mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase

        # Supabase mock responses
        mock_supabase.table().select().eq().single().execute.return_value.data = {"version": "1.0"}
        mock_supabase.table().upsert().execute.return_value.data = [{}]
        mock_supabase.table().delete().eq().execute.return_value.data = [{}]
        mock_supabase.table().insert().execute.return_value.data = [{"id": "res-001"}]

        mock_get_profile.return_value = {
            "designation": "Junior Statistical Officer",
            "responsibilities": "Statistical pipeline and database ETL automation",
            "tools_experience": ["SQL", "Kafka"],
        }
        mock_get_raw_items.return_value = [{"id": "item-001"}]
        mock_evaluate_sub.return_value = {
            "overall_score": 65.0,
            "competency_breakdown": {
                comp_id: {"score": 50, "measured_level": 1, "confidence": 0.88, "items_evaluated": 4}
            },
            "item_log": [],
        }
        mock_list_comps.return_value = [{"id": comp_id, "name": comp_name, "category": "Data Engineering"}]
        mock_compute_gaps.return_value = [{
            "competency_id": comp_id,
            "competency_name": comp_name,
            "competency_category": "Data Engineering",
            "current_level": 1,
            "required_level": 3,
            "gap_size": 2,
            "priority": "HIGH",
            "requirement_source": "VYREN Framework",
        }]
        return mock_supabase

    # ------------------------------------------------------------------
    # TEST 1: Contextual query returns results -> Tier 1 only, no Tier 2
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.assessment_repo.get_supabase")
    @unittest.mock.patch("app.repositories.assessment_repo.ScoringEngine.evaluate_submission")
    @unittest.mock.patch("app.repositories.assessment_repo.AssessmentRepository.get_raw_assessment_items")
    @unittest.mock.patch("app.repositories.assessment_repo.CompetencyRepository.list_competencies")
    @unittest.mock.patch("app.repositories.assessment_repo.GapEngine.compute_all_gaps")
    @unittest.mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @unittest.mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.get_course_for_competency")
    def test_tier1_contextual_success_avoids_tier2_and_local_fallback(
        self,
        mock_get_local,
        mock_upsert_normalized,
        mock_search_courses,
        mock_get_profile,
        mock_compute_gaps,
        mock_list_comps,
        mock_get_raw_items,
        mock_evaluate_sub,
        mock_get_supabase,
    ):
        from app.repositories.assessment_repo import AssessmentRepository

        self._setup_assessment_mocks(
            mock_get_supabase, mock_evaluate_sub, mock_get_raw_items,
            mock_list_comps, mock_compute_gaps, mock_get_profile,
        )

        tier1_course = {
            "id": "tier1-crs-uuid",
            "title": "Specialized Pipeline Design for JSO",
            "external_id": "do_tier1_pipe_99",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_tier1_pipe_99/overview",
            "provider": "UpGrad",
        }
        # Tier 1 returns course on first attempt
        mock_search_courses.return_value = [tier1_course]
        mock_upsert_normalized.return_value = tier1_course

        AssessmentRepository.process_and_store_submission(
            user_id="user-t1",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict={"item-001": 1},
        )

        # 1. Exactly one search query made (Tier 1)
        self.assertEqual(mock_search_courses.call_count, 1)
        tier1_called_query = mock_search_courses.call_args[1]["query"]
        self.assertIn("Junior Statistical Officer", tier1_called_query)

        # 2. Tier 1 course upserted
        mock_upsert_normalized.assert_called_once_with(tier1_course)

        # 3. Tier 3 local fallback NOT called
        mock_get_local.assert_not_called()

    # ------------------------------------------------------------------
    # TEST 2: Contextual query returns 0 -> Tier 2 retry occurs & upserted
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.assessment_repo.get_supabase")
    @unittest.mock.patch("app.repositories.assessment_repo.ScoringEngine.evaluate_submission")
    @unittest.mock.patch("app.repositories.assessment_repo.AssessmentRepository.get_raw_assessment_items")
    @unittest.mock.patch("app.repositories.assessment_repo.CompetencyRepository.list_competencies")
    @unittest.mock.patch("app.repositories.assessment_repo.GapEngine.compute_all_gaps")
    @unittest.mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @unittest.mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.get_course_for_competency")
    def test_tier1_zero_results_triggers_tier2_retry_and_upsert(
        self,
        mock_get_local,
        mock_upsert_normalized,
        mock_search_courses,
        mock_get_profile,
        mock_compute_gaps,
        mock_list_comps,
        mock_get_raw_items,
        mock_evaluate_sub,
        mock_get_supabase,
    ):
        from app.repositories.assessment_repo import AssessmentRepository

        self._setup_assessment_mocks(
            mock_get_supabase, mock_evaluate_sub, mock_get_raw_items,
            mock_list_comps, mock_compute_gaps, mock_get_profile,
        )

        tier2_course = {
            "id": "tier2-crs-uuid",
            "title": "Database Design and Introduction to MySQL",
            "external_id": "do_tier2_mysql_88",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_tier2_mysql_88/overview",
            "provider": "UpGrad",
        }
        # Tier 1 returns empty list; Tier 2 returns course
        mock_search_courses.side_effect = [[], [tier2_course]]
        mock_upsert_normalized.return_value = tier2_course

        AssessmentRepository.process_and_store_submission(
            user_id="user-t2",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict={"item-001": 1},
        )

        # 1. Exactly two search queries made (Tier 1 then Tier 2 retry)
        self.assertEqual(mock_search_courses.call_count, 2)
        call1_query = mock_search_courses.call_args_list[0][1]["query"]
        call2_query = mock_search_courses.call_args_list[1][1]["query"]

        # Tier 1 had contextual metadata
        self.assertIn("Junior Statistical Officer", call1_query)
        # Tier 2 was clean competency name fallback
        self.assertEqual(call2_query, "Data Pipeline Design")

        # 2. Tier 2 course upserted
        mock_upsert_normalized.assert_called_once_with(tier2_course)

        # 3. Tier 3 local fallback NOT called
        mock_get_local.assert_not_called()

    # ------------------------------------------------------------------
    # TEST 3: Both Tier 1 and Tier 2 return 0 -> Local fallback IS used
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.assessment_repo.get_supabase")
    @unittest.mock.patch("app.repositories.assessment_repo.ScoringEngine.evaluate_submission")
    @unittest.mock.patch("app.repositories.assessment_repo.AssessmentRepository.get_raw_assessment_items")
    @unittest.mock.patch("app.repositories.assessment_repo.CompetencyRepository.list_competencies")
    @unittest.mock.patch("app.repositories.assessment_repo.GapEngine.compute_all_gaps")
    @unittest.mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @unittest.mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.get_course_for_competency")
    def test_both_contextual_and_competency_only_zero_results_uses_local_fallback(
        self,
        mock_get_local,
        mock_upsert_normalized,
        mock_search_courses,
        mock_get_profile,
        mock_compute_gaps,
        mock_list_comps,
        mock_get_raw_items,
        mock_evaluate_sub,
        mock_get_supabase,
    ):
        from app.repositories.assessment_repo import AssessmentRepository

        self._setup_assessment_mocks(
            mock_get_supabase, mock_evaluate_sub, mock_get_raw_items,
            mock_list_comps, mock_compute_gaps, mock_get_profile,
        )

        local_fallback = {
            "id": "local-fallback-uuid",
            "title": "Data Pipeline Design: Enterprise Patterns",
            "external_id": None,
            "external_url": None,
            "provider": None,
        }
        # Both Tier 1 and Tier 2 return empty list
        mock_search_courses.side_effect = [[], []]
        mock_get_local.return_value = local_fallback

        AssessmentRepository.process_and_store_submission(
            user_id="user-t3",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict={"item-001": 1},
        )

        # 1. Exactly two search queries made
        self.assertEqual(mock_search_courses.call_count, 2)

        # 2. Upsert NOT called (no external course found)
        mock_upsert_normalized.assert_not_called()

        # 3. Tier 3 local fallback IS called with the competency ID
        mock_get_local.assert_called_once_with("c1000000-0000-0000-0000-000000000002")

    # ------------------------------------------------------------------
    # TEST 4: Different competencies resolve dynamically to different courses
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.assessment_repo.get_supabase")
    @unittest.mock.patch("app.repositories.assessment_repo.ScoringEngine.evaluate_submission")
    @unittest.mock.patch("app.repositories.assessment_repo.AssessmentRepository.get_raw_assessment_items")
    @unittest.mock.patch("app.repositories.assessment_repo.CompetencyRepository.list_competencies")
    @unittest.mock.patch("app.repositories.assessment_repo.GapEngine.compute_all_gaps")
    @unittest.mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @unittest.mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.get_course_for_competency")
    def test_different_competencies_resolve_dynamically_to_different_courses(
        self,
        mock_get_local,
        mock_upsert_normalized,
        mock_search_courses,
        mock_get_profile,
        mock_compute_gaps,
        mock_list_comps,
        mock_get_raw_items,
        mock_evaluate_sub,
        mock_get_supabase,
    ):
        """Two distinct competencies must query their respective queries and resolve dynamically."""
        from app.repositories.assessment_repo import AssessmentRepository

        mock_supabase = unittest.mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase
        mock_supabase.table().select().eq().single().execute.return_value.data = {"version": "1.0"}
        mock_supabase.table().upsert().execute.return_value.data = [{}]
        mock_supabase.table().delete().eq().execute.return_value.data = [{}]
        mock_supabase.table().insert().execute.return_value.data = [{"id": "res-multi"}]

        mock_get_profile.return_value = None  # Clean, no designation
        mock_get_raw_items.return_value = [{"id": "item-001"}]
        mock_evaluate_sub.return_value = {
            "overall_score": 60.0,
            "competency_breakdown": {
                "c1000000-0000-0000-0000-000000000001": {"score": 40, "measured_level": 1, "confidence": 0.8},
                "c1000000-0000-0000-0000-000000000004": {"score": 45, "measured_level": 1, "confidence": 0.8},
            },
            "item_log": [],
        }
        mock_list_comps.return_value = [
            {"id": "c1000000-0000-0000-0000-000000000001", "name": "Statistical Inference"},
            {"id": "c1000000-0000-0000-0000-000000000004", "name": "Data Governance"},
        ]
        mock_compute_gaps.return_value = [
            {
                "competency_id": "c1000000-0000-0000-0000-000000000001",
                "competency_name": "Statistical Inference",
                "current_level": 1,
                "required_level": 3,
                "gap_size": 2,
                "priority": "HIGH",
            },
            {
                "competency_id": "c1000000-0000-0000-0000-000000000004",
                "competency_name": "Data Governance",
                "current_level": 1,
                "required_level": 3,
                "gap_size": 2,
                "priority": "HIGH",
            },
        ]

        course_stat = {
            "id": "stat-crs-uuid",
            "title": "Data Analysis using R",
            "external_id": "do_stat_01",
            "provider": "UpGrad",
        }
        course_gov = {
            "id": "gov-crs-uuid",
            "title": "Data Foundations for Governance",
            "external_id": "do_gov_02",
            "provider": "Wadhwani Foundation",
        }

        # Side effect: maps query -> course
        def _search_side_effect(query):
            if "Statistical Inference" in query:
                return [course_stat]
            if "Data Governance" in query:
                return [course_gov]
            return []

        mock_search_courses.side_effect = _search_side_effect
        mock_upsert_normalized.side_effect = lambda c: c

        AssessmentRepository.process_and_store_submission(
            user_id="user-multi",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict={"item-001": 1},
        )

        upserted_titles = [call[0][0]["title"] for call in mock_upsert_normalized.call_args_list]
        self.assertIn("Data Analysis using R", upserted_titles)
        self.assertIn("Data Foundations for Governance", upserted_titles)

    # ------------------------------------------------------------------
    # TEST 5: External metadata preserved from successful tier
    # ------------------------------------------------------------------
    @unittest.mock.patch("app.repositories.assessment_repo.get_supabase")
    @unittest.mock.patch("app.repositories.assessment_repo.ScoringEngine.evaluate_submission")
    @unittest.mock.patch("app.repositories.assessment_repo.AssessmentRepository.get_raw_assessment_items")
    @unittest.mock.patch("app.repositories.assessment_repo.CompetencyRepository.list_competencies")
    @unittest.mock.patch("app.repositories.assessment_repo.GapEngine.compute_all_gaps")
    @unittest.mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @unittest.mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    @unittest.mock.patch("app.repositories.course_repo.CourseRepository.get_course_for_competency")
    def test_external_metadata_preserved_from_successful_tier(
        self,
        mock_get_local,
        mock_upsert_normalized,
        mock_search_courses,
        mock_get_profile,
        mock_compute_gaps,
        mock_list_comps,
        mock_get_raw_items,
        mock_evaluate_sub,
        mock_get_supabase,
    ):
        """The external_id, external_url, and provider from the Sunbird result must be passed to upsert."""
        from app.repositories.assessment_repo import AssessmentRepository

        mock_supabase = self._setup_assessment_mocks(
            mock_get_supabase, mock_evaluate_sub, mock_get_raw_items,
            mock_list_comps, mock_compute_gaps, mock_get_profile,
        )

        verified_sunbird_course = {
            "id": "dyn-uuid-123",
            "title": "Dynamic Sunbird Module",
            "external_id": "do_live_999888",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_live_999888/overview",
            "provider": "Ministry of Statistics Training Division",
        }
        mock_search_courses.return_value = [verified_sunbird_course]
        mock_upsert_normalized.return_value = verified_sunbird_course

        AssessmentRepository.process_and_store_submission(
            user_id="user-meta",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict={"item-001": 1},
        )

        upsert_payload = mock_upsert_normalized.call_args[0][0]
        self.assertEqual(upsert_payload["external_id"], "do_live_999888")
        self.assertEqual(
            upsert_payload["external_url"],
            "https://portal.igotkarmayogi.gov.in/public/toc/do_live_999888/overview",
        )
        self.assertEqual(upsert_payload["provider"], "Ministry of Statistics Training Division")

    # ------------------------------------------------------------------
    # TEST 6: Verify no course-specific hardcoding in production logic
    # ------------------------------------------------------------------
    def test_no_course_hardcoding_in_production_logic(self):
        """Production recommendation logic must not hardcode course titles, DO_IDs, or providers."""
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app"))
        production_files = [
            os.path.join(base_dir, "services", "recommendation_ranker.py"),
            os.path.join(base_dir, "repositories", "assessment_repo.py"),
        ]

        prohibited_strings = [
            "do_1138884164974755841152",
            "do_113896143955607552142",
            "do_11452980177757798411",
            "do_114324411708661760133",
            "Database Design and Introduction to MySQL",
            "Data Analysis using R",
            "Data Foundations for Governance",
            "UpGrad",
            "Wadhwani Foundation",
        ]

        for filepath in production_files:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            for bad_str in prohibited_strings:
                self.assertNotIn(
                    bad_str, content,
                    f"Production file {os.path.basename(filepath)} contains hardcoded string: {bad_str!r}"
                )


if __name__ == "__main__":
    unittest.main()
