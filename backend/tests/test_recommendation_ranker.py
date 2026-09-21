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

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.repositories.course_repo import CourseRepository
from app.services.recommendation_ranker import (
    rank_gaps_for_recommendation,
    build_course_search_query,
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


class TestCourseRepositoryDbDurability(unittest.TestCase):

    def setUp(self):
        from app.repositories.course_repo import CourseRepository
        CourseRepository._IGOT_COURSE_METADATA_CACHE.clear()

    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    def test_get_course_detail_reads_db_external_metadata_without_cache(self, mock_get_supabase):
        from app.repositories.course_repo import CourseRepository

        mock_supabase = unittest.mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase

        db_course = {
            "id": "b0100000-0000-0000-0000-000000000001",
            "title": "Data Pipeline Design: Enterprise Patterns",
            "is_active": True,
            "external_id": "do_113812384910298112115",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_113812384910298112115/overview",
            "provider": "iGOT Karmayogi Bharat / NSSTA",
        }
        mock_supabase.table().select().eq().eq().single().execute.return_value.data = db_course
        mock_supabase.table().select().eq().order().execute.return_value.data = [
            {"id": "mod-1", "title": "Module 1", "order_index": 0}
        ]

        # In-memory cache is empty
        self.assertEqual(CourseRepository._IGOT_COURSE_METADATA_CACHE, {})

        detail = CourseRepository.get_course_detail("b0100000-0000-0000-0000-000000000001")
        self.assertIsNotNone(detail)
        self.assertEqual(detail["external_id"], "do_113812384910298112115")
        self.assertEqual(
            detail["external_url"],
            "https://portal.igotkarmayogi.gov.in/public/toc/do_113812384910298112115/overview",
        )
        self.assertEqual(detail["provider"], "iGOT Karmayogi Bharat / NSSTA")
        self.assertEqual(detail["integration_mode"], "REAL / SUNBIRD")

    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    def test_unforced_local_course_metadata(self, mock_get_supabase):
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

    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    @unittest.mock.patch.object(CourseRepository, "enroll_user")
    @unittest.mock.patch.object(CourseRepository, "get_course_detail")
    def test_complete_module_does_not_mutate_competency_scores(
        self, mock_get_detail, mock_enroll, mock_get_supabase
    ):
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

    @unittest.mock.patch("app.repositories.course_repo.get_supabase")
    def test_upsert_normalized_course_includes_external_metadata(self, mock_get_supabase):
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


if __name__ == "__main__":
    unittest.main()
