import re

from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session, joinedload

from app.core.responses import Meta, success_response, CamelModel
from app.database import get_db
from app.dependencies import get_client_ip, get_current_user, require_admin, require_permission
from app.models.alerts import Alert, AlertRule, AlertSeverity, AlertStatus, CommunicationTemplate, NotificationChannel
from app.models.hr_ops import (
    ActionItem,
    Intervention,
    Report,
    ReportStatus,
    RetentionStrategy,
    ScheduledReport,
    SuccessionCandidate,
    Survey,
)
from app.models.audit import ComplianceChecklistItem, DataQualitySnapshot, FeatureEngineeringConfig, Integration, PipelineRun, SystemSetting
from app.models.organization import AttritionRisk, Employee
from app.models.user import User
from app.services.audit_service import log_audit
from app.services.data_processing_service import (
    apply_imputation,
    get_feature_configs,
    get_imputation_strategies,
    get_latest_pipeline_run,
    get_quality_report,
    handle_outliers,
    run_preprocessing_pipeline,
    update_feature_configs,
)
from app.services.employee_service import get_department_scope, list_employees_query, serialize_employee
from app.services import benchmark_service, report_service
from app.services.settings_service import (
    get_notification_settings,
    get_security_settings,
    get_system_settings,
    list_integrations,
    patch_notification_settings,
    patch_security_settings,
    patch_system_settings,
)
from app.services.engagement_service import (
    create_pulse_survey,
    create_survey,
    ensure_survey_invites,
    get_engagement_dimensions,
    get_engagement_summary,
    get_engagement_trends,
    get_public_survey,
    get_sentiment_analysis,
    get_vs_attrition,
    list_feedback,
    list_survey_responses,
    list_surveys,
    send_survey_emails_for_survey,
    send_survey_invites_for_survey,
    submit_feedback,
    submit_public_survey_response,
)
from app.services.report_service import (
    build_report_preview,
    export_report_csv,
    export_report_pdf,
    export_report_xlsx,
)

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


class ReportCreate(CamelModel):
    name: str
    type: str
    date_range_start: date | None = None
    date_range_end: date | None = None
    metrics: dict | None = None


class ReportPreviewRequest(CamelModel):
    name: str | None = None
    type: str | None = None
    date_range_start: date | None = None
    date_range_end: date | None = None
    metrics: list[str] | None = None


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
def preview_report(
    payload: ReportPreviewRequest | None = None,
    user: User = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    preview = build_report_preview(db, user)
    return success_response(preview)


@reports_router.get("/export")
def export_report(
    request: Request,
    template_id: str | None = Query(default=None, alias="templateId"),
    report_type: str | None = Query(default=None, alias="reportType"),
    report_name: str | None = Query(default=None, alias="reportName"),
    start_date: date | None = Query(default=None, alias="startDate"),
    end_date: date | None = Query(default=None, alias="endDate"),
    sections: str | None = None,
    format: str = Query(default="csv", alias="format"),
    user: User = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    section_list = [s.strip() for s in sections.split(",")] if sections else None
    export_kwargs = dict(
        template_id=template_id,
        report_type=report_type,
        report_name=report_name,
        start_date=start_date,
        end_date=end_date,
        sections=section_list,
    )
    normalized_format = (format or "csv").lower()
    if normalized_format == "excel":
        content, filename = export_report_xlsx(db, user, **export_kwargs)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif normalized_format == "pdf":
        content, filename = export_report_pdf(db, user, **export_kwargs)
        media_type = "application/pdf"
    else:
        csv_content, filename = export_report_csv(db, user, **export_kwargs)
        content = csv_content
        media_type = "text/csv"
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="EXPORT",
        resource="Reports",
        details=f"Exported report as {normalized_format.upper()}: {filename}",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@reports_router.get("/forecast")
def forecast(
    user: User = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    return success_response(report_service.get_attrition_forecast(db, user))


@reports_router.get("/turnover-cost")
def turnover_cost(
    user: User = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    return success_response(report_service.get_turnover_cost_breakdown(db, user))


@reports_router.get("/correlations")
def correlations(
    user: User = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    return success_response(report_service.get_factor_correlations(db, user))


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


class SurveyCreate(BaseModel):
    title: str
    type: str
    audience: str
    anonymous: bool = False
    questions: list[dict] = Field(default_factory=list)


class QuickSurveyCreate(BaseModel):
    question: str
    response_type: str = "scale"


class FeedbackCreate(BaseModel):
    category: str = "General"
    message: str
    anonymous: bool = True
    sentiment: str | None = None


class PublicSurveyResponseSubmit(BaseModel):
    answers: dict = Field(default_factory=dict)


def _queue_survey_emails(background_tasks: BackgroundTasks, survey_id: UUID) -> None:
    background_tasks.add_task(send_survey_emails_for_survey, survey_id)


def _launch_survey(
    background_tasks: BackgroundTasks,
    db: Session,
    user: User,
    result: dict,
) -> dict:
    invite_stats = ensure_survey_invites(db, UUID(result["id"]), user)
    _queue_survey_emails(background_tasks, UUID(result["id"]))
    result.update(invite_stats)
    result["emailsQueued"] = True
    return result


@engagement_router.get("/summary")
def engagement_summary(
    user: User = Depends(require_permission("engagement.view")),
    db: Session = Depends(get_db),
):
    return success_response(get_engagement_summary(db, user))


@engagement_router.get("/sentiment")
def sentiment(
    user: User = Depends(require_permission("engagement.view")),
    db: Session = Depends(get_db),
):
    return success_response(get_sentiment_analysis(db, user))


@engagement_router.get("/dimensions")
def dimensions(
    user: User = Depends(require_permission("engagement.view")),
    db: Session = Depends(get_db),
):
    return success_response(get_engagement_dimensions(db, user))


@engagement_router.get("/trends")
def trends(
    user: User = Depends(require_permission("engagement.view")),
    db: Session = Depends(get_db),
):
    return success_response(get_engagement_trends(db, user))


@engagement_router.get("/vs-attrition")
def vs_attrition(
    user: User = Depends(require_permission("engagement.view")),
    db: Session = Depends(get_db),
):
    return success_response(get_vs_attrition(db, user))


surveys_router = APIRouter(prefix="/surveys", tags=["surveys"])


@surveys_router.get("/public/{token}")
def get_public_survey_endpoint(token: str, db: Session = Depends(get_db)):
    return success_response(get_public_survey(db, token))


@surveys_router.post("/public/{token}/respond")
def submit_public_survey_endpoint(
    token: str,
    payload: PublicSurveyResponseSubmit,
    db: Session = Depends(get_db),
):
    return success_response(submit_public_survey_response(db, token, payload.answers))


@surveys_router.get("")
def list_surveys_endpoint(
    user: User = Depends(require_permission("engagement.view")),
    db: Session = Depends(get_db),
):
    return success_response(list_surveys(db, user))


@surveys_router.post("")
def create_survey_endpoint(
    payload: SurveyCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_permission("engagement.create")),
    db: Session = Depends(get_db),
):
    result = create_survey(
        db,
        user,
        title=payload.title,
        survey_type=payload.type,
        audience=payload.audience,
        anonymous=payload.anonymous,
        questions=payload.questions,
    )
    return success_response(_launch_survey(background_tasks, db, user, result))


@surveys_router.get("/{survey_id}/responses")
def list_survey_responses_endpoint(
    survey_id: UUID,
    user: User = Depends(require_permission("engagement.view")),
    db: Session = Depends(get_db),
):
    return success_response(list_survey_responses(db, user, survey_id))


@surveys_router.post("/{survey_id}/send-invites")
def resend_survey_invites(
    survey_id: UUID,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_permission("engagement.create")),
    db: Session = Depends(get_db),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Survey not found"})
    result = {"id": str(survey.id), "message": "Survey invitations queued"}
    return success_response(_launch_survey(background_tasks, db, user, result))


@surveys_router.post("/pulse")
def pulse_survey(
    background_tasks: BackgroundTasks,
    user: User = Depends(require_permission("engagement.create")),
    db: Session = Depends(get_db),
):
    result = create_pulse_survey(db, user)
    return success_response(_launch_survey(background_tasks, db, user, result))


@surveys_router.post("/quick")
def quick_survey(
    payload: QuickSurveyCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(require_permission("engagement.create")),
    db: Session = Depends(get_db),
):
    question_type = "rating" if payload.response_type == "scale" else payload.response_type
    result = create_survey(
        db,
        user,
        title=f"Quick Pulse: {payload.question[:48]}",
        survey_type="pulse",
        audience="All Employees",
        anonymous=True,
        questions=[{"text": payload.question, "type": question_type}],
    )
    return success_response(_launch_survey(background_tasks, db, user, result))


feedback_router = APIRouter(prefix="/feedback", tags=["feedback"])


@feedback_router.get("")
def list_feedback_endpoint(_: User = Depends(require_permission("engagement.view")), db: Session = Depends(get_db)):
    return success_response(list_feedback(db))


@feedback_router.post("")
def submit_feedback_endpoint(
    payload: FeedbackCreate,
    _: User = Depends(require_permission("engagement.view")),
    db: Session = Depends(get_db),
):
    return success_response(
        submit_feedback(
            db,
            category=payload.category,
            message=payload.message,
            anonymous=payload.anonymous,
            sentiment=payload.sentiment,
        )
    )


# --- Alerts ---

alerts_router = APIRouter(prefix="/alerts", tags=["alerts"])


def _serialize_alert(alert: Alert, db: Session) -> dict:
    return alert_service.serialize_alert(alert, db)


class AlertUpdate(BaseModel):
    status: str | None = None


class AlertRuleUpdate(BaseModel):
    enabled: bool | None = None
    threshold: float | None = None


@alerts_router.get("")
def list_alerts(user: User = Depends(require_permission("alerts.view")), db: Session = Depends(get_db)):
    return success_response(alert_service.list_alerts(db, user))


@alerts_router.get("/summary")
def alerts_summary(user: User = Depends(require_permission("alerts.view")), db: Session = Depends(get_db)):
    return success_response(alert_service.count_alert_summary(db, user))


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
    return success_response(alert_service.detect_alerts(db, user))


@alerts_router.get("/rules")
def alert_rules(_: User = Depends(require_permission("alerts.view")), db: Session = Depends(get_db)):
    return success_response(alert_service.list_alert_rules(db))


@alerts_router.patch("/rules/{rule_id}")
def update_rule(
    rule_id: UUID,
    payload: AlertRuleUpdate,
    _: User = Depends(require_permission("alerts.configure")),
    db: Session = Depends(get_db),
):
    return success_response(alert_service.update_alert_rule(db, rule_id, payload.enabled, payload.threshold))


# --- Decisions ---

decisions_router = APIRouter(prefix="/retention", tags=["decisions"])


@decisions_router.get("/strategies")
def strategies(_: User = Depends(require_permission("decisions.view")), db: Session = Depends(get_db)):
    rows = db.query(RetentionStrategy).all()
    high_risk_count = (
        db.query(Employee)
        .filter(Employee.deleted_at.is_(None), Employee.attrition_risk == AttritionRisk.HIGH)
        .count()
    )
    category_share = {
        "compensation": 0.45,
        "development": 0.75,
        "wellbeing": 0.55,
    }
    return success_response(
        [
            {
                "id": str(s.id),
                "name": s.name,
                "description": s.description,
                "estimatedCost": float(s.estimated_cost),
                "successRate": float(s.success_rate),
                "category": s.category,
                "currency": "RWF",
                "targetEmployeeCount": max(
                    1,
                    round(high_risk_count * category_share.get(s.category, 0.5)),
                )
                if high_risk_count
                else 0,
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


def _parse_incumbent(notes: str | None) -> str | None:
    if not notes:
        return None
    match = re.match(r"^Incumbent:\s*(.+?)(?:\s*\||$)", notes.strip())
    return match.group(1).strip() if match else None


def _serialize_action_item(item: ActionItem) -> dict:
    employee = None
    if item.description:
        emp_match = re.search(r"Employee:\s*(.+?)(?:\s*\||$)", item.description)
        if emp_match:
            employee = emp_match.group(1).strip()
    if not employee and item.title:
        with_match = re.search(r"\bwith\s+(.+)$", item.title, re.IGNORECASE)
        if with_match:
            employee = with_match.group(1).strip()

    assignee_name = None
    if item.assignee:
        assignee_name = item.assignee.name

    return {
        "id": str(item.id),
        "title": item.title,
        "description": item.description,
        "status": item.status,
        "priority": item.priority,
        "dueDate": item.due_date.isoformat() if item.due_date else None,
        "assignee": assignee_name,
        "employee": employee,
    }


@action_items_router.get("")
def action_items(_: User = Depends(require_permission("decisions.view")), db: Session = Depends(get_db)):
    rows = (
        db.query(ActionItem)
        .options(joinedload(ActionItem.assignee))
        .order_by(ActionItem.due_date)
        .all()
    )
    return success_response([_serialize_action_item(a) for a in rows])


succession_router = APIRouter(prefix="/succession", tags=["decisions"])


@succession_router.get("")
def succession(_: User = Depends(require_permission("decisions.view")), db: Session = Depends(get_db)):
    rows = (
        db.query(SuccessionCandidate)
        .options(joinedload(SuccessionCandidate.employee))
        .order_by(SuccessionCandidate.target_role, SuccessionCandidate.readiness_score.desc())
        .all()
    )

    grouped: dict[str, dict] = {}
    for row in rows:
        role = row.target_role
        if role not in grouped:
            grouped[role] = {
                "targetRole": role,
                "currentIncumbent": None,
                "candidates": [],
            }

        incumbent = _parse_incumbent(row.notes)
        if incumbent and not grouped[role]["currentIncumbent"]:
            grouped[role]["currentIncumbent"] = incumbent

        employee = row.employee
        name = f"{employee.first_name} {employee.last_name}" if employee else "Unknown"
        grouped[role]["candidates"].append(
            {
                "id": str(row.id),
                "employeeId": str(row.employee_id),
                "name": name,
                "readinessScore": float(row.readiness_score),
                "notes": row.notes,
            }
        )

    return success_response(list(grouped.values()))


# --- Data processing ---

data_router = APIRouter(prefix="/data-quality", tags=["data-processing"])


class FeatureToggleUpdate(CamelModel):
    id: str
    enabled: bool


class FeatureConfigUpdate(CamelModel):
    features: list[FeatureToggleUpdate] = Field(default_factory=list)


class PipelineRunRequest(CamelModel):
    outlier_threshold: float = 2.5
    features: list[FeatureToggleUpdate] = Field(default_factory=list)


@data_router.get("")
def data_quality(
    user: User = Depends(require_permission("data.preprocess")),
    db: Session = Depends(get_db),
    threshold: float = Query(default=2.5, alias="threshold"),
):
    report = get_quality_report(db, user, outlier_threshold=threshold)
    return success_response(report)


@data_router.get("/missing")
def missing_data(
    user: User = Depends(require_permission("data.preprocess")),
    db: Session = Depends(get_db),
):
    report = get_quality_report(db, user)
    strategies = get_imputation_strategies(db, user)
    return success_response({"distribution": report["missing"], "strategies": strategies})


@data_router.get("/outliers")
def outlier_data(
    user: User = Depends(require_permission("data.preprocess")),
    db: Session = Depends(get_db),
    threshold: float = Query(default=2.5, alias="threshold"),
):
    report = get_quality_report(db, user, outlier_threshold=threshold)
    return success_response(report["outliers"])


@data_router.get("/features")
def feature_engineering_config(
    _: User = Depends(require_permission("data.preprocess")),
    db: Session = Depends(get_db),
):
    return success_response(get_feature_configs(db))


@data_router.patch("/features")
def patch_feature_engineering_config(
    payload: FeatureConfigUpdate,
    _: User = Depends(require_permission("data.preprocess")),
    db: Session = Depends(get_db),
):
    updates = [item.model_dump() for item in payload.features]
    return success_response(update_feature_configs(db, updates))


@data_router.post("/impute")
def impute_missing_values(
    user: User = Depends(require_permission("data.preprocess")),
    db: Session = Depends(get_db),
):
    result = apply_imputation(db, user)
    return success_response(result)


@data_router.post("/outliers/handle")
def handle_outlier_values(
    user: User = Depends(require_permission("data.preprocess")),
    db: Session = Depends(get_db),
    threshold: float = Query(default=2.5, alias="threshold"),
):
    result = handle_outliers(db, user, threshold)
    return success_response(result)


pipelines_router = APIRouter(prefix="/pipelines", tags=["data-processing"])


@pipelines_router.get("/latest")
def latest_pipeline(
    user: User = Depends(require_permission("data.preprocess")),
    db: Session = Depends(get_db),
):
    run = get_latest_pipeline_run(db, user)
    return success_response(run or {"steps": []})


@pipelines_router.post("/run")
def run_pipeline(
    payload: PipelineRunRequest | None = None,
    user: User = Depends(require_permission("data.preprocess")),
    db: Session = Depends(get_db),
):
    body = payload or PipelineRunRequest()
    result = run_preprocessing_pipeline(
        db,
        user,
        outlier_threshold=body.outlier_threshold,
        feature_updates=[item.model_dump() for item in body.features],
    )
    return success_response(result)


# --- Benchmarks ---

benchmarks_router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])


@benchmarks_router.get("/industry")
def industry_benchmarks(
    industry: str = Query(default="technology"),
    user: User = Depends(require_permission("benchmarks.view")),
    db: Session = Depends(get_db),
):
    return success_response(benchmark_service.get_industry_benchmarks(db, user, industry))


@benchmarks_router.get("/competitors")
def competitors(
    user: User = Depends(require_permission("benchmarks.view")),
    db: Session = Depends(get_db),
):
    return success_response(benchmark_service.get_competitors(db, user))


@benchmarks_router.get("/best-practices")
def best_practices(_: User = Depends(require_permission("benchmarks.view"))):
    return success_response(benchmark_service.get_best_practices())


# --- Settings & notifications ---

settings_router = APIRouter(prefix="/settings", tags=["settings"])


@settings_router.get("/security")
def get_security(_: User = Depends(require_permission("settings.view")), db: Session = Depends(get_db)):
    return success_response(get_security_settings(db))


@settings_router.patch("/security")
def patch_security(
    payload: dict,
    request: Request,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    updated = patch_security_settings(db, payload)
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="UPDATE",
        resource="Settings",
        details="Updated security settings",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return success_response(updated)


@settings_router.get("/notifications")
def get_notifications(_: User = Depends(require_permission("settings.view")), db: Session = Depends(get_db)):
    return success_response(get_notification_settings(db))


@settings_router.patch("/notifications")
def patch_notifications(
    payload: dict,
    request: Request,
    user: User = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
):
    updated = patch_notification_settings(db, payload)
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="UPDATE",
        resource="Settings",
        details="Updated notification settings",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return success_response(updated)


@settings_router.get("/system")
def get_system(_: User = Depends(require_permission("settings.view")), db: Session = Depends(get_db)):
    return success_response(get_system_settings(db))


@settings_router.patch("/system")
def patch_system(
    payload: dict,
    request: Request,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    updated = patch_system_settings(db, payload)
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="UPDATE",
        resource="Settings",
        details="Updated system settings",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return success_response(updated)


@settings_router.get("/integrations")
def get_integrations(_: User = Depends(require_permission("settings.view")), db: Session = Depends(get_db)):
    return success_response(list_integrations(db))


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


@notifications_router.post("/mark-all-read")
def mark_all_notifications_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models.alerts import Notification

    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.read.is_(False),
    ).update({"read": True}, synchronize_session=False)
    db.commit()
    return success_response({"message": "All notifications marked as read"})


@notifications_router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.alerts import Notification

    notification = (
        db.query(Notification)
        .filter(Notification.id == UUID(notification_id), Notification.user_id == user.id)
        .first()
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Notification not found"},
        )
    notification.read = True
    db.commit()
    return success_response({"id": str(notification.id), "read": True})


@notifications_router.get("/channels")
def notification_channels(_: User = Depends(require_permission("alerts.view")), db: Session = Depends(get_db)):
    rows = db.query(NotificationChannel).all()
    return success_response(
        [{"channelType": r.channel_type, "enabled": r.enabled, "config": r.config} for r in rows]
    )
