"""Apply lightweight schema updates for existing databases."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect, text

from app.database import engine


def migrate() -> None:
    with engine.begin() as conn:
        columns = {col["name"] for col in inspect(conn).get_columns("employees")}
        if "currency" not in columns:
            conn.execute(text("ALTER TABLE employees ADD COLUMN currency VARCHAR(8) DEFAULT 'RWF' NOT NULL"))
            print("Added employees.currency")
        if "pay_frequency" not in columns:
            conn.execute(text("ALTER TABLE employees ADD COLUMN pay_frequency VARCHAR(32) DEFAULT 'monthly' NOT NULL"))
            print("Added employees.pay_frequency")

        feedback_columns = {col["name"] for col in inspect(conn).get_columns("feedback")}
        if "sentiment" not in feedback_columns:
            conn.execute(text("ALTER TABLE feedback ADD COLUMN sentiment VARCHAR(32) DEFAULT 'neutral' NOT NULL"))
            print("Added feedback.sentiment")

    from app.database import Base
    from app.models.hr_ops import SurveyInvite

    SurveyInvite.__table__.create(bind=engine, checkfirst=True)
    print("Ensured survey_invites table exists.")
    print("Schema migration complete.")


if __name__ == "__main__":
    migrate()
