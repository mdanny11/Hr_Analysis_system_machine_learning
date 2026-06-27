import random
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

# Allow running as: python scripts/seed.py (from backend/)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from faker import Faker
from sqlalchemy.orm import Session

from app.core.permissions import UserRole
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models.alerts import Alert, AlertRule, AlertSeverity, AlertStatus, Notification, NotificationChannel
from app.models.audit import AuditLog, ComplianceChecklistItem, DataQualitySnapshot, FeatureEngineeringConfig, Integration, SystemSetting
from app.models.hr_ops import ActionItem, Feedback, RetentionStrategy, ScheduledReport, SuccessionCandidate, Survey, SurveyResponse, SurveyStatus
from app.models.ml import ModelFeatureImportance, ModelStatus, ModelType, PredictionModel
from app.models.organization import AttritionRisk, Department, Employee, EmployeeStatus, EmploymentEvent, CompensationRecord
from app.models.user import User, UserStatus

fake = Faker()

DEPARTMENTS = [
    {"name": "Engineering", "head_count": 145, "attrition_rate": 12.5, "avg_satisfaction": 7.8, "budget": 2500000},
    {"name": "Sales", "head_count": 89, "attrition_rate": 18.2, "avg_satisfaction": 6.9, "budget": 1800000},
    {"name": "Marketing", "head_count": 45, "attrition_rate": 8.5, "avg_satisfaction": 8.1, "budget": 950000},
    {"name": "Human Resources", "head_count": 28, "attrition_rate": 5.2, "avg_satisfaction": 8.4, "budget": 450000},
    {"name": "Finance", "head_count": 52, "attrition_rate": 7.8, "avg_satisfaction": 7.5, "budget": 780000},
    {"name": "Operations", "head_count": 78, "attrition_rate": 15.3, "avg_satisfaction": 6.5, "budget": 1200000},
    {"name": "Customer Support", "head_count": 112, "attrition_rate": 22.1, "avg_satisfaction": 6.2, "budget": 890000},
    {"name": "Research & Development", "head_count": 67, "attrition_rate": 9.1, "avg_satisfaction": 8.0, "budget": 1950000},
]

SEED_USERS = [
    ("admin@ison.com", "System Administrator", UserRole.ADMIN, "IT", "https://github.com/shadcn.png"),
    ("manager@ison.com", "Sarah Manager", UserRole.HR_MANAGER, "Human Resources", None),
    ("analyst@ison.com", "Mike Analyst", UserRole.HR_ANALYST, "Data Science", None),
    ("head@ison.com", "Emily Head", UserRole.DEPARTMENT_HEAD, "Engineering", None),
]

POSITIONS = [
    "Software Engineer", "Senior Engineer", "Team Lead", "Product Manager", "Data Analyst",
    "UX Designer", "Sales Representative", "Account Manager", "Marketing Specialist",
    "HR Coordinator", "Financial Analyst", "Operations Manager", "Support Specialist", "Research Scientist",
]

FEATURE_IMPORTANCE = [
    ("Satisfaction Score", 0.245, "Engagement"),
    ("Years at Company", 0.198, "Tenure"),
    ("Work-Life Balance", 0.156, "Wellbeing"),
    ("Last Promotion (Years)", 0.134, "Career"),
    ("Overtime Hours", 0.098, "Workload"),
    ("Monthly Income", 0.078, "Compensation"),
    ("Training Hours", 0.045, "Development"),
    ("Distance from Home", 0.032, "Commute"),
    ("Number of Companies Worked", 0.014, "History"),
]


def calculate_risk(satisfaction, years, promotion_years, overtime, work_life):
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
        return AttritionRisk.LOW, pct
    if pct < 60:
        return AttritionRisk.MEDIUM, pct
    return AttritionRisk.HIGH, pct


def seed_notifications(db: Session) -> int:
    """Add demo notifications for admin/manager if none exist yet."""
    if db.query(Notification).count() > 0:
        return 0

    admin = db.query(User).filter(User.email == "admin@ison.com").first()
    manager = db.query(User).filter(User.email == "manager@ison.com").first()
    seeded_notifications = [
        (admin, "High attrition risk detected in Sales", "5 employees flagged as high risk this week", False),
        (admin, "New report generated", "Weekly Executive Summary is ready", False),
        (manager, "Survey response rate reached 70%", "Q1 Pulse Survey is performing well", False),
        (admin, "Engagement score dropped in Engineering", "Down 5% from last month", True),
        (admin, "Model retrained successfully", "Prediction accuracy improved to 94.2%", True),
        (manager, "High attrition risk detected in Sales", "3 employees flagged as high risk this week", False),
        (manager, "New report generated", "Monthly Attrition Analysis is ready", True),
    ]
    added = 0
    for user, title, message, read in seeded_notifications:
        if user:
            db.add(Notification(user_id=user.id, title=title, message=message, read=read))
            added += 1
    if added:
        db.commit()
    return added


RETENTION_STRATEGY_COSTS_RWF = {
    "Career Development Program": 15_000_000,
    "Compensation Review": 85_000_000,
    "Flexible Work Policy": 5_000_000,
}


def seed_retention_strategy_rwf_amounts(db: Session) -> int:
    """Normalize legacy USD-scale retention costs to RWF amounts."""
    updated = 0
    for name, cost in RETENTION_STRATEGY_COSTS_RWF.items():
        row = db.query(RetentionStrategy).filter(RetentionStrategy.name == name).first()
        if row and float(row.estimated_cost) < 1_000_000:
            row.estimated_cost = cost
            updated += 1
    if updated:
        db.commit()
    return updated


def seed_succession_candidates(db: Session) -> int:
    """Add succession pipeline rows when none exist yet."""
    if db.query(SuccessionCandidate).count() > 0:
        return 0

    role_groups = [
        ("Engineering Lead", "John Smith", "Team Lead"),
        ("Sales Director", "Emily Davis", "Account Manager"),
        ("HR Manager", "Robert Brown", "HR Coordinator"),
    ]

    added = 0
    for target_role, incumbent_name, position_filter in role_groups:
        candidates = (
            db.query(Employee)
            .filter(
                Employee.deleted_at.is_(None),
                Employee.position.ilike(f"%{position_filter}%"),
            )
            .order_by(Employee.performance_score.desc(), Employee.satisfaction_score.desc())
            .limit(3)
            .all()
        )
        if len(candidates) < 2:
            candidates = (
                db.query(Employee)
                .filter(Employee.deleted_at.is_(None))
                .order_by(Employee.performance_score.desc())
                .offset(added * 3)
                .limit(3)
                .all()
            )

        readiness_scores = [85, 72, 68]
        for index, employee in enumerate(candidates):
            notes = f"Incumbent: {incumbent_name}" if index == 0 else None
            db.add(
                SuccessionCandidate(
                    employee_id=employee.id,
                    target_role=target_role,
                    readiness_score=readiness_scores[index] if index < len(readiness_scores) else 65,
                    notes=notes,
                )
            )
            added += 1

    if added:
        db.commit()
    return added


def seed_action_items(db: Session) -> int:
    """Ensure a full demo action-item set exists."""
    manager = db.query(User).filter(User.email == "manager@ison.com").first()
    head = db.query(User).filter(User.email == "head@ison.com").first()
    admin = db.query(User).filter(User.email == "admin@ison.com").first()
    analyst = db.query(User).filter(User.email == "analyst@ison.com").first()

    employees = (
        db.query(Employee)
        .filter(Employee.deleted_at.is_(None))
        .order_by(Employee.attrition_probability.desc())
        .limit(5)
        .all()
    )
    if len(employees) < 5:
        return 0

    demo_items = [
        ("Schedule 1:1 with {name}", "Employee: {name} | Retention check-in", manager, 1, "pending", "high"),
        ("Prepare salary adjustment proposal", "Employee: {name} | Compensation review", admin, 2, "in-progress", "high"),
        ("Review career development plan", "Employee: {name} | Growth path discussion", head, 3, "completed", "medium"),
        ("Implement flexible schedule", "Employee: {name} | Work-life balance initiative", head, 4, "pending", "medium"),
        ("Follow-up on wellness program enrollment", "Employee: {name} | Wellbeing program", analyst, 5, "in-progress", "low"),
    ]

    existing_titles = {row.title for row in db.query(ActionItem.title).all()}
    added = 0
    for title_tpl, desc_tpl, assignee, day_offset, status, priority in demo_items:
        employee = employees[day_offset - 1]
        name = f"{employee.first_name} {employee.last_name}"
        title = title_tpl.format(name=name)
        if title in existing_titles:
            continue
        db.add(
            ActionItem(
                title=title,
                description=desc_tpl.format(name=name),
                assignee_id=assignee.id if assignee else None,
                due_date=date.today() + timedelta(days=day_offset),
                status=status,
                priority=priority,
            )
        )
        added += 1

    if added:
        db.commit()
    return added


def seed_feature_engineering_configs(db: Session) -> int:
    from app.services.data_processing_service import DEFAULT_FEATURES

    if db.query(FeatureEngineeringConfig).count() > 0:
        return 0

    for feature in DEFAULT_FEATURES:
        db.add(
            FeatureEngineeringConfig(
                feature_name=feature["id"],
                enabled=feature["enabled"],
                transformation=feature["transformation"],
            )
        )
    db.commit()
    return len(DEFAULT_FEATURES)


def seed_engagement_data(db: Session) -> tuple[int, int]:
    responses_added = 0
    feedback_added = 0
    survey = db.query(Survey).order_by(Survey.created_at.asc()).first()
    if survey and db.query(SurveyResponse).count() == 0:
        employees = (
            db.query(Employee)
            .filter(Employee.deleted_at.is_(None))
            .order_by(Employee.created_at.asc())
            .limit(80)
            .all()
        )
        now = datetime.now(timezone.utc)
        for employee in employees:
            db.add(
                SurveyResponse(
                    survey_id=survey.id,
                    employee_id=None if survey.anonymous else employee.id,
                    answers={
                        "satisfaction": round(random.uniform(6, 10), 1),
                        "manager_support": round(random.uniform(6, 10), 1),
                        "work_life_balance": round(random.uniform(6, 10), 1),
                    },
                    submitted_at=now - timedelta(days=random.randint(0, 150)),
                )
            )
            responses_added += 1

    if db.query(Feedback).count() < 5:
        extra_feedback = [
            ("Management", "Managers are supportive and provide clear direction", "positive"),
            ("Compensation", "Salary feels below market for my role", "negative"),
            ("Work Environment", "Flexible schedule options would help a lot", "neutral"),
            ("Management", "Great recognition during team meetings", "positive"),
        ]
        for category, message, sentiment in extra_feedback:
            db.add(
                Feedback(
                    category=category,
                    message=message,
                    anonymous=True,
                    sentiment=sentiment,
                    submitted_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30)),
                )
            )
            feedback_added += 1

    if responses_added or feedback_added:
        db.commit()
    return responses_added, feedback_added


def seed_database(db: Session) -> None:
    if db.query(User).count() > 0:
        notifications_added = seed_notifications(db)
        strategies_updated = seed_retention_strategy_rwf_amounts(db)
        succession_added = seed_succession_candidates(db)
        actions_added = seed_action_items(db)
        features_added = seed_feature_engineering_configs(db)
        responses_added, feedback_added = seed_engagement_data(db)
        if notifications_added or strategies_updated or succession_added or actions_added or features_added or responses_added or feedback_added:
            parts = []
            if notifications_added:
                parts.append(f"{notifications_added} notifications added")
            if strategies_updated:
                parts.append(f"{strategies_updated} retention strategies updated to RWF")
            if succession_added:
                parts.append(f"{succession_added} succession candidates added")
            if actions_added:
                parts.append(f"{actions_added} action items added")
            if features_added:
                parts.append(f"{features_added} feature engineering configs added")
            if responses_added:
                parts.append(f"{responses_added} survey responses added")
            if feedback_added:
                parts.append(f"{feedback_added} feedback entries added")
            print(f"Applied incremental seed updates ({', '.join(parts)}).")
        else:
            print("Database already seeded.")
        return

    dept_map: dict[str, Department] = {}
    for item in DEPARTMENTS:
        dept = Department(**item)
        db.add(dept)
        dept_map[item["name"]] = dept
    db.flush()

    hr_dept = dept_map.get("Human Resources")
    eng_dept = dept_map.get("Engineering")

    for email, name, role, department_name, avatar in SEED_USERS:
        dept = dept_map.get(department_name) or hr_dept or eng_dept
        db.add(
            User(
                email=email,
                password_hash=hash_password("password123"),
                name=name,
                role=role,
                department_id=dept.id if dept else None,
                avatar_url=avatar,
                status=UserStatus.ACTIVE,
            )
        )
    db.flush()

    for index in range(500):
        department = random.choice(list(dept_map.values()))
        years = random.randint(1, 15)
        satisfaction = round(random.uniform(6, 10), 1)
        performance = round(random.uniform(7, 10), 1)
        work_life = round(random.uniform(6, 10), 1)
        promotion_years = random.randint(0, 5)
        overtime = random.randint(0, 30)
        risk, probability = calculate_risk(satisfaction, years, promotion_years, overtime, work_life)
        first_name = fake.first_name()
        last_name = fake.last_name()
        hire_date = date.today() - timedelta(days=years * 365)
        salary = Decimal(str(random.randint(50000, 130000)))
        status_roll = random.random()
        if status_roll > 0.1:
            emp_status = EmployeeStatus.ACTIVE
        elif status_roll > 0.05:
            emp_status = EmployeeStatus.ON_LEAVE
        else:
            emp_status = EmployeeStatus.INACTIVE

        employee = Employee(
            employee_id=f"EMP{str(index + 1001).zfill(5)}",
            first_name=first_name,
            last_name=last_name,
            email=f"{first_name.lower()}.{last_name.lower()}{index}@company.com",
            department_id=department.id,
            position=random.choice(POSITIONS),
            hire_date=hire_date,
            salary=salary,
            age=random.randint(22, 56),
            gender=random.choice(["Male", "Female"]),
            years_at_company=years,
            performance_score=performance,
            satisfaction_score=satisfaction,
            work_life_balance=work_life,
            last_promotion_years=promotion_years,
            training_hours=random.randint(20, 120),
            overtime_hours=overtime,
            attrition_risk=risk,
            attrition_probability=probability,
            status=emp_status,
        )
        db.add(employee)
        if index % 100 == 0:
            db.flush()

    db.flush()

    models_data = [
        ("Random Forest Classifier", ModelType.RANDOM_FOREST, 0.872, 0.845, 0.891, 0.867, 0.912, ModelStatus.ACTIVE, "2024-01-15"),
        ("XGBoost Ensemble", ModelType.XGBOOST, 0.894, 0.878, 0.905, 0.891, 0.934, ModelStatus.ACTIVE, "2024-01-18"),
        ("Neural Network (Deep Learning)", ModelType.NEURAL_NETWORK, 0.881, 0.856, 0.898, 0.876, 0.925, ModelStatus.DEPRECATED, "2024-01-10"),
    ]
    for name, model_type, acc, prec, rec, f1, auc, status, trained in models_data:
        model = PredictionModel(
            name=name,
            type=model_type,
            accuracy=acc,
            precision=prec,
            recall=rec,
            f1_score=f1,
            auc=auc,
            last_trained_at=datetime.fromisoformat(trained).replace(tzinfo=timezone.utc),
            status=status,
        )
        db.add(model)
        db.flush()
        for feature, importance, category in FEATURE_IMPORTANCE:
            db.add(
                ModelFeatureImportance(
                    model_id=model.id,
                    feature_name=feature,
                    importance=importance,
                    category=category,
                )
            )

    admin = db.query(User).filter(User.email == "admin@ison.com").first()
    sample_logs = [
        (admin.id if admin else None, "Admin User", "LOGIN", "System", "Successful login"),
        (None, "HR Manager", "VIEW", "Employee Data", "Viewed employee list"),
        (None, "HR Manager", "EXPORT", "Reports", "Exported attrition report"),
        (None, "HR Analyst", "RUN_MODEL", "ML Predictions", "Executed XGBoost prediction"),
        (admin.id if admin else None, "Admin User", "UPDATE", "User Settings", "Updated role permissions"),
    ]
    for user_id, user_name, action, resource, details in sample_logs:
        db.add(
            AuditLog(
                user_id=user_id,
                user_name=user_name,
                action=action,
                resource=resource,
                details=details,
                ip_address="192.168.1.100",
                timestamp=datetime.now(timezone.utc),
            )
        )

    db.add(
        ComplianceChecklistItem(
            category="Data Protection",
            requirement="Employee PII encrypted at rest",
            status="compliant",
            last_reviewed_at=datetime.now(timezone.utc),
        )
    )

    # Phase 3 seed data
    db.add(
        DataQualitySnapshot(
            recorded_at=datetime.now(timezone.utc),
            completeness=94.2,
            accuracy=91.8,
            consistency=88.5,
        )
    )

    strategies = [
        ("Career Development Program", "Structured career pathing with mentorship", 15_000_000, 78, "development"),
        ("Compensation Review", "Market-rate salary adjustments for at-risk employees", 85_000_000, 65, "compensation"),
        ("Flexible Work Policy", "Remote/hybrid options to improve work-life balance", 5_000_000, 72, "wellbeing"),
    ]
    for name, desc, cost, rate, category in strategies:
        db.add(RetentionStrategy(name=name, description=desc, estimated_cost=cost, success_rate=rate, category=category))

    db.add(
        AlertRule(
            name="High Attrition Risk",
            condition={"field": "attrition_probability", "operator": ">=", "value": 80},
            threshold=80.0,
            enabled=True,
        )
    )
    db.add(
        AlertRule(
            name="Low Satisfaction",
            condition={"field": "satisfaction_score", "operator": "<", "value": 5},
            threshold=5.0,
            enabled=True,
        )
    )

    high_risk_employees = (
        db.query(Employee)
        .filter(Employee.deleted_at.is_(None))
        .order_by(Employee.attrition_probability.desc())
        .limit(5)
        .all()
    )
    severities = [AlertSeverity.CRITICAL, AlertSeverity.CRITICAL, AlertSeverity.HIGH, AlertSeverity.HIGH, AlertSeverity.MEDIUM]
    statuses = [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED, AlertStatus.ACTIVE, AlertStatus.ACTIVE, AlertStatus.RESOLVED]
    for employee, severity, alert_status in zip(high_risk_employees, severities, statuses):
        db.add(
            Alert(
                employee_id=employee.id,
                severity=severity,
                message=f"Attrition risk at {employee.attrition_probability}%",
                status=alert_status,
            )
        )

    for channel in ["email", "slack", "teams", "sms"]:
        db.add(NotificationChannel(channel_type=channel, enabled=channel in ("email", "slack"), config={}))

    seed_notifications(db)

    db.add(
        Survey(
            title="Q1 Employee Engagement Pulse",
            type="pulse",
            audience="All Employees",
            anonymous=True,
            status=SurveyStatus.ACTIVE,
            created_by=admin.id if admin else None,
        )
    )
    db.flush()

    survey = db.query(Survey).order_by(Survey.created_at.desc()).first()
    if survey:
        sample_employees = (
            db.query(Employee)
            .filter(Employee.deleted_at.is_(None))
            .order_by(Employee.created_at.asc())
            .limit(60)
            .all()
        )
        now = datetime.now(timezone.utc)
        for employee in sample_employees:
            db.add(
                SurveyResponse(
                    survey_id=survey.id,
                    employee_id=None,
                    answers={
                        "satisfaction": round(random.uniform(6, 10), 1),
                        "manager_support": round(random.uniform(6, 10), 1),
                        "work_life_balance": round(random.uniform(6, 10), 1),
                    },
                    submitted_at=now - timedelta(days=random.randint(0, 120)),
                )
            )

    db.add(
        Feedback(
            category="Work Environment",
            message="Great team culture but need more flexible hours",
            anonymous=True,
            sentiment="neutral",
            submitted_at=datetime.now(timezone.utc),
        )
    )
    for category, message, sentiment in [
        ("Management", "Leadership communicates priorities clearly", "positive"),
        ("Compensation", "Benefits package could be more competitive", "negative"),
    ]:
        db.add(
            Feedback(
                category=category,
                message=message,
                anonymous=True,
                sentiment=sentiment,
                submitted_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 14)),
            )
        )

    db.add(
        ScheduledReport(
            report_template_id="2",
            frequency="monthly",
            delivery_method="email",
            recipients=["manager@ison.com"],
            start_date=date.today(),
            enabled=True,
        )
    )

    manager = db.query(User).filter(User.email == "manager@ison.com").first()
    head = db.query(User).filter(User.email == "head@ison.com").first()
    admin = db.query(User).filter(User.email == "admin@ison.com").first()
    analyst = db.query(User).filter(User.email == "analyst@ison.com").first()

    high_risk_for_actions = (
        db.query(Employee)
        .filter(Employee.deleted_at.is_(None))
        .order_by(Employee.attrition_probability.desc())
        .limit(5)
        .all()
    )

    action_seed = [
        ("Review Engineering retention plan", "Analyze Q1 attrition trends for Engineering dept", manager, 14, "in-progress", "high", None),
    ]
    if len(high_risk_for_actions) >= 5:
        names = [f"{e.first_name} {e.last_name}" for e in high_risk_for_actions]
        action_seed.extend([
            (f"Schedule 1:1 with {names[0]}", f"Employee: {names[0]} | Retention check-in", manager, 1, "pending", "high", names[0]),
            ("Prepare salary adjustment proposal", f"Employee: {names[1]} | Compensation review", admin, 2, "in-progress", "high", names[1]),
            ("Review career development plan", f"Employee: {names[2]} | Growth path discussion", head, 3, "completed", "medium", names[2]),
            ("Implement flexible schedule", f"Employee: {names[3]} | Work-life balance initiative", head, 4, "pending", "medium", names[3]),
            ("Follow-up on wellness program enrollment", f"Employee: {names[4]} | Wellbeing program", analyst, 5, "in-progress", "low", names[4]),
        ])

    for title, description, assignee, days, status, priority, _employee in action_seed:
        db.add(
            ActionItem(
                title=title,
                description=description,
                assignee_id=assignee.id if assignee else None,
                status=status,
                priority=priority,
                due_date=date.today() + timedelta(days=days),
            )
        )

    seed_succession_candidates(db)
    seed_feature_engineering_configs(db)

    db.add(SystemSetting(key="security", value={"mfaRequired": False, "passwordMinLength": 8, "sessionTimeoutMinutes": 30}))
    for name, status_val in [("HRIS", "connected"), ("SSO", "pending"), ("Slack", "connected")]:
        db.add(Integration(name=name, status=status_val, config={}))

    db.commit()
    print("Database seeded successfully.")


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
