from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.responses import success_response
from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.services.dashboard_service import (
    department_risk_breakdown,
    list_departments,
)

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("")
def get_departments(
    _: User = Depends(require_permission("dashboard.view")),
    db: Session = Depends(get_db),
):
    return success_response(list_departments(db))


@router.get("/{department_id}/risk-breakdown")
def risk_breakdown(
    department_id: UUID,
    user: User = Depends(require_permission("risk.view")),
    db: Session = Depends(get_db),
):
    return success_response(department_risk_breakdown(db, department_id, user))
