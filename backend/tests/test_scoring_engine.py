import sys
from app.services.scoring_engine import ScoringEngine, convert_score_to_level, calculate_confidence
from app.services.gap_engine import GapEngine


def test_level_conversions():
    print("--- 1. Testing Level Conversion Mapping ---")
    assert convert_score_to_level(0.0) == 0
    assert convert_score_to_level(24.9) == 0
    assert convert_score_to_level(25.0) == 1
    assert convert_score_to_level(49.9) == 1
    assert convert_score_to_level(50.0) == 2
    assert convert_score_to_level(69.9) == 2
    assert convert_score_to_level(70.0) == 3
    assert convert_score_to_level(84.9) == 3
    assert convert_score_to_level(85.0) == 4
    assert convert_score_to_level(100.0) == 4
    print("  [+] All 10 level conversion thresholds passed!")


def test_confidence_calculations():
    print("\n--- 2. Testing Independent Confidence Calculations ---")
    c1 = calculate_confidence(1, ["MEDIUM"])
    c2 = calculate_confidence(2, ["EASY", "HARD"])
    c3 = calculate_confidence(3, ["EASY", "MEDIUM", "HARD"])
    
    assert 0.0 <= c1 <= 1.0
    assert 0.0 <= c2 <= 1.0
    assert 0.0 <= c3 <= 1.0
    assert c3 > c1, "More items should yield higher confidence"
    print(f"  [+] Confidence values verified: 1 item={c1}, 2 items={c2}, 3 items={c3}")


def test_scoring_engine_evaluation():
    print("\n--- 3. Testing Deterministic Scoring Engine ---")
    items = [
        {
            "id": "item-1",
            "competency_id": "comp-A",
            "correct_index": 1,
            "weight": 1.0,
            "difficulty": "MEDIUM",
        },
        {
            "id": "item-2",
            "competency_id": "comp-A",
            "correct_index": 2,
            "weight": 1.0,
            "difficulty": "HARD",
        },
    ]

    # Perfect submission: both correct
    res_perfect = ScoringEngine.evaluate_submission(items, {"item-1": 1, "item-2": 2})
    assert res_perfect["overall_score"] == 100.0
    assert res_perfect["competency_breakdown"]["comp-A"]["score"] == 100.0
    assert res_perfect["competency_breakdown"]["comp-A"]["measured_level"] == 4
    print(f"  [+] Perfect Score Test: {res_perfect['overall_score']}% (Level {res_perfect['competency_breakdown']['comp-A']['measured_level']})")

    # Mixed submission: 1 correct, 1 wrong -> 50%
    res_mixed = ScoringEngine.evaluate_submission(items, {"item-1": 1, "item-2": 0})
    assert res_mixed["overall_score"] == 50.0
    assert res_mixed["competency_breakdown"]["comp-A"]["score"] == 50.0
    assert res_mixed["competency_breakdown"]["comp-A"]["measured_level"] == 2
    print(f"  [+] Mixed Score Test: {res_mixed['overall_score']}% (Level {res_mixed['competency_breakdown']['comp-A']['measured_level']})")


def test_gap_engine_priorities():
    print("\n--- 4. Testing Skill Gap Engine & Priority Assignment ---")
    g_high = GapEngine.compute_gap(measured_level=1, required_level=3)
    assert g_high["gap_size"] == 2
    assert g_high["priority"] == "HIGH"
    print(f"  [+] Measured=1, Required=3 -> Gap={g_high['gap_size']}, Priority={g_high['priority']}")

    g_med = GapEngine.compute_gap(measured_level=2, required_level=3)
    assert g_med["gap_size"] == 1
    assert g_med["priority"] == "MEDIUM"
    print(f"  [+] Measured=2, Required=3 -> Gap={g_med['gap_size']}, Priority={g_med['priority']}")

    g_none = GapEngine.compute_gap(measured_level=3, required_level=3)
    assert g_none["gap_size"] == 0
    assert g_none["priority"] == "NONE"
    print(f"  [+] Measured=3, Required=3 -> Gap={g_none['gap_size']}, Priority={g_none['priority']}")


if __name__ == "__main__":
    test_level_conversions()
    test_confidence_calculations()
    test_scoring_engine_evaluation()
    test_gap_engine_priorities()
    print("\n==================================================")
    print("   ALL SCORING & GAP ENGINE UNIT TESTS PASSED!   ")
    print("==================================================")
