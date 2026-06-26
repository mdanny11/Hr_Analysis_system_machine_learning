from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.responses import Meta, success_response
from app.database import get_db
from app.dependencies import require_permission
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.dashboard import AuditLogOut

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
def audit_logs(
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    _: User = Depends(require_permission("audit.view")),
    db: Session = Depends(get_db),
):
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
    return success_response(
        [AuditLogOut.model_validate(log).model_dump(by_alias=True) for log in logs],
        Meta(page=page, limit=limit, total=total),
    )


@router.get("/export")
def export_audit_logs(_: User = Depends(require_permission("audit.view"))):
    return success_response({"message": "Audit export queued", "format": "csv"})
