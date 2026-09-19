import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.targeting_engine import ContextTargetingEngine, FINAL_ASSESSMENT_SIZE


def test_jso_blueprint_personalization():
    print("--- 1. Testing JSO Profile Blueprint Personalization ---")
    jso_profile = {
        "id": "user-jso-001",
        "department": "National Sample Survey (NSS) Division",
        "designation": "Junior Statistical Officer",
        "responsibilities": "Field survey sampling design, stratified estimation, household expenditure schedules",
        "tools_experience": ["R", "Excel", "Python"],
        "self_reported_level": 1,
        "target_competencies": ["c1000000-0000-0000-0000-000000000001"],  # Statistical Inference
        "onboarding_completed": True,
    }

    bp = ContextTargetingEngine.build_blueprint(user_id="user-jso-001", profile_override=jso_profile)

    assert bp.total_questions == 18, f"Expected 18 questions, got {bp.total_questions}"
    assert sum(s.question_count for s in bp.competency_slots.values()) == 18, "Slot counts must sum to 18"
    assert all(s.question_count >= 3 for s in bp.competency_slots.values()), "All competencies must have >= 3 questions"

    stat_slot = bp.competency_slots["c1000000-0000-0000-0000-000000000001"]
    assert stat_slot.is_primary is True, "Statistical Inference must be primary for this JSO"
    assert stat_slot.question_count >= 5, f"Statistical Inference should receive boosted allocation, got {stat_slot.question_count}"
    assert bp.overall_difficulty.EASY == 5, f"Expected 5 EASY questions for self-reported level 1, got {bp.overall_difficulty.EASY}"
    assert bp.overall_difficulty.HARD == 3, f"Expected 3 HARD questions for self-reported level 1, got {bp.overall_difficulty.HARD}"
    print(f"  [+] JSO Blueprint Verified: Stat Inference={stat_slot.question_count} items, Total=18, Easy={bp.overall_difficulty.EASY}, Hard={bp.overall_difficulty.HARD}")


def test_data_engineer_blueprint_personalization():
    print("\n--- 2. Testing Data Engineer / MLOps Profile Blueprint ---")
    de_profile = {
        "id": "user-de-002",
        "department": "Data Systems & IT Directorate",
        "designation": "Assistant Director (Data Analytics)",
        "responsibilities": "Automated ETL pipeline orchestration, ML model deployment, drift detection, Kafka streaming",
        "tools_experience": ["Python", "SQL", "Docker", "MLflow", "Kafka"],
        "self_reported_level": 3,
        "target_competencies": [
            "c1000000-0000-0000-0000-000000000002",  # Data Pipeline Design
            "c1000000-0000-0000-0000-000000000003",  # MLOps
        ],
        "onboarding_completed": True,
    }

    bp = ContextTargetingEngine.build_blueprint(user_id="user-de-002", profile_override=de_profile)

    assert bp.total_questions == 18
    assert sum(s.question_count for s in bp.competency_slots.values()) == 18
    assert all(s.question_count >= 3 for s in bp.competency_slots.values())

    pipe_slot = bp.competency_slots["c1000000-0000-0000-0000-000000000002"]
    mlops_slot = bp.competency_slots["c1000000-0000-0000-0000-000000000003"]
    assert pipe_slot.is_primary or mlops_slot.is_primary, "Engineering/MLOps competencies must be prioritized"
    assert (pipe_slot.question_count + mlops_slot.question_count) >= 9, "Engineering + MLOps should dominate coverage"
    assert bp.overall_difficulty.EASY == 3, "Expected 3 EASY for level 3"
    assert bp.overall_difficulty.HARD == 5, "Expected 5 HARD for level 3"
    print(f"  [+] Data Analytics Blueprint Verified: Pipeline={pipe_slot.question_count}, MLOps={mlops_slot.question_count}, Total=18, Hard={bp.overall_difficulty.HARD}")


def test_blueprint_determinism():
    print("\n--- 3. Testing Blueprint Determinism ---")
    profile = {
        "id": "user-det-003",
        "department": "National Accounts Division",
        "designation": "Senior Statistical Officer",
        "responsibilities": "GDP compilation, GVA calculations, input-output tables, double deflation",
        "tools_experience": ["STATA", "Excel", "R"],
        "self_reported_level": 2,
        "target_competencies": ["c1000000-0000-0000-0000-000000000001", "c1000000-0000-0000-0000-000000000004"],
        "onboarding_completed": True,
    }

    bp1 = ContextTargetingEngine.build_blueprint(user_id="user-det-003", profile_override=profile)
    bp2 = ContextTargetingEngine.build_blueprint(user_id="user-det-003", profile_override=profile)

    # Blueprint parameters should be identical
    for cid in bp1.competency_slots:
        assert bp1.competency_slots[cid].question_count == bp2.competency_slots[cid].question_count
        assert bp1.competency_slots[cid].is_primary == bp2.competency_slots[cid].is_primary
        assert bp1.competency_slots[cid].difficulty_distribution.EASY == bp2.competency_slots[cid].difficulty_distribution.EASY
        assert bp1.competency_slots[cid].difficulty_distribution.HARD == bp2.competency_slots[cid].difficulty_distribution.HARD

    print("  [+] Blueprint is 100% deterministic across identical executions.")


def test_difficulty_bounds_and_floors():
    print("\n--- 4. Testing Controlled Difficulty Bounds Across All Levels (0-4) ---")
    for lvl in range(5):
        diff = ContextTargetingEngine.calculate_overall_difficulty(lvl)
        total = diff.EASY + diff.MEDIUM + diff.HARD
        assert total == 18, f"Level {lvl}: Total difficulty must equal 18, got {total}"
        assert diff.EASY >= 2, f"Level {lvl}: EASY floor of 2 violated (got {diff.EASY})"
        assert diff.MEDIUM >= 8, f"Level {lvl}: MEDIUM floor of 8 violated (got {diff.MEDIUM})"
        assert diff.HARD >= 2, f"Level {lvl}: HARD floor of 2 violated (got {diff.HARD})"
        print(f"  [+] Level {lvl}: EASY={diff.EASY}, MEDIUM={diff.MEDIUM}, HARD={diff.HARD} (Sum={total})")


if __name__ == "__main__":
    test_jso_blueprint_personalization()
    test_data_engineer_blueprint_personalization()
    test_blueprint_determinism()
    test_difficulty_bounds_and_floors()
    print("\n==================================================")
    print("   ALL CONTEXT TARGETING ENGINE TESTS PASSED!     ")
    print("==================================================")
