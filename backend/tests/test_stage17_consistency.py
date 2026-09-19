import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.validation_pipeline import ValidationPipeline


def test_matching_rationale_passes():
    """
    Test A:
    Correct option + matching rationale -> PASS.
    """
    options = [
        "Increase the sample size",
        "Apply Principal Component Analysis (PCA) before regression",
        "Remove the dependent variable",
        "Use a higher significance level"
    ]
    correct_index = 1
    rationale = (
        "Applying Principal Component Analysis (PCA) transforms correlated predictor variables into "
        "orthogonal principal components, effectively eliminating multicollinearity before fitting regression models."
    )

    passed, reason = ValidationPipeline.validate_answer_key_consistency(
        options=options,
        correct_index=correct_index,
        rationale=rationale,
    )
    assert passed is True, f"Matching rationale should pass Stage 17, failed with reason: {reason}"
    print(f"  [+] Test A Passed: Matching rationale successfully passed Stage 17 ({reason}).")


def test_unrelated_generic_rationale_rejects():
    """
    Test B:
    Correct option + unrelated generic rationale -> REJECT.
    Rationale has generic text with zero substantive overlap with correct option terms.
    """
    options = [
        "Increase the sample size",
        "Apply Principal Component Analysis (PCA) before regression",
        "Remove the dependent variable",
        "Use a higher significance level"
    ]
    correct_index = 1
    # Generic filler rationale with zero mention of PCA, principal components, or regression
    rationale = (
        "This is an essential competency requirement for all statistical officers working in modern government departments "
        "to ensure high analytical rigor and comprehensive data standards across official surveys."
    )

    passed, reason = ValidationPipeline.validate_answer_key_consistency(
        options=options,
        correct_index=correct_index,
        rationale=rationale,
    )
    assert passed is False, "Unrelated generic rationale MUST be rejected by Stage 17!"
    assert reason == "no_substantive_alignment", f"Expected 'no_substantive_alignment', got: {reason}"
    print(f"  [+] Test B Passed: Unrelated generic rationale correctly rejected ({reason}).")


def test_contradictory_rationale_rejects():
    """
    Test C:
    Correct option + contradictory rationale -> REJECT.
    Case 1: Rationale explicitly asserts another option is correct.
    Case 2: Rationale explicitly negates/rejects the keyed correct option.
    """
    options = [
        "Modified Laspeyres formula",
        "Paasche index formula",
        "Fisher Ideal index",
        "Simple arithmetic mean"
    ]
    correct_index = 0

    # Case 1: Rationale says Option B is correct
    rationale_contradicts_choice = (
        "In official consumer price index compilation, Option B is correct because Paasche indices "
        "dynamically adjust commodity weights every month."
    )
    passed1, reason1 = ValidationPipeline.validate_answer_key_consistency(
        options=options,
        correct_index=correct_index,
        rationale=rationale_contradicts_choice,
    )
    assert passed1 is False, "Contradictory rationale asserting another option must be rejected!"
    assert "contradiction" in reason1, f"Expected contradiction reason, got {reason1}"
    print(f"  [+] Test C.1 Passed: Contradictory rationale asserting other option rejected ({reason1}).")

    # Case 2: Rationale negates the keyed term
    rationale_negates_term = (
        "The Modified Laspeyres formula is incorrect because base-year consumption expenditure weights "
        "introduce severe substitution bias."
    )
    passed2, reason2 = ValidationPipeline.validate_answer_key_consistency(
        options=options,
        correct_index=correct_index,
        rationale=rationale_negates_term,
    )
    assert passed2 is False, "Contradictory rationale negating keyed term must be rejected!"
    assert "contradiction" in reason2, f"Expected contradiction reason, got {reason2}"
    print(f"  [+] Test C.2 Passed: Contradictory rationale negating keyed term rejected ({reason2}).")


def test_short_technical_answer_passes():
    """
    Test D:
    Valid short technical answer with meaningful terminology -> should NOT be rejected merely because it is short.
    """
    options = [
        "Apache Spark",
        "Apache Kafka",
        "PostgreSQL",
        "Docker"
    ]
    correct_index = 1
    # Short option ("Apache Kafka"), matching concise rationale
    rationale = "Apache Kafka provides distributed event log streaming with partition-based fault tolerance."

    passed, reason = ValidationPipeline.validate_answer_key_consistency(
        options=options,
        correct_index=correct_index,
        rationale=rationale,
    )
    assert passed is True, f"Valid short technical answer should pass, failed with: {reason}"
    print(f"  [+] Test D Passed: Short technical answer with meaningful terminology passed ({reason}).")


def test_full_item_stage17_hard_rejection():
    """
    Verifies that Stage 17 is treated as a HARD rejection stage when running validate_item().
    """
    item_with_unrelated_rationale = {
        "competency_id": "c1000000-0000-0000-0000-000000000001",
        "prompt": "What is the key assumption of Ordinary Least Squares regression regarding error terms?",
        "options": [
            "Errors are non-normal",
            "Errors have constant variance (homoscedasticity)",
            "Errors are dependent",
            "Errors have non-zero mean"
        ],
        "correct_index": 1,
        "difficulty": "HARD",
        "rationale": "General mathematical knowledge is essential for all analytical cadres in national statistical governance."
    }

    res = ValidationPipeline.validate_item(item_with_unrelated_rationale)
    assert res["is_valid"] is False, "Item failing Stage 17 must be hard-rejected!"
    assert "17_semantic_answer_alignment" in res["hard_failures"]
    print("  [+] Full Item Stage 17 Check Passed: Candidate with unrelated rationale was hard-rejected.")


if __name__ == "__main__":
    print("\n--- Running Stage 17 Deterministic Answer-Key Validation Tests ---")
    test_matching_rationale_passes()
    test_unrelated_generic_rationale_rejects()
    test_contradictory_rationale_rejects()
    test_short_technical_answer_passes()
    test_full_item_stage17_hard_rejection()
    print("\n==================================================")
    print("   ALL STAGE 17 CONSISTENCY TESTS PASSED!         ")
    print("==================================================")
