from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models.alerts import Alert, AlertRule, AlertSeverity, AlertStatus
from app.models.organization import Employee
from app.models.user import User
from app.services.employee_service import get_department_scope, list_employees_query, serialize_employee


def _employee_value(employee: Employee, field: str) -> float:
    return float(getattr(employee, field))


def _rule_matches(employee: Employee, rule: AlertRule) -> bool:
    condition = rule.condition or {}
    field = condition.get("field")
    operator = condition.get("operator")
    value = condition.get("value")
    if not field or operator is None or value is None:
        threshold = rule.threshold or 0
        return employee.attrition_probability >= threshold

    current = _employee_value(employee, field)
    target = float(value)
    if operator == ">=":
        return current >= target
    if operator == ">":
        return current > target
    if operator == "<=":
        return current <= target
    if operator == "<":
        return current < target
    if operator == "==":
        return current == target
    return False


def _severity_for_employee(employee: Employee) -> AlertSeverity:
    if employee.attrition_probability >= 85:
        return AlertSeverity.CRITICAL
    if employee.attrition_probability >= 70:
        return AlertSeverity.HIGH
    if employee.attrition_probability >= 50:
        return AlertSeverity.MEDIUM
    return AlertSeverity.LOW


def _alert_message(employee: Employee, rule: AlertRule) -> str:
    condition = rule.condition or {}
    field = condition.get("field", "attrition_probability")
    if field == "attrition_probability":
        return f"Attrition risk at {employee.attrition_probability}%"
    if field == "satisfaction_score":
        return f"Low satisfaction score ({employee.satisfaction_score})"
    return f"{rule.name} triggered for {employee.first_name} {employee.last_name}"


def serialize_alert(alert: Alert, db: Session) -> dict:
    employee = db.query(Employee).filter(Employee.id == alert.employee_id).first() if alert.employee_id else None
    reason = alert.message
    if employee and "attrition risk" in alert.message.lower():
        reason = f"Attrition risk at {employee.attrition_probability}%"
    return {
        "id": str(alert.id),
        "type": alert.severity.value,
        "employee": serialize_employee(employee) if employee else None,
        "reason": reason,
        "triggeredAt": alert.created_at.isoformat(),
        "status": alert.status.value,
        "assignee": "HR Manager",
    }


def list_alerts(db: Session, user: User, limit: int = 50) -> list[dict]:
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if get_department_scope(user):
        query = query.join(Employee).filter(Employee.department_id == user.department_id)
    alerts = query.limit(limit).all()
    return [serialize_alert(alert, db) for alert in alerts]


def detect_alerts(db: Session, user: User) -> dict:
    rules = db.query(AlertRule).filter(AlertRule.enabled.is_(True)).all()
    if not rules:
        rules = [
            AlertRule(
                name="High Attrition Risk",
                condition={"field": "attrition_probability", "operator": ">=", "value": 80},
                threshold=80.0,
                enabled=True,
            )
        ]

    employees = list_employees_query(db, user).all()
    created = 0
    updated = 0
    resolved = 0
    matched_employee_ids: set = set()

    for employee in employees:
        matching_rules = [rule for rule in rules if _rule_matches(employee, rule)]
        if not matching_rules:
            continue

        matched_employee_ids.add(employee.id)
        primary_rule = matching_rules[0]
        existing = (
            db.query(Alert)
            .filter(
                Alert.employee_id == employee.id,
                Alert.status.in_([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED]),
            )
            .first()
        )
        if existing:
            existing.severity = _severity_for_employee(employee)
            existing.message = _alert_message(employee, primary_rule)
            updated += 1
            continue

        db.add(
            Alert(
                employee_id=employee.id,
                rule_id=primary_rule.id if getattr(primary_rule, "id", None) else None,
                severity=_severity_for_employee(employee),
                message=_alert_message(employee, primary_rule),
                status=AlertStatus.ACTIVE,
            )
        )
        created += 1

    active_alerts = db.query(Alert).filter(Alert.status.in_([AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED])).all()
    for alert in active_alerts:
        if not alert.employee_id or alert.employee_id in matched_employee_ids:
            continue
        employee = db.query(Employee).filter(Employee.id == alert.employee_id).first()
        if not employee:
            continue
        still_matches = any(_rule_matches(employee, rule) for rule in rules)
        if not still_matches:
            alert.status = AlertStatus.RESOLVED
            resolved += 1

    db.commit()
    return {
        "message": "Detection complete",
        "alertsCreated": created,
        "alertsUpdated": updated,
        "alertsResolved": resolved,
    }


def list_alert_rules(db: Session) -> list[dict]:
    rows = db.query(AlertRule).all()
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "condition": row.condition,
            "threshold": row.threshold,
            "enabled": row.enabled,
        }
        for row in rows
    ]


def update_alert_rule(db: Session, rule_id, enabled: bool | None = None, threshold: float | None = None) -> dict:
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not rule:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Rule not found"})
    if enabled is not None:
        rule.enabled = enabled
    if threshold is not None:
        rule.threshold = threshold
        if rule.condition and rule.condition.get("field") == "attrition_probability":
            rule.condition = {**rule.condition, "value": threshold}
            flag_modified(rule, "condition")
    db.commit()
    return {"id": str(rule.id), "enabled": rule.enabled, "threshold": rule.threshold}


def count_alert_summary(db: Session, user: User) -> dict:
    query = db.query(Alert)
    if get_department_scope(user):
        query = query.join(Employee).filter(Employee.department_id == user.department_id)
    alerts = query.all()
    today = datetime.now(timezone.utc).date()
    resolved_today = sum(
        1
        for alert in alerts
        if alert.status == AlertStatus.RESOLVED
        and alert.updated_at
        and alert.updated_at.date() == today
    )
    return {
        "critical": sum(1 for alert in alerts if alert.severity == AlertSeverity.CRITICAL and alert.status != AlertStatus.RESOLVED),
        "warning": sum(
            1
            for alert in alerts
            if alert.severity in (AlertSeverity.HIGH, AlertSeverity.MEDIUM) and alert.status != AlertStatus.RESOLVED
        ),
        "pending": sum(1 for alert in alerts if alert.status in (AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED)),
        "resolvedToday": resolved_today,
    }
