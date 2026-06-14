from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.responses import success_response
from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.services import ml_service

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/at-risk")
def at_risk_employees(
    threshold: float = Query(default=0.5, ge=0, le=100),
    user: User = Depends(require_permission("predictions.view")),
    db: Session = Depends(get_db),
):
    return success_response(ml_service.get_at_risk_employees(db, user, threshold))
