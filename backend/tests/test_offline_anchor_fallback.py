import os
import sys
import unittest.mock as mock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.repositories.assessment_repo import AssessmentRepository
from app.repositories.instance_repo import AssessmentInstanceRepository
from app.services.ai_assistant import AIAssistantService
from app.services.assessment_orchestrator import AssessmentOrchestrationService
from app.services.blueprint_selector import BlueprintSelectionEngine
from app.services.targeting_engine import ContextTargetingEngine, FINAL_ASSESSMENT_SIZE


def test_scenario_a_gemini_unavailable_supabase_available():
    """
    Scenario A:
    Gemini is unavailable, but Supabase is available.
    -> Orchestrator falls back to anchor pool retrieved from Supabase.
    -> Exactly 18 items returned.
    """
    with mock.patch.object(AIAssistantService, "generate_baseline_candidates", side_effect=Exception("Gemini quota exhausted (429)")):
        # Supabase returns the live clean anchors
        anchors = AssessmentOrchestrationService.get_clean_anchors()
        assert len(anchors) >= 18, f"Expected at least 18 clean anchors from Supabase, got {len(anchors)}"

        blueprint = ContextTargetingEngine.build_blueprint(user_id="test-user-scenario-a")
        final_18 = BlueprintSelectionEngine.select_final_18(
            blueprint=blueprint,
            anchor_pool=anchors,
            candidate_pool=[],
        )

        assert len(final_18) == FINAL_ASSESSMENT_SIZE == 18
        # Verify all 4 competencies represented
        cids = set(it["competency_id"] for it in final_18)
        assert len(cids) == 4, f"All 4 competencies must be present, got {len(cids)}"
        # Verify no duplicate IDs
        ids = [it["id"] for it in final_18]
        assert len(ids) == len(set(ids)) == 18
        print("  [+] Scenario A Passed: Gemini down + Supabase up -> exactly 18 unique anchors, 4 domains.")


def test_scenario_b_gemini_unavailable_supabase_unavailable():
    """
    Scenario B:
    Gemini unavailable + Supabase unavailable (database network failure / error).
    -> AssessmentRepository falls back to local verified anchors (baseline_anchors.json).
    -> Exactly 18 items assembled.
    """
    # Simulate complete Supabase DB failure
    with mock.patch("app.repositories.assessment_repo.get_supabase", side_effect=Exception("Connection refused (503)")):
        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", side_effect=Exception("Gemini unreachable")):
            anchors = AssessmentOrchestrationService.get_clean_anchors()
            assert len(anchors) == 20, f"Expected 20 local verified anchors from offline JSON, got {len(anchors)}"

            blueprint = ContextTargetingEngine.build_blueprint(user_id="test-user-scenario-b")
            final_18 = BlueprintSelectionEngine.select_final_18(
                blueprint=blueprint,
                anchor_pool=anchors,
                candidate_pool=[],
            )

            assert len(final_18) == 18
            cids = set(it["competency_id"] for it in final_18)
            assert len(cids) == 4, f"All 4 competencies must be represented, got {len(cids)}"
            ids = [it["id"] for it in final_18]
            assert len(ids) == len(set(ids)) == 18
            print("  [+] Scenario B Passed: Gemini down + Supabase down -> 20 local anchors loaded, exactly 18 assembled.")


def test_scenario_c_gemini_available_supabase_unavailable():
    """
    Scenario C:
    Gemini is available, but Supabase is unavailable.
    -> Generates candidates via Gemini, uses local offline anchors for anchor slots.
    -> Exactly 18 items assembled.
    """
    mock_candidates = [
        {
            "id": f"cand-c1-{i}",
            "competency_id": "c1000000-0000-0000-0000-000000000001",
            "prompt": f"Mock statistical inference question prompt {i} with sufficient length?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_index": 0,
            "difficulty": "MEDIUM",
            "item_source": "gemini_generated"
        }
        for i in range(4)
    ]

    with mock.patch("app.repositories.assessment_repo.get_supabase", side_effect=Exception("Connection timeout")):
        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", return_value=mock_candidates):
            anchors = AssessmentOrchestrationService.get_clean_anchors()
            assert len(anchors) == 20

            blueprint = ContextTargetingEngine.build_blueprint(user_id="test-user-scenario-c")
            final_18 = BlueprintSelectionEngine.select_final_18(
                blueprint=blueprint,
                anchor_pool=anchors,
                candidate_pool=mock_candidates,
            )

            assert len(final_18) == 18
            sources = set(it.get("item_source") for it in final_18)
            assert "anchor" in sources
            assert "gemini_generated" in sources
            cids = set(it["competency_id"] for it in final_18)
            assert len(cids) == 4
            print("  [+] Scenario C Passed: Gemini up + Supabase down -> candidates + local anchors assembled.")


def test_scenario_d_full_offline_e2e_isolation():
    """
    Scenario D: Full Offline Isolation Test
    Simulates complete network and database isolation.
    Verifies:
    1. Exactly 18 questions returned.
    2. All 4 competencies represented (minimum 3 per competency).
    3. Zero duplicate IDs.
    4. Valid difficulty strings (EASY, MEDIUM, HARD).
    5. correct_index retained in repository but stripped from learner response.
    """
    with mock.patch("app.repositories.assessment_repo.get_supabase", side_effect=Exception("Network unreachable")):
        with mock.patch.object(AIAssistantService, "generate_baseline_candidates", side_effect=Exception("Offline")):
            # Create instance directly in offline mode
            blueprint = ContextTargetingEngine.build_blueprint(user_id="offline-user-123")
            anchors = AssessmentRepository.get_validated_anchors()
            assert len(anchors) == 20, f"Expected 20 offline anchors, got {len(anchors)}"

            final_18 = BlueprintSelectionEngine.select_final_18(
                blueprint=blueprint,
                anchor_pool=anchors,
                candidate_pool=[],
            )
            assert len(final_18) == 18

            # Save instance into repository (memory fallback active)
            instance = AssessmentInstanceRepository.create_instance(
                user_id="offline-user-123",
                blueprint=blueprint.model_dump(),
                items=final_18,
                generation_mode="anchor_padded",
            )
            instance_id = instance["id"]

            # Verify server-side raw items retain correct_index
            raw_items = AssessmentInstanceRepository.get_raw_instance_items_for_scoring(instance_id)
            assert len(raw_items) == 18
            for it in raw_items:
                assert "correct_index" in it
                assert isinstance(it["correct_index"], int)

            # Verify learner-facing items STRIP correct_index
            learner_items = AssessmentInstanceRepository.get_instance_items_for_learner(instance_id)
            assert len(learner_items) == 18
            for it in learner_items:
                assert "correct_index" not in it, "CRITICAL SECURITY BREACH: correct_index exposed to learner!"
                assert it["difficulty"] in ("EASY", "MEDIUM", "HARD")

            # Check competency distribution (minimum 3 per competency)
            from collections import Counter
            comp_counts = Counter(it["competency_id"] for it in learner_items)
            assert len(comp_counts) == 4, f"All 4 competencies must be represented, got {comp_counts}"
            for cid, count in comp_counts.items():
                assert count >= 3, f"Competency {cid} has {count} items, expected at least 3!"

            print("  [+] Scenario D Passed: Full offline isolation verified. 18 unique items, 4 domains, correct_index protected.")


if __name__ == "__main__":
    print("\n--- Running Offline Anchor Fallback Regression Tests ---")
    test_scenario_a_gemini_unavailable_supabase_available()
    test_scenario_b_gemini_unavailable_supabase_unavailable()
    test_scenario_c_gemini_available_supabase_unavailable()
    test_scenario_d_full_offline_e2e_isolation()
    print("\n==================================================")
    print("   ALL OFFLINE ANCHOR FALLBACK TESTS PASSED!      ")
    print("==================================================")
