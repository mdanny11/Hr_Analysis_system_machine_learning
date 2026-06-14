from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.organization import AttritionRisk, Department, Employee
from app.models.user import User
from app.services.employee_service import get_department_scope, list_employees_query, serialize_employee


def _employee_query(db: Session, user: User):
    return list_employees_query(db, user).options(joinedload(Employee.department))


def risk_summary(db: Session, user: User) -> dict:
    query = _employee_query(db, user)
    total = query.count() or 1
    low = query.filter(Employee.attrition_risk == AttritionRisk.LOW).count()
    medium = query.filter(Employee.attrition_risk == AttritionRisk.MEDIUM).count()
    high = query.filter(Employee.attrition_risk == AttritionRisk.HIGH).count()
    avg_score = db.query(func.avg(Employee.attrition_probability)).scalar() or 0
    return {
        "totalEmployees": total,
        "lowRisk": low,
        "mediumRisk": medium,
        "highRisk": high,
        "lowRiskPct": round(low / total * 100, 1),
        "mediumRiskPct": round(medium / total * 100, 1),
        "highRiskPct": round(high / total * 100, 1),
        "avgRiskScore": round(float(avg_score), 1),
    }


def risk_by_tenure(db: Session, user: User) -> list[dict]:
    groups = [
        ("< 1 year", 0, 1),
        ("1-2 years", 1, 2),
        ("2-5 years", 2, 5),
        ("5-10 years", 5, 10),
        ("10+ years", 10, 100),
    ]
    employees = _employee_query(db, user).all()
    result = []
    for label, min_years, max_years in groups:
        group = [e for e in employees if min_years <= e.years_at_company < max_years]
        avg_risk = sum(e.attrition_probability for e in group) / len(group) if group else 0
        result.append({"tenure": label, "avgRisk": round(avg_risk), "count": len(group)})
    return result


def risk_by_salary(db: Session, user: User) -> list[dict]:
    groups = [
        ("< 60K", 0, 60000),
        ("60-80K", 60000, 80000),
        ("80-100K", 80000, 100000),
        ("100-120K", 100000, 120000),
        ("120K+", 120000, 999999),
    ]
    employees = _employee_query(db, user).all()
    result = []
    for label, min_salary, max_salary in groups:
        group = [e for e in employees if min_salary <= float(e.salary) < max_salary]
        avg_risk = sum(e.attrition_probability for e in group) / len(group) if group else 0
        result.append({"salary": label, "avgRisk": round(avg_risk), "count": len(group)})
    return result


def risk_matrix(db: Session, user: User, limit: int = 100) -> list[dict]:
    employees = (
        _employee_query(db, user)
        .order_by(Employee.attrition_probability.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "satisfaction": e.satisfaction_score,
            "performance": e.performance_score,
            "risk": e.attrition_probability,
            "name": f"{e.first_name} {e.last_name}",
        }
        for e in employees
    ]


def risk_by_department(db: Session, user: User) -> list[dict]:
    dept_scope = get_department_scope(user)
    query = db.query(Department)
    if dept_scope:
        query = query.filter(Department.id == dept_scope)
    departments = query.all()
    result = []
    for dept in departments:
        employees = _employee_query(db, user).filter(Employee.department_id == dept.id).all()
        avg_risk = sum(e.attrition_probability for e in employees) / len(employees) if employees else 0
        result.append(
            {
                "department": dept.name.split(" ")[0],
                "fullName": dept.name,
                "attritionRate": dept.attrition_rate,
                "satisfaction": round(dept.avg_satisfaction * 10, 1),
                "headCount": dept.head_count,
                "avgRisk": round(avg_risk, 1),
                "employeeCount": len(employees),
            }
        )
    return result


def high_risk_employees(db: Session, user: User, limit: int = 20) -> list[dict]:
    employees = (
        _employee_query(db, user)
        .filter(Employee.attrition_risk == AttritionRisk.HIGH)
        .order_by(Employee.attrition_probability.desc())
        .limit(limit)
        .all()
    )
    return [serialize_employee(e) for e in employees]
