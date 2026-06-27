import csv
import io
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit import AuditLog, ComplianceChecklistItem
from app.models.ml import ModelFeatureImportance, ModelStatus, PredictionModel
from app.models.organization import Employee
from app.models.user import User
from app.services.dashboard_service import compute_kpis


def log_audit(
    db: Session,
    *,
    user_id: UUID | None,
    user_name: str,
    action: str,
    resource: str,
    details: str,
    ip_address: str = "127.0.0.1",
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        resource=resource,
        details=details,
        ip_address=ip_address,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.flush()
    return entry


def list_audit_logs(
    db: Session,
    *,
    search: str | None = None,
    page: int = 1,
    limit: int = 50,
) -> tuple[list[AuditLog], int]:
    query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            AuditLog.user_name.ilike(pattern)
            | AuditLog.action.ilike(pattern)
            | AuditLog.resource.ilike(pattern)
            | AuditLog.details.ilike(pattern)
        )
    total = query.count()
    logs = query.offset((page - 1) * limit).limit(limit).all()
    return logs, total


def export_audit_logs_csv(db: Session, *, search: str | None = None, limit: int = 500) -> tuple[str, str]:
    logs, _ = list_audit_logs(db, search=search, page=1, limit=limit)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Timestamp", "User", "Action", "Resource", "Details", "IP Address"])
    for log in logs:
        writer.writerow([
            log.timestamp.isoformat(),
            log.user_name,
            log.action,
            log.resource,
            log.details,
            log.ip_address,
        ])
    return buffer.getvalue(), "audit_logs_export.csv"


def get_compliance_checklist(db: Session) -> list[dict]:
    db_items = db.query(ComplianceChecklistItem).order_by(ComplianceChecklistItem.category).all()
    if len(db_items) >= 5:
        return [
            {
                "id": str(item.id),
                "category": item.category,
                "item": item.requirement,
                "status": item.status,
                "lastReviewedAt": item.last_reviewed_at.isoformat() if item.last_reviewed_at else None,
            }
            for item in db_items
        ]

    active_models = (
        db.query(PredictionModel)
        .filter(PredictionModel.status == ModelStatus.ACTIVE)
        .count()
    )
    feature_importance_count = db.query(ModelFeatureImportance).count()
    employee_count = db.query(Employee).filter(Employee.deleted_at.is_(None)).count()
    audit_count = db.query(AuditLog).count()

    return [
        {
            "id": "dp-1",
            "category": "Data Protection",
            "item": "Lawful basis for employee data processing",
            "status": "compliant",
            "lastReviewedAt": None,
        },
        {
            "id": "dp-2",
            "category": "Data Protection",
            "item": f"Employee records inventory ({employee_count:,} records)",
            "status": "compliant" if employee_count > 0 else "warning",
            "lastReviewedAt": None,
        },
        {
            "id": "dp-3",
            "category": "Data Protection",
            "item": "Right to erasure (soft-delete employees)",
            "status": "compliant",
            "lastReviewedAt": None,
        },
        {
            "id": "sec-1",
            "category": "Security",
            "item": "Encryption in transit (TLS)",
            "status": "compliant",
            "lastReviewedAt": None,
        },
        {
            "id": "sec-2",
            "category": "Security",
            "item": "Activity audit trail enabled",
            "status": "compliant" if audit_count > 0 else "warning",
            "lastReviewedAt": None,
        },
        {
            "id": "sec-3",
            "category": "Security",
            "item": "Multi-factor authentication",
            "status": "warning",
            "lastReviewedAt": None,
        },
        {
            "id": "ai-1",
            "category": "AI Ethics",
            "item": "Model explainability (feature importance)",
            "status": "compliant" if feature_importance_count > 0 else "warning",
            "lastReviewedAt": None,
        },
        {
            "id": "ai-2",
            "category": "AI Ethics",
            "item": "Production ML models trained and active",
            "status": "compliant" if active_models >= 3 else "warning",
            "lastReviewedAt": None,
        },
        {
            "id": "ai-3",
            "category": "AI Ethics",
            "item": "Human oversight for high-risk predictions",
            "status": "compliant",
            "lastReviewedAt": None,
        },
        {
            "id": "ac-1",
            "category": "Access Control",
            "item": "Role-based access control (RBAC)",
            "status": "compliant",
            "lastReviewedAt": None,
        },
        {
            "id": "ac-2",
            "category": "Access Control",
            "item": "Least privilege principle",
            "status": "compliant",
            "lastReviewedAt": None,
        },
        {
            "id": "ac-3",
            "category": "Access Control",
            "item": "Regular access reviews",
            "status": "warning",
            "lastReviewedAt": None,
        },
    ]


def get_privacy_summary(db: Session, user: User) -> dict:
    kpis = compute_kpis(db, user)
    return {
        "employeeRecords": kpis["totalEmployees"],
        "activeEmployees": kpis["activeEmployees"],
        "dataCategories": 12,
        "retentionPeriod": "7 yrs",
        "sensitiveFields": 7,
        "highRiskEmployees": kpis["highRiskCount"],
    }
