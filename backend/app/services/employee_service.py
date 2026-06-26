import random
from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.permissions import UserRole
from app.models.organization import (
    AttritionRisk,
    CompensationRecord,
    Department,
    Employee,
    EmployeeCertification,
    EmployeeSkill,
    EmploymentEvent,
    EmployeeStatus,
)
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeStats, EmployeeUpdate


def _calculate_risk(
    satisfaction: float,
    years: int,
    promotion_years: int,
    overtime: int,
    work_life: float,
) -> tuple[AttritionRisk, int]:
    probability = 0.1
    if satisfaction < 7:
        probability += 0.2
    if years < 2:
        probability += 0.15
    if promotion_years > 3:
        probability += 0.15
    if overtime > 20:
        probability += 0.1
    if work_life < 6.5:
        probability += 0.15
    probability = min(0.95, max(0.05, probability + random.uniform(-0.1, 0.1)))
    pct = int(round(probability * 100))
    if pct < 30:
        risk = AttritionRisk.LOW
    elif pct < 60:
        risk = AttritionRisk.MEDIUM
    else:
        risk = AttritionRisk.HIGH
    return risk, pct


def serialize_employee(employee: Employee) -> dict:
    return EmployeeOut(
        id=employee.id,
        employee_id=employee.employee_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        department=employee.department.name if employee.department else "",
        position=employee.position,
        hire_date=employee.hire_date,
        salary=employee.salary,
        age=employee.age,
        gender=employee.gender,
        years_at_company=employee.years_at_company,
        performance_score=employee.performance_score,
        satisfaction_score=employee.satisfaction_score,
        work_life_balance=employee.work_life_balance,
        last_promotion_years=employee.last_promotion_years,
        training_hours=employee.training_hours,
        overtime_hours=employee.overtime_hours,
        attrition_risk=employee.attrition_risk,
        attrition_probability=employee.attrition_probability,
        status=employee.status,
        avatar_url=employee.avatar_url,
    ).model_dump(by_alias=True)


def get_department_scope(user: User) -> UUID | None:
    if user.role == UserRole.DEPARTMENT_HEAD:
        return user.department_id
    return None


def list_employees_query(db: Session, user: User):
    query = (
        db.query(Employee)
        .options(joinedload(Employee.department))
        .filter(Employee.deleted_at.is_(None))
    )
    dept_scope = get_department_scope(user)
    if dept_scope:
        query = query.filter(Employee.department_id == dept_scope)
    return query


def list_employees(
    db: Session,
    user: User,
    *,
    search: str | None = None,
    department: str | None = None,
    risk: str | None = None,
    status_filter: str | None = None,
    page: int = 1,
    limit: int = 20,
    sort: str = "lastName",
) -> tuple[list[Employee], int]:
    query = list_employees_query(db, user)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Employee.first_name.ilike(pattern),
                Employee.last_name.ilike(pattern),
                Employee.email.ilike(pattern),
                Employee.employee_id.ilike(pattern),
            )
        )
    if department:
        query = query.join(Department).filter(Department.name.ilike(f"%{department}%"))
    if risk:
        query = query.filter(Employee.attrition_risk == risk)
    if status_filter:
        query = query.filter(Employee.status == status_filter)

    total = query.count()
    sort_map = {
        "lastName": Employee.last_name.asc(),
        "firstName": Employee.first_name.asc(),
        "department": Employee.department_id.asc(),
        "risk": Employee.attrition_probability.desc(),
    }
    query = query.order_by(sort_map.get(sort, Employee.last_name.asc()))
    items = query.offset((page - 1) * limit).limit(limit).all()
    return items, total


def get_employee(db: Session, user: User, employee_id: UUID) -> Employee:
    employee = (
        list_employees_query(db, user)
        .filter(Employee.id == employee_id)
        .first()
    )
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Employee not found"},
        )
    return employee


def resolve_department(db: Session, department_name: str) -> Department:
    department = db.query(Department).filter(Department.name == department_name).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_DEPARTMENT", "message": f"Department '{department_name}' not found"},
        )
    return department


def create_employee(db: Session, user: User, payload: EmployeeCreate) -> Employee:
    department = resolve_department(db, payload.department)
    if get_department_scope(user) and department.id != user.department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"code": "FORBIDDEN", "message": "Cannot create employee outside your department"})

    count = db.query(func.count(Employee.id)).scalar() or 0
    employee_code = payload.employee_id or f"EMP{str(count + 1001).zfill(5)}"
    risk, probability = _calculate_risk(
        payload.satisfaction_score,
        payload.years_at_company,
        payload.last_promotion_years,
        payload.overtime_hours,
        payload.work_life_balance,
    )
    employee = Employee(
        employee_id=employee_code,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        department_id=department.id,
        position=payload.position,
        hire_date=payload.hire_date,
        salary=payload.salary,
        age=payload.age,
        gender=payload.gender,
        years_at_company=payload.years_at_company,
        performance_score=payload.performance_score,
        satisfaction_score=payload.satisfaction_score,
        work_life_balance=payload.work_life_balance,
        last_promotion_years=payload.last_promotion_years,
        training_hours=payload.training_hours,
        overtime_hours=payload.overtime_hours,
        attrition_risk=risk,
        attrition_probability=probability,
        status=payload.status,
    )
    db.add(employee)
    db.flush()
    db.add(
        EmploymentEvent(
            employee_id=employee.id,
            event_type="hire",
            title="Joined company",
            description=f"Started as {employee.position} in {department.name}",
            event_date=employee.hire_date,
        )
    )
    db.add(
        CompensationRecord(
            employee_id=employee.id,
            base_salary=employee.salary,
            bonus=Decimal(str(float(employee.salary) * 0.1)),
            stock_options=max(100, int(float(employee.salary) / 1000)),
            effective_date=employee.hire_date,
        )
    )
    db.commit()
    db.refresh(employee)
    return get_employee(db, user, employee.id)


def update_employee(db: Session, user: User, employee_id: UUID, payload: EmployeeUpdate) -> Employee:
    employee = get_employee(db, user, employee_id)
    data = payload.model_dump(exclude_unset=True)
    if "department" in data:
        department = resolve_department(db, data.pop("department"))
        employee.department_id = department.id
    for key, value in data.items():
        setattr(employee, key, value)
    risk, probability = _calculate_risk(
        employee.satisfaction_score,
        employee.years_at_company,
        employee.last_promotion_years,
        employee.overtime_hours,
        employee.work_life_balance,
    )
    employee.attrition_risk = risk
    employee.attrition_probability = probability
    db.commit()
    db.refresh(employee)
    return employee


def employee_stats(db: Session, user: User) -> dict:
    query = list_employees_query(db, user)
    total = query.count()
    active = query.filter(Employee.status == EmployeeStatus.ACTIVE).count()
    on_leave = query.filter(Employee.status == EmployeeStatus.ON_LEAVE).count()
    inactive = query.filter(Employee.status == EmployeeStatus.INACTIVE).count()
    high_risk = query.filter(Employee.attrition_risk == AttritionRisk.HIGH).count()
    medium_risk = query.filter(Employee.attrition_risk == AttritionRisk.MEDIUM).count()
    low_risk = query.filter(Employee.attrition_risk == AttritionRisk.LOW).count()
    avg_performance = db.query(func.avg(Employee.performance_score)).filter(
        Employee.deleted_at.is_(None)
    ).scalar() or 0
    avg_satisfaction = db.query(func.avg(Employee.satisfaction_score)).filter(
        Employee.deleted_at.is_(None)
    ).scalar() or 0
    return EmployeeStats(
        total=total,
        active=active,
        on_leave=on_leave,
        inactive=inactive,
        high_risk=high_risk,
        medium_risk=medium_risk,
        low_risk=low_risk,
        avg_performance=round(float(avg_performance), 1),
        avg_satisfaction=round(float(avg_satisfaction), 1),
    ).model_dump(by_alias=True)
