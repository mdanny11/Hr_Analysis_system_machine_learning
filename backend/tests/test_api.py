from datetime import date

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


def test_auth_refresh(client: TestClient):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@ison.com", "password": "password123"},
    )
    refresh_token = login.json()["data"]["refreshToken"]
    response = client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token})
    assert response.status_code == 200
    assert "accessToken" in response.json()["data"]


def test_change_password(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    response = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"currentPassword": "password123", "newPassword": "newSecure1"},
    )
    assert response.status_code == 200
    client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"currentPassword": "newSecure1", "newPassword": "password123"},
    )


def test_access_requests_require_admin(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/access-requests", headers=headers)
    assert response.status_code == 403


def test_export_employees_csv(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    response = client.get("/api/v1/employees/export", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    body = response.text
    assert "firstName,lastName,email" in body
    assert body.count("\n") >= 501


def test_export_employees_xlsx(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    response = client.get("/api/v1/employees/export?format=xlsx", headers=headers)
    assert response.status_code == 200
    assert "spreadsheetml.sheet" in response.headers["content-type"]
    assert response.content[:2] == b"PK"


def test_import_employees_xlsx(client: TestClient, auth_headers):
    from io import BytesIO

    from openpyxl import Workbook

    headers = auth_headers("admin@ison.com")
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append(
        [
            "employeeId",
            "firstName",
            "lastName",
            "email",
            "department",
            "position",
            "hireDate",
            "salary",
            "currency",
            "payFrequency",
            "age",
            "gender",
            "yearsAtCompany",
            "performanceScore",
            "satisfactionScore",
            "workLifeBalance",
            "lastPromotionYears",
            "trainingHours",
            "overtimeHours",
        ]
    )
    worksheet.append(
        [
            "EMP88888",
            "Excel",
            "Import",
            "excel.import@example.com",
            "Engineering",
            "Analyst",
            "2024-06-01",
            450000,
            "RWF",
            "monthly",
            29,
            "female",
            1,
            7.0,
            7.5,
            7.0,
            0,
            8,
            4,
        ]
    )
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    response = client.post(
        "/api/v1/employees/import",
        headers=headers,
        files={"file": ("employees.xlsx", buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["created"] == 1
    assert data["skipped"] == 0


def test_import_employees_csv(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    csv_content = (
        "employeeId,firstName,lastName,email,department,position,hireDate,salary,currency,payFrequency,age,gender,"
        "yearsAtCompany,performanceScore,satisfactionScore,workLifeBalance,lastPromotionYears,trainingHours,overtimeHours\n"
        "EMP99999,Import,Test,import.test@example.com,Engineering,Analyst,2024-06-01,450000,RWF,monthly,29,female,"
        "1,7.0,7.5,7.0,0,8,4\n"
    )
    response = client.post(
        "/api/v1/employees/import",
        headers=headers,
        files={"file": ("employees.csv", csv_content, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["created"] == 1
    assert data["skipped"] == 0

    duplicate = client.post(
        "/api/v1/employees/import",
        headers=headers,
        files={"file": ("employees.csv", csv_content, "text/csv")},
    )
    assert duplicate.status_code == 200
    dup_data = duplicate.json()["data"]
    assert dup_data["created"] == 0
    assert dup_data["skipped"] == 1


def test_import_employees_requires_edit_permission(client: TestClient, auth_headers):
    headers = auth_headers("analyst@ison.com")
    response = client.post(
        "/api/v1/employees/import",
        headers=headers,
        files={"file": ("employees.csv", "firstName,lastName,email\n", "text/csv")},
    )
    assert response.status_code == 403


def test_import_years_at_company_from_hire_date(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    csv_content = (
        "employeeId,firstName,lastName,email,department,position,hireDate,salary,currency,payFrequency,age,gender,"
        "yearsAtCompany,performanceScore,satisfactionScore,workLifeBalance,lastPromotionYears,trainingHours,overtimeHours\n"
        "EMP88888,Tenure,Check,tenure.check@example.com,Engineering,Analyst,2020-06-15,450000,RWF,monthly,32,female,"
        "99,7.0,7.5,7.0,0,8,4\n"
    )
    response = client.post(
        "/api/v1/employees/import",
        headers=headers,
        files={"file": ("employees.csv", csv_content, "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["data"]["created"] == 1

    employees = client.get(
        "/api/v1/employees?search=tenure.check@example.com&limit=1",
        headers=headers,
    ).json()["data"]
    assert len(employees) == 1
    expected_years = max(0, date.today().year - 2020 - (1 if (date.today().month, date.today().day) < (6, 15) else 0))
    assert employees[0]["yearsAtCompany"] == expected_years
    assert employees[0]["yearsAtCompany"] != 99


def test_create_employee_duplicate_email(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    existing = client.get("/api/v1/employees?limit=1", headers=headers).json()["data"][0]["email"]
    payload = {
        "firstName": "Dup",
        "lastName": "Test",
        "email": existing,
        "department": "Engineering",
        "position": "Analyst",
        "hireDate": "2024-01-01",
        "salary": 100000,
        "age": 30,
        "gender": "male",
    }
    response = client.post("/api/v1/employees", headers=headers, json=payload)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "DUPLICATE_EMAIL"


def test_export_users_csv(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    response = client.get("/api/v1/users/export", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    body = response.text
    assert "name,email,role" in body
    assert "admin@ison.com" in body


def test_export_users_requires_admin(client: TestClient, auth_headers):
    headers = auth_headers("manager@ison.com")
    response = client.get("/api/v1/users/export", headers=headers)
    assert response.status_code == 403


def test_export_report_csv(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    response = client.get(
        "/api/v1/reports/export?templateId=1&format=csv&sections=Executive%20Summary,Risk%20Analysis",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    body = response.text
    assert "HR Report Export" in body
    assert "Executive Summary" in body


def test_export_report_excel(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    response = client.get(
        "/api/v1/reports/export?templateId=1&format=excel&sections=Executive%20Summary",
        headers=headers,
    )
    assert response.status_code == 200
    assert "spreadsheetml" in response.headers["content-type"]
    assert response.content[:2] == b"PK"


def test_export_report_pdf(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    response = client.get(
        "/api/v1/reports/export?templateId=1&format=pdf&sections=Executive%20Summary",
        headers=headers,
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_notifications_list_and_mark_read(client: TestClient, auth_headers):
    headers = auth_headers("admin@ison.com")
    list_response = client.get("/api/v1/notifications", headers=headers)
    assert list_response.status_code == 200
    notifications = list_response.json()["data"]
    assert len(notifications) >= 1
    unread = next(n for n in notifications if not n["read"])

    mark_response = client.patch(f"/api/v1/notifications/{unread['id']}/read", headers=headers)
    assert mark_response.status_code == 200
    assert mark_response.json()["data"]["read"] is True

    mark_all_response = client.post("/api/v1/notifications/mark-all-read", headers=headers)
    assert mark_all_response.status_code == 200

    refreshed = client.get("/api/v1/notifications", headers=headers).json()["data"]
    assert all(n["read"] for n in refreshed)
