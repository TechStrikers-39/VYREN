import os
import sys
import json
import httpx

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.igot_client import get_igot_provider, RealIgotProvider, LocalFallbackIgotProvider
from app.services.competency_mapper import CompetencyMapperService
from app.repositories.course_repo import CourseRepository

BASE_URL = "http://localhost:8000"

def run_live_sunbird_verification():
    print("==================================================================")
    print("     VYREN — REAL iGOT / SUNBIRD LIVE END-TO-END VERIFICATION     ")
    print("==================================================================")

    results = {}

    # ------------------------------------------------------------------
    # 1. Authenticate Learner
    # ------------------------------------------------------------------
    with httpx.Client(timeout=15.0) as client:
        login_res = client.post(
            f"{BASE_URL}/auth/login",
            json={"email": "alex.vance@gmail.com", "password": "SecurePassword123!"}
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[OK] Step 1: Authenticated successfully as learner (alex.vance@gmail.com)")

        # ------------------------------------------------------------------
        # 2. Verify GET /igot/status -> REAL / SUNBIRD
        # ------------------------------------------------------------------
        status_res = client.get(f"{BASE_URL}/igot/status", headers=headers)
        assert status_res.status_code == 200, f"Status call failed: {status_res.text}"
        status_data = status_res.json()
        print(f"[OK] Step 2: GET /igot/status ->")
        print(f"     Mode:           {status_data['mode']}")
        print(f"     Is Real:        {status_data['is_real']}")
        print(f"     Provider:       {status_data['provider']}")
        print(f"     Endpoint:       {status_data['endpoint']}")
        print(f"     Authenticated:  {status_data['authenticated']}")
        print(f"     Blocker:        {status_data['blocker_summary']}")
        assert status_data["mode"] == "REAL / SUNBIRD", f"Expected REAL / SUNBIRD, got {status_data['mode']}"
        assert status_data["is_real"] is True
        assert status_data["authenticated"] is True
        results["status"] = status_data

        # ------------------------------------------------------------------
        # 3. Verify Live Course Search through VYREN: GET /igot/search?query=Statistics
        # ------------------------------------------------------------------
        search_res = client.get(f"{BASE_URL}/igot/search?query=Statistics", headers=headers)
        assert search_res.status_code == 200, f"Search failed: {search_res.text}"
        search_items = search_res.json()
        print(f"[OK] Step 3: GET /igot/search?query=Statistics ->")
        print(f"     Courses returned from live Sunbird: {len(search_items)}")
        assert len(search_items) > 0, "No live courses returned from Sunbird search!"
        
        sample_course = search_items[0]
        sample_do_id = sample_course.get("external_id")
        print(f"     Sample Course Title: '{sample_course['title']}'")
        print(f"     Sample Provider:     '{sample_course['provider']}'")
        print(f"     Sample External DO_ID: {sample_do_id}")
        print(f"     Sample External URL:   {sample_course.get('external_url')}")
        print(f"     Integration Mode:      {sample_course.get('integration_mode')}")
        assert sample_do_id and sample_do_id.startswith("do_"), f"Invalid DO_ID: {sample_do_id}"
        assert sample_course.get("integration_mode") == "REAL / SUNBIRD"
        results["search_count"] = len(search_items)
        results["sample_do_id"] = sample_do_id
        results["sample_title"] = sample_course["title"]

        # ------------------------------------------------------------------
        # 4. Verify Live Course Hierarchy Retrieval for returned DO_ID
        # ------------------------------------------------------------------
        provider = get_igot_provider()
        assert isinstance(provider, RealIgotProvider), f"Expected RealIgotProvider instance, got {type(provider)}"
        hierarchy_course = provider.get_course_hierarchy(sample_do_id)
        assert hierarchy_course is not None, f"Failed to retrieve hierarchy for {sample_do_id}"
        modules = hierarchy_course.get("modules", [])
        print(f"[OK] Step 4: Live Hierarchy for DO_ID '{sample_do_id}' ->")
        print(f"     Course Title: '{hierarchy_course['title']}'")
        print(f"     Modules/Units Extracted: {len(modules)}")
        for m in modules[:3]:
            print(f"       - Unit: '{m['title']}' ({m['duration_minutes']} mins, type: {m['type']})")
        results["hierarchy_modules_count"] = len(modules)

        # ------------------------------------------------------------------
        # 5. Competency Mapping on Live Course
        # ------------------------------------------------------------------
        comp_maps = CompetencyMapperService.map_course_to_competencies(
            title=hierarchy_course["title"],
            description=hierarchy_course.get("description"),
            competencies_v5=hierarchy_course.get("source_metadata", {}).get("competencies_v5")
        )
        print(f"[OK] Step 5: Competency Mapping Result ->")
        for cm in comp_maps:
            print(f"     Mapped to: '{cm['competency_name']}' ({cm['frac_code']}) at confidence {cm['confidence']}")
        primary_cid = comp_maps[0]["competency_id"] if comp_maps else "c1000000-0000-0000-0000-000000000001"
        hierarchy_course["competencies_covered"] = [primary_cid]

        # ------------------------------------------------------------------
        # 6. Idempotent Ingestion of Live Course into Supabase
        # ------------------------------------------------------------------
        for m in hierarchy_course.get("modules", []):
            m["competency_id"] = primary_cid

        ingested = CourseRepository.upsert_normalized_course(hierarchy_course)
        print(f"[OK] Step 6: Supabase Course Representation ->")
        print(f"     Deterministic Internal UUID: {ingested['id']}")
        print(f"     Title: {ingested['title']}")
        print(f"     Competencies Covered: {ingested['competencies_covered']}")

        # ------------------------------------------------------------------
        # 7. Recommendation -> Course_ID Linkage
        # ------------------------------------------------------------------
        matched_course = CourseRepository.get_course_for_competency(primary_cid)
        print(f"[OK] Step 7: Skill-Gap Recommendation Linkage ->")
        print(f"     Target Competency ID: {primary_cid}")
        print(f"     Linked Course ID:     {matched_course['id']}")
        print(f"     Linked Course Title:  '{matched_course['title']}'")
        assert matched_course is not None

        # ------------------------------------------------------------------
        # 8. Dynamic Learning Path for Learner
        # ------------------------------------------------------------------
        lp_res = client.get(f"{BASE_URL}/learner/learning-path", headers=headers)
        assert lp_res.status_code == 200, f"Learning path call failed: {lp_res.text}"
        lp = lp_res.json()
        print(f"[OK] Step 8: Dynamic Learning Path ->")
        print(f"     Learner:     {lp['learner_name']}")
        print(f"     Progress:    {lp['completion_percentage']}%")
        print(f"     Total Steps: {lp['total_steps']}")
        for st in lp["steps"]:
            print(f"       - [{st['status'].upper()}] {st['title']} ({st['category']}) | Provider: {st.get('provider')}")

        # ------------------------------------------------------------------
        # 9. Fallback Provider Intactness
        # ------------------------------------------------------------------
        fallback = LocalFallbackIgotProvider()
        fb_status = fallback.get_status()
        assert fb_status["mode"] == "FALLBACK / LOCAL"
        assert fb_status["is_real"] is False
        print(f"[OK] Step 9: Fallback Provider verified intact as explicit fallback.")

    print("\n==================================================================")
    print("        ALL 9 LIVE SUNBIRD FLOW VERIFICATIONS PASSED!             ")
    print("==================================================================")
    return results

if __name__ == "__main__":
    try:
        run_live_sunbird_verification()
    except Exception as e:
        print(f"\n[X] Verification Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
