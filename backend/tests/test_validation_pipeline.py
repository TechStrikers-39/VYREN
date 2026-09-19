import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.validation_pipeline import ValidationPipeline


def test_valid_item_passes():
    print("--- 1. Testing Fully Valid Item ---")
    valid_item = {
        "competency_id": "c1000000-0000-0000-0000-000000000001",
        "prompt": "In an official sample survey with stratified two-stage sampling design, how is design-unbiased Horvitz-Thompson estimation performed?",
        "options": [
            "By weighting each observation with the reciprocal of its inclusion probability",
            "By taking the unweighted arithmetic mean of all surveyed primary sampling units",
            "By normalizing all sample values to a standard normal Gaussian distribution",
            "By discarding clusters whose variance exceeds the national median threshold"
        ],
        "correct_index": 0,
        "difficulty": "HARD",
        "weight": 1.0,
        "question_type": "APPLIED",
        "target_proficiency": 3,
        "rationale": "Under Horvitz-Thompson estimation theory, weighting each observation by the reciprocal of its inclusion probability (multiplier) guarantees an unbiased estimator of universe totals."
    }

    res = ValidationPipeline.validate_item(valid_item, locale="en")
    assert res["is_valid"] is True, f"Valid item failed hard checks: {res['hard_failures']}"
    assert res["passed_stages_count"] >= 17, f"Expected high stage pass count, got {res['passed_stages_count']}"
    print(f"  [+] Valid Item Passed ({res['passed_stages_count']}/18 stages).")


def test_hard_rejections():
    print("\n--- 2. Testing Hard Rejections ---")
    base_item = {
        "competency_id": "c1000000-0000-0000-0000-000000000001",
        "prompt": "What is the primary formula for computing Consumer Price Index?",
        "options": ["Modified Laspeyres", "Paasche", "Fisher", "Simple Average"],
        "correct_index": 0,
        "difficulty": "MEDIUM",
        "rationale": "CPI official compilation uses the Modified Laspeyres formula with base-year weights."
    }

    # A: Fewer than 4 options
    bad_options = dict(base_item, options=["Option 1", "Option 2", "Option 3"])
    r1 = ValidationPipeline.validate_item(bad_options)
    assert r1["is_valid"] is False
    assert "1_option_count" in r1["hard_failures"]

    # B: Trivial giveaway distractor
    giveaway = dict(base_item, options=["Modified Laspeyres", "Paasche", "Fisher", "All of the above"])
    r2 = ValidationPipeline.validate_item(giveaway)
    assert r2["is_valid"] is False
    assert "7_distractor_quality" in r2["hard_failures"]

    # C: Test artifact detection
    artifact = dict(base_item, prompt="Automated audit verification item - Test 99882233")
    r3 = ValidationPipeline.validate_item(artifact)
    assert r3["is_valid"] is False
    assert "12_test_artifact_detection" in r3["hard_failures"]

    # D: Duplicate detection
    existing = ["What is the primary formula for computing Consumer Price Index?"]
    r4 = ValidationPipeline.validate_item(base_item, existing_prompts=existing)
    assert r4["is_valid"] is False
    assert "11_duplicate_detection" in r4["hard_failures"]

    print("  [+] All 4 hard rejection categories correctly blocked invalid items.")


def test_language_validation():
    print("\n--- 3. Testing Language Validation (Hindi & English) ---")
    hi_valid = {
        "competency_id": "c1000000-0000-0000-0000-000000000001",
        "prompt": "राष्ट्रीय नमूना सर्वेक्षण (NSS) पद्धति में प्राथमिक नमूनाकरण इकाई (PSU) का क्या महत्व है?",
        "options": [
            "प्रथम चरण में चयनित भौगोलिक क्लस्टर",
            "अंतिम चरण का पारिवारिक प्रतिदर्श",
            "राज्य स्तरीय सांख्यिकी कार्यालय",
            "केंद्रीय प्रगणक सूची"
        ],
        "correct_index": 0,
        "difficulty": "MEDIUM",
        "rationale": "एनएसएस सर्वेक्षण में प्रथम चरण इकाइयां फील्ड कार्य लागत को अनुकूलित करने के लिए क्लस्टर बनाती हैं।"
    }

    r_hi = ValidationPipeline.validate_item(hi_valid, locale="hi")
    assert r_hi["is_valid"] is True, f"Valid Hindi item failed: {r_hi['hard_failures']}"
    print("  [+] Valid Hindi item passed language consistency check.")

    # English text passed to Hindi locale should fail stage 18
    en_in_hi = {
        "competency_id": "c1000000-0000-0000-0000-000000000001",
        "prompt": "What is the key assumption of Ordinary Least Squares regression?",
        "options": ["Homoscedasticity", "Multicollinearity", "Heteroscedasticity", "Autocorrelation"],
        "correct_index": 0,
        "difficulty": "HARD",
        "rationale": "Homoscedasticity ensures error terms have constant finite variance across observations."
    }
    r_fail = ValidationPipeline.validate_item(en_in_hi, locale="hi")
    assert r_fail["is_valid"] is False
    assert "18_language_consistency" in r_fail["hard_failures"]
    print("  [+] English item in Hindi locale correctly failed language check.")


if __name__ == "__main__":
    test_valid_item_passes()
    test_hard_rejections()
    test_language_validation()
    print("\n==================================================")
    print("   ALL VALIDATION PIPELINE TESTS PASSED!          ")
    print("==================================================")
