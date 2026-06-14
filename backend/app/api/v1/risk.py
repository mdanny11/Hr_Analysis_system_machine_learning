from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.responses import success_response
from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.services import risk_service

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("/summary")
def summary(user: User = Depends(require_permission("risk.view")), db: Session = Depends(get_db)):
    return success_response(risk_service.risk_summary(db, user))


@router.get("/by-tenure")
def by_tenure(user: User = Depends(require_permission("risk.view")), db: Session = Depends(get_db)):
    return success_response(risk_service.risk_by_tenure(db, user))


@router.get("/by-salary")
def by_salary(user: User = Depends(require_permission("risk.view")), db: Session = Depends(get_db)):
    return success_response(risk_service.risk_by_salary(db, user))


@router.get("/matrix")
def matrix(user: User = Depends(require_permission("risk.view")), db: Session = Depends(get_db)):
    return success_response(risk_service.risk_matrix(db, user))


@router.get("/by-department")
def by_department(user: User = Depends(require_permission("risk.view")), db: Session = Depends(get_db)):
    return success_response(risk_service.risk_by_department(db, user))


@router.get("/high-risk-employees")
def high_risk(user: User = Depends(require_permission("risk.view")), db: Session = Depends(get_db)):
    return success_response(risk_service.high_risk_employees(db, user))


@router.get("/export")
def export_report(_: User = Depends(require_permission("risk.view"))):
    return success_response({"message": "Risk report export queued", "format": "pdf"})
