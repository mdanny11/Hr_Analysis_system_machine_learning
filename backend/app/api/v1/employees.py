from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session, joinedload

from app.core.responses import Meta, success_response
from app.database import get_db
from app.dependencies import get_client_ip, require_permission
from app.models.organization import CompensationRecord, EmployeeCertification, EmployeeSkill, EmploymentEvent
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.services.audit_service import log_audit
from app.services.employee_service import (
    create_employee,
    employee_stats,
    get_employee,
    list_employees,
    serialize_employee,
    update_employee,
)
from app.services.dashboard_service import compute_kpis

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("")
def get_employees(
    search: str | None = None,
    department: str | None = None,
    risk: str | None = None,
    status: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort: str = "lastName",
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    items, total = list_employees(
        db,
        user,
        search=search,
        department=department,
        risk=risk,
        status_filter=status,
        page=page,
        limit=limit,
        sort=sort,
    )
    return success_response(
        [serialize_employee(e) for e in items],
        Meta(page=page, limit=limit, total=total),
    )


@router.get("/stats")
def stats(
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    return success_response(employee_stats(db, user))


@router.get("/{employee_id}")
def get_employee_detail(
    employee_id: UUID,
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    employee = get_employee(db, user, employee_id)
    return success_response(serialize_employee(employee))


@router.post("")
def create_employee_endpoint(
    payload: EmployeeCreate,
    request: Request,
    user: User = Depends(require_permission("employees.edit")),
    db: Session = Depends(get_db),
):
    employee = create_employee(db, user, payload)
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="CREATE",
        resource="Employee",
        details=f"Created employee {employee.employee_id}",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return success_response(serialize_employee(employee))


@router.patch("/{employee_id}")
def patch_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    request: Request,
    user: User = Depends(require_permission("employees.edit")),
    db: Session = Depends(get_db),
):
    employee = update_employee(db, user, employee_id, payload)
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="UPDATE",
        resource="Employee",
        details=f"Updated employee {employee.employee_id}",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return success_response(serialize_employee(employee))


@router.get("/{employee_id}/skills")
def employee_skills(
    employee_id: UUID,
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    get_employee(db, user, employee_id)
    skills = db.query(EmployeeSkill).filter(EmployeeSkill.employee_id == employee_id).all()
    return success_response(
        [
            {
                "id": s.id,
                "skillName": s.skill_name,
                "proficiency": s.proficiency,
                "yearsExperience": s.years_experience,
            }
            for s in skills
        ]
    )


@router.get("/{employee_id}/timeline")
def employee_timeline(
    employee_id: UUID,
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    get_employee(db, user, employee_id)
    events = (
        db.query(EmploymentEvent)
        .filter(EmploymentEvent.employee_id == employee_id)
        .order_by(EmploymentEvent.event_date.desc())
        .all()
    )
    return success_response(
        [
            {
                "id": e.id,
                "eventType": e.event_type,
                "title": e.title,
                "description": e.description,
                "eventDate": e.event_date.isoformat(),
            }
            for e in events
        ]
    )


@router.get("/{employee_id}/compensation")
def employee_compensation(
    employee_id: UUID,
    user: User = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    employee = get_employee(db, user, employee_id)
    record = (
        db.query(CompensationRecord)
        .filter(CompensationRecord.employee_id == employee_id)
        .order_by(CompensationRecord.effective_date.desc())
        .first()
    )
    if not record:
        return success_response(
            {
                "baseSalary": float(employee.salary),
                "bonus": round(float(employee.salary) * 0.1, 2),
                "stockOptions": 500,
                "effectiveDate": employee.hire_date.isoformat(),
                "totalCompensation": round(float(employee.salary) * 1.1, 2),
            }
        )
    total = float(record.base_salary) + float(record.bonus)
    return success_response(
        {
            "baseSalary": float(record.base_salary),
            "bonus": float(record.bonus),
            "stockOptions": record.stock_options,
            "effectiveDate": record.effective_date.isoformat(),
            "totalCompensation": round(total, 2),
        }
    )
