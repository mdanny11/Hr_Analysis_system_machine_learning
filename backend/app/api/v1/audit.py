from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.responses import Meta, success_response
from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.schemas.dashboard import AuditLogOut
from app.services.audit_service import (
    export_audit_logs_csv,
    get_compliance_checklist,
    get_privacy_summary,
    list_audit_logs,
)

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
def audit_logs(
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=100, ge=1, le=500),
    _: User = Depends(require_permission("audit.view")),
    db: Session = Depends(get_db),
):
    logs, total = list_audit_logs(db, search=search, page=page, limit=limit)
    return success_response(
        [AuditLogOut.model_validate(log).model_dump(by_alias=True) for log in logs],
        Meta(page=page, limit=limit, total=total),
    )


@router.get("/compliance")
def compliance_checklist(
    _: User = Depends(require_permission("audit.view")),
    db: Session = Depends(get_db),
):
    return success_response(get_compliance_checklist(db))


@router.get("/privacy")
def privacy_summary(
    user: User = Depends(require_permission("audit.view")),
    db: Session = Depends(get_db),
):
    return success_response(get_privacy_summary(db, user))


@router.get("/export")
def export_audit_logs(
    search: str | None = None,
    _: User = Depends(require_permission("audit.view")),
    db: Session = Depends(get_db),
):
    csv_content, filename = export_audit_logs_csv(db, search=search)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
