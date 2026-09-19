import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.targeting_engine import ContextTargetingEngine, FINAL_ASSESSMENT_SIZE
from app.services.blueprint_selector import BlueprintSelectionEngine


def mock_anchor_pool():
    topics = [
        ("Horvitz-Thompson sampling variance and multiplier calculation in multi-stage surveys", "c1000000-0000-0000-0000-000000000001", "MEDIUM"),
        ("Ordinary Least Squares homoscedasticity assumption in linear regression", "c1000000-0000-0000-0000-000000000001", "HARD"),
        ("Hypothesis testing null hypothesis rejection criteria using p-value alpha threshold", "c1000000-0000-0000-0000-000000000001", "EASY"),
        ("Multicollinearity reduction using Principal Component Analysis and ridge penalty", "c1000000-0000-0000-0000-000000000001", "HARD"),
        ("Stratified sampling cluster design in National Sample Survey first stage units", "c1000000-0000-0000-0000-000000000001", "MEDIUM"),
        ("Idempotency in distributed ETL data pipelines with automated retry mechanism", "c1000000-0000-0000-0000-000000000002", "MEDIUM"),
        ("Bi-temporal data modeling for late-arriving industrial production factory returns", "c1000000-0000-0000-0000-000000000002", "HARD"),
        ("Consumer Price Index item specification substitution with base price splicing", "c1000000-0000-0000-0000-000000000002", "HARD"),
        ("Modified Laspeyres price index formula compilation across fixed commodity baskets", "c1000000-0000-0000-0000-000000000002", "MEDIUM"),
        ("Database indexing on composite keys to optimize survey microdata aggregation queries", "c1000000-0000-0000-0000-000000000002", "EASY"),
        ("Model drift detection in production machine learning inference using Kolmogorov-Smirnov", "c1000000-0000-0000-0000-000000000003", "MEDIUM"),
        ("Seasonal feature shift and covariate drift in crop satellite imagery classification", "c1000000-0000-0000-0000-000000000003", "MEDIUM"),
        ("Shadow deployment of challenger ML models for automated record linkage verification", "c1000000-0000-0000-0000-000000000003", "HARD"),
        ("Immutable lineage and code artifact hashing in statistical MLOps registry", "c1000000-0000-0000-0000-000000000003", "HARD"),
        ("Regularization L1 Lasso and L2 Ridge for preventing model overfitting on tabular data", "c1000000-0000-0000-0000-000000000003", "EASY"),
        ("Data lineage tracking metadata and provenance across enterprise pipeline transformations", "c1000000-0000-0000-0000-000000000004", "EASY"),
        ("Double deflation methodology in national accounts real gross value added compilation", "c1000000-0000-0000-0000-000000000004", "HARD"),
        ("GDP at market prices versus GVA at basic prices under System of National Accounts 2008", "c1000000-0000-0000-0000-000000000004", "MEDIUM"),
        ("Statistical disclosure control using k-anonymity and top-coding under DPDP regulations", "c1000000-0000-0000-0000-000000000004", "MEDIUM"),
        ("Metadata catalog governance and data steward authorization protocols for official data", "c1000000-0000-0000-0000-000000000004", "HARD"),
    ]
    anchors = []
    for i, (prompt, cid, diff) in enumerate(topics):
        anchors.append({
            "id": f"anchor-{i+1}",
            "competency_id": cid,
            "prompt": f"Official Assessment Question: {prompt}?",
            "options": ["Standard Option A", "Standard Option B", "Standard Option C", "Standard Option D"],
            "correct_index": 0,
            "difficulty": diff,
            "weight": 1.0,
            "rationale": f"Pedagogical justification for official topic on {prompt}."
        })
    return anchors


def mock_candidate_pool():
    cand_topics = [
        ("Applying Jackknife variance estimation to complex multi-stage survey clusters", "c1000000-0000-0000-0000-000000000001", "HARD"),
        ("Interpreting Type I versus Type II errors in agricultural yield sample verification", "c1000000-0000-0000-0000-000000000001", "MEDIUM"),
        ("Confidence interval interpretation for state-level labor force participation rates", "c1000000-0000-0000-0000-000000000001", "EASY"),
        ("Partitioning high-throughput Apache Kafka streaming logs for municipal birth registrations", "c1000000-0000-0000-0000-000000000002", "HARD"),
        ("Dead letter queue error recovery in asynchronous batch data ingestion architectures", "c1000000-0000-0000-0000-000000000002", "MEDIUM"),
        ("Schema migration compatibility checks in relational data warehouses without service downtime", "c1000000-0000-0000-0000-000000000002", "MEDIUM"),
        ("Canary release traffic splitting for deep learning land-use classification services", "c1000000-0000-0000-0000-000000000003", "HARD"),
        ("Feature store point-in-time correctness to prevent data leakage during offline training", "c1000000-0000-0000-0000-000000000003", "MEDIUM"),
        ("Automated model rollback triggers based on precision-recall degradation thresholds", "c1000000-0000-0000-0000-000000000003", "MEDIUM"),
        ("Differential privacy epsilon parameter calibration for public census data dissemination", "c1000000-0000-0000-0000-000000000004", "HARD"),
        ("Role-based access control policies for classified economic indicator microdata sets", "c1000000-0000-0000-0000-000000000004", "MEDIUM"),
        ("Data retention and destruction compliance workflows according to government record archiving acts", "c1000000-0000-0000-0000-000000000004", "MEDIUM"),
    ]
    candidates = []
    for i, (prompt, cid, diff) in enumerate(cand_topics):
        candidates.append({
            "id": f"cand-{i+100}",
            "competency_id": cid,
            "prompt": f"Scenario Case Evaluation: {prompt}?",
            "options": ["Scenario Option 1", "Scenario Option 2", "Scenario Option 3", "Scenario Option 4"],
            "correct_index": 1,
            "difficulty": diff,
            "weight": 1.0,
            "rationale": f"Pedagogical rationale explaining why candidate item on {prompt} is correct."
        })
    return candidates



def test_hybrid_selection_exact_18():
    print("--- 1. Testing Hybrid Anchor + Candidate Assembly (Exact 18) ---")
    profile = {
        "id": "user-sel-001",
        "department": "National Accounts Division",
        "designation": "Assistant Director (Data Analytics)",
        "responsibilities": "ML Pipeline Design, Survey Data Processing",
        "tools_experience": ["Python", "SQL"],
        "self_reported_level": 2,
        "target_competencies": ["c1000000-0000-0000-0000-000000000002"],
        "onboarding_completed": True,
    }

    bp = ContextTargetingEngine.build_blueprint(user_id="user-sel-001", profile_override=profile)
    anchors = mock_anchor_pool()
    candidates = mock_candidate_pool()

    final_items = BlueprintSelectionEngine.select_final_18(bp, anchors, candidates)

    assert len(final_items) == 18, f"Expected exactly 18 items, got {len(final_items)}"
    assert len(set(it["prompt"] for it in final_items)) == 18, "All 18 items must have unique prompts"
    
    # Check that both anchors and generated items are present
    sources = set(it["item_source"] for it in final_items)
    assert "anchor" in sources and "gemini_generated" in sources, f"Hybrid assembly should contain both, got: {sources}"
    
    # Check sequential ordering
    assert [it["presentation_order"] for it in final_items] == list(range(1, 19))
    print(f"  [+] Hybrid Selection Passed: Exactly {len(final_items)} items assembled (Anchors={sum(1 for it in final_items if it['item_source']=='anchor')}, Generated={sum(1 for it in final_items if it['item_source']=='gemini_generated')})")


def test_anchor_only_fallback_exact_18():
    print("\n--- 2. Testing Anchor-Only Fallback Assembly (When Gemini returns 0 candidates) ---")
    profile = {
        "id": "user-fallback-002",
        "department": "Field Operations Division",
        "designation": "Junior Statistical Officer",
        "responsibilities": "Field data collection and validation",
        "tools_experience": ["Excel"],
        "self_reported_level": 1,
        "target_competencies": ["c1000000-0000-0000-0000-000000000001"],
        "onboarding_completed": True,
    }

    bp = ContextTargetingEngine.build_blueprint(user_id="user-fallback-002", profile_override=profile)
    anchors = mock_anchor_pool()
    candidates = []  # Gemini failed / 0 candidates

    final_items = BlueprintSelectionEngine.select_final_18(bp, anchors, candidates)

    assert len(final_items) == 18, f"Expected exactly 18 items under full fallback, got {len(final_items)}"
    assert all(it["item_source"] == "anchor" for it in final_items), "All items must be anchors in fallback mode"
    assert len(set(it["prompt"] for it in final_items)) == 18, "No duplicates allowed in fallback"
    print(f"  [+] Fallback Selection Passed: Exactly 18 validated anchors delivered.")


if __name__ == "__main__":
    test_hybrid_selection_exact_18()
    test_anchor_only_fallback_exact_18()
    print("\n==================================================")
    print("   ALL BLUEPRINT SELECTION ENGINE TESTS PASSED!   ")
    print("==================================================")
