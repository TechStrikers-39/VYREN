import asyncio
import os
import sys
import unittest.mock as mock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.ai_assistant import AIAssistantService
from app.services.assessment_orchestrator import AssessmentOrchestrationService
from app.repositories.assessment_repo import AssessmentRepository
from app.repositories.instance_repo import AssessmentInstanceRepository
from app.services.targeting_engine import FINAL_ASSESSMENT_SIZE


async def run_e2e_personalized_assessment_test():
    """
    Hybrid / Mocked End-to-End Test for Personalized Baseline Assessment Flow.
    NOTE: External Gemini API call is mocked with valid candidate questions to ensure
    deterministic, quota-safe test execution.
    """
    print("=== 1. Starting Hybrid / Mocked E2E Personalized Assessment Test ===")
    test_user_id = "06c48e37-57e7-489c-afab-800b212a9060"

    mock_candidates = [
        {
            "id": f"gen-cand-{i}",
            "competency_id": "c1000000-0000-0000-0000-000000000001",
            "prompt": f"In official statistical estimation, which estimator minimizes mean squared error under heteroscedasticity scenario {i}?",
            "options": [
                "Generalized Least Squares (GLS)",
                "Ordinary Least Squares with uncorrected errors",
                "Arbitrary unweighted aggregation",
                "Simple percentage change without weights"
            ],
            "correct_index": 0,
            "difficulty": "HARD",
            "weight": 1.0,
            "question_type": "APPLIED",
            "rationale": "Generalized Least Squares (GLS) estimators minimize mean squared error by incorporating error covariance structures.",
            "item_source": "gemini_generated"
        }
        for i in range(10)
    ]

    with mock.patch.object(AIAssistantService, "generate_baseline_candidates", return_value=mock_candidates):
        # 1. Fetch or create personalized assessment
        assessment_data = await AssessmentOrchestrationService.get_or_create_personalized_assessment(
            user_id=test_user_id,
            force_regenerate=True,
        )

        instance_id = assessment_data["id"]
        items = assessment_data["items"]
        print(f"  [+] Created Assessment Instance: {instance_id}")
        print(f"  [+] Total Items Count: {len(items)} (Required: {FINAL_ASSESSMENT_SIZE})")

        assert len(items) == FINAL_ASSESSMENT_SIZE, f"Expected {FINAL_ASSESSMENT_SIZE} items, got {len(items)}"
        assert all("correct_index" not in it for it in items), "SECURITY CRITICAL: correct_index leaked to learner!"

        # Verify unique prompts
        prompts = [it["prompt"] for it in items]
        assert len(set(prompts)) == FINAL_ASSESSMENT_SIZE, "Duplicate prompts found in final assessment items!"

        # 2. Test Refresh / Idempotency (Must return same instance without regenerating)
        refreshed_data = await AssessmentOrchestrationService.get_or_create_personalized_assessment(
            user_id=test_user_id,
            force_regenerate=False,
        )
        assert refreshed_data["id"] == instance_id, "Refresh regenerated assessment! Expected identical active instance."
        print("  [+] Idempotent Refresh Verified: Returned identical active instance.")

        # 3. Simulate Submission of Answers
        print("\n=== 2. Testing Deterministic Evaluation of Instance Submission ===")
        answers_dict = {it["id"]: 0 for it in items}

        submission_result = AssessmentRepository.process_and_store_submission(
            user_id=test_user_id,
            assessment_id=instance_id,
            answers_dict=answers_dict,
        )

        assert submission_result is not None
        assert "overall_score" in submission_result
        assert "competency_breakdown" in submission_result
        assert "resulting_gaps" in submission_result
        assert len(submission_result["item_log"]) == FINAL_ASSESSMENT_SIZE

        print(f"  [+] Submission Processed Successfully!")
        print(f"  [+] Overall Score: {submission_result['overall_score']}%")
        print(f"  [+] Competencies Evaluated: {len(submission_result['competency_breakdown'])}")
        for cid, bd in submission_result['competency_breakdown'].items():
            print(f"      - {cid}: Score={bd['score']}%, Measured Level={bd['measured_level']}, Confidence={bd['confidence']}")

        # 4. Verify Instance is Marked Submitted
        instance = AssessmentInstanceRepository.get_instance(instance_id)
        assert instance["status"] == "submitted", f"Instance status was not updated to submitted (got {instance['status']})"
        print("  [+] Instance Status Verified: 'submitted'")

        print("\n==================================================")
        print("   HYBRID / MOCKED E2E ASSESSMENT TEST PASSED!    ")
        print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_e2e_personalized_assessment_test())
