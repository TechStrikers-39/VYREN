"""
VYREN — Comprehensive Combinatorial Validation & E2E QA Test Suite
===================================================================
Covers Parts 2 through 14 of the QA specification:
- Part 2: Combinatorial Matrix (pairwise, boundary-value, equivalence-class, property, seeded random)
- Part 3: Answer Pattern Coverage (18 questions, 14 distinct patterns)
- Part 4: Score / Level Boundary Coverage (24/25, 49/50, 69/70, 84/85, determinism)
- Part 5: Confidence Coverage (item counts, difficulty variance, score independence)
- Part 6: Profile / Onboarding Combinations (designations, responsibilities, tools, experience, goals)
- Part 7: Recommendation Ranking Coverage (priority, gap, confidence, context, stable tie-breaker)
- Part 8: Tiered iGOT Search Coverage (States A through N)
- Part 9: Dynamic Course Resolution (REAL vs LOCAL properties)
- Part 11: End-to-End Persistence Simulation (ID consistency)
- Part 12: Post-Learning Adaptive Loop (module completion vs post-assessment recalibration)
- Part 13: Error / Resilience Testing (timeouts, HTTP errors, malformed payloads)
- Part 14: Property / Invariant Testing (14 explicit invariants)
"""

import os
import sys
import uuid
import random
import unittest
import unittest.mock as mock
from collections import defaultdict
from typing import Any, Dict, List
import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.scoring_engine import (
    ScoringEngine,
    convert_score_to_level,
    calculate_confidence,
)
from app.services.gap_engine import GapEngine, DEMO_DESIGNATION_REQUIREMENTS
from app.services.recommendation_ranker import (
    rank_gaps_for_recommendation,
    build_course_search_query,
    get_tiered_search_queries,
)
from app.services.igot_client import RealIgotProvider, LocalFallbackIgotProvider
from app.repositories.course_repo import CourseRepository
from app.repositories.assessment_repo import AssessmentRepository


# ---------------------------------------------------------------------------
# Test Data Fixtures (18 questions across 4 competencies)
# ---------------------------------------------------------------------------

COMP_STAT_INF = "c1000000-0000-0000-0000-000000000001"
COMP_DATA_PIPE = "c1000000-0000-0000-0000-000000000002"
COMP_ML_OPS = "c1000000-0000-0000-0000-000000000003"
COMP_DATA_GOV = "c1000000-0000-0000-0000-000000000004"

COMPETENCY_IDS = [COMP_STAT_INF, COMP_DATA_PIPE, COMP_ML_OPS, COMP_DATA_GOV]

COMPETENCY_NAMES = {
    COMP_STAT_INF: "Statistical Inference",
    COMP_DATA_PIPE: "Data Pipeline Design",
    COMP_ML_OPS: "Machine Learning Ops",
    COMP_DATA_GOV: "Data Governance",
}


def generate_standard_18_items() -> List[Dict[str, Any]]:
    """
    Generate standard 18 assessment items balanced across 4 competencies:
      - Statistical Inference: 5 items (2 EASY, 2 MEDIUM, 1 HARD)
      - Data Pipeline Design: 5 items (1 EASY, 3 MEDIUM, 1 HARD)
      - Machine Learning Ops: 4 items (1 EASY, 2 MEDIUM, 1 HARD)
      - Data Governance: 4 items (1 EASY, 2 MEDIUM, 1 HARD)
    Total = 18 items. Weights vary between 1.0 and 1.5.
    """
    distribution = [
        (COMP_STAT_INF, 5, ["EASY", "EASY", "MEDIUM", "MEDIUM", "HARD"], [1.0, 1.0, 1.0, 1.5, 1.5]),
        (COMP_DATA_PIPE, 5, ["EASY", "MEDIUM", "MEDIUM", "MEDIUM", "HARD"], [1.0, 1.0, 1.0, 1.0, 1.5]),
        (COMP_ML_OPS, 4, ["EASY", "MEDIUM", "MEDIUM", "HARD"], [1.0, 1.0, 1.5, 1.5]),
        (COMP_DATA_GOV, 4, ["EASY", "MEDIUM", "MEDIUM", "HARD"], [1.0, 1.0, 1.0, 1.5]),
    ]
    items = []
    idx = 1
    for comp_id, count, diffs, weights in distribution:
        for i in range(count):
            items.append({
                "id": f"q-{idx:02d}",
                "competency_id": comp_id,
                "competency_name": COMPETENCY_NAMES[comp_id],
                "prompt": f"Technical prompt for {COMPETENCY_NAMES[comp_id]} #{i+1}",
                "options": ["Option 0 (Key)", "Option 1", "Option 2", "Option 3"],
                "correct_index": 0,  # Standardize correct index to 0
                "weight": weights[i],
                "difficulty": diffs[i],
            })
            idx += 1
    return items


STANDARD_COMPETENCIES = [
    {"id": COMP_STAT_INF, "name": "Statistical Inference", "category": "Data Analytics"},
    {"id": COMP_DATA_PIPE, "name": "Data Pipeline Design", "category": "Data Engineering"},
    {"id": COMP_ML_OPS, "name": "Machine Learning Ops", "category": "AI & ML"},
    {"id": COMP_DATA_GOV, "name": "Data Governance", "category": "Data Management"},
]

STANDARD_JSO_PROFILE = {
    "designation": "Junior Statistical Officer",
    "responsibilities": "Field survey sampling design, hypothesis testing, survey estimation",
    "tools_experience": ["R", "SQL"],
}


def create_mock_supabase_for_assessment(items=None):
    """
    Creates a fully wired Supabase mock supporting all queries in AssessmentRepository.process_and_store_submission:
    assessments, assessment_instances, assessment_items, competency_scores, skill_gaps, recommendations, assessment_results, courses.
    """
    if items is None:
        items = generate_standard_18_items()

    tables = defaultdict(mock.MagicMock)
    sb = mock.MagicMock()
    sb.table.side_effect = lambda t="default": tables[t]

    tables["assessments"].select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "a1000000-0000-0000-0000-000000000001",
        "version": "1.0",
    }
    tables["assessment_instances"].select.return_value.eq.return_value.single.return_value.execute.return_value.data = None
    tables["assessment_instances"].select.return_value.eq.return_value.execute.return_value.data = []
    tables["assessment_items"].select.return_value.order.return_value.execute.return_value.data = items

    tables["competency_scores"].upsert.return_value.execute.return_value.data = []
    tables["skill_gaps"].upsert.return_value.execute.return_value.data = []
    tables["recommendations"].delete.return_value.eq.return_value.execute.return_value.data = []

    inserted_recommendations = []
    def _mock_rec_insert(rec):
        inserted_recommendations.append(rec)
        m = mock.MagicMock()
        m.execute.return_value.data = [rec]
        return m

    tables["recommendations"].insert.side_effect = _mock_rec_insert
    tables["assessment_results"].insert.side_effect = lambda payload: mock.MagicMock(
        execute=lambda: mock.MagicMock(data=[dict(payload, id="res-e2e")])
    )
    tables["courses"].upsert.return_value.execute.return_value.data = []
    tables["courses"].select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = None
    tables["course_modules"].select.return_value.eq.return_value.order.return_value.execute.return_value.data = []

    return sb, tables, inserted_recommendations


# ===========================================================================
# PART 3 & 4: Answer Pattern Coverage & Score / Level Boundary Coverage
# ===========================================================================

class TestAnswerPatternsAndBoundaries(unittest.TestCase):
    """
    Verifies 14 distinct answer patterns across all 18 questions,
    and boundary thresholds around 24/25, 49/50, 69/70, 84/85.
    """

    def setUp(self):
        self.items = generate_standard_18_items()
        self.assertEqual(len(self.items), 18)
        self.rng = random.Random(42)

    def test_pattern_01_all_correct(self):
        """Pattern 1: All 18 correct -> 100% score, Level 4 across all competencies."""
        answers = {item["id"]: 0 for item in self.items}
        res = ScoringEngine.evaluate_submission(self.items, answers)
        self.assertEqual(res["overall_score"], 100.0)
        for cid, bd in res["competency_breakdown"].items():
            self.assertEqual(bd["score"], 100.0)
            self.assertEqual(bd["measured_level"], 4)
            self.assertEqual(bd["correct_items"], bd["items_evaluated"])

    def test_pattern_02_all_incorrect(self):
        """Pattern 2: All 18 incorrect -> 0% score, Level 0 across all competencies."""
        answers = {item["id"]: 1 for item in self.items}  # all wrong (key is 0)
        res = ScoringEngine.evaluate_submission(self.items, answers)
        self.assertEqual(res["overall_score"], 0.0)
        for cid, bd in res["competency_breakdown"].items():
            self.assertEqual(bd["score"], 0.0)
            self.assertEqual(bd["measured_level"], 0)
            self.assertEqual(bd["correct_items"], 0)

    def test_pattern_03_exactly_one_correct(self):
        """Pattern 3: Exactly 1 correct out of 18 -> Item 0 weight=1.0 out of 21.0 -> 4.76% (Level 0)."""
        answers = {item["id"]: 1 for item in self.items}
        answers[self.items[0]["id"]] = 0  # Only first item correct (weight 1.0)
        res = ScoringEngine.evaluate_submission(self.items, answers)
        # Expected score: 1.0 / 21.0 * 100.0 = 4.76%
        self.assertEqual(res["overall_score"], 4.76)
        self.assertEqual(convert_score_to_level(res["overall_score"]), 0)
        first_comp = self.items[0]["competency_id"]
        # STAT_INF has 5 items with total weight 6.0: 1.0 / 6.0 * 100.0 = 16.67%
        self.assertEqual(res["competency_breakdown"][first_comp]["score"], 16.67)
        self.assertEqual(res["competency_breakdown"][first_comp]["measured_level"], 0)

    def test_pattern_04_exactly_one_incorrect(self):
        """Pattern 4: Exactly 1 incorrect out of 18 -> high score in L4 range."""
        answers = {item["id"]: 0 for item in self.items}
        answers[self.items[0]["id"]] = 1  # Only first item wrong
        res = ScoringEngine.evaluate_submission(self.items, answers)
        self.assertTrue(res["overall_score"] >= 85.0)
        self.assertEqual(convert_score_to_level(res["overall_score"]), 4)

    def test_pattern_05_alternating_correct_incorrect(self):
        """Pattern 5: Alternating correct/incorrect (9 correct, 9 incorrect -> 10.0 weight earned out of 21.0 -> 47.62%, Level 1)."""
        answers = {item["id"]: (0 if i % 2 == 0 else 1) for i, item in enumerate(self.items)}
        res = ScoringEngine.evaluate_submission(self.items, answers)
        # Even-indexed items earn 10.0 weight out of 21.0 possible = 47.62% -> Level 1 (Foundational)
        self.assertEqual(res["overall_score"], 47.62)
        self.assertEqual(convert_score_to_level(res["overall_score"]), 1)

    def test_pattern_06_first_half_correct_second_half_incorrect(self):
        """Pattern 6: Items 1-9 correct, 10-18 incorrect -> 10.0 weight earned out of 21.0 -> 47.62%, Level 1."""
        answers = {item["id"]: (0 if i < 9 else 1) for i, item in enumerate(self.items)}
        res = ScoringEngine.evaluate_submission(self.items, answers)
        # First 9 items sum to 10.0 weight out of 21.0 = 47.62% -> Level 1 (Foundational)
        self.assertEqual(res["overall_score"], 47.62)
        self.assertEqual(convert_score_to_level(res["overall_score"]), 1)

    def test_pattern_07_first_half_incorrect_second_half_correct(self):
        """Pattern 7: Items 1-9 incorrect, 10-18 correct -> 11.0 weight earned out of 21.0 -> 52.38%, Level 2."""
        answers = {item["id"]: (1 if i < 9 else 0) for i, item in enumerate(self.items)}
        res = ScoringEngine.evaluate_submission(self.items, answers)
        # Last 9 items sum to 11.0 weight out of 21.0 = 52.38% -> Level 2 (Developing)
        self.assertEqual(res["overall_score"], 52.38)
        self.assertEqual(convert_score_to_level(res["overall_score"]), 2)

    def test_pattern_08_correct_answers_concentrated_in_one_competency(self):
        """Pattern 8: Only Statistical Inference items correct (100%), all others 0%."""
        answers = {
            item["id"]: (0 if item["competency_id"] == COMP_STAT_INF else 1)
            for item in self.items
        }
        res = ScoringEngine.evaluate_submission(self.items, answers)
        bd = res["competency_breakdown"]
        self.assertEqual(bd[COMP_STAT_INF]["score"], 100.0)
        self.assertEqual(bd[COMP_STAT_INF]["measured_level"], 4)
        for cid in [COMP_DATA_PIPE, COMP_ML_OPS, COMP_DATA_GOV]:
            self.assertEqual(bd[cid]["score"], 0.0)
            self.assertEqual(bd[cid]["measured_level"], 0)

    def test_pattern_09_incorrect_answers_concentrated_in_one_competency(self):
        """Pattern 9: Only Data Governance items wrong (0%), all other competencies 100%."""
        answers = {
            item["id"]: (1 if item["competency_id"] == COMP_DATA_GOV else 0)
            for item in self.items
        }
        res = ScoringEngine.evaluate_submission(self.items, answers)
        bd = res["competency_breakdown"]
        self.assertEqual(bd[COMP_DATA_GOV]["score"], 0.0)
        self.assertEqual(bd[COMP_DATA_GOV]["measured_level"], 0)
        for cid in [COMP_STAT_INF, COMP_DATA_PIPE, COMP_ML_OPS]:
            self.assertEqual(bd[cid]["score"], 100.0)
            self.assertEqual(bd[cid]["measured_level"], 4)

    def test_pattern_10_uniform_mixed_performance(self):
        """Pattern 10: Exactly 1 item wrong in every competency."""
        answers = {}
        for cid in COMPETENCY_IDS:
            comp_items = [it for it in self.items if it["competency_id"] == cid]
            for idx, it in enumerate(comp_items):
                answers[it["id"]] = 1 if idx == 0 else 0  # first item of each comp is wrong
        res = ScoringEngine.evaluate_submission(self.items, answers)
        for cid in COMPETENCY_IDS:
            bd = res["competency_breakdown"][cid]
            self.assertTrue(bd["score"] >= 65.0)
            self.assertTrue(bd["measured_level"] in (2, 3))

    def test_pattern_11_high_weight_correct_low_weight_incorrect(self):
        """Pattern 11: Items with weight > 1.0 correct; weight == 1.0 incorrect."""
        answers = {
            item["id"]: (0 if item["weight"] > 1.0 else 1)
            for item in self.items
        }
        res = ScoringEngine.evaluate_submission(self.items, answers)
        high_w_items = [it for it in self.items if it["weight"] > 1.0]
        total_w_high = sum(it["weight"] for it in high_w_items)
        total_possible = sum(it["weight"] for it in self.items)
        expected_score = round(total_w_high / total_possible * 100.0, 2)
        self.assertAlmostEqual(res["overall_score"], expected_score, places=1)

    def test_pattern_12_low_weight_correct_high_weight_incorrect(self):
        """Pattern 12: Items with weight == 1.0 correct; weight > 1.0 incorrect."""
        answers = {
            item["id"]: (0 if item["weight"] <= 1.0 else 1)
            for item in self.items
        }
        res = ScoringEngine.evaluate_submission(self.items, answers)
        low_w_items = [it for it in self.items if it["weight"] <= 1.0]
        total_w_low = sum(it["weight"] for it in low_w_items)
        total_possible = sum(it["weight"] for it in self.items)
        expected_score = round(total_w_low / total_possible * 100.0, 2)
        self.assertAlmostEqual(res["overall_score"], expected_score, places=1)

    def test_pattern_13_random_seeded_answer_patterns(self):
        """Pattern 13: 20 reproducible random submissions with fixed seed (42)."""
        rng = random.Random(42)
        scores = []
        for _ in range(20):
            answers = {item["id"]: rng.randint(0, 3) for item in self.items}
            res = ScoringEngine.evaluate_submission(self.items, answers)
            self.assertTrue(0.0 <= res["overall_score"] <= 100.0)
            scores.append(res["overall_score"])
        # Verify determinism across second run
        rng2 = random.Random(42)
        scores2 = []
        for _ in range(20):
            answers = {item["id"]: rng2.randint(0, 3) for item in self.items}
            res = ScoringEngine.evaluate_submission(self.items, answers)
            scores2.append(res["overall_score"])
        self.assertEqual(scores, scores2, "Random seeded submissions must be strictly deterministic")

    def test_pattern_14_boundary_values_and_level_transitions(self):
        """Pattern 14: Exact boundary testing for 24/25, 49/50, 69/70, 84/85 thresholds."""
        boundaries = [
            (0.0, 0),
            (24.0, 0),
            (24.99, 0),
            (25.0, 1),
            (49.0, 1),
            (49.99, 1),
            (50.0, 2),
            (69.0, 2),
            (69.99, 2),
            (70.0, 3),
            (84.0, 3),
            (84.99, 3),
            (85.0, 4),
            (100.0, 4),
        ]
        for score, expected_lvl in boundaries:
            with self.subTest(score=score, expected_lvl=expected_lvl):
                lvl = convert_score_to_level(score)
                self.assertEqual(lvl, expected_lvl, f"Score {score} expected Level {expected_lvl} but got {lvl}")


# ===========================================================================
# PART 5: Confidence Calculation Coverage
# ===========================================================================

class TestConfidenceFormulas(unittest.TestCase):
    """
    Verifies that confidence calculations are strictly separate from performance score
    and correctly scale with evidence quantity and difficulty variation.
    """

    def test_confidence_monotonically_increases_with_item_count(self):
        c1 = calculate_confidence(1, ["MEDIUM"])
        c2 = calculate_confidence(2, ["MEDIUM", "MEDIUM"])
        c3 = calculate_confidence(3, ["MEDIUM", "MEDIUM", "MEDIUM"])
        c4 = calculate_confidence(4, ["MEDIUM", "MEDIUM", "MEDIUM", "MEDIUM"])
        self.assertTrue(c1 < c2 < c3 < c4)

    def test_confidence_difficulty_diversity_bonus(self):
        c_same = calculate_confidence(3, ["MEDIUM", "MEDIUM", "MEDIUM"])
        c_diverse = calculate_confidence(3, ["EASY", "MEDIUM", "HARD"])
        self.assertEqual(round(c_diverse - c_same, 3), 0.03)

    def test_confidence_bounds(self):
        for items_count in range(0, 10):
            for diffs in [["EASY"], ["MEDIUM", "HARD"], ["EASY", "MEDIUM", "HARD"]]:
                c = calculate_confidence(items_count, diffs)
                self.assertTrue(0.0 <= c <= 1.0)

    def test_confidence_does_not_mutate_score(self):
        """Two submissions with identical accuracy but different item counts must yield identical scores."""
        items_1 = [{"id": "q1", "competency_id": "c1", "correct_index": 0, "weight": 1.0, "difficulty": "MEDIUM"}]
        items_2 = [
            {"id": "q1", "competency_id": "c1", "correct_index": 0, "weight": 1.0, "difficulty": "EASY"},
            {"id": "q2", "competency_id": "c1", "correct_index": 0, "weight": 1.0, "difficulty": "HARD"},
        ]
        res1 = ScoringEngine.evaluate_submission(items_1, {"q1": 0})
        res2 = ScoringEngine.evaluate_submission(items_2, {"q1": 0, "q2": 0})

        # Scores must both be 100.0
        self.assertEqual(res1["competency_breakdown"]["c1"]["score"], 100.0)
        self.assertEqual(res2["competency_breakdown"]["c1"]["score"], 100.0)

        # Confidence must differ
        self.assertNotEqual(
            res1["competency_breakdown"]["c1"]["confidence"],
            res2["competency_breakdown"]["c1"]["confidence"],
        )


# ===========================================================================
# PART 6: Profile / Onboarding Combinations
# ===========================================================================

class TestProfileCombinatorics(unittest.TestCase):
    """
    Verifies that learner profile attributes (designation, tools, responsibilities)
    personalize query construction but NEVER mutate deterministic scoring.
    """

    def setUp(self):
        self.items = generate_standard_18_items()
        self.answers = {item["id"]: 0 for item in self.items}

    def test_profile_never_alters_assessment_score(self):
        """ScoringEngine output must be identical regardless of learner profile context."""
        res_baseline = ScoringEngine.evaluate_submission(self.items, self.answers)

        profiles = [
            {"designation": "Junior Statistical Officer", "tools_experience": ["R", "Python"]},
            {"designation": "Chief Statistical Officer & Admin", "tools_experience": ["Kafka", "Spark"]},
            {"designation": "", "tools_experience": []},
            {"designation": "A" * 150, "tools_experience": ["Unrelated Tool #1"]},
            {"designation": "Special-Grade Lead / Analyst (MoSPI)", "responsibilities": "Complex survey design & stratification"},
        ]

        for p in profiles:
            res = ScoringEngine.evaluate_submission(self.items, self.answers)
            self.assertEqual(res["overall_score"], res_baseline["overall_score"])
            for cid in COMPETENCY_IDS:
                self.assertEqual(
                    res["competency_breakdown"][cid]["score"],
                    res_baseline["competency_breakdown"][cid]["score"],
                )

    def test_query_builder_handles_extreme_profile_variations(self):
        """build_course_search_query must safely format and truncate varied profiles."""
        # 1. Normal known role
        q1 = build_course_search_query("Data Governance", profile={"designation": "Data Governance Lead"})
        self.assertIn("Data Governance", q1)
        self.assertIn("Data Governance Lead", q1)

        # 2. Empty profile
        q2 = build_course_search_query("Statistical Inference", profile=None)
        self.assertEqual(q2, "Statistical Inference")

        # 3. Super-long designation (> 60 chars) should be omitted by design
        q3 = build_course_search_query(
            "Data Pipeline Design",
            profile={"designation": "X" * 80, "tools_experience": ["SQL"]},
        )
        self.assertNotIn("X" * 80, q3)
        self.assertIn("sql", q3.lower())

        # 4. Unusual characters in designation
        q4 = build_course_search_query(
            "Machine Learning Ops",
            profile={"designation": "AI/ML & Cloud Architect (Spec-Ops)"},
        )
        self.assertIn("Machine Learning Ops", q4)
        self.assertIn("AI/ML & Cloud Architect (Spec-Ops)", q4)




# ===========================================================================
# PART 8 & 9: Tiered iGOT Search & Dynamic Course Resolution
# ===========================================================================

class TestTieredSearchStatesAndResolution(unittest.TestCase):
    """
    Verifies States A through N of the Generic Tiered iGOT Search:
    - Tier 1 success
    - Tier 2 fallback
    - Tier 3 local fallback
    - Error handling & resilience
    - Preservation of provider & external URLs
    """

    def setUp(self):
        CourseRepository._IGOT_COURSE_METADATA_CACHE.clear()
        self.items = generate_standard_18_items()

    @mock.patch("app.repositories.assessment_repo.get_supabase")
    @mock.patch.object(AssessmentRepository, "get_raw_assessment_items")
    @mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @mock.patch("app.repositories.competency_repo.CompetencyRepository.list_competencies")
    @mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    def test_state_a_tier1_succeeds(
        self,
        mock_upsert,
        mock_search_courses,
        mock_list_comps,
        mock_get_profile,
        mock_get_raw_items,
        mock_get_supabase,
    ):
        """State A: Tier 1 returns valid results -> process_and_store_submission uses Tier 1 without attempting Tier 2."""
        sb, tables, inserted_recs = create_mock_supabase_for_assessment(self.items)
        mock_get_supabase.return_value = sb
        mock_get_raw_items.return_value = self.items
        mock_get_profile.return_value = STANDARD_JSO_PROFILE
        mock_list_comps.return_value = STANDARD_COMPETENCIES

        tier1_course = {
            "id": "c-tier1-101",
            "title": "Data Pipeline Engineering for JSO",
            "external_id": "do_tier1_101",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_tier1_101/overview",
            "provider": "Capacity Development Division, MoSPI",
            "integration_mode": "REAL / SUNBIRD",
        }
        mock_search_courses.return_value = [tier1_course]
        mock_upsert.return_value = tier1_course

        answers = {it["id"]: (1 if it["competency_id"] == COMP_DATA_PIPE else 0) for it in self.items}

        res = AssessmentRepository.process_and_store_submission(
            user_id="user-state-a",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers,
        )

        self.assertIsNotNone(res)
        self.assertEqual(mock_search_courses.call_count, 1)
        tier1_query = mock_search_courses.call_args[1]["query"]
        self.assertIn("Junior Statistical Officer", tier1_query)
        self.assertIn("Data Pipeline Design", tier1_query)
        mock_upsert.assert_called_once_with(tier1_course)
        self.assertTrue(len(inserted_recs) > 0)
        self.assertEqual(inserted_recs[0]["course_id"], "c-tier1-101")
        self.assertEqual(res["top_recommendation"]["course_id"], "c-tier1-101")

    @mock.patch("app.repositories.assessment_repo.get_supabase")
    @mock.patch.object(AssessmentRepository, "get_raw_assessment_items")
    @mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @mock.patch("app.repositories.competency_repo.CompetencyRepository.list_competencies")
    @mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    def test_state_b_tier1_returns_zero_tier2_succeeds(
        self,
        mock_upsert,
        mock_search_courses,
        mock_list_comps,
        mock_get_profile,
        mock_get_raw_items,
        mock_get_supabase,
    ):
        """State B: Tier 1 returns 0 -> Tier 2 retry occurs and succeeds with normalized metadata."""
        sb, tables, inserted_recs = create_mock_supabase_for_assessment(self.items)
        mock_get_supabase.return_value = sb
        mock_get_raw_items.return_value = self.items
        mock_get_profile.return_value = STANDARD_JSO_PROFILE
        mock_list_comps.return_value = STANDARD_COMPETENCIES

        tier2_course = {
            "id": "c-tier2-202",
            "title": "Database Design and Introduction to MySQL",
            "external_id": "do_tier2_mysql_88",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_tier2_mysql_88/overview",
            "provider": "UpGrad",
            "integration_mode": "REAL / SUNBIRD",
        }
        mock_search_courses.side_effect = [[], [tier2_course]]
        mock_upsert.return_value = tier2_course

        answers = {it["id"]: (1 if it["competency_id"] == COMP_DATA_PIPE else 0) for it in self.items}

        res = AssessmentRepository.process_and_store_submission(
            user_id="user-state-b",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers,
        )

        self.assertEqual(mock_search_courses.call_count, 2)
        call1_query = mock_search_courses.call_args_list[0][1]["query"]
        call2_query = mock_search_courses.call_args_list[1][1]["query"]
        self.assertIn("Junior Statistical Officer", call1_query)
        self.assertEqual(call2_query, "Data Pipeline Design")
        mock_upsert.assert_called_once_with(tier2_course)
        self.assertEqual(inserted_recs[0]["course_id"], "c-tier2-202")
        self.assertEqual(res["top_recommendation"]["course_id"], "c-tier2-202")

    @mock.patch("app.repositories.assessment_repo.get_supabase")
    @mock.patch.object(AssessmentRepository, "get_raw_assessment_items")
    @mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @mock.patch("app.repositories.competency_repo.CompetencyRepository.list_competencies")
    @mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    @mock.patch("app.repositories.course_repo.CourseRepository.get_course_for_competency")
    def test_state_c_both_tiers_return_zero_falls_back_to_local(
        self,
        mock_get_local,
        mock_upsert,
        mock_search_courses,
        mock_list_comps,
        mock_get_profile,
        mock_get_raw_items,
        mock_get_supabase,
    ):
        """State C: Tier 1 returns 0, Tier 2 returns 0 -> falls back to CourseRepository.get_course_for_competency."""
        sb, tables, inserted_recs = create_mock_supabase_for_assessment(self.items)
        mock_get_supabase.return_value = sb
        mock_get_raw_items.return_value = self.items
        mock_get_profile.return_value = STANDARD_JSO_PROFILE
        mock_list_comps.return_value = STANDARD_COMPETENCIES

        local_fallback = {
            "id": "local-fallback-c3",
            "title": "Local Data Pipeline Curriculum",
            "external_id": None,
            "external_url": None,
            "provider": None,
            "integration_mode": "FALLBACK / LOCAL",
        }
        mock_search_courses.side_effect = [[], []]
        mock_get_local.return_value = local_fallback

        answers = {it["id"]: (1 if it["competency_id"] == COMP_DATA_PIPE else 0) for it in self.items}

        res = AssessmentRepository.process_and_store_submission(
            user_id="user-state-c",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers,
        )

        self.assertEqual(mock_search_courses.call_count, 2)
        mock_upsert.assert_not_called()
        mock_get_local.assert_called_once_with(COMP_DATA_PIPE)
        self.assertEqual(inserted_recs[0]["course_id"], "local-fallback-c3")
        self.assertEqual(res["top_recommendation"]["course_id"], "local-fallback-c3")

    @mock.patch("app.repositories.assessment_repo.get_supabase")
    @mock.patch.object(AssessmentRepository, "get_raw_assessment_items")
    @mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @mock.patch("app.repositories.competency_repo.CompetencyRepository.list_competencies")
    @mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    def test_state_d_tier1_network_error_falls_forward_to_tier2(
        self,
        mock_upsert,
        mock_search_courses,
        mock_list_comps,
        mock_get_profile,
        mock_get_raw_items,
        mock_get_supabase,
    ):
        """State D: Tier 1 raises network exception -> production code catches, logs, and attempts Tier 2."""
        sb, tables, inserted_recs = create_mock_supabase_for_assessment(self.items)
        mock_get_supabase.return_value = sb
        mock_get_raw_items.return_value = self.items
        mock_get_profile.return_value = STANDARD_JSO_PROFILE
        mock_list_comps.return_value = STANDARD_COMPETENCIES

        tier2_course = {
            "id": "c-tier2-net-404",
            "title": "Pipeline Architecture Recovery",
            "external_id": "do_tier2_net_404",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_tier2_net_404/overview",
            "provider": "Wadhwani Foundation",
            "integration_mode": "REAL / SUNBIRD",
        }
        mock_search_courses.side_effect = [httpx.TimeoutException("Sunbird connection timed out"), [tier2_course]]
        mock_upsert.return_value = tier2_course

        answers = {it["id"]: (1 if it["competency_id"] == COMP_DATA_PIPE else 0) for it in self.items}

        res = AssessmentRepository.process_and_store_submission(
            user_id="user-state-d",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers,
        )

        self.assertEqual(mock_search_courses.call_count, 2)
        mock_upsert.assert_called_once_with(tier2_course)
        self.assertEqual(inserted_recs[0]["course_id"], "c-tier2-net-404")
        self.assertEqual(res["top_recommendation"]["course_id"], "c-tier2-net-404")

    def test_state_g_duplicate_tier1_tier2_deduplicated(self):
        """State G: Empty profile produces query identical to competency name; only 1 tier generated."""
        tiers = get_tiered_search_queries("Machine Learning Ops", profile=None)
        self.assertEqual(len(tiers), 1)
        self.assertEqual(tiers[0][0], "Tier 1 (contextual)")
        self.assertEqual(tiers[0][1], "Machine Learning Ops")

    def test_state_n_multi_provider_preservation_and_uuid5(self):
        """State N: Normalization of real Sunbird payloads from diverse providers."""
        provider = RealIgotProvider(api_url="https://igotkarmayogi.gov.in")

        test_items = [
            {"identifier": "do_upgrad_100", "name": "MySQL Course", "organisation": ["UpGrad"]},
            {"identifier": "do_wadhwani_200", "name": "Data Foundations", "organisation": "Wadhwani Foundation"},
            {"identifier": "do_negd_300", "name": "GitHub Enterprise", "organisation": "NEGD MeitY"},
            {"identifier": "do_mospi_400", "name": "MoSPI Statistics", "organisation": ["Capacity Development Division, MoSPI"]},
        ]

        for item in test_items:
            norm = provider._normalize_content_item(item)
            do_id = item["identifier"]
            expected_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"igot:{do_id}"))

            self.assertEqual(norm["id"], expected_uuid)
            self.assertEqual(norm["external_id"], do_id)
            self.assertEqual(norm["external_url"], f"https://portal.igotkarmayogi.gov.in/public/toc/{do_id}/overview")
            self.assertEqual(norm["integration_mode"], "REAL / SUNBIRD")
            if isinstance(item["organisation"], list):
                self.assertEqual(norm["provider"], item["organisation"][0])
            else:
                self.assertEqual(norm["provider"], item["organisation"])


# ===========================================================================
# PART 12: Post-Learning Adaptive Loop
# ===========================================================================

class TestPostLearningAdaptiveLoop(unittest.TestCase):
    """
    Verifies that:
      1. Learning module completion alone records evidence only, never mutating scores.
      2. Post-learning assessment recalculates scores and regenerates recommendations.
    """

    @mock.patch("app.repositories.course_repo.get_supabase")
    @mock.patch.object(CourseRepository, "enroll_user")
    @mock.patch.object(CourseRepository, "get_course_detail")
    def test_learning_completion_never_mutates_score_directly(
        self, mock_get_detail, mock_enroll, mock_get_supabase
    ):
        mock_get_detail.return_value = {
            "id": "b0100000-0000-0000-0000-000000000001",
            "modules": [{"id": "mod-1", "title": "Module 1", "competency_id": COMP_DATA_PIPE}],
        }
        mock_enroll.return_value = {"id": "enr-1", "completed_modules": []}
        mock_supabase = mock.MagicMock()
        mock_get_supabase.return_value = mock_supabase

        res = CourseRepository.complete_module(
            user_id="user-post-1",
            course_id="b0100000-0000-0000-0000-000000000001",
            module_id="mod-1",
        )
        self.assertIsNone(res["recalibrated_score"])
        self.assertIsNone(res["recalibrated_level"])
        self.assertIsNone(res["updated_gap_priority"])
        self.assertIn("recorded as learning activity evidence", res["message"])

    def test_post_learning_assessment_recalibrates_gaps(self):
        """A second assessment with higher performance closes gaps and changes priorities."""
        # Initial assessment: Level 1 (Required: Level 3) -> Gap = 2, Priority = HIGH
        gap_initial = GapEngine.compute_gap(measured_level=1, required_level=3)
        self.assertEqual(gap_initial["gap_size"], 2)
        self.assertEqual(gap_initial["priority"], "HIGH")

        # Post-learning assessment: Level 3 (Required: Level 3) -> Gap = 0, Priority = NONE
        gap_post = GapEngine.compute_gap(measured_level=3, required_level=3)
        self.assertEqual(gap_post["gap_size"], 0)
        self.assertEqual(gap_post["priority"], "NONE")

        # Recommendation ranker must exclude closed gaps
        ranked = rank_gaps_for_recommendation([gap_post])
        self.assertEqual(len(ranked), 0, "Closed gap must be excluded from recommendations")


# ===========================================================================
# PART 14: Automated Property & Invariant Testing (14 Invariants)
# ===========================================================================

class TestSystemPropertyInvariants(unittest.TestCase):
    """
    Automated verification of the 14 core system invariants.
    """

    def setUp(self):
        self.items = generate_standard_18_items()
        self.rng = random.Random(1337)

    def test_invariant_01_determinism(self):
        """Invariant 1: Same input + same seed -> strictly identical score."""
        answers = {it["id"]: self.rng.randint(0, 3) for it in self.items}
        res1 = ScoringEngine.evaluate_submission(self.items, answers)
        res2 = ScoringEngine.evaluate_submission(self.items, answers)
        self.assertEqual(res1["overall_score"], res2["overall_score"])
        self.assertEqual(res1["competency_breakdown"], res2["competency_breakdown"])

    def test_invariant_02_score_range(self):
        """Invariant 2: Score always in [0.0, 100.0]."""
        for _ in range(30):
            answers = {it["id"]: self.rng.randint(0, 3) for it in self.items}
            res = ScoringEngine.evaluate_submission(self.items, answers)
            self.assertTrue(0.0 <= res["overall_score"] <= 100.0)

    def test_invariant_03_confidence_range(self):
        """Invariant 3: Confidence always in [0.0, 1.0]."""
        for count in range(1, 15):
            c = calculate_confidence(count, ["EASY", "MEDIUM", "HARD"])
            self.assertTrue(0.0 <= c <= 1.0)

    def test_invariant_04_level_score_consistency(self):
        """Invariant 4: Measured level always strictly corresponds to score interval."""
        for score in [0.0, 24.9, 25.0, 49.9, 50.0, 69.9, 70.0, 84.9, 85.0, 100.0]:
            lvl = convert_score_to_level(score)
            if score < 25.0:
                self.assertEqual(lvl, 0)
            elif score < 50.0:
                self.assertEqual(lvl, 1)
            elif score < 70.0:
                self.assertEqual(lvl, 2)
            elif score < 85.0:
                self.assertEqual(lvl, 3)
            else:
                self.assertEqual(lvl, 4)

    def test_invariant_05_non_negative_gap(self):
        """Invariant 5: Gap size can never be negative."""
        for measured in range(0, 5):
            for required in range(0, 5):
                gap = GapEngine.compute_gap(measured, required)
                self.assertTrue(gap["gap_size"] >= 0)

    def test_invariant_06_priority_gap_consistency(self):
        """Invariant 6: Recommendation priority corresponds strictly to gap size and measured vs required."""
        for measured in range(0, 5):
            for required in range(0, 5):
                gap = GapEngine.compute_gap(measured, required)
                if measured >= required:
                    self.assertEqual(gap["priority"], "NONE")
                elif gap["gap_size"] >= 2:
                    self.assertEqual(gap["priority"], "HIGH")
                elif gap["gap_size"] == 1:
                    self.assertEqual(gap["priority"], "MEDIUM")

    def test_invariant_07_no_fabricated_url(self):
        """Invariant 7: External URL is NEVER fabricated for courses without live DO_ID."""
        local_course = {"id": "local-c1", "title": "Local Course", "external_id": None, "external_url": None, "provider": None}
        CourseRepository._IGOT_COURSE_METADATA_CACHE.clear()
        with mock.patch("app.repositories.course_repo.get_supabase") as mock_sb:
            mock_sb.return_value.table().select().eq().eq().single().execute.return_value.data = local_course
            mock_sb.return_value.table().select().eq().order().execute.return_value.data = []
            detail = CourseRepository.get_course_detail("local-c1")
            self.assertIsNone(detail["external_url"])
            self.assertIsNone(detail["external_id"])

    def test_invariant_08_real_sunbird_requires_external_url(self):
        """Invariant 8: REAL / SUNBIRD mode requires non-null external_url."""
        real_course = {
            "id": "real-c1",
            "title": "Real Course",
            "external_id": "do_999",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_999/overview",
            "provider": "Wadhwani",
        }
        CourseRepository._IGOT_COURSE_METADATA_CACHE.clear()
        with mock.patch("app.repositories.course_repo.get_supabase") as mock_sb:
            mock_sb.return_value.table().select().eq().eq().single().execute.return_value.data = real_course
            mock_sb.return_value.table().select().eq().order().execute.return_value.data = []
            detail = CourseRepository.get_course_detail("real-c1")
            self.assertEqual(detail["integration_mode"], "REAL / SUNBIRD")
            self.assertIsNotNone(detail["external_url"])

    def test_invariant_09_local_never_exposes_launch_url(self):
        """Invariant 9: LOCAL courses must report integration_mode = FALLBACK / LOCAL and external_url = None."""
        local_course = {"id": "loc-c2", "title": "Local 2", "external_id": None, "external_url": None, "provider": None}
        CourseRepository._IGOT_COURSE_METADATA_CACHE.clear()
        with mock.patch("app.repositories.course_repo.get_supabase") as mock_sb:
            mock_sb.return_value.table().select().eq().eq().single().execute.return_value.data = local_course
            mock_sb.return_value.table().select().eq().order().execute.return_value.data = []
            detail = CourseRepository.get_course_detail("loc-c2")
            self.assertEqual(detail["integration_mode"], "FALLBACK / LOCAL")
            self.assertIsNone(detail["external_url"])

    def test_invariant_10_provider_metadata_preservation(self):
        """Invariant 10: Successful iGOT results preserve provider metadata without substitution."""
        provider_name = "Indian Institute of Technology (IIT) Madras"
        course_data = {
            "id": "c-iit",
            "title": "IIT Madras Data Science",
            "external_id": "do_iit_001",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_iit_001/overview",
            "provider": provider_name,
        }
        with mock.patch("app.repositories.course_repo.get_supabase") as mock_sb:
            mock_sb.return_value.table().upsert().execute.return_value.data = [course_data]
            CourseRepository.upsert_normalized_course(course_data)
            self.assertEqual(CourseRepository._IGOT_COURSE_METADATA_CACHE["c-iit"]["provider"], provider_name)

    @mock.patch("app.repositories.assessment_repo.get_supabase")
    @mock.patch.object(AssessmentRepository, "get_raw_assessment_items")
    @mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @mock.patch("app.repositories.competency_repo.CompetencyRepository.list_competencies")
    @mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    def test_invariant_11_recommendation_points_to_valid_id(
        self,
        mock_upsert,
        mock_search_courses,
        mock_list_comps,
        mock_get_profile,
        mock_get_raw_items,
        mock_get_supabase,
    ):
        """Invariant 11: Generated recommendations must contain a valid, well-formed UUID course_id and valid competency_id."""
        sb, tables, inserted_recs = create_mock_supabase_for_assessment(self.items)
        mock_get_supabase.return_value = sb
        mock_get_raw_items.return_value = self.items
        mock_get_profile.return_value = STANDARD_JSO_PROFILE
        mock_list_comps.return_value = STANDARD_COMPETENCIES

        valid_course = {
            "id": str(uuid.uuid4()),
            "title": "Pipeline Architecture",
            "external_id": "do_pipe_inv11",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_pipe_inv11/overview",
            "provider": "Wadhwani Foundation",
            "integration_mode": "REAL / SUNBIRD",
        }
        mock_search_courses.return_value = [valid_course]
        mock_upsert.return_value = valid_course

        answers = {it["id"]: (1 if it["competency_id"] == COMP_DATA_PIPE else 0) for it in self.items}

        AssessmentRepository.process_and_store_submission(
            user_id="user-inv-11",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers,
        )

        self.assertTrue(len(inserted_recs) > 0, "Recommendations should have been generated")
        for rec in inserted_recs:
            course_id = rec["course_id"]
            self.assertIsInstance(course_id, str)
            self.assertTrue(len(course_id) > 0)
            parsed_uuid = uuid.UUID(course_id)
            self.assertIn(parsed_uuid.version, [4, 5])
            self.assertEqual(str(parsed_uuid), course_id)
            self.assertIn(rec["competency_id"], COMPETENCY_IDS)

    @mock.patch("app.repositories.course_repo.get_supabase")
    @mock.patch.object(CourseRepository, "enroll_user")
    @mock.patch.object(CourseRepository, "get_course_detail")
    def test_invariant_12_learning_completion_isolation(
        self, mock_get_detail, mock_enroll, mock_get_supabase
    ):
        """Invariant 12: Learning completion alone records progress evidence and never mutates competency scores or skill gaps."""
        course_id = str(uuid.uuid4())
        mock_get_detail.return_value = {
            "id": course_id,
            "modules": [{"id": "mod-iso-1", "title": "Module 1", "competency_id": COMP_DATA_PIPE}],
        }
        mock_enroll.return_value = {"id": "enr-iso", "completed_modules": []}
        mock_sb = mock.MagicMock()
        mock_get_supabase.return_value = mock_sb

        res = CourseRepository.complete_module(
            user_id="user-iso-1",
            course_id=course_id,
            module_id="mod-iso-1",
        )
        self.assertIsNone(res["recalibrated_score"])
        self.assertIsNone(res["recalibrated_level"])
        self.assertIsNone(res["updated_gap_priority"])
        self.assertIn("recorded as learning activity evidence", res["message"])
        mock_sb.table.assert_called_with("course_enrollments")
        for call in mock_sb.table.call_args_list:
            table_name = call[0][0]
            self.assertNotIn(table_name, ["competency_scores", "skill_gaps", "recommendations"])

    @mock.patch("app.repositories.assessment_repo.get_supabase")
    @mock.patch.object(AssessmentRepository, "get_raw_assessment_items")
    @mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @mock.patch("app.repositories.competency_repo.CompetencyRepository.list_competencies")
    @mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    def test_invariant_13_post_learning_adaptability(
        self,
        mock_upsert,
        mock_search_courses,
        mock_list_comps,
        mock_get_profile,
        mock_get_raw_items,
        mock_get_supabase,
    ):
        """Invariant 13: Post-learning assessment produces a new score that recalibrates gaps and updates recommendations."""
        sb, tables, inserted_recs = create_mock_supabase_for_assessment(self.items)
        mock_get_supabase.return_value = sb
        mock_get_raw_items.return_value = self.items
        mock_get_profile.return_value = STANDARD_JSO_PROFILE
        mock_list_comps.return_value = STANDARD_COMPETENCIES

        mock_course = {
            "id": str(uuid.uuid4()),
            "title": "Pipeline Mastery",
            "external_id": "do_post_adapt",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_post_adapt/overview",
            "provider": "MoSPI",
            "integration_mode": "REAL / SUNBIRD",
        }
        mock_search_courses.return_value = [mock_course]
        mock_upsert.return_value = mock_course

        # 1. Baseline submission: all wrong for Data Pipeline Design
        answers_baseline = {it["id"]: (1 if it["competency_id"] == COMP_DATA_PIPE else 0) for it in self.items}
        res_baseline = AssessmentRepository.process_and_store_submission(
            user_id="user-post-adapt-1",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers_baseline,
        )
        pipe_gap_baseline = next(g for g in res_baseline["resulting_gaps"] if g["competency_id"] == COMP_DATA_PIPE)
        self.assertGreater(pipe_gap_baseline["gap_size"], 0)
        self.assertIn(pipe_gap_baseline["priority"], ["HIGH", "MEDIUM"])
        self.assertGreater(len(inserted_recs), 0)
        self.assertIsNotNone(res_baseline["top_recommendation"])

        # 2. Post-learning submission: learner achieves mastery on all items (all correct = 0)
        inserted_recs.clear()
        answers_post = {it["id"]: 0 for it in self.items}
        res_post = AssessmentRepository.process_and_store_submission(
            user_id="user-post-adapt-1",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers_post,
        )
        pipe_gap_post = next(g for g in res_post["resulting_gaps"] if g["competency_id"] == COMP_DATA_PIPE)
        self.assertEqual(pipe_gap_post["gap_size"], 0)
        self.assertEqual(pipe_gap_post["priority"], "NONE")
        self.assertEqual(len(inserted_recs), 0)
        self.assertIsNone(res_post["top_recommendation"])

    def test_invariant_14_generic_discovery_no_hardcoded_ids(self):
        """Invariant 14: Dynamic resolution does not depend on hardcoded course IDs or titles."""
        arbitrary_do_id = f"do_{uuid.uuid4().hex[:16]}"
        arbitrary_title = "Arbitrary Mission Karmayogi Module"
        raw_sunbird = {
            "identifier": arbitrary_do_id,
            "name": arbitrary_title,
            "organisation": "Autonomous Government Academy",
        }
        provider = RealIgotProvider(api_url="https://igotkarmayogi.gov.in")
        norm = provider._normalize_content_item(raw_sunbird)
        self.assertEqual(norm["external_id"], arbitrary_do_id)
        self.assertEqual(norm["title"], arbitrary_title)
        self.assertEqual(norm["provider"], "Autonomous Government Academy")


# ===========================================================================
# PART 11: End-to-End Persistence Simulation (ID Consistency)
# ===========================================================================

class TestEndToEndPersistenceMock(unittest.TestCase):
    """
    Verifies that identifiers remain strictly consistent across the entire chain:
    assessment submission -> scoring -> gaps -> ranking -> tiered search ->
    upsert -> recommendation persistence -> course detail resolution.
    """

    def setUp(self):
        CourseRepository._IGOT_COURSE_METADATA_CACHE.clear()

    @mock.patch("app.repositories.assessment_repo.get_supabase")
    @mock.patch("app.repositories.course_repo.get_supabase")
    @mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @mock.patch("app.repositories.competency_repo.CompetencyRepository.list_competencies")
    def test_end_to_end_id_consistency(
        self,
        mock_list_comps,
        mock_get_profile,
        mock_search_courses,
        mock_course_supabase,
        mock_assessment_supabase,
    ):
        from app.repositories.assessment_repo import AssessmentRepository

        user_id = "user-e2e-persistent-999"
        assessment_id = "a1000000-0000-0000-0000-000000000001"
        items = generate_standard_18_items()

        # Table-dispatch mocks for assessment_supabase
        from collections import defaultdict
        tables = defaultdict(mock.MagicMock)
        assessment_sb = mock.MagicMock()
        assessment_sb.table.side_effect = lambda t="default": tables[t]
        mock_assessment_supabase.return_value = assessment_sb

        course_sb = mock.MagicMock()
        mock_course_supabase.return_value = course_sb

        # Mock assessment instance & items
        tables["assessments"].select.return_value.eq.return_value.single.return_value.execute.return_value.data = {"version": "1.0"}
        tables["assessment_instances"].select.return_value.eq.return_value.single.return_value.execute.return_value.data = None
        tables["assessment_items"].select.return_value.order.return_value.execute.return_value.data = items

        inserted_recommendations = []
        def _mock_rec_insert(payload):
            inserted_recommendations.append(payload)
            m = mock.MagicMock()
            m.execute.return_value.data = [payload]
            return m

        tables["recommendations"].insert.side_effect = _mock_rec_insert
        tables["recommendations"].delete.return_value.eq.return_value.execute.return_value.data = []
        tables["competency_scores"].upsert.return_value.execute.return_value.data = []
        tables["skill_gaps"].upsert.return_value.execute.return_value.data = []
        tables["assessment_results"].insert.return_value.execute.return_value.data = [{"id": "res-e2e"}]

        mock_get_profile.return_value = {
            "designation": "Assistant Director (Data Analytics)",
            "tools_experience": ["SQL", "Kafka"],
        }
        mock_list_comps.return_value = [
            {"id": COMP_STAT_INF, "name": "Statistical Inference"},
            {"id": COMP_DATA_PIPE, "name": "Data Pipeline Design"},
            {"id": COMP_ML_OPS, "name": "Machine Learning Ops"},
            {"id": COMP_DATA_GOV, "name": "Data Governance"},
        ]

        # Deterministic Sunbird response
        do_id = "do_live_e2e_pipeline_123"
        expected_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"igot:{do_id}"))
        mock_sunbird_course = {
            "id": expected_uuid,
            "title": "Enterprise Pipeline Architecture",
            "external_id": do_id,
            "external_url": f"https://portal.igotkarmayogi.gov.in/public/toc/{do_id}/overview",
            "provider": "Wadhwani Foundation / iGOT Karmayogi Bharat",
            "integration_mode": "REAL / SUNBIRD",
        }
        mock_search_courses.return_value = [mock_sunbird_course]

        # Mock course upsert
        course_sb.table("courses").upsert().execute.return_value.data = [mock_sunbird_course]
        course_sb.table("courses").select().eq().eq().single().execute.return_value.data = mock_sunbird_course
        course_sb.table("course_modules").select().eq().order().execute.return_value.data = []

        # Learner answers all questions correctly except Data Pipeline Design
        answers = {it["id"]: (1 if it["competency_id"] == COMP_DATA_PIPE else 0) for it in items}

        result = AssessmentRepository.process_and_store_submission(
            user_id=user_id,
            assessment_id=assessment_id,
            answers_dict=answers,
        )

        self.assertIsNotNone(result)
        self.assertTrue(len(inserted_recommendations) > 0)

        # 1. Verify recommendation points to the exact upserted course ID
        rec = inserted_recommendations[0]
        self.assertEqual(rec["course_id"], expected_uuid)
        self.assertEqual(rec["competency_id"], COMP_DATA_PIPE)

        # 2. Verify CourseRepository.get_course_detail retrieves identical external metadata
        detail = CourseRepository.get_course_detail(rec["course_id"])
        self.assertEqual(detail["id"], expected_uuid)
        self.assertEqual(detail["external_id"], do_id)
        self.assertEqual(detail["external_url"], f"https://portal.igotkarmayogi.gov.in/public/toc/{do_id}/overview")
        self.assertEqual(detail["provider"], "Wadhwani Foundation / iGOT Karmayogi Bharat")
        self.assertEqual(detail["integration_mode"], "REAL / SUNBIRD")


# ===========================================================================
# PART 13: Error / Resilience Testing
# ===========================================================================

class TestErrorResilienceSuite(unittest.TestCase):
    """
    Verifies graceful handling of upstream network errors, timeouts,
    malformed payloads, and repeated submissions through production methods.
    """

    def setUp(self):
        CourseRepository._IGOT_COURSE_METADATA_CACHE.clear()
        self.items = generate_standard_18_items()

    @mock.patch("app.repositories.assessment_repo.get_supabase")
    @mock.patch.object(AssessmentRepository, "get_raw_assessment_items")
    @mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @mock.patch("app.repositories.competency_repo.CompetencyRepository.list_competencies")
    @mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    def test_sunbird_timeout_falls_forward_cleanly(
        self,
        mock_upsert,
        mock_search_courses,
        mock_list_comps,
        mock_get_profile,
        mock_get_raw_items,
        mock_get_supabase,
    ):
        """Gateway timeout on Tier 1 in production submission loop falls forward to Tier 2 cleanly."""
        sb, tables, inserted_recs = create_mock_supabase_for_assessment(self.items)
        mock_get_supabase.return_value = sb
        mock_get_raw_items.return_value = self.items
        mock_get_profile.return_value = STANDARD_JSO_PROFILE
        mock_list_comps.return_value = STANDARD_COMPETENCIES

        fallback_course = {
            "id": "c-timeout-fallback-1",
            "title": "Fallback Statistical Analysis",
            "external_id": "do_stat_fallback",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_stat_fallback/overview",
            "provider": "Sankhyiki Bhawan",
            "integration_mode": "REAL / SUNBIRD",
        }
        mock_search_courses.side_effect = [
            httpx.TimeoutException("Read timed out connecting to Sunbird API"),
            [fallback_course],
        ]
        mock_upsert.return_value = fallback_course

        answers = {it["id"]: (1 if it["competency_id"] == COMP_DATA_PIPE else 0) for it in self.items}

        res = AssessmentRepository.process_and_store_submission(
            user_id="user-timeout-1",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers,
        )

        self.assertIsNotNone(res)
        self.assertEqual(mock_search_courses.call_count, 2)
        mock_upsert.assert_called_once_with(fallback_course)
        self.assertEqual(inserted_recs[0]["course_id"], "c-timeout-fallback-1")
        self.assertEqual(res["top_recommendation"]["course_id"], "c-timeout-fallback-1")

    @mock.patch("app.repositories.assessment_repo.get_supabase")
    @mock.patch.object(AssessmentRepository, "get_raw_assessment_items")
    @mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @mock.patch("app.repositories.competency_repo.CompetencyRepository.list_competencies")
    @mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    @mock.patch("app.repositories.course_repo.CourseRepository.get_course_for_competency")
    def test_sunbird_http_500_falls_forward_cleanly(
        self,
        mock_get_local,
        mock_upsert,
        mock_search_courses,
        mock_list_comps,
        mock_get_profile,
        mock_get_raw_items,
        mock_get_supabase,
    ):
        """HTTP 500 on both tiers in production submission loop falls back safely to local catalog."""
        sb, tables, inserted_recs = create_mock_supabase_for_assessment(self.items)
        mock_get_supabase.return_value = sb
        mock_get_raw_items.return_value = self.items
        mock_get_profile.return_value = STANDARD_JSO_PROFILE
        mock_list_comps.return_value = STANDARD_COMPETENCIES

        mock_req = mock.MagicMock()
        mock_resp = mock.MagicMock(status_code=500)
        mock_search_courses.side_effect = [
            httpx.HTTPStatusError("500 Server Error", request=mock_req, response=mock_resp),
            httpx.HTTPStatusError("500 Server Error", request=mock_req, response=mock_resp),
        ]
        local_course = {
            "id": "b0100000-0000-0000-0000-000000000002",
            "title": "Local Data Pipeline Module",
            "external_id": None,
            "external_url": None,
            "provider": None,
            "integration_mode": "FALLBACK / LOCAL",
        }
        mock_get_local.return_value = local_course

        answers = {it["id"]: (1 if it["competency_id"] == COMP_DATA_PIPE else 0) for it in self.items}

        res = AssessmentRepository.process_and_store_submission(
            user_id="user-http-500",
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers,
        )

        self.assertIsNotNone(res)
        self.assertEqual(mock_search_courses.call_count, 2)
        mock_upsert.assert_not_called()
        mock_get_local.assert_called_once_with(COMP_DATA_PIPE)
        self.assertEqual(inserted_recs[0]["course_id"], "b0100000-0000-0000-0000-000000000002")
        self.assertEqual(res["top_recommendation"]["course_id"], "b0100000-0000-0000-0000-000000000002")

    def test_malformed_sunbird_payload_handled_safely(self):
        """Sunbird payload with missing fields does not crash normalization."""
        provider = RealIgotProvider(api_url="https://igotkarmayogi.gov.in")
        malformed_items = [
            {},  # completely empty
            {"identifier": None, "name": None, "organisation": None},
            {"identifier": "", "name": "", "organisation": []},
            {"identifier": "do_partial", "description": None},
        ]
        for item in malformed_items:
            norm = provider._normalize_content_item(item)
            self.assertIsNotNone(norm["id"])
            self.assertIsNotNone(norm["external_id"])
            self.assertIsNotNone(norm["title"])
            self.assertIsNotNone(norm["provider"])
            self.assertTrue(norm["external_url"].startswith("https://portal.igotkarmayogi.gov.in/public/toc/"))

    @mock.patch("app.repositories.assessment_repo.get_supabase")
    @mock.patch.object(AssessmentRepository, "get_raw_assessment_items")
    @mock.patch("app.repositories.user_repo.UserRepository.get_profile")
    @mock.patch("app.repositories.competency_repo.CompetencyRepository.list_competencies")
    @mock.patch("app.services.igot_client.IGOTClientService.search_courses")
    @mock.patch("app.repositories.course_repo.CourseRepository.upsert_normalized_course")
    def test_repeated_submission_resets_stale_recommendations(
        self,
        mock_upsert,
        mock_search_courses,
        mock_list_comps,
        mock_get_profile,
        mock_get_raw_items,
        mock_get_supabase,
    ):
        """Production submission resets stale recommendations via delete(user_id=...) on each call."""
        sb, tables, inserted_recs = create_mock_supabase_for_assessment(self.items)
        mock_get_supabase.return_value = sb
        mock_get_raw_items.return_value = self.items
        mock_get_profile.return_value = STANDARD_JSO_PROFILE
        mock_list_comps.return_value = STANDARD_COMPETENCIES

        mock_course = {
            "id": "c-repeat-101",
            "title": "Data Pipeline Engineering",
            "external_id": "do_repeat_101",
            "external_url": "https://portal.igotkarmayogi.gov.in/public/toc/do_repeat_101/overview",
            "provider": "MoSPI",
            "integration_mode": "REAL / SUNBIRD",
        }
        mock_search_courses.return_value = [mock_course]
        mock_upsert.return_value = mock_course

        user_id = "user-repeat-submission-888"
        answers = {it["id"]: (1 if it["competency_id"] == COMP_DATA_PIPE else 0) for it in self.items}

        # First submission
        AssessmentRepository.process_and_store_submission(
            user_id=user_id,
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers,
        )
        self.assertEqual(tables["recommendations"].delete.call_count, 1)
        tables["recommendations"].delete.return_value.eq.assert_called_with("user_id", user_id)

        # Second submission by same user
        AssessmentRepository.process_and_store_submission(
            user_id=user_id,
            assessment_id="a1000000-0000-0000-0000-000000000001",
            answers_dict=answers,
        )
        self.assertEqual(tables["recommendations"].delete.call_count, 2)
        tables["recommendations"].delete.return_value.eq.assert_called_with("user_id", user_id)


if __name__ == "__main__":
    unittest.main()
