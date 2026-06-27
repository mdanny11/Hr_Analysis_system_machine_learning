import csv
import io

from sqlalchemy.orm import Session, joinedload

from app.models.user import User
from app.services.auth_service import serialize_user

USER_CSV_HEADERS = ["id", "name", "email", "role", "department", "status", "lastLoginAt", "mfaEnabled"]


def export_users_csv(db: Session) -> str:
    users = (
        db.query(User)
        .options(joinedload(User.department))
        .filter(User.deleted_at.is_(None))
        .order_by(User.name)
        .all()
    )
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=USER_CSV_HEADERS)
    writer.writeheader()
    for user in users:
        data = serialize_user(user)
        writer.writerow(
            {
                "id": data["id"],
                "name": data["name"],
                "email": data["email"],
                "role": data["role"],
                "department": data.get("department") or "",
                "status": data["status"],
                "lastLoginAt": data.get("lastLoginAt") or "",
                "mfaEnabled": data.get("mfaEnabled", False),
            }
        )
    return buffer.getvalue()
