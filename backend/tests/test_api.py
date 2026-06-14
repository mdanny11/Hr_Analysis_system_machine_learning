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
