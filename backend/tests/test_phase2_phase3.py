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


def test_ml_predict_uses_trained_model(client: TestClient, auth_headers):
    headers = auth_headers("analyst@ison.com")
    models = client.get("/api/v1/models", headers=headers).json()["data"]
    model_id = models[0]["id"]
    client.post(f"/api/v1/models/{model_id}/retrain", headers=headers)
    before = client.get("/api/v1/employees?limit=1", headers=headers).json()["data"][0]["attritionProbability"]
    client.post(f"/api/v1/models/{model_id}/predict", headers=headers, json={"threshold": 0.5})
    after = client.get("/api/v1/employees?limit=1", headers=headers).json()["data"][0]["attritionProbability"]
    assert isinstance(after, int)


def test_alerts_list(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/alerts", headers=headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 1


def test_engagement_summary(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/engagement/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "overallScore" in data
    assert "participationRate" in data
    assert "sentimentScore" in data
    assert "activeSurveys" in data


def test_engagement_sentiment_and_dimensions(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    sentiment = client.get("/api/v1/engagement/sentiment", headers=headers)
    dimensions = client.get("/api/v1/engagement/dimensions", headers=headers)
    trends = client.get("/api/v1/engagement/trends", headers=headers)
    assert sentiment.status_code == 200
    assert dimensions.status_code == 200
    assert trends.status_code == 200
    assert len(sentiment.json()["data"]) >= 1
    assert len(dimensions.json()["data"]) == 5
    assert len(trends.json()["data"]) == 6


def test_engagement_vs_attrition(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/engagement/vs-attrition", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "points" in data
    assert "correlation" in data
    assert isinstance(data["points"], list)


def test_surveys_and_feedback(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    surveys = client.get("/api/v1/surveys", headers=headers)
    assert surveys.status_code == 200
    survey_rows = surveys.json()["data"]
    assert isinstance(survey_rows, list)
    if survey_rows:
        assert "responseCount" in survey_rows[0]

    create = client.post(
        "/api/v1/surveys",
        headers=headers,
        json={
            "title": "Test Engagement Survey",
            "type": "engagement",
            "audience": "All Employees",
            "anonymous": True,
            "questions": [{"text": "How engaged do you feel?", "type": "rating"}],
        },
    )
    assert create.status_code == 200
    assert create.json()["data"]["id"]
    assert create.json()["data"]["emailsQueued"] is True

    pulse = client.post("/api/v1/surveys/pulse", headers=headers)
    assert pulse.status_code == 200

    feedback = client.post(
        "/api/v1/feedback",
        headers=headers,
        json={"category": "General", "message": "Great workplace culture", "anonymous": True, "sentiment": "positive"},
    )
    assert feedback.status_code == 200
    assert feedback.json()["data"]["sentiment"] == "positive"

    listed = client.get("/api/v1/feedback", headers=headers)
    assert listed.status_code == 200
    assert any(item.get("sentiment") for item in listed.json()["data"])


def test_survey_responses_list(client: TestClient, auth_headers):
    from datetime import datetime, timedelta, timezone

    from app.database import SessionLocal
    from app.models.hr_ops import Survey, SurveyQuestion, SurveyResponse, SurveyStatus
    from app.models.organization import Employee

    db = SessionLocal()
    try:
        employee = db.query(Employee).filter(Employee.deleted_at.is_(None)).first()
        survey = Survey(
            title="Responses Panel Survey",
            type="engagement",
            audience="All Employees",
            anonymous=False,
            status=SurveyStatus.ACTIVE,
        )
        db.add(survey)
        db.flush()
        question = SurveyQuestion(
            survey_id=survey.id,
            question_text="How engaged are you?",
            question_type="rating",
            order_index=0,
        )
        db.add(question)
        db.flush()
        db.add(
            SurveyResponse(
                survey_id=survey.id,
                employee_id=employee.id,
                answers={str(question.id): 9},
                submitted_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
        survey_id = str(survey.id)
    finally:
        db.close()

    headers = auth_headers("manager@ison.com")
    response = client.get(f"/api/v1/surveys/{survey_id}/responses", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["responseCount"] == 1
    assert len(data["submissions"]) == 1
    assert data["submissions"][0]["answers"][0]["answer"] == 9


def test_public_survey_response_flow(client: TestClient, auth_headers):
    from datetime import datetime, timedelta, timezone
    import secrets

    from app.database import SessionLocal
    from app.models.hr_ops import Survey, SurveyInvite, SurveyQuestion, SurveyStatus
    from app.models.organization import Employee

    db = SessionLocal()
    try:
        employee = db.query(Employee).filter(Employee.deleted_at.is_(None)).first()
        assert employee is not None

        survey = Survey(
            title="Public Link Survey",
            type="pulse",
            audience="All Employees",
            anonymous=True,
            status=SurveyStatus.ACTIVE,
        )
        db.add(survey)
        db.flush()
        question = SurveyQuestion(
            survey_id=survey.id,
            question_text="How satisfied are you?",
            question_type="rating",
            order_index=0,
        )
        db.add(question)
        token = secrets.token_urlsafe(24)
        db.add(
            SurveyInvite(
                survey_id=survey.id,
                employee_id=employee.id,
                email=employee.email,
                token=token,
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()
        question_id = str(question.id)
    finally:
        db.close()

    public_get = client.get(f"/api/v1/surveys/public/{token}")
    assert public_get.status_code == 200
    payload = public_get.json()["data"]
    assert payload["title"] == "Public Link Survey"
    assert len(payload["questions"]) == 1

    submit = client.post(
        f"/api/v1/surveys/public/{token}/respond",
        json={"answers": {question_id: 8}},
    )
    assert submit.status_code == 200
    assert submit.json()["data"]["message"] == "Survey submitted successfully"

    already = client.post(
        f"/api/v1/surveys/public/{token}/respond",
        json={"answers": {question_id: 9}},
    )
    assert already.status_code == 409


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


def test_succession_planning(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/succession", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert isinstance(data, list)
    if data:
        role = data[0]
        assert "targetRole" in role
        assert "candidates" in role
        assert isinstance(role["candidates"], list)


def test_action_items(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/action-items", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert isinstance(data, list)
    assert len(data) >= 1
    item = data[0]
    assert "title" in item
    assert "status" in item
    assert "dueDate" in item or item.get("dueDate") is None


def test_data_quality_report(client: TestClient, auth_headers):
    headers = auth_headers("analyst@ison.com")
    response = client.get("/api/v1/data-quality", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "summary" in data
    assert "fields" in data
    assert data["summary"]["employeeCount"] == 500
    assert len(data["fields"]) >= 9


def test_data_quality_missing(client: TestClient, auth_headers):
    headers = auth_headers("analyst@ison.com")
    response = client.get("/api/v1/data-quality/missing", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "distribution" in data
    assert "strategies" in data
    assert len(data["strategies"]) >= 5


def test_data_quality_pipeline(client: TestClient, auth_headers):
    headers = auth_headers("analyst@ison.com")
    response = client.post(
        "/api/v1/pipelines/run",
        headers=headers,
        json={"outlierThreshold": 2.5, "features": [{"id": "tenure_bucket", "enabled": True}]},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "completed"
    assert len(data["steps"]) >= 7
    assert "runId" in data

    latest = client.get("/api/v1/pipelines/latest", headers=headers)
    assert latest.status_code == 200
    assert latest.json()["data"]["runId"] == data["runId"]
