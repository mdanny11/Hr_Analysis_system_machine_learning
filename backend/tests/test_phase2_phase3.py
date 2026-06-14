from fastapi.testclient import TestClient


def test_list_models(client: TestClient, auth_headers):
    headers = auth_headers("analyst@ison.com")
    response = client.get("/api/v1/models", headers=headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) == 3


def test_risk_summary(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/risk/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "highRisk" in data
    assert data["totalEmployees"] == 500


def test_predictions_at_risk(client: TestClient, auth_headers):
    headers = auth_headers("analyst@ison.com")
    response = client.get("/api/v1/predictions/at-risk?threshold=60", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json()["data"], list)


def test_report_templates(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/reports/templates", headers=headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 5


def test_alerts_list(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/alerts", headers=headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 1


def test_engagement_summary(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/engagement/summary", headers=headers)
    assert response.status_code == 200
    assert "overallScore" in response.json()["data"]


def test_benchmarks(client: TestClient, auth_headers):
    headers = auth_headers("analyst@ison.com")
    response = client.get("/api/v1/benchmarks/industry?industry=technology", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["industry"] == "technology"


def test_retention_strategies(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/retention/strategies", headers=headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 3
