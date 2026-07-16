"""
Trivela backend security + flow tests.
Covers:
  - Public endpoints
  - Register/login/me auth flow
  - Admin token unlocks /api/admin/*
  - Non-admin token → 403 on /api/admin/*
  - No token → 401 on /api/admin/*
  - No password leakage in admin/users response
  - Login rate limiting (429 after 8 attempts)
  - Guest order creation
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://preview-project-13.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@trivela.local"
ADMIN_PASSWORD = "Trivela@Admin2026"


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={
        "loginField": ADMIN_EMAIL, "password": ADMIN_PASSWORD
    })
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("user", {}).get("isAdmin") is True, f"expected isAdmin true, got: {data}"
    return data["token"]


@pytest.fixture(scope="session")
def user_credentials():
    ts = int(time.time())
    return {
        "name": "QA Tester",
        "phone": f"9665{ts % 100000000:08d}",
        "email": f"qatester_{ts}_{uuid.uuid4().hex[:6]}@trivela.test",
        "password": "TestPass!123",
    }


@pytest.fixture(scope="session")
def user_token(api, user_credentials):
    r = api.post(f"{BASE_URL}/api/auth/register", json=user_credentials)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    # verify no password leak in register response
    user = data.get("user", {})
    assert "password" not in user
    assert "rawPasswordPlaintext" not in user
    assert "rawPassword" not in user
    assert user.get("isAdmin") is False
    assert data.get("token")
    return data["token"]


# --------------------------------------------------------------------------
# Public endpoints
# --------------------------------------------------------------------------
class TestPublicEndpoints:
    def test_public_content(self, api):
        r = api.get(f"{BASE_URL}/api/public/content")
        assert r.status_code == 200
        j = r.json()
        assert "settings" in j

    def test_players(self, api):
        r = api.get(f"{BASE_URL}/api/players")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_analytics_ping(self, api):
        # try both GET and POST since spec isn't clear
        r = api.get(f"{BASE_URL}/api/public/analytics-ping")
        if r.status_code == 404:
            r = api.post(f"{BASE_URL}/api/public/analytics-ping", json={})
        assert r.status_code in (200, 204), f"analytics-ping returned {r.status_code}: {r.text[:200]}"

    def test_guest_order_creation(self, api):
        payload = {
            "service": "شحن 1000K كوينز",
            "priceSAR": 50,
            "customerName": "Guest QA",
            "customerPhone": f"96650{int(time.time()) % 10000000:07d}",
            "platform": "PS",
            "paymentMethod": "STC Pay",
            "notes": "QA automated test"
        }
        r = api.post(f"{BASE_URL}/api/orders", json=payload)
        assert r.status_code in (200, 201), f"guest order failed: {r.status_code} {r.text[:300]}"


# --------------------------------------------------------------------------
# Auth flow
# --------------------------------------------------------------------------
class TestAuthFlow:
    def test_register_returns_token_no_password_leak(self, user_token):
        # Fixture already asserted; presence of token confirms
        assert user_token and len(user_token) > 0

    def test_auth_me_regular_user(self, api, user_token):
        r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 200
        me = r.json()
        assert me.get("isAdmin") is False
        assert "password" not in me
        assert "rawPasswordPlaintext" not in me

    def test_admin_login_returns_isAdmin_true(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={
            "loginField": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        assert r.status_code == 200
        d = r.json()
        assert d.get("user", {}).get("isAdmin") is True
        assert "password" not in d.get("user", {})


# --------------------------------------------------------------------------
# Admin auth guard — endpoint matrix
# --------------------------------------------------------------------------
ADMIN_ENDPOINTS = [
    ("GET",    "/api/admin/stats",           None),
    ("GET",    "/api/admin/users",           None),
    ("GET",    "/api/admin/orders",          None),
    ("GET",    "/api/admin/settings",        None),
    ("POST",   "/api/admin/reset",           {"type": "logs"}),
    ("GET",    "/api/admin/backup-db",       None),
    ("POST",   "/api/admin/restore-db",      {"users": [], "players": [], "orders": []}),
    # order-specific — use a bogus id since we only test the auth guard
    ("DELETE", "/api/admin/orders/nonexistent_id_zzz", None),
    ("PUT",    "/api/admin/orders/nonexistent_id_zzz/status", {"status": "completed"}),
    ("POST",   "/api/admin/users/nonexistent_id_zzz/points",  {"points": 10, "reason": "qa"}),
]


class TestAdminAuthGuard:
    @pytest.mark.parametrize("method,path,body", ADMIN_ENDPOINTS)
    def test_no_token_returns_401(self, api, method, path, body):
        r = api.request(method, f"{BASE_URL}{path}", json=body)
        assert r.status_code == 401, (
            f"expected 401 without token for {method} {path}, got {r.status_code}: {r.text[:200]}"
        )

    @pytest.mark.parametrize("method,path,body", ADMIN_ENDPOINTS)
    def test_non_admin_token_returns_403(self, api, user_token, method, path, body):
        r = api.request(
            method, f"{BASE_URL}{path}", json=body,
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 403, (
            f"expected 403 with non-admin token for {method} {path}, got {r.status_code}: {r.text[:200]}"
        )

    def test_admin_token_unlocks_stats(self, api, admin_token):
        r = api.get(f"{BASE_URL}/api/admin/stats",
                    headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "totalUsers" in d

    def test_admin_token_unlocks_users_and_no_password_leak(self, api, admin_token):
        r = api.get(f"{BASE_URL}/api/admin/users",
                    headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list) and len(users) > 0
        # verify NO password material is leaked across ALL users
        for u in users:
            for leak_key in ("password", "rawPasswordPlaintext", "rawPassword"):
                assert leak_key not in u, f"LEAK: field {leak_key} exposed for user {u.get('email')}"

    def test_admin_token_unlocks_orders(self, api, admin_token):
        r = api.get(f"{BASE_URL}/api/admin/orders",
                    headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200

    def test_admin_token_unlocks_settings(self, api, admin_token):
        r = api.get(f"{BASE_URL}/api/admin/settings",
                    headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200

    def test_admin_token_unlocks_backup_db(self, api, admin_token):
        r = api.get(f"{BASE_URL}/api/admin/backup-db",
                    headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200

    # Iteration 2 additional security check — token in query-string must NOT work
    def test_admin_token_in_query_string_is_rejected(self, api, admin_token):
        # No Authorization header, token in ?token= must return 401
        r = api.get(f"{BASE_URL}/api/admin/stats?token={admin_token}")
        assert r.status_code == 401, (
            f"expected 401 when admin token is passed as query string, "
            f"got {r.status_code}: {r.text[:200]}"
        )

    def test_admin_token_via_header_still_works_after_query_reject(self, api, admin_token):
        r = api.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert r.status_code == 200, r.text[:300]


# --------------------------------------------------------------------------
# Login rate-limiting (must run last; consumes attempts for this IP)
# --------------------------------------------------------------------------
class TestLoginRateLimit:
    def test_rate_limit_kicks_in_after_8_attempts(self, api):
        # Use a fresh session to avoid session-level pollution — same IP still.
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        got_429 = False
        last_status = None
        last_body = None
        for i in range(12):
            r = s.post(f"{BASE_URL}/api/auth/login", json={
                "loginField": "no_such_user_qa@trivela.test",
                "password": "wrong_password_" + str(i)
            })
            last_status = r.status_code
            last_body = r.text[:200]
            if r.status_code == 429:
                got_429 = True
                # verify Arabic-ish message body exists
                assert r.text and len(r.text) > 0
                break
        assert got_429, f"rate limit never triggered after 12 attempts. last={last_status} body={last_body}"
