import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.validation_pipeline import ValidationPipeline, VALID_COMPETENCY_IDS


def test_blueprint_slot_mismatch_rejects():
    """
    Test A:
    Blueprint requests Statistical Inference (c1000000-0000-0000-0000-000000000001).
    Gemini returns Data Pipeline (c1000000-0000-0000-0000-000000000002).
    Result = REJECT (fails Stage 10: Blueprint Slot Alignment).
    """
    candidate_item = {
        "competency_id": "c1000000-0000-0000-0000-000000000002",  # Data Pipeline
        "prompt": "In a real-time data streaming pipeline, how does Apache Kafka maintain partition offsets?",
        "options": [
            "Offsets are committed to an internal Kafka consumer offsets topic",
            "Offsets are written to raw CSV files on the producer edge node",
            "Offsets are discarded once read by the first consumer instance",
            "Offsets are stored as environment variables in the Docker daemon"
        ],
        "correct_index": 0,
        "difficulty": "MEDIUM",
        "weight": 1.0,
        "question_type": "APPLIED",
        "rationale": "Offsets are committed to an internal Kafka consumer offsets topic to track consumer read positions reliably."
    }

    expected_slot = "c1000000-0000-0000-0000-000000000001"  # Statistical Inference requested
    res = ValidationPipeline.validate_item(candidate_item, expected_competency_id=expected_slot)

    assert res["is_valid"] is False, "Item with mismatched competency slot should be rejected!"
    assert "10_blueprint_slot_alignment" in res["hard_failures"], (
        f"Expected '10_blueprint_slot_alignment' failure, got: {res['hard_failures']}"
    )
    print("  [+] Test A Passed: Blueprint slot mismatch correctly rejected (Statistical Inference != Data Pipeline).")


def test_blueprint_slot_match_accepts():
    """
    Test B:
    Blueprint requests Data Pipeline (c1000000-0000-0000-0000-000000000002).
    Gemini returns Data Pipeline (c1000000-0000-0000-0000-000000000002).
    Result = ACCEPT if all other validation passes.
    """
    candidate_item = {
        "competency_id": "c1000000-0000-0000-0000-000000000002",  # Data Pipeline
        "prompt": "In an official statistical data pipeline, what ensures idempotent batch ingestion when district offices retransmit?",
        "options": [
            "Database upserts with unique survey unit constraints",
            "Dropping and recreating the target survey schema",
            "Appending duplicate rows to an unindexed text file",
            "Discarding all retransmitted survey batches unconditionally"
        ],
        "correct_index": 0,
        "difficulty": "MEDIUM",
        "weight": 1.0,
        "question_type": "APPLIED",
        "rationale": "Database upserts with unique survey unit constraints guarantee idempotency by updating existing records rather than duplicating counts."
    }

    expected_slot = "c1000000-0000-0000-0000-000000000002"  # Data Pipeline requested
    res = ValidationPipeline.validate_item(candidate_item, expected_competency_id=expected_slot)

    assert res["is_valid"] is True, f"Matching item failed validation: {res['hard_failures']}"
    assert "10_blueprint_slot_alignment" not in res["hard_failures"]
    assert res["stage_breakdown"]["10_blueprint_slot_alignment"] is True
    print("  [+] Test B Passed: Blueprint slot match correctly accepted.")


def test_unknown_competency_uuid_rejects():
    """
    Test C:
    Gemini returns an unknown competency UUID outside the authoritative framework.
    Result = REJECT (fails Stage 9: Competency Link).
    """
    candidate_item = {
        "competency_id": "c9999999-9999-9999-9999-999999999999",  # Non-authoritative UUID
        "prompt": "In advanced deep learning architectures, what is the role of self-attention mechanisms?",
        "options": [
            "Computes dynamic weightings across all sequence tokens",
            "Converts numerical data to random binary noise",
            "Eliminates the need for any gradient calculation",
            "Restricts inputs to exactly one dimensional vectors"
        ],
        "correct_index": 0,
        "difficulty": "HARD",
        "weight": 1.0,
        "question_type": "CONCEPTUAL",
        "rationale": "Self-attention computes dynamic weightings across all sequence tokens to model long-range context dependencies."
    }

    res = ValidationPipeline.validate_item(candidate_item)

    assert res["is_valid"] is False, "Item with unknown competency UUID must be rejected!"
    assert "9_competency_link" in res["hard_failures"], (
        f"Expected '9_competency_link' failure, got: {res['hard_failures']}"
    )
    print("  [+] Test C Passed: Unknown competency UUID correctly rejected by framework validation.")


def test_validate_candidate_pool_prevents_self_assignment():
    """
    Verifies that validate_candidate_pool strictly checks candidates against allowed blueprint slots
    and does NOT allow candidates to bypass blueprint targeting.
    """
    allowed_slots = {
        "c1000000-0000-0000-0000-000000000001",  # Statistical Inference
    }

    items = [
        # Item 1 matches allowed slot
        {
            "competency_id": "c1000000-0000-0000-0000-000000000001",
            "prompt": "What is the key assumption of Ordinary Least Squares regression regarding errors?",
            "options": ["Errors have constant variance (homoscedasticity)", "Errors are dependent", "Errors are non-normal", "Errors have non-zero mean"],
            "correct_index": 0,
            "difficulty": "MEDIUM",
            "rationale": "Errors have constant variance (homoscedasticity) under Gauss-Markov assumptions for OLS regression."
        },
        # Item 2 is valid competency but outside allowed blueprint slots for this call
        {
            "competency_id": "c1000000-0000-0000-0000-000000000003",  # MLOps
            "prompt": "What is model drift, and why does it matter in production ML systems?",
            "options": ["A bug introduced during model deployment", "Gradual degradation of model accuracy due to data distribution changes", "An overfit model that performs poorly", "A technique for reducing model size"],
            "correct_index": 1,
            "difficulty": "MEDIUM",
            "rationale": "Model drift causes gradual degradation of model accuracy due to data distribution changes over time in production."
        }
    ]

    valid = ValidationPipeline.validate_candidate_pool(items, allowed_competency_ids=allowed_slots)
    assert len(valid) == 1, f"Expected exactly 1 valid item matching blueprint, got {len(valid)}"
    assert valid[0]["competency_id"] == "c1000000-0000-0000-0000-000000000001"
    print("  [+] Candidate Pool Check Passed: Disallowed slot item was filtered out.")


if __name__ == "__main__":
    print("\n--- Running Blueprint Slot Validation Regression Tests ---")
    test_blueprint_slot_mismatch_rejects()
    test_blueprint_slot_match_accepts()
    test_unknown_competency_uuid_rejects()
    test_validate_candidate_pool_prevents_self_assignment()
    print("\n==================================================")
    print("   ALL BLUEPRINT SLOT VALIDATION TESTS PASSED!    ")
    print("==================================================")
