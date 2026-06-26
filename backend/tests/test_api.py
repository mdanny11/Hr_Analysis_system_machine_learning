from fastapi.testclient import TestClient


def test_health(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_login_success(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ison.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "accessToken" in data
    assert data["user"]["role"] == "admin"


def test_login_invalid_credentials(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ison.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_list_employees(client: TestClient, auth_headers):
    headers = auth_headers()
    response = client.get("/api/v1/employees?page=1&limit=10", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) == 10
    assert body["meta"]["total"] == 500


def test_department_head_scoped(client: TestClient, auth_headers):
    headers = auth_headers("head@ison.com")
    response = client.get("/api/v1/employees?limit=100", headers=headers)
    assert response.status_code == 200
    employees = response.json()["data"]
    assert all(emp["department"] == "Engineering" for emp in employees)


def test_audit_logs(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    response = client.get("/api/v1/audit/logs", headers=headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 1


def test_create_user_with_password(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "newuser@ison.com",
            "password": "securePass1",
            "name": "New User",
            "role": "hr-analyst",
            "department": "Human Resources",
        },
    )
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "newuser@ison.com"
    assert "password" not in response.json()["data"]

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "newuser@ison.com", "password": "securePass1"},
    )
    assert login_response.status_code == 200


def test_create_user_duplicate_email(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "admin@ison.com",
            "password": "securePass1",
            "name": "Duplicate",
            "role": "hr-analyst",
        },
    )
    assert response.status_code == 409


def test_admin_reset_password(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    users = client.get("/api/v1/users", headers=headers).json()["data"]
    target = next(u for u in users if u["email"] == "manager@ison.com")

    reset_response = client.post(
        f"/api/v1/users/{target['id']}/reset-password",
        headers=headers,
        json={"password": "newPass456"},
    )
    assert reset_response.status_code == 200
    assert "password" not in reset_response.json()["data"]["user"]

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "manager@ison.com", "password": "newPass456"},
    )
    assert login_response.status_code == 200


def test_submit_access_request(client: TestClient):
    response = client.post(
        "/api/v1/access-requests",
        json={
            "name": "Jane Applicant",
            "email": "jane.applicant@ison.com",
            "department": "Human Resources",
            "jobTitle": "HR Coordinator",
            "requestedRole": "hr-analyst",
            "justification": "Need access for reporting",
            "managerEmail": "manager@ison.com",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["referenceId"].startswith("AR-")
    assert data["status"] == "pending"


def test_access_request_workflow(client: TestClient, auth_headers):
    submit = client.post(
        "/api/v1/access-requests",
        json={
            "name": "Workflow User",
            "email": "workflow.user@ison.com",
            "department": "Engineering",
            "jobTitle": "Analyst",
            "requestedRole": "hr-analyst",
            "justification": "Project work",
            "managerEmail": "head@ison.com",
        },
    )
    assert submit.status_code == 200

    admin_headers = auth_headers("admin@ison.com")
    list_response = client.get("/api/v1/access-requests?status=pending", headers=admin_headers)
    assert list_response.status_code == 200
    requests = list_response.json()["data"]
    assert any(r["email"] == "workflow.user@ison.com" for r in requests)
    request_id = next(r["id"] for r in requests if r["email"] == "workflow.user@ison.com")

    approve_response = client.post(
        f"/api/v1/access-requests/{request_id}/approve",
        headers=admin_headers,
        json={"role": "hr-analyst", "password": "approvedPass1"},
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["data"]["user"]["email"] == "workflow.user@ison.com"

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "workflow.user@ison.com", "password": "approvedPass1"},
    )
    assert login_response.status_code == 200


def test_reject_access_request(client: TestClient, auth_headers):
    submit = client.post(
        "/api/v1/access-requests",
        json={
            "name": "Rejected User",
            "email": "rejected.user@ison.com",
            "department": "Finance",
            "jobTitle": "Analyst",
            "requestedRole": "hr-analyst",
            "justification": "Temporary access",
            "managerEmail": "manager@ison.com",
        },
    )
    assert submit.status_code == 200

    admin_headers = auth_headers("admin@ison.com")
    list_response = client.get("/api/v1/access-requests?status=pending", headers=admin_headers)
    request_id = next(
        r["id"] for r in list_response.json()["data"] if r["email"] == "rejected.user@ison.com"
    )

    reject_response = client.post(
        f"/api/v1/access-requests/{request_id}/reject",
        headers=admin_headers,
        json={"reason": "Insufficient authorization."},
    )
    assert reject_response.status_code == 200
    assert reject_response.json()["data"]["request"]["status"] == "rejected"


def test_access_requests_require_admin(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/access-requests", headers=headers)
    assert response.status_code == 403
