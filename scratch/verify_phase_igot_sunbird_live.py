import httpx
import sys

BASE_URL = "http://localhost:8000"

def test_live():
    print("=== LIVE FASTAPI BACKEND VERIFICATION ===")
    
    with httpx.Client(timeout=10.0) as client:
        # 1. Login
        login_res = client.post(
            f"{BASE_URL}/auth/login",
            json={"email": "alex.vance@gmail.com", "password": "SecurePassword123!"}
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"[OK] Login successful for alex.vance@gmail.com")

        # 2. iGOT Status
        status_res = client.get(f"{BASE_URL}/igot/status", headers=headers)
        assert status_res.status_code == 200, f"Status failed: {status_res.text}"
        st = status_res.json()
        print(f"[OK] GET /igot/status -> Mode: '{st['mode']}', Provider: '{st['provider']}', Authenticated: {st['authenticated']}")
        assert st["mode"] in ("FALLBACK / LOCAL", "REAL / SUNBIRD")

        # 3. iGOT FRAC mapping
        frac_res = client.get(f"{BASE_URL}/igot/frac-mapping", headers=headers)
        assert frac_res.status_code == 200, f"FRAC mapping failed: {frac_res.text}"
        fracs = frac_res.json()
        print(f"[OK] GET /igot/frac-mapping -> {len(fracs)} FRAC mappings retrieved")
        assert len(fracs) == 4

        # 4. iGOT Courses
        courses_res = client.get(f"{BASE_URL}/igot/courses", headers=headers)
        assert courses_res.status_code == 200, f"Courses failed: {courses_res.text}"
        courses = courses_res.json()
        print(f"[OK] GET /igot/courses -> {len(courses)} courses retrieved from active provider")

        # 5. iGOT Search
        search_res = client.get(f"{BASE_URL}/igot/search?query=pipeline", headers=headers)
        assert search_res.status_code == 200, f"Search failed: {search_res.text}"
        searched = search_res.json()
        print(f"[OK] GET /igot/search?query=pipeline -> {len(searched)} courses matched")

        # 6. Learner Dynamic Learning Path
        lp_res = client.get(f"{BASE_URL}/learner/learning-path", headers=headers)
        assert lp_res.status_code == 200, f"Learning Path failed: {lp_res.text}"
        lp = lp_res.json()
        print(f"[OK] GET /learner/learning-path -> Learner: '{lp['learner_name']}', Progress: {lp['completion_percentage']}%, Steps: {lp['total_steps']}")
        for s in lp["steps"]:
            print(f"    - [{s['status'].upper()}] {s['title']} ({s['category']}) -> {s['link']}")

        # 7. Learner Passport
        passport_res = client.get(f"{BASE_URL}/igot/passport", headers=headers)
        assert passport_res.status_code == 200, f"Passport failed: {passport_res.text}"
        p = passport_res.json()
        print(f"[OK] GET /igot/passport -> Passport ID: {p['passport_id']}, Standard: {p['credential_standard']}, Claims: {len(p['claims'])}")

        print("\n=== ALL LIVE BACKEND ENDPOINTS VERIFIED SUCCESSFULLY ===")

if __name__ == "__main__":
    try:
        test_live()
    except Exception as e:
        print(f"[X] Verification failed: {e}")
        sys.exit(1)
