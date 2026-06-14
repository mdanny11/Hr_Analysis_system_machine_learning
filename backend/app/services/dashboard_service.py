from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import UserRole
from app.models.organization import AttritionRisk, Department, Employee, EmployeeStatus
from app.models.user import User
from app.schemas.dashboard import AttritionTrendPoint, KpiMetrics
from app.schemas.department import DepartmentOut, DepartmentRiskOut
from app.services.employee_service import get_department_scope, list_employees_query


ATTRITION_TRENDS = [
    {"month": "Jan", "actual": 12, "predicted": 14, "hired": 18},
    {"month": "Feb", "actual": 8, "predicted": 10, "hired": 15},
    {"month": "Mar", "actual": 15, "predicted": 13, "hired": 22},
    {"month": "Apr", "actual": 11, "predicted": 12, "hired": 19},
    {"month": "May", "actual": 9, "predicted": 11, "hired": 16},
    {"month": "Jun", "actual": 14, "predicted": 15, "hired": 21},
    {"month": "Jul", "actual": 18, "predicted": 16, "hired": 25},
    {"month": "Aug", "actual": 13, "predicted": 14, "hired": 20},
    {"month": "Sep", "actual": 10, "predicted": 12, "hired": 17},
    {"month": "Oct", "actual": 16, "predicted": 15, "hired": 23},
    {"month": "Nov", "actual": 12, "predicted": 13, "hired": 18},
    {"month": "Dec", "actual": 7, "predicted": 9, "hired": 12},
]


def list_departments(db: Session) -> list[dict]:
    departments = db.query(Department).order_by(Department.name).all()
    return [DepartmentOut.model_validate(d).model_dump(by_alias=True) for d in departments]


def department_risk_breakdown(db: Session, department_id, user: User) -> dict:
    if get_department_scope(user) and department_id != user.department_id:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"code": "FORBIDDEN", "message": "Access denied"})
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Department not found"})

    employees = db.query(Employee).filter(Employee.department_id == department.id, Employee.deleted_at.is_(None))
    high = employees.filter(Employee.attrition_risk == AttritionRisk.HIGH).count()
    medium = employees.filter(Employee.attrition_risk == AttritionRisk.MEDIUM).count()
    low = employees.filter(Employee.attrition_risk == AttritionRisk.LOW).count()
    return DepartmentRiskOut(
        id=department.id,
        name=department.name,
        head_count=department.head_count,
        attrition_rate=department.attrition_rate,
        avg_satisfaction=department.avg_satisfaction,
        budget=department.budget,
        high_risk=high,
        medium_risk=medium,
        low_risk=low,
    ).model_dump(by_alias=True)


def compute_kpis(db: Session, user: User) -> dict:
    query = list_employees_query(db, user)
    total = query.count()
    active = query.filter(Employee.status == EmployeeStatus.ACTIVE).count()
    high = query.filter(Employee.attrition_risk == AttritionRisk.HIGH).count()
    medium = query.filter(Employee.attrition_risk == AttritionRisk.MEDIUM).count()
    low = query.filter(Employee.attrition_risk == AttritionRisk.LOW).count()
    avg_tenure = db.query(func.avg(Employee.years_at_company)).scalar() or 0
    avg_satisfaction = db.query(func.avg(Employee.satisfaction_score)).scalar() or 0
    avg_performance = db.query(func.avg(Employee.performance_score)).scalar() or 0
    attrition_rate = round(((high + medium * 0.5) / max(total, 1)) * 100, 1)
    return KpiMetrics(
        total_employees=total,
        active_employees=active,
        attrition_rate=attrition_rate,
        avg_tenure=round(float(avg_tenure), 1),
        avg_satisfaction=round(float(avg_satisfaction), 1),
        high_risk_count=high,
        medium_risk_count=medium,
        low_risk_count=low,
        open_positions=23,
        monthly_turnover=14,
        retention_rate=round(100 - attrition_rate, 1),
        avg_performance=round(float(avg_performance), 1),
    ).model_dump(by_alias=True)


def get_attrition_trends() -> list[dict]:
    return [AttritionTrendPoint(**item).model_dump(by_alias=True) for item in ATTRITION_TRENDS]


def role_dashboard(db: Session, user: User) -> dict:
    kpis = compute_kpis(db, user)
    high_risk = (
        list_employees_query(db, user)
        .options(joinedload(Employee.department))
        .filter(Employee.attrition_risk == AttritionRisk.HIGH)
        .order_by(Employee.attrition_probability.desc())
        .limit(10)
        .all()
    )
    from app.services.employee_service import serialize_employee

    return {
        "role": user.role.value,
        "kpis": kpis,
        "highRiskEmployees": [serialize_employee(e) for e in high_risk],
        "attritionTrends": get_attrition_trends(),
    }
