from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.permissions import UserRole
from app.core.responses import success_response
from app.database import get_db
from app.dependencies import get_current_user, require_permission
from app.models.user import User
from app.services.dashboard_service import compute_kpis, get_attrition_trends, role_dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis")
def kpis(
    user: User = Depends(require_permission("dashboard.view")),
    db: Session = Depends(get_db),
):
    return success_response(compute_kpis(db, user))


@router.get("/{role}")
def dashboard_by_role(
    role: UserRole,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != role and user.role != UserRole.ADMIN:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Cannot access dashboard for another role"},
        )
    return success_response(role_dashboard(db, user))


analytics_router = APIRouter(prefix="/analytics", tags=["analytics"])


@analytics_router.get("/attrition-trends")
def attrition_trends(_: User = Depends(require_permission("dashboard.view"))):
    return success_response(get_attrition_trends())
