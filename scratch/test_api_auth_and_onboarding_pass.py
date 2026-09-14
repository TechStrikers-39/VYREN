import urllib.request
import urllib.parse
import json
import uuid

BASE_URL = "http://localhost:8000"

def make_req(endpoint, method="GET", data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body

def test_admin_registration_blocked():
    print("\n--- Testing Admin Self-Registration Blocked (Security Rule) ---")
    random_email = f"attacker_{uuid.uuid4().hex[:6]}@example.com"
    status, res = make_req("/auth/register", method="POST", data={
        "email": random_email,
        "password": "Password123!",
        "role": "admin"
    })
    print(f"Status: {status} | Response: {res}")
    assert status == 403, f"Expected 403, got {status}"
    assert "cannot be self-registered" in str(res)
    print("PASS: Public registration of 'admin' role correctly blocked with 403 Forbidden.")

def test_learner_login_and_onboarding():
    print("\n--- Testing Learner Login, Profile, and Context Onboarding ---")
    # Login as verified learner alex.vance@gmail.com
    status, res = make_req("/auth/login", method="POST", data={
        "email": "alex.vance@gmail.com",
        "password": "SecurePassword123!"
    })
    assert status == 200, f"Login failed: {res}"
    token = res["access_token"]
    user = res["user"]
    print(f"PASS: Logged in as {user['email']} (Role: {user['role']})")

    # Get profile
    status, prof = make_req("/learner/profile", token=token)
    assert status == 200
    print(f"Learner profile retrieved: {prof.get('full_name')} (Onboarding completed: {prof.get('onboarding_completed')})")

    # Submit onboarding
    onboarding_payload = {
        "department": "National Statistical Systems Training Academy (NSSTA)",
        "designation": "Assistant Director (Data Analytics)",
        "responsibilities": "National accounts compilation and sample survey variance modeling.",
        "tools_experience": ["Python", "SQL", "R"],
        "self_reported_level": 3,
        "target_competencies": ["c1000000-0000-0000-0000-000000000001", "c1000000-0000-0000-0000-000000000002"]
    }
    status, updated_prof = make_req("/learner/onboarding", method="POST", data=onboarding_payload, token=token)
    assert status == 200, f"Onboarding failed: {updated_prof}"
    assert updated_prof["onboarding_completed"] is True
    assert updated_prof["designation"] == "Assistant Director (Data Analytics)"
    print(f"PASS: Learner onboarding successfully recorded. (onboarding_completed=True)")

def test_rbac_enforcement():
    print("\n--- Testing Server-Side RBAC Enforcement ---")
    # Login as learner
    _, res = make_req("/auth/login", method="POST", data={
        "email": "alex.vance@gmail.com",
        "password": "SecurePassword123!"
    })
    learner_token = res["access_token"]

    # Attempt to access admin endpoint
    admin_status, admin_res = make_req("/admin/users", token=learner_token)
    assert admin_status == 403
    print(f"PASS: Learner blocked from /admin/users (HTTP 403 Forbidden).")

    # Attempt to access trainer endpoint
    trainer_status, trainer_res = make_req("/trainer/items", token=learner_token)
    assert trainer_status == 403
    print(f"PASS: Learner blocked from /trainer/items (HTTP 403 Forbidden).")

if __name__ == "__main__":
    test_admin_registration_blocked()
    test_learner_login_and_onboarding()
    test_rbac_enforcement()
    print("\n=======================================================")
    print("ALL API AUTH & ONBOARDING SECURITY TESTS PASSED!")
    print("=======================================================")
