from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def log_audit(
    db: Session,
    *,
    user_id: UUID | None,
    user_name: str,
    action: str,
    resource: str,
    details: str,
    ip_address: str = "127.0.0.1",
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        resource=resource,
        details=details,
        ip_address=ip_address,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.flush()
    return entry
