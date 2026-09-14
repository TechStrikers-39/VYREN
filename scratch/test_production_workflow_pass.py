import sys
import os
import json
from dotenv import load_dotenv

load_dotenv('backend/.env')
sys.path.insert(0, os.path.abspath('backend'))

from app.core.config import get_settings
from app.repositories.user_repo import UserRepository
from app.services.gap_engine import GapEngine, DEMO_DESIGNATION_REQUIREMENTS
from app.services.ai_assistant import AIAssistantService, validate_9_stage_item
from app.repositories.admin_repo import AdminRepository
from app.services.igot_client import IGOTClientService

def test_designation_mapping_and_gap_engine():
    print("\n--- Testing Designation Mapping & GapEngine ---")
    # Test assistant director mappings
    assert "Assistant Director (Data Analytics)" in DEMO_DESIGNATION_REQUIREMENTS
    ad_reqs = DEMO_DESIGNATION_REQUIREMENTS["Assistant Director (Data Analytics)"]
    assert len(ad_reqs) == 4
    for comp_name, req_level in ad_reqs.items():
        lvl, source = GapEngine.resolve_required_level(
            competency_name=comp_name,
            competency_id="c1000000-0000-0000-0000-000000000001",
            default_level=3,
            designation="Assistant Director (Data Analytics)"
        )
        assert lvl == req_level, f"Expected required_level={req_level}, got {lvl}"
        assert "Demonstration Mapping" in source or "Official" in source

    # Test unknown designation fallback
    fallback_lvl, fallback_src = GapEngine.resolve_required_level(
        competency_name="Unknown",
        competency_id="c1000000-0000-0000-0000-000000000001",
        default_level=3,
        designation="Unknown Designation"
    )
    assert fallback_lvl == 3
    assert fallback_src == "Default Competency Standard"
    print("PASS: Designation-to-competency requirement resolution verified.")

def test_9_stage_item_validation():
    print("\n--- Testing 9-Stage MCQ Validation Pipeline ---")
    # Valid MoSPI item
    valid_item = {
        "competency_id": "c1000000-0000-0000-0000-000000000001",
        "prompt": "In a national statistical survey conducted by MoSPI, when stratified sampling encounters non-response, which estimator minimizes sample variance?",
        "options": [
            "Horvitz-Thompson generalized regression estimator",
            "Simple unweighted sample mean",
            "Random hot-deck imputation without adjustment",
            "Arbitrary outlier truncation"
        ],
        "correct_index": 0,
        "rationale": "The Horvitz-Thompson regression estimator incorporates auxiliary population totals to correct non-response bias and minimize variance.",
        "difficulty": "HARD"
    }
    
    validation_res = validate_9_stage_item(valid_item)
    assert validation_res["is_valid"] is True, f"Validation failed: {validation_res}"
    assert validation_res["passed_stages_count"] == 9
    print(f"PASS: Valid item passed all 9 stages: {validation_res['stage_breakdown']}")

    # Invalid item (only 2 options, short prompt, invalid correct_index)
    invalid_item = {
        "prompt": "Too short",
        "options": ["A", "B"],
        "correct_index": 5,
        "rationale": "",
        "difficulty": "EASY"
    }
    fail_res = validate_9_stage_item(invalid_item)
    assert fail_res["is_valid"] is False
    assert fail_res["stage_breakdown"]["1_option_count"] is False
    assert fail_res["stage_breakdown"]["3_valid_correct_index"] is False
    assert fail_res["stage_breakdown"]["4_prompt_depth"] is False
    print("PASS: Invalid item rejected at failing validation stages.")

def test_admin_training_effectiveness():
    print("\n--- Testing Admin Training Program Effectiveness ---")
    effectiveness = AdminRepository.get_training_effectiveness()
    assert isinstance(effectiveness, dict)
    assert "programs" in effectiveness
    programs = effectiveness["programs"]
    assert isinstance(programs, list)
    assert len(programs) >= 1
    for p in programs:
        assert "course_id" in p
        assert "title" in p
        assert "enrolled_count" in p
        assert "completed_count" in p
        assert "completion_rate" in p
        assert "avg_progress" in p
    print(f"PASS: Training effectiveness aggregated {len(programs)} courses (Total enrollments: {effectiveness.get('total_enrollments')}).")

def test_live_igot_provider_status():
    print("\n--- Testing Live Sunbird iGOT Provider Status ---")
    status = IGOTClientService.get_status()
    print(f"Provider: {status.get('provider')} | Mode: {status.get('mode')} | Real: {status.get('is_real')}")
    assert status.get("is_real") is True
    assert "REAL" in status.get("mode")
    
    # Test lightweight live search
    courses = IGOTClientService.search_courses(query="Statistics")
    assert isinstance(courses, list)
    assert len(courses) > 0
    print(f"PASS: Live Sunbird search returned {len(courses)} courses (Top: {courses[0].get('title')}).")

if __name__ == "__main__":
    test_designation_mapping_and_gap_engine()
    test_9_stage_item_validation()
    test_admin_training_effectiveness()
    test_live_igot_provider_status()
    print("\n=======================================================")
    print("ALL PRODUCTION WORKFLOW BACKEND SUITE TESTS PASSED!")
    print("=======================================================")
