from __future__ import annotations

import logging
import secrets
import statistics
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models.hr_ops import Feedback, Survey, SurveyInvite, SurveyQuestion, SurveyResponse, SurveyStatus
from app.models.organization import Department, Employee, EmployeeStatus
from app.models.user import User
from app.services.email_service import send_survey_invitation_email
from app.services.employee_service import list_employees_query

logger = logging.getLogger(__name__)

SENTIMENT_CATEGORIES: dict[str, str] = {
    "Work Environment": "work_life_balance",
    "Management": "performance_score",
    "Compensation": "satisfaction_score",
}

MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
INVITE_EXPIRY_DAYS = 30


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _employees_for_user(db: Session, user: User) -> list[Employee]:
    return list_employees_query(db, user).filter(Employee.deleted_at.is_(None)).all()


def _employees_for_survey_audience(db: Session, user: User, audience: str) -> list[Employee]:
    query = (
        list_employees_query(db, user)
        .filter(Employee.deleted_at.is_(None), Employee.status == EmployeeStatus.ACTIVE)
    )
    audience_parts = [part.strip().lower() for part in audience.split(",") if part.strip()]
    if not audience_parts or any(part in ("all employees", "all") for part in audience_parts):
        return query.all()

    department_ids = {
        department.name.lower(): department.id for department in db.query(Department).all()
    }
    matched_ids = [department_ids[part] for part in audience_parts if part in department_ids]
    if matched_ids:
        return query.filter(Employee.department_id.in_(matched_ids)).all()
    return query.all()


def ensure_survey_invites(db: Session, survey_id: UUID, user: User) -> dict:
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        return {"invitesCreated": 0, "inviteCount": 0, "skipped": 0}

    employees = _employees_for_survey_audience(db, user, survey.audience)
    settings = get_settings()
    if settings.survey_email_max_per_launch > 0:
        employees = employees[: settings.survey_email_max_per_launch]

    expires_at = datetime.now(timezone.utc) + timedelta(days=INVITE_EXPIRY_DAYS)
    created = 0
    skipped = 0

    for employee in employees:
        if not employee.email or "@" not in employee.email:
            skipped += 1
            continue

        invite = (
            db.query(SurveyInvite)
            .filter(SurveyInvite.survey_id == survey.id, SurveyInvite.employee_id == employee.id)
            .first()
        )
        if invite and invite.responded_at:
            skipped += 1
            continue

        if invite:
            invite.email = employee.email
            invite.expires_at = expires_at
        else:
            invite = SurveyInvite(
                survey_id=survey.id,
                employee_id=employee.id,
                email=employee.email,
                token=secrets.token_urlsafe(32),
                expires_at=expires_at,
            )
            db.add(invite)
            created += 1

        db.commit()

    return {
        "invitesCreated": created,
        "inviteCount": len(employees),
        "skipped": skipped,
    }


def send_survey_emails_for_survey(survey_id: UUID) -> dict:
    db = SessionLocal()
    try:
        survey = db.query(Survey).filter(Survey.id == survey_id).first()
        if not survey:
            return {"emailsSent": 0, "emailsFailed": 0}

        settings = get_settings()
        invites = (
            db.query(SurveyInvite)
            .filter(
                SurveyInvite.survey_id == survey_id,
                SurveyInvite.sent_at.is_(None),
                SurveyInvite.responded_at.is_(None),
            )
            .all()
        )
        sent = 0
        failed = 0

        for invite in invites:
            employee = db.query(Employee).filter(Employee.id == invite.employee_id).first()
            employee_name = (
                f"{employee.first_name} {employee.last_name}".strip() if employee else "Employee"
            )
            link = f"{settings.frontend_url.rstrip('/')}/survey/{invite.token}"
            try:
                send_survey_invitation_email(
                    to_email=invite.email,
                    employee_name=employee_name or "Employee",
                    survey_title=survey.title,
                    survey_link=link,
                )
                invite.sent_at = datetime.now(timezone.utc)
                db.commit()
                sent += 1
            except Exception:
                logger.exception("Failed to send survey invite to %s", invite.email)
                db.rollback()
                failed += 1

        return {"emailsSent": sent, "emailsFailed": failed}
    finally:
        db.close()


def send_survey_invites_for_survey(survey_id: UUID, user_id: UUID) -> dict:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"emailsSent": 0, "emailsFailed": 0, "inviteCount": 0, "skipped": 0}

        invite_stats = ensure_survey_invites(db, survey_id, user)
        email_stats = send_survey_emails_for_survey(survey_id)
        return {**invite_stats, **email_stats}
    finally:
        db.close()


def get_public_survey(db: Session, token: str) -> dict:
    invite = db.query(SurveyInvite).filter(SurveyInvite.token == token).first()
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Survey link not found"},
        )
    if _as_utc(invite.expires_at) <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={"code": "EXPIRED", "message": "This survey link has expired"},
        )

    survey = db.query(Survey).filter(Survey.id == invite.survey_id).first()
    if not survey or survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={"code": "CLOSED", "message": "This survey is no longer accepting responses"},
        )

    employee = db.query(Employee).filter(Employee.id == invite.employee_id).first()
    questions = (
        db.query(SurveyQuestion)
        .filter(SurveyQuestion.survey_id == survey.id)
        .order_by(SurveyQuestion.order_index.asc())
        .all()
    )

    return {
        "surveyId": str(survey.id),
        "title": survey.title,
        "anonymous": survey.anonymous,
        "employeeName": None if survey.anonymous else (f"{employee.first_name} {employee.last_name}" if employee else None),
        "alreadyResponded": invite.responded_at is not None,
        "questions": [
            {
                "id": str(question.id),
                "text": question.question_text,
                "type": question.question_type,
            }
            for question in questions
        ],
    }


def submit_public_survey_response(db: Session, token: str, answers: dict) -> dict:
    invite = db.query(SurveyInvite).filter(SurveyInvite.token == token).first()
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Survey link not found"},
        )
    if _as_utc(invite.expires_at) <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={"code": "EXPIRED", "message": "This survey link has expired"},
        )
    if invite.responded_at:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ALREADY_RESPONDED", "message": "You have already submitted this survey"},
        )

    survey = db.query(Survey).filter(Survey.id == invite.survey_id).first()
    if not survey or survey.status != SurveyStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={"code": "CLOSED", "message": "This survey is no longer accepting responses"},
        )

    questions = db.query(SurveyQuestion).filter(SurveyQuestion.survey_id == survey.id).all()
    question_ids = {str(question.id) for question in questions}
    if not question_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "NO_QUESTIONS", "message": "This survey has no questions"},
        )

    normalized_answers: dict[str, object] = {}
    for question in questions:
        key = str(question.id)
        value = answers.get(key, answers.get(question.question_text))
        if value is None or value == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "MISSING_ANSWER", "message": f"Answer required for: {question.question_text}"},
            )
        normalized_answers[key] = value

    now = datetime.now(timezone.utc)
    db.add(
        SurveyResponse(
            survey_id=survey.id,
            employee_id=None if survey.anonymous else invite.employee_id,
            answers=normalized_answers,
            submitted_at=now,
        )
    )
    invite.responded_at = now
    db.commit()
    return {"message": "Survey submitted successfully", "submittedAt": now.isoformat()}


def _score_distribution(values: list[float]) -> dict[str, float]:
    if not values:
        return {"positive": 0.0, "neutral": 0.0, "negative": 0.0}
    positive = sum(1 for value in values if value >= 7) / len(values) * 100
    negative = sum(1 for value in values if value < 5) / len(values) * 100
    neutral = max(0.0, 100.0 - positive - negative)
    return {
        "positive": round(positive, 1),
        "neutral": round(neutral, 1),
        "negative": round(negative, 1),
    }


def _avg(values: list[float], default: float = 0.0) -> float:
    return float(statistics.mean(values)) if values else default


def _pearson_correlation(pairs: list[tuple[float, float]]) -> float | None:
    if len(pairs) < 2:
        return None
    xs = [pair[0] for pair in pairs]
    ys = [pair[1] for pair in pairs]
    mean_x = statistics.mean(xs)
    mean_y = statistics.mean(ys)
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in pairs)
    denom_x = sum((x - mean_x) ** 2 for x in xs) ** 0.5
    denom_y = sum((y - mean_y) ** 2 for y in ys) ** 0.5
    if denom_x == 0 or denom_y == 0:
        return None
    return round(numerator / (denom_x * denom_y), 2)


def infer_feedback_sentiment(message: str) -> str:
    text = message.lower()
    negative_words = ("bad", "poor", "unhappy", "stress", "toxic", "leave", "quit", "unfair", "overwork")
    positive_words = ("great", "good", "excellent", "love", "happy", "support", "flexible", "thank", "awesome")
    negative_hits = sum(1 for word in negative_words if word in text)
    positive_hits = sum(1 for word in positive_words if word in text)
    if negative_hits > positive_hits:
        return "negative"
    if positive_hits > negative_hits:
        return "positive"
    return "neutral"


def get_engagement_summary(db: Session, user: User) -> dict:
    employees = _employees_for_user(db, user)
    active_surveys = db.query(Survey).filter(Survey.status == SurveyStatus.ACTIVE).count()
    total_responses = db.query(func.count(SurveyResponse.id)).scalar() or 0
    employee_count = len(employees) or 1

    overall_score = round(_avg([employee.satisfaction_score for employee in employees], default=7.0), 1)
    participation_rate = round(
        min(100.0, (total_responses / max(employee_count * max(active_surveys, 1), 1)) * 100),
        1,
    )

    sentiment_rows = get_sentiment_analysis(db, user)
    sentiment_score = round(
        _avg([float(row["positive"]) for row in sentiment_rows], default=0.0),
        1,
    )

    return {
        "overallScore": overall_score,
        "participationRate": participation_rate,
        "sentimentScore": sentiment_score,
        "activeSurveys": active_surveys,
        "totalEmployees": employee_count,
        "totalResponses": total_responses,
    }


def get_sentiment_analysis(db: Session, user: User) -> list[dict]:
    employees = _employees_for_user(db, user)
    rows: list[dict] = []
    for category, field in SENTIMENT_CATEGORIES.items():
        values = [float(getattr(employee, field)) for employee in employees]
        distribution = _score_distribution(values)
        rows.append({"category": category, **distribution})
    return rows


def get_engagement_dimensions(db: Session, user: User) -> list[dict]:
    employees = _employees_for_user(db, user)
    if not employees:
        return [
            {"dimension": "Purpose", "score": 0},
            {"dimension": "Growth", "score": 0},
            {"dimension": "Recognition", "score": 0},
            {"dimension": "Wellbeing", "score": 0},
            {"dimension": "Connection", "score": 0},
        ]

    avg_performance = _avg([employee.performance_score for employee in employees], default=7.0)
    avg_promotion_gap = _avg([employee.last_promotion_years for employee in employees], default=2.0)
    avg_work_life = _avg([employee.work_life_balance for employee in employees], default=7.0)
    avg_satisfaction = _avg([employee.satisfaction_score for employee in employees], default=7.0)
    avg_training = _avg([employee.training_hours for employee in employees], default=40.0)

    growth_score = max(0.0, min(100.0, (5 - avg_promotion_gap) / 5 * 100))
    recognition_score = max(0.0, min(100.0, avg_performance * 10))
    training_score = max(0.0, min(100.0, avg_training / 120 * 100))

    return [
        {"dimension": "Purpose", "score": round(recognition_score * 0.9, 1)},
        {"dimension": "Growth", "score": round((growth_score + training_score) / 2, 1)},
        {"dimension": "Recognition", "score": round(recognition_score, 1)},
        {"dimension": "Wellbeing", "score": round(avg_work_life * 10, 1)},
        {"dimension": "Connection", "score": round(avg_satisfaction * 10, 1)},
    ]


def get_engagement_trends(db: Session, user: User) -> list[dict]:
    employees = _employees_for_user(db, user)
    employee_count = len(employees) or 1
    current_score = round(_avg([employee.satisfaction_score for employee in employees], default=7.0), 1)
    now = datetime.now(timezone.utc)
    trends: list[dict] = []

    for offset in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=offset * 28)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        responses = (
            db.query(SurveyResponse)
            .filter(
                SurveyResponse.submitted_at >= month_start,
                SurveyResponse.submitted_at < month_end,
            )
            .count()
        )
        participation = round(min(100.0, (responses / employee_count) * 100), 1)
        score = current_score
        if responses:
            answer_scores = []
            for response in (
                db.query(SurveyResponse)
                .filter(
                    SurveyResponse.submitted_at >= month_start,
                    SurveyResponse.submitted_at < month_end,
                )
                .all()
            ):
                for value in response.answers.values():
                    if isinstance(value, (int, float)):
                        answer_scores.append(float(value))
            if answer_scores:
                score = round(_avg(answer_scores), 1)
        trends.append(
            {
                "month": MONTH_LABELS[month_start.month - 1],
                "score": score,
                "participation": participation,
            }
        )
    return trends


def get_vs_attrition(db: Session, user: User) -> dict:
    employees = list_employees_query(db, user).limit(500).all()
    points = [
        {
            "engagement": round(employee.satisfaction_score, 1),
            "attritionRisk": employee.attrition_probability,
            "name": f"{employee.first_name} {employee.last_name}",
        }
        for employee in employees
    ]
    correlation = _pearson_correlation(
        [(point["engagement"], float(point["attritionRisk"])) for point in points]
    )
    return {"points": points, "correlation": correlation}


def _survey_response_count(db: Session, survey_id: UUID) -> int:
    return db.query(SurveyResponse).filter(SurveyResponse.survey_id == survey_id).count()


def list_surveys(db: Session, user: User) -> list[dict]:
    employee_count = len(_employees_for_user(db, user))
    rows = db.query(Survey).order_by(Survey.created_at.desc()).all()
    results: list[dict] = []
    for survey in rows:
        responses = _survey_response_count(db, survey.id)
        end_date = (survey.created_at + timedelta(days=30)).date().isoformat() if survey.created_at else None
        results.append(
            {
                "id": str(survey.id),
                "title": survey.title,
                "type": survey.type,
                "audience": survey.audience,
                "status": survey.status.value,
                "anonymous": survey.anonymous,
                "responseCount": responses,
                "totalEmployees": employee_count,
                "endDate": end_date,
                "createdAt": survey.created_at.isoformat() if survey.created_at else None,
            }
        )
    return results


def list_survey_responses(db: Session, user: User, survey_id: UUID) -> dict:
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Survey not found"},
        )

    questions = (
        db.query(SurveyQuestion)
        .filter(SurveyQuestion.survey_id == survey.id)
        .order_by(SurveyQuestion.order_index.asc())
        .all()
    )
    question_map = {str(question.id): question for question in questions}

    rows = (
        db.query(SurveyResponse)
        .filter(SurveyResponse.survey_id == survey.id)
        .order_by(SurveyResponse.submitted_at.desc())
        .all()
    )

    submissions: list[dict] = []
    for row in rows:
        respondent = "Anonymous" if survey.anonymous else "Unknown"
        if row.employee_id and not survey.anonymous:
            employee = db.query(Employee).filter(Employee.id == row.employee_id).first()
            if employee:
                respondent = f"{employee.first_name} {employee.last_name}"

        answer_rows: list[dict] = []
        seen_keys: set[str] = set()
        for question_id, question in question_map.items():
            value = row.answers.get(question_id, row.answers.get(question.question_text))
            answer_rows.append(
                {
                    "questionId": question_id,
                    "question": question.question_text,
                    "type": question.question_type,
                    "answer": value,
                }
            )
            seen_keys.add(question_id)
            seen_keys.add(question.question_text)

        for key, value in row.answers.items():
            if key in seen_keys:
                continue
            answer_rows.append(
                {
                    "questionId": str(key),
                    "question": str(key),
                    "type": "unknown",
                    "answer": value,
                }
            )

        submissions.append(
            {
                "id": str(row.id),
                "submittedAt": row.submitted_at.isoformat() if row.submitted_at else None,
                "respondent": respondent,
                "answers": answer_rows,
            }
        )

    return {
        "surveyId": str(survey.id),
        "title": survey.title,
        "anonymous": survey.anonymous,
        "responseCount": len(submissions),
        "submissions": submissions,
    }


def create_survey(
    db: Session,
    user: User,
    *,
    title: str,
    survey_type: str,
    audience: str,
    anonymous: bool,
    questions: list[dict],
) -> dict:
    survey = Survey(
        title=title,
        type=survey_type,
        audience=audience or "All Employees",
        anonymous=anonymous,
        status=SurveyStatus.ACTIVE,
        created_by=user.id,
    )
    db.add(survey)
    db.flush()
    for index, question in enumerate(questions):
        db.add(
            SurveyQuestion(
                survey_id=survey.id,
                question_text=question.get("text", ""),
                question_type=question.get("type", "text"),
                order_index=index,
            )
        )
    db.commit()
    db.refresh(survey)
    return {"id": str(survey.id), "message": "Survey launched"}


def create_pulse_survey(db: Session, user: User) -> dict:
    return create_survey(
        db,
        user,
        title=f"Pulse Survey {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        survey_type="pulse",
        audience="All Employees",
        anonymous=True,
        questions=[
            {"text": "How satisfied are you with your current role?", "type": "rating"},
            {"text": "Do you feel valued by your manager?", "type": "rating"},
            {"text": "How would you rate work-life balance?", "type": "rating"},
        ],
    )


def list_feedback(db: Session) -> list[dict]:
    rows = db.query(Feedback).order_by(Feedback.submitted_at.desc()).limit(20).all()
    return [
        {
            "id": str(row.id),
            "category": row.category,
            "message": row.message,
            "anonymous": row.anonymous,
            "sentiment": row.sentiment,
            "submittedAt": row.submitted_at.isoformat(),
        }
        for row in rows
    ]


def submit_feedback(db: Session, *, category: str, message: str, anonymous: bool, sentiment: str | None = None) -> dict:
    resolved_sentiment = sentiment or infer_feedback_sentiment(message)
    row = Feedback(
        category=category,
        message=message,
        anonymous=anonymous,
        sentiment=resolved_sentiment,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": str(row.id),
        "message": "Feedback submitted",
        "sentiment": row.sentiment,
    }
