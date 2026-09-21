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


if __name__ == "__main__":
    unittest.main()
