from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session, joinedload

from app.core.responses import Meta, success_response
from app.database import get_db
from app.dependencies import get_client_ip, get_current_user, require_permission
from app.models.alerts import Alert, AlertRule, AlertSeverity, AlertStatus, CommunicationTemplate, NotificationChannel
from app.models.hr_ops import (
    ActionItem,
    Feedback,
    Intervention,
    Report,
    ReportStatus,
    RetentionStrategy,
    ScheduledReport,
    SuccessionCandidate,
    Survey,
    SurveyQuestion,
    SurveyStatus,
)
from app.models.audit import ComplianceChecklistItem, DataQualitySnapshot, FeatureEngineeringConfig, Integration, PipelineRun, SystemSetting
from app.models.organization import Employee
from app.models.user import User
from app.services.audit_service import log_audit
from app.services.employee_service import get_department_scope, list_employees_query, serialize_employee

# --- Reports ---

reports_router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_TEMPLATES = [
    {"id": "1", "name": "Executive Summary", "type": "summary", "lastGenerated": "2024-01-18", "frequency": "Weekly"},
    {"id": "2", "name": "Attrition Analysis", "type": "analysis", "lastGenerated": "2024-01-15", "frequency": "Monthly"},
    {"id": "3", "name": "Department Comparison", "type": "comparison", "lastGenerated": "2024-01-20", "frequency": "Quarterly"},
    {"id": "4", "name": "Cost Impact Report", "type": "financial", "lastGenerated": "2024-01-12", "frequency": "Monthly"},
    {"id": "5", "name": "Risk Distribution", "type": "risk", "lastGenerated": "2024-01-19", "frequency": "Weekly"},
]

FORECAST_DATA = [
    {"month": "Jan", "actual": 12, "predicted": 12, "forecast": None},
    {"month": "Feb", "actual": 8, "predicted": 10, "forecast": None},
    {"month": "Mar", "actual": 15, "predicted": 13, "forecast": None},
    {"month": "Apr", "actual": 11, "predicted": 12, "forecast": None},
    {"month": "May", "actual": 9, "predicted": 11, "forecast": None},
    {"month": "Jun", "actual": 14, "predicted": 15, "forecast": None},
    {"month": "Jul", "actual": None, "predicted": None, "forecast": 13},
    {"month": "Aug", "actual": None, "predicted": None, "forecast": 11},
    {"month": "Sep", "actual": None, "predicted": None, "forecast": 14},
    {"month": "Oct", "actual": None, "predicted": None, "forecast": 12},
    {"month": "Nov", "actual": None, "predicted": None, "forecast": 10},
    {"month": "Dec", "actual": None, "predicted": None, "forecast": 8},
]


class ReportCreate(BaseModel):
    name: str
    type: str
    date_range_start: date | None = None
    date_range_end: date | None = None
    metrics: dict | None = None


class ScheduledReportCreate(BaseModel):
    report_template_id: str
    frequency: str
    delivery_method: str
    recipients: list[str] = Field(default_factory=list)
    start_date: date


@reports_router.get("/templates")
def report_templates(_: User = Depends(require_permission("reports.view"))):
    return success_response(REPORT_TEMPLATES)


@reports_router.post("")
def create_report(
    payload: ReportCreate,
    user: User = Depends(require_permission("reports.create")),
    db: Session = Depends(get_db),
):
    report = Report(
        name=payload.name,
        type=payload.type,
        date_range_start=payload.date_range_start,
        date_range_end=payload.date_range_end,
        metrics=payload.metrics,
        created_by=user.id,
        status=ReportStatus.COMPLETED,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return success_response({"id": str(report.id), "name": report.name, "status": report.status.value})


@reports_router.post("/preview")
def preview_report(_: User = Depends(require_permission("reports.view"))):
    return success_response({"previewUrl": "/reports/preview/sample.pdf", "pages": 12})


@reports_router.get("/forecast")
def forecast(_: User = Depends(require_permission("reports.view"))):
    return success_response(FORECAST_DATA)


@reports_router.get("/turnover-cost")
def turnover_cost(_: User = Depends(require_permission("reports.view"))):
    return success_response(
        [
            {"category": "Recruitment", "cost": 8500, "percentage": 25},
            {"category": "Training", "cost": 6800, "percentage": 20},
            {"category": "Lost Productivity", "cost": 12000, "percentage": 35},
            {"category": "Administrative", "cost": 3400, "percentage": 10},
            {"category": "Onboarding", "cost": 3400, "percentage": 10},
        ]
    )


@reports_router.get("/correlations")
def correlations(_: User = Depends(require_permission("reports.view"))):
    return success_response(
        [
            {"factor": "Satisfaction", "correlation": -0.72, "description": "Strong negative correlation with attrition"},
            {"factor": "Tenure", "correlation": -0.45, "description": "Moderate negative correlation"},
            {"factor": "Overtime", "correlation": 0.58, "description": "Positive correlation with attrition risk"},
        ]
    )


@reports_router.get("/scheduled")
def list_scheduled(_: User = Depends(require_permission("reports.view")), db: Session = Depends(get_db)):
    rows = db.query(ScheduledReport).order_by(ScheduledReport.start_date.desc()).all()
    return success_response(
        [
            {
                "id": str(r.id),
                "reportTemplateId": r.report_template_id,
                "frequency": r.frequency,
                "deliveryMethod": r.delivery_method,
                "recipients": r.recipients,
                "startDate": r.start_date.isoformat(),
                "enabled": r.enabled,
                "lastSentAt": r.last_sent_at.isoformat() if r.last_sent_at else None,
            }
            for r in rows
        ]
    )


@reports_router.post("/scheduled")
def schedule_report(
    payload: ScheduledReportCreate,
    _: User = Depends(require_permission("reports.create")),
    db: Session = Depends(get_db),
):
    row = ScheduledReport(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return success_response({"id": str(row.id), "message": "Report scheduled"})


# --- Engagement ---

engagement_router = APIRouter(prefix="/engagement", tags=["engagement"])

ENGAGEMENT_TRENDS = [
    {"month": "Jul", "score": 6.8, "participation": 72},
    {"month": "Aug", "score": 7.0, "participation": 75},
    {"month": "Sep", "score": 7.2, "participation": 78},
    {"month": "Oct", "score": 7.1, "participation": 76},
    {"month": "Nov", "score": 7.4, "participation": 80},
    {"month": "Dec", "score": 7.3, "participation": 79},
]


class SurveyCreate(BaseModel):
    title: str
    type: str
    audience: str
    anonymous: bool = False
    questions: list[dict] = Field(default_factory=list)


class FeedbackCreate(BaseModel):
    category: str
    message: str
    anonymous: bool = True


@engagement_router.get("/summary")
def engagement_summary(_: User = Depends(require_permission("engagement.view"))):
    return success_response({"overallScore": 7.3, "participationRate": 79, "sentimentScore": 72, "activeSurveys": 3})


@engagement_router.get("/sentiment")
def sentiment(_: User = Depends(require_permission("engagement.view"))):
    return success_response(
        [
            {"category": "Work Environment", "positive": 68, "neutral": 22, "negative": 10},
            {"category": "Management", "positive": 62, "neutral": 28, "negative": 10},
            {"category": "Compensation", "positive": 55, "neutral": 30, "negative": 15},
        ]
    )


@engagement_router.get("/dimensions")
def dimensions(_: User = Depends(require_permission("engagement.view"))):
    return success_response(
        [
            {"dimension": "Purpose", "score": 78},
            {"dimension": "Growth", "score": 72},
            {"dimension": "Recognition", "score": 68},
            {"dimension": "Wellbeing", "score": 74},
            {"dimension": "Connection", "score": 70},
        ]
    )


@engagement_router.get("/trends")
def trends(_: User = Depends(require_permission("engagement.view"))):
    return success_response(ENGAGEMENT_TRENDS)


@engagement_router.get("/vs-attrition")
def vs_attrition(
    user: User = Depends(require_permission("engagement.view")),
    db: Session = Depends(get_db),
):
    employees = list_employees_query(db, user).limit(100).all()
    return success_response(
        [
            {"engagement": e.satisfaction_score * 10, "attritionRisk": e.attrition_probability, "name": f"{e.first_name} {e.last_name}"}
            for e in employees
        ]
    )


surveys_router = APIRouter(prefix="/surveys", tags=["surveys"])


@surveys_router.get("")
def list_surveys(_: User = Depends(require_permission("engagement.view")), db: Session = Depends(get_db)):
    rows = db.query(Survey).order_by(Survey.created_at.desc()).all()
    return success_response(
        [{"id": str(s.id), "title": s.title, "type": s.type, "audience": s.audience, "status": s.status.value, "anonymous": s.anonymous} for s in rows]
    )


@surveys_router.post("")
def create_survey(
    payload: SurveyCreate,
    user: User = Depends(require_permission("engagement.create")),
    db: Session = Depends(get_db),
):
    survey = Survey(
        title=payload.title,
        type=payload.type,
        audience=payload.audience,
        anonymous=payload.anonymous,
        status=SurveyStatus.ACTIVE,
        created_by=user.id,
    )
    db.add(survey)
    db.flush()
    for index, question in enumerate(payload.questions):
        db.add(
            SurveyQuestion(
                survey_id=survey.id,
                question_text=question.get("text", ""),
                question_type=question.get("type", "text"),
                order_index=index,
            )
        )
    db.commit()
    return success_response({"id": str(survey.id), "message": "Survey launched"})


@surveys_router.post("/pulse")
def pulse_survey(_: User = Depends(require_permission("engagement.create"))):
    return success_response({"message": "Pulse survey sent to all employees"})


feedback_router = APIRouter(prefix="/feedback", tags=["feedback"])


@feedback_router.get("")
def list_feedback(_: User = Depends(require_permission("engagement.view")), db: Session = Depends(get_db)):
    rows = db.query(Feedback).order_by(Feedback.submitted_at.desc()).limit(20).all()
    return success_response(
        [{"id": str(f.id), "category": f.category, "message": f.message, "anonymous": f.anonymous, "submittedAt": f.submitted_at.isoformat()} for f in rows]
    )


@feedback_router.post("")
def submit_feedback(
    payload: FeedbackCreate,
    _: User = Depends(require_permission("engagement.view")),
    db: Session = Depends(get_db),
):
    row = Feedback(
        category=payload.category,
        message=payload.message,
        anonymous=payload.anonymous,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    return success_response({"message": "Feedback submitted"})


# --- Alerts ---

alerts_router = APIRouter(prefix="/alerts", tags=["alerts"])


def _serialize_alert(alert: Alert, db: Session) -> dict:
    employee = db.query(Employee).filter(Employee.id == alert.employee_id).first() if alert.employee_id else None
    return {
        "id": str(alert.id),
        "type": alert.severity.value,
        "employee": serialize_employee(employee) if employee else None,
        "reason": alert.message,
        "triggeredAt": alert.created_at.isoformat(),
        "status": alert.status.value,
        "assignee": "HR Manager",
    }


class AlertUpdate(BaseModel):
    status: str | None = None


class AlertRuleUpdate(BaseModel):
    enabled: bool | None = None
    threshold: float | None = None


@alerts_router.get("")
def list_alerts(user: User = Depends(require_permission("alerts.view")), db: Session = Depends(get_db)):
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if get_department_scope(user):
        query = query.join(Employee).filter(Employee.department_id == user.department_id)
    alerts = query.limit(50).all()
    return success_response([_serialize_alert(a, db) for a in alerts])


@alerts_router.patch("/{alert_id}")
def update_alert(
    alert_id: UUID,
    payload: AlertUpdate,
    user: User = Depends(require_permission("alerts.view")),
    db: Session = Depends(get_db),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Alert not found"})
    if payload.status:
        alert.status = AlertStatus(payload.status)
        if payload.status == "acknowledged":
            alert.acknowledged_by = user.id
            alert.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    return success_response(_serialize_alert(alert, db))


@alerts_router.post("/detect")
def detect_alerts(
    user: User = Depends(require_permission("alerts.configure")),
    db: Session = Depends(get_db),
):
    high_risk = (
        list_employees_query(db, user)
        .filter(Employee.attrition_probability >= 80)
        .limit(10)
        .all()
    )
    created = 0
    for employee in high_risk:
        existing = db.query(Alert).filter(
            Alert.employee_id == employee.id,
            Alert.status.in_([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]),
        ).first()
        if existing:
            continue
        db.add(
            Alert(
                employee_id=employee.id,
                severity=AlertSeverity.CRITICAL,
                message=f"Attrition risk exceeded {employee.attrition_probability}%",
                status=AlertStatus.ACTIVE,
            )
        )
        created += 1
    db.commit()
    return success_response({"message": f"Detection complete", "alertsCreated": created})


@alerts_router.get("/rules")
def alert_rules(_: User = Depends(require_permission("alerts.view")), db: Session = Depends(get_db)):
    rows = db.query(AlertRule).all()
    return success_response(
        [{"id": str(r.id), "name": r.name, "condition": r.condition, "threshold": r.threshold, "enabled": r.enabled} for r in rows]
    )


@alerts_router.patch("/rules/{rule_id}")
def update_rule(
    rule_id: UUID,
    payload: AlertRuleUpdate,
    _: User = Depends(require_permission("alerts.configure")),
    db: Session = Depends(get_db),
):
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Rule not found"})
    if payload.enabled is not None:
        rule.enabled = payload.enabled
    if payload.threshold is not None:
        rule.threshold = payload.threshold
    db.commit()
    return success_response({"id": str(rule.id), "enabled": rule.enabled, "threshold": rule.threshold})


# --- Decisions ---

decisions_router = APIRouter(prefix="/retention", tags=["decisions"])


@decisions_router.get("/strategies")
def strategies(_: User = Depends(require_permission("decisions.view")), db: Session = Depends(get_db)):
    rows = db.query(RetentionStrategy).all()
    return success_response(
        [
            {
                "id": str(s.id),
                "name": s.name,
                "description": s.description,
                "estimatedCost": float(s.estimated_cost),
                "successRate": float(s.success_rate),
                "category": s.category,
            }
            for s in rows
        ]
    )


interventions_router = APIRouter(prefix="/interventions", tags=["decisions"])


@interventions_router.get("/queue")
def intervention_queue(
    user: User = Depends(require_permission("decisions.view")),
    db: Session = Depends(get_db),
):
    employees = (
        list_employees_query(db, user)
        .options(joinedload(Employee.department))
        .filter(Employee.attrition_probability >= 70)
        .order_by(Employee.attrition_probability.desc())
        .limit(20)
        .all()
    )
    return success_response([serialize_employee(e) for e in employees])


class InterventionCreate(BaseModel):
    employee_id: UUID
    strategy_id: UUID | None = None
    notes: str | None = None


@interventions_router.post("")
def create_intervention(
    payload: InterventionCreate,
    user: User = Depends(require_permission("decisions.create")),
    db: Session = Depends(get_db),
):
    row = Intervention(
        employee_id=payload.employee_id,
        strategy_id=payload.strategy_id,
        status="planned",
        notes=payload.notes,
        assigned_to=user.id,
    )
    db.add(row)
    db.commit()
    return success_response({"id": str(row.id), "status": row.status})


action_items_router = APIRouter(prefix="/action-items", tags=["decisions"])


@action_items_router.get("")
def action_items(_: User = Depends(require_permission("decisions.view")), db: Session = Depends(get_db)):
    rows = db.query(ActionItem).order_by(ActionItem.due_date).all()
    return success_response(
        [
            {
                "id": str(a.id),
                "title": a.title,
                "description": a.description,
                "status": a.status,
                "priority": a.priority,
                "dueDate": a.due_date.isoformat() if a.due_date else None,
            }
            for a in rows
        ]
    )


succession_router = APIRouter(prefix="/succession", tags=["decisions"])


@succession_router.get("")
def succession(_: User = Depends(require_permission("decisions.view")), db: Session = Depends(get_db)):
    rows = db.query(SuccessionCandidate).all()
    return success_response(
        [
            {
                "id": str(s.id),
                "employeeId": str(s.employee_id),
                "targetRole": s.target_role,
                "readinessScore": float(s.readiness_score),
                "notes": s.notes,
            }
            for s in rows
        ]
    )


# --- Data processing ---

data_router = APIRouter(prefix="/data-quality", tags=["data-processing"])


@data_router.get("")
def data_quality(_: User = Depends(require_permission("data.preprocess")), db: Session = Depends(get_db)):
    snapshot = db.query(DataQualitySnapshot).order_by(DataQualitySnapshot.recorded_at.desc()).first()
    if snapshot:
        return success_response(
            {
                "completeness": snapshot.completeness,
                "accuracy": snapshot.accuracy,
                "consistency": snapshot.consistency,
                "recordedAt": snapshot.recorded_at.isoformat(),
            }
        )
    return success_response({"completeness": 94.2, "accuracy": 91.8, "consistency": 88.5})


@data_router.get("/missing")
def missing_data(_: User = Depends(require_permission("data.preprocess"))):
    return success_response(
        [
            {"field": "Training Hours", "missing": 12, "percentage": 2.4},
            {"field": "Last Promotion", "missing": 8, "percentage": 1.6},
            {"field": "Work-Life Balance", "missing": 5, "percentage": 1.0},
        ]
    )


pipelines_router = APIRouter(prefix="/pipelines", tags=["data-processing"])


@pipelines_router.post("/run")
def run_pipeline(
    user: User = Depends(require_permission("data.preprocess")),
    db: Session = Depends(get_db),
):
    run = PipelineRun(
        status="completed",
        steps=[
            {"name": "Data Validation", "status": "completed"},
            {"name": "Missing Value Imputation", "status": "completed"},
            {"name": "Outlier Detection", "status": "completed"},
            {"name": "Feature Engineering", "status": "completed"},
        ],
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        triggered_by=user.id,
    )
    db.add(run)
    db.commit()
    return success_response({"runId": str(run.id), "status": run.status, "steps": run.steps})


# --- Benchmarks ---

benchmarks_router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])

BENCHMARK_DATA = {
    "technology": {"attritionRate": 13.2, "avgTenure": 3.8, "avgSatisfaction": 7.1},
    "finance": {"attritionRate": 10.5, "avgTenure": 4.5, "avgSatisfaction": 7.4},
    "healthcare": {"attritionRate": 15.8, "avgTenure": 3.2, "avgSatisfaction": 6.8},
}


@benchmarks_router.get("/industry")
def industry_benchmarks(
    industry: str = Query(default="technology"),
    _: User = Depends(require_permission("benchmarks.view")),
):
    data = BENCHMARK_DATA.get(industry, BENCHMARK_DATA["technology"])
    return success_response({"industry": industry, **data, "companyAttritionRate": 12.4})


@benchmarks_router.get("/competitors")
def competitors(_: User = Depends(require_permission("benchmarks.view"))):
    return success_response(
        [
            {"company": "Industry Avg", "attritionRate": 13.2, "retentionPrograms": 3},
            {"company": "Competitor A", "attritionRate": 11.5, "retentionPrograms": 5},
            {"company": "Competitor B", "attritionRate": 14.8, "retentionPrograms": 2},
            {"company": "Your Company", "attritionRate": 12.4, "retentionPrograms": 4},
        ]
    )


@benchmarks_router.get("/best-practices")
def best_practices(_: User = Depends(require_permission("benchmarks.view"))):
    return success_response(
        [
            {"title": "Regular Stay Interviews", "impact": "high", "adoption": 45},
            {"title": "Flexible Work Arrangements", "impact": "high", "adoption": 78},
            {"title": "Career Pathing Programs", "impact": "medium", "adoption": 52},
        ]
    )


# --- Settings & notifications ---

settings_router = APIRouter(prefix="/settings", tags=["settings"])


@settings_router.get("/security")
def get_security(_: User = Depends(require_permission("settings.view")), db: Session = Depends(get_db)):
    row = db.query(SystemSetting).filter(SystemSetting.key == "security").first()
    default = {"mfaRequired": False, "passwordMinLength": 8, "sessionTimeoutMinutes": 30}
    return success_response(row.value if row else default)


@settings_router.patch("/security")
def patch_security(
    payload: dict,
    _: User = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
):
    row = db.query(SystemSetting).filter(SystemSetting.key == "security").first()
    if row:
        row.value = {**row.value, **payload}
    else:
        row = SystemSetting(key="security", value=payload)
        db.add(row)
    db.commit()
    return success_response(row.value)


notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])


@notifications_router.get("")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models.alerts import Notification

    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )
    return success_response(
        [{"id": str(n.id), "title": n.title, "message": n.message, "read": n.read, "createdAt": n.created_at.isoformat()} for n in rows]
    )


@notifications_router.get("/channels")
def notification_channels(_: User = Depends(require_permission("alerts.view")), db: Session = Depends(get_db)):
    rows = db.query(NotificationChannel).all()
    return success_response(
        [{"channelType": r.channel_type, "enabled": r.enabled, "config": r.config} for r in rows]
    )
