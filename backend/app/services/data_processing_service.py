import re
import statistics
import time
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.models.audit import DataQualitySnapshot, FeatureEngineeringConfig, PipelineRun
from app.models.organization import Employee
from app.models.user import User
from app.services.employee_service import list_employees_query

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

DEFAULT_FEATURES: list[dict] = [
    {
        "id": "tenure_bucket",
        "name": "Tenure Buckets",
        "description": "Group years at company into categories",
        "enabled": True,
        "transformation": "bucket",
    },
    {
        "id": "salary_normalized",
        "name": "Salary Normalization",
        "description": "Min-max scaling of salary data",
        "enabled": True,
        "transformation": "min_max",
    },
    {
        "id": "satisfaction_binary",
        "name": "Satisfaction Binary",
        "description": "Convert to high/low satisfaction",
        "enabled": False,
        "transformation": "binary",
    },
    {
        "id": "overtime_flag",
        "name": "Overtime Flag",
        "description": "Flag employees with >20 overtime hours",
        "enabled": True,
        "transformation": "flag",
    },
    {
        "id": "promotion_gap",
        "name": "Promotion Gap",
        "description": "Years since last promotion",
        "enabled": True,
        "transformation": "derived",
    },
    {
        "id": "engagement_score",
        "name": "Engagement Score",
        "description": "Composite engagement metric",
        "enabled": False,
        "transformation": "composite",
    },
]

FIELD_RULES: list[dict] = [
    {
        "field": "Employee ID",
        "complete": lambda e: bool(e.employee_id and e.employee_id.strip()),
        "valid": lambda e: len(e.employee_id or "") >= 3,
        "unique_key": lambda e: e.employee_id,
    },
    {
        "field": "Name",
        "complete": lambda e: bool(e.first_name.strip() and e.last_name.strip()),
        "valid": lambda e: len(e.first_name) >= 2 and len(e.last_name) >= 2,
        "unique_key": lambda e: f"{e.first_name} {e.last_name}".lower(),
    },
    {
        "field": "Email",
        "complete": lambda e: bool(e.email and e.email.strip()),
        "valid": lambda e: bool(EMAIL_PATTERN.match(e.email or "")),
        "unique_key": lambda e: (e.email or "").lower(),
    },
    {
        "field": "Department",
        "complete": lambda e: e.department_id is not None,
        "valid": lambda e: e.department is not None,
        "unique_key": lambda e: e.department.name if e.department else None,
    },
    {
        "field": "Salary",
        "complete": lambda e: e.salary is not None and float(e.salary) > 0,
        "valid": lambda e: 10_000 <= float(e.salary) <= 500_000_000,
        "unique_key": lambda e: str(e.salary),
    },
    {
        "field": "Performance Score",
        "complete": lambda e: e.performance_score is not None and e.performance_score > 0,
        "valid": lambda e: 1 <= e.performance_score <= 10,
        "unique_key": lambda e: round(e.performance_score, 1),
    },
    {
        "field": "Satisfaction Score",
        "complete": lambda e: e.satisfaction_score is not None and e.satisfaction_score > 0,
        "valid": lambda e: 1 <= e.satisfaction_score <= 10,
        "unique_key": lambda e: round(e.satisfaction_score, 1),
    },
    {
        "field": "Last Promotion Years",
        "complete": lambda e: e.last_promotion_years is not None,
        "valid": lambda e: 0 <= e.last_promotion_years <= max(e.years_at_company, 1),
        "unique_key": lambda e: e.last_promotion_years,
    },
    {
        "field": "Training Hours",
        "complete": lambda e: e.training_hours is not None and e.training_hours > 0,
        "valid": lambda e: 0 <= e.training_hours <= 500,
        "unique_key": lambda e: e.training_hours,
    },
]

MISSING_FIELD_MAP = {
    "Training Hours": "training_hours",
    "Last Promotion": "last_promotion_years",
    "Satisfaction": "satisfaction_score",
    "Performance": "performance_score",
    "Salary": "salary",
    "Email": "email",
}

IMPUTATION_STRATEGIES = [
    {
        "field": "Training Hours",
        "strategy": "Mean Imputation",
        "action": "Fill with department mean training hours",
        "attribute": "training_hours",
        "method": "mean_int",
    },
    {
        "field": "Last Promotion",
        "strategy": "Median Imputation",
        "action": "Fill with median promotion gap",
        "attribute": "last_promotion_years",
        "method": "median_int",
    },
    {
        "field": "Satisfaction",
        "strategy": "Department Mean",
        "action": "Predict from department average satisfaction",
        "attribute": "satisfaction_score",
        "method": "mean_float",
    },
    {
        "field": "Performance",
        "strategy": "Department Mean",
        "action": "Use department average performance",
        "attribute": "performance_score",
        "method": "mean_float",
    },
    {
        "field": "Salary",
        "strategy": "Position Median",
        "action": "Fill with position median salary",
        "attribute": "salary",
        "method": "median_decimal",
    },
]


def _load_employees(db: Session, user: User) -> list[Employee]:
    return (
        list_employees_query(db, user)
        .options(joinedload(Employee.department))
        .all()
    )


def _pct(numerator: int, total: int) -> float:
    if total == 0:
        return 100.0
    return round(numerator / total * 100, 1)


def _status(completeness: float, validity: float) -> str:
    score = (completeness + validity) / 2
    if score >= 90:
        return "good"
    if score >= 75:
        return "warning"
    return "error"


def compute_field_metrics(employees: list[Employee]) -> list[dict]:
    total = len(employees)
    metrics: list[dict] = []

    for rule in FIELD_RULES:
        complete_count = sum(1 for e in employees if rule["complete"](e))
        valid_count = sum(1 for e in employees if rule["valid"](e))
        unique_values = {rule["unique_key"](e) for e in employees if rule["unique_key"](e) is not None}
        completeness = _pct(complete_count, total)
        validity = _pct(valid_count, total)
        uniqueness = _pct(len(unique_values), total)
        metrics.append(
            {
                "field": rule["field"],
                "completeness": completeness,
                "validity": validity,
                "uniqueness": uniqueness,
                "status": _status(completeness, validity),
            }
        )

    return metrics


def compute_missing_data(employees: list[Employee]) -> list[dict]:
    total = len(employees)
    rows: list[dict] = []

    checks = {
        "Training Hours": lambda e: e.training_hours > 0,
        "Last Promotion": lambda e: e.last_promotion_years <= e.years_at_company,
        "Satisfaction": lambda e: e.satisfaction_score > 0,
        "Performance": lambda e: e.performance_score > 0,
        "Salary": lambda e: float(e.salary) > 0,
        "Email": lambda e: bool(EMAIL_PATTERN.match(e.email or "")),
    }

    for field, check in checks.items():
        missing = sum(1 for e in employees if not check(e))
        rows.append(
            {
                "field": field,
                "missing": missing,
                "percentage": round(missing / total * 100, 1) if total else 0,
            }
        )

    rows.sort(key=lambda row: row["percentage"], reverse=True)
    return rows


def compute_outliers(employees: list[Employee], threshold: float = 2.5) -> dict:
    salaries = [float(e.salary) for e in employees]
    tenures = [e.years_at_company for e in employees]
    mean_salary = statistics.mean(salaries) if salaries else 0
    std_salary = statistics.pstdev(salaries) if len(salaries) > 1 else 1
    std_salary = std_salary or 1

    points: list[dict] = []
    outliers: list[dict] = []

    for employee in employees:
        salary = float(employee.salary)
        z_score = (salary - mean_salary) / std_salary
        is_outlier = abs(z_score) >= threshold
        point = {
            "x": salary,
            "y": employee.years_at_company,
            "z": max(50, min(400, employee.training_hours * 3)),
            "employeeId": employee.employee_id,
            "name": f"{employee.first_name} {employee.last_name}",
            "currency": employee.currency or "RWF",
            "isOutlier": is_outlier,
        }
        points.append(point)
        if is_outlier:
            outliers.append(
                {
                    "id": employee.employee_id,
                    "field": "Salary",
                    "value": salary,
                    "currency": employee.currency or "RWF",
                    "reason": f"Z-score: {z_score:.1f}",
                }
            )

    return {
        "threshold": threshold,
        "points": points[:300],
        "outliers": outliers,
        "outlierCount": len(outliers),
    }


def compute_summary(employees: list[Employee], field_metrics: list[dict], missing_rows: list[dict], outlier_count: int) -> dict:
    total = len(employees)
    quality_score = round(
        sum((m["completeness"] + m["validity"]) / 2 for m in field_metrics) / len(field_metrics)
    ) if field_metrics else 0
    fields_validated = sum(1 for m in field_metrics if m["status"] == "good")
    missing_values = sum(row["missing"] for row in missing_rows)
    completeness = round(sum(m["completeness"] for m in field_metrics) / len(field_metrics), 1) if field_metrics else 0
    accuracy = round(sum(m["validity"] for m in field_metrics) / len(field_metrics), 1) if field_metrics else 0
    consistency = round(sum(m["uniqueness"] for m in field_metrics[:4]) / 4, 1) if len(field_metrics) >= 4 else 0

    return {
        "qualityScore": quality_score,
        "fieldsValidated": fields_validated,
        "missingValues": missing_values,
        "outliersDetected": outlier_count,
        "employeeCount": total,
        "completeness": completeness,
        "accuracy": accuracy,
        "consistency": consistency,
    }


def get_quality_report(db: Session, user: User, outlier_threshold: float = 2.5) -> dict:
    employees = _load_employees(db, user)
    field_metrics = compute_field_metrics(employees)
    missing_rows = compute_missing_data(employees)
    outlier_info = compute_outliers(employees, outlier_threshold)
    summary = compute_summary(employees, field_metrics, missing_rows, outlier_info["outlierCount"])

    snapshot = db.query(DataQualitySnapshot).order_by(DataQualitySnapshot.recorded_at.desc()).first()
    if snapshot:
        summary["lastSnapshotAt"] = snapshot.recorded_at.isoformat()

    return {
        "summary": summary,
        "fields": field_metrics,
        "missing": missing_rows,
        "outliers": outlier_info,
    }


def ensure_feature_configs(db: Session) -> list[FeatureEngineeringConfig]:
    existing = {row.feature_name: row for row in db.query(FeatureEngineeringConfig).all()}
    for feature in DEFAULT_FEATURES:
        if feature["id"] not in existing:
            db.add(
                FeatureEngineeringConfig(
                    feature_name=feature["id"],
                    enabled=feature["enabled"],
                    transformation=feature["transformation"],
                )
            )
    db.commit()
    return db.query(FeatureEngineeringConfig).order_by(FeatureEngineeringConfig.feature_name).all()


def serialize_features(rows: list[FeatureEngineeringConfig]) -> list[dict]:
    meta = {item["id"]: item for item in DEFAULT_FEATURES}
    results: list[dict] = []
    for row in rows:
        info = meta.get(row.feature_name, {})
        results.append(
            {
                "id": row.feature_name,
                "name": info.get("name", row.feature_name.replace("_", " ").title()),
                "description": info.get("description", ""),
                "enabled": row.enabled,
                "transformation": row.transformation,
            }
        )
    ordered = {item["id"]: item for item in DEFAULT_FEATURES}
    results.sort(key=lambda item: list(ordered.keys()).index(item["id"]) if item["id"] in ordered else 999)
    return results


def get_feature_configs(db: Session) -> list[dict]:
    rows = ensure_feature_configs(db)
    return serialize_features(rows)


def update_feature_configs(db: Session, updates: list[dict]) -> list[dict]:
    ensure_feature_configs(db)
    for item in updates:
        row = db.query(FeatureEngineeringConfig).filter(FeatureEngineeringConfig.feature_name == item["id"]).first()
        if row and "enabled" in item:
            row.enabled = bool(item["enabled"])
    db.commit()
    return get_feature_configs(db)


def _is_incomplete(employee: Employee, attribute: str) -> bool:
    if attribute == "training_hours":
        return employee.training_hours <= 0
    if attribute == "last_promotion_years":
        return employee.last_promotion_years > employee.years_at_company
    if attribute == "satisfaction_score":
        return employee.satisfaction_score <= 0
    if attribute == "performance_score":
        return employee.performance_score <= 0
    if attribute == "salary":
        return float(employee.salary) <= 0
    if attribute == "email":
        return not EMAIL_PATTERN.match(employee.email or "")
    return False


def apply_imputation(db: Session, user: User) -> dict:
    employees = _load_employees(db, user)
    updated = 0

    training_values = [e.training_hours for e in employees if e.training_hours > 0]
    promotion_values = [e.last_promotion_years for e in employees if e.last_promotion_years <= e.years_at_company]
    mean_training = round(statistics.mean(training_values)) if training_values else 40
    median_promotion = round(statistics.median(promotion_values)) if promotion_values else 2

    dept_satisfaction: dict[str, list[float]] = {}
    dept_performance: dict[str, list[float]] = {}
    position_salary: dict[str, list[float]] = {}
    for employee in employees:
        dept_name = employee.department.name if employee.department else "Unknown"
        dept_satisfaction.setdefault(dept_name, []).append(employee.satisfaction_score)
        dept_performance.setdefault(dept_name, []).append(employee.performance_score)
        position_salary.setdefault(employee.position, []).append(float(employee.salary))

    for employee in employees:
        changed = False
        dept_name = employee.department.name if employee.department else "Unknown"

        if employee.training_hours <= 0:
            employee.training_hours = mean_training
            changed = True
        if employee.last_promotion_years > employee.years_at_company:
            employee.last_promotion_years = min(median_promotion, employee.years_at_company)
            changed = True
        if employee.satisfaction_score <= 0:
            employee.satisfaction_score = round(statistics.mean(dept_satisfaction.get(dept_name, [7.0])), 1)
            changed = True
        if employee.performance_score <= 0:
            employee.performance_score = round(statistics.mean(dept_performance.get(dept_name, [7.5])), 1)
            changed = True
        if float(employee.salary) <= 0:
            salaries = position_salary.get(employee.position, [100000])
            employee.salary = Decimal(str(round(statistics.median(salaries), 2)))
            changed = True

        if changed:
            updated += 1

    db.commit()
    return {"updatedEmployees": updated, "message": f"Imputed missing values for {updated} employees"}


def handle_outliers(db: Session, user: User, threshold: float = 2.5) -> dict:
    employees = _load_employees(db, user)
    salaries = [float(e.salary) for e in employees]
    if not salaries:
        return {"adjustedEmployees": 0, "message": "No employees to process"}

    mean_salary = statistics.mean(salaries)
    std_salary = statistics.pstdev(salaries) if len(salaries) > 1 else 0
    std_salary = std_salary or 1
    lower = mean_salary - threshold * std_salary
    upper = mean_salary + threshold * std_salary
    adjusted = 0

    for employee in employees:
        salary = float(employee.salary)
        z_score = abs((salary - mean_salary) / std_salary)
        if z_score >= threshold:
            clamped = max(lower, min(upper, salary))
            employee.salary = Decimal(str(round(clamped, 2)))
            adjusted += 1

    db.commit()
    return {"adjustedEmployees": adjusted, "message": f"Adjusted salary outliers for {adjusted} employees"}


def _step(name: str, status: str, duration: str | None = None, detail: str | None = None) -> dict:
    payload = {"name": name, "status": status}
    if duration is not None:
        payload["duration"] = duration
    if detail is not None:
        payload["detail"] = detail
    return payload


def run_preprocessing_pipeline(
    db: Session,
    user: User,
    *,
    outlier_threshold: float = 2.5,
    feature_updates: list[dict] | None = None,
) -> dict:
    started = time.perf_counter()
    employees = _load_employees(db, user)
    steps: list[dict] = []

    t0 = time.perf_counter()
    employee_count = len(employees)
    steps.append(
        _step(
            "Data Import",
            "completed",
            f"{time.perf_counter() - t0:.1f}s",
            f"{employee_count} employee records loaded",
        )
    )

    t0 = time.perf_counter()
    field_metrics = compute_field_metrics(employees)
    invalid_fields = [m["field"] for m in field_metrics if m["status"] == "error"]
    steps.append(
        _step(
            "Schema Validation",
            "completed" if not invalid_fields else "completed",
            f"{time.perf_counter() - t0:.1f}s",
            f"{len(field_metrics) - len(invalid_fields)} fields passed validation",
        )
    )

    t0 = time.perf_counter()
    missing_before = compute_missing_data(employees)
    missing_count = sum(row["missing"] for row in missing_before)
    steps.append(
        _step(
            "Missing Value Detection",
            "completed",
            f"{time.perf_counter() - t0:.1f}s",
            f"{missing_count} missing values detected",
        )
    )

    t0 = time.perf_counter()
    impute_result = apply_imputation(db, user)
    steps.append(
        _step(
            "Missing Value Imputation",
            "completed",
            f"{time.perf_counter() - t0:.1f}s",
            impute_result["message"],
        )
    )

    employees = _load_employees(db, user)
    t0 = time.perf_counter()
    outlier_info = compute_outliers(employees, outlier_threshold)
    steps.append(
        _step(
            "Outlier Detection",
            "completed",
            f"{time.perf_counter() - t0:.1f}s",
            f"{outlier_info['outlierCount']} salary outliers detected",
        )
    )

    t0 = time.perf_counter()
    outlier_result = handle_outliers(db, user, outlier_threshold)
    steps.append(
        _step(
            "Data Normalization",
            "completed",
            f"{time.perf_counter() - t0:.1f}s",
            outlier_result["message"],
        )
    )

    t0 = time.perf_counter()
    if feature_updates:
        update_feature_configs(db, feature_updates)
    enabled_features = [f["name"] for f in get_feature_configs(db) if f["enabled"]]
    steps.append(
        _step(
            "Feature Engineering",
            "completed",
            f"{time.perf_counter() - t0:.1f}s",
            f"{len(enabled_features)} features enabled",
        )
    )

    t0 = time.perf_counter()
    employees = _load_employees(db, user)
    field_metrics = compute_field_metrics(employees)
    missing_rows = compute_missing_data(employees)
    outlier_info = compute_outliers(employees, outlier_threshold)
    summary = compute_summary(employees, field_metrics, missing_rows, outlier_info["outlierCount"])
    snapshot = DataQualitySnapshot(
        recorded_at=datetime.now(timezone.utc),
        completeness=summary["completeness"],
        accuracy=summary["accuracy"],
        consistency=summary["consistency"],
    )
    db.add(snapshot)

    run = PipelineRun(
        status="completed",
        steps=steps + [_step("Export to ML Pipeline", "completed", f"{time.perf_counter() - t0:.1f}s", "Snapshot saved for ML models")],
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        triggered_by=user.id,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    total_duration = time.perf_counter() - started
    return {
        "runId": str(run.id),
        "status": run.status,
        "steps": run.steps,
        "summary": summary,
        "durationSeconds": round(total_duration, 2),
    }


def get_latest_pipeline_run(db: Session, user: User) -> dict | None:
    run = (
        db.query(PipelineRun)
        .filter(PipelineRun.triggered_by == user.id)
        .order_by(PipelineRun.created_at.desc())
        .first()
    )
    if not run:
        return None
    return {
        "runId": str(run.id),
        "status": run.status,
        "steps": run.steps or [],
        "startedAt": run.started_at.isoformat() if run.started_at else None,
        "completedAt": run.completed_at.isoformat() if run.completed_at else None,
    }


def get_imputation_strategies(db: Session, user: User) -> list[dict]:
    employees = _load_employees(db, user)
    strategies: list[dict] = []

    training_values = [e.training_hours for e in employees if e.training_hours > 0]
    promotion_values = [e.last_promotion_years for e in employees if e.last_promotion_years <= e.years_at_company]
    mean_training = round(statistics.mean(training_values), 1) if training_values else 40
    median_promotion = round(statistics.median(promotion_values), 1) if promotion_values else 2

    action_map = {
        "Training Hours": f"Fill with {mean_training} hrs",
        "Last Promotion": f"Fill with {median_promotion} years",
        "Satisfaction": "Use department average satisfaction",
        "Performance": "Use department average performance",
        "Salary": "Fill with position median salary",
    }

    for strategy in IMPUTATION_STRATEGIES:
        missing = sum(1 for e in employees if _is_incomplete(e, strategy["attribute"]))
        strategies.append(
            {
                "field": strategy["field"],
                "strategy": strategy["strategy"],
                "action": action_map[strategy["field"]],
                "missingCount": missing,
            }
        )
    return strategies
