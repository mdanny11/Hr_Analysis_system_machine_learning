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


def _salary_band_groups(employees: list[Employee]) -> list[tuple[str, float, float]]:
    if not employees:
        return [
            ("< 60K", 0, 60_000),
            ("60-80K", 60_000, 80_000),
            ("80-100K", 80_000, 100_000),
            ("100-120K", 100_000, 120_000),
            ("120K+", 120_000, float("inf")),
        ]

    max_salary = max(float(employee.salary) for employee in employees)
    if max_salary >= 500_000:
        return [
            ("< 500K RWF", 0, 500_000),
            ("500K-1M", 500_000, 1_000_000),
            ("1M-1.5M", 1_000_000, 1_500_000),
            ("1.5M-2M", 1_500_000, 2_000_000),
            ("2M+ RWF", 2_000_000, float("inf")),
        ]

    return [
        ("< 60K", 0, 60_000),
        ("60-80K", 60_000, 80_000),
        ("80-100K", 80_000, 100_000),
        ("100-120K", 100_000, 120_000),
        ("120K+", 120_000, float("inf")),
    ]


def risk_by_salary(db: Session, user: User) -> list[dict]:
    employees = _employee_query(db, user).all()
    groups = _salary_band_groups(employees)
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
        high_risk_count = sum(1 for e in employees if e.attrition_risk == AttritionRisk.HIGH)
        avg_satisfaction = sum(e.satisfaction_score for e in employees) / len(employees) if employees else 0
        live_attrition_rate = round(high_risk_count / len(employees) * 100, 1) if employees else 0
        result.append(
            {
                "department": dept.name.split(" ")[0],
                "fullName": dept.name,
                "attritionRate": live_attrition_rate,
                "satisfaction": round(avg_satisfaction, 1),
                "headCount": len(employees),
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
