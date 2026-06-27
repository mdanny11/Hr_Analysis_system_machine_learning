from sqlalchemy.orm import Session

from app.models.audit import Integration, SystemSetting
from app.services.email_service import _smtp_configured

DEFAULT_SECURITY = {
    "mfaRequired": False,
    "passwordMinLength": 8,
    "requireSpecialChars": True,
    "requireNumbers": True,
    "maxLoginAttempts": 5,
    "sessionTimeoutMinutes": 30,
}

DEFAULT_NOTIFICATIONS = {
    "emailNotifications": True,
    "riskAlerts": True,
    "weeklyDigest": True,
    "systemUpdates": False,
}

DEFAULT_SYSTEM = {
    "language": "en",
    "timezone": "UTC",
    "dateFormat": "MM/DD/YYYY",
    "dataRetentionDays": "90",
}

INTEGRATION_LABELS = {
    "HRIS": ("HRIS System", "Employee data synchronization"),
    "Email": ("Email Service", "Notification delivery"),
    "SSO": ("SSO Provider", "Single sign-on authentication"),
    "Slack": ("Slack Integration", "Team notifications"),
}


def _get_setting(db: Session, key: str, default: dict) -> dict:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not row or not row.value:
        return dict(default)
    return {**default, **row.value}


def _patch_setting(db: Session, key: str, payload: dict, default: dict) -> dict:
    merged = {**_get_setting(db, key, default), **payload}
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row:
        row.value = merged
    else:
        db.add(SystemSetting(key=key, value=merged))
    db.flush()
    return merged


def get_security_settings(db: Session) -> dict:
    return _get_setting(db, "security", DEFAULT_SECURITY)


def patch_security_settings(db: Session, payload: dict) -> dict:
    allowed = set(DEFAULT_SECURITY.keys())
    filtered = {key: value for key, value in payload.items() if key in allowed}
    return _patch_setting(db, "security", filtered, DEFAULT_SECURITY)


def get_notification_settings(db: Session) -> dict:
    return _get_setting(db, "notifications", DEFAULT_NOTIFICATIONS)


def patch_notification_settings(db: Session, payload: dict) -> dict:
    allowed = set(DEFAULT_NOTIFICATIONS.keys())
    filtered = {key: value for key, value in payload.items() if key in allowed}
    return _patch_setting(db, "notifications", filtered, DEFAULT_NOTIFICATIONS)


def get_system_settings(db: Session) -> dict:
    return _get_setting(db, "system", DEFAULT_SYSTEM)


def patch_system_settings(db: Session, payload: dict) -> dict:
    allowed = set(DEFAULT_SYSTEM.keys())
    filtered = {key: value for key, value in payload.items() if key in allowed}
    return _patch_setting(db, "system", filtered, DEFAULT_SYSTEM)


def list_integrations(db: Session) -> list[dict]:
    rows = db.query(Integration).order_by(Integration.name).all()
    integrations: list[dict] = []
    seen_names: set[str] = set()

    for row in rows:
        label, description = INTEGRATION_LABELS.get(row.name, (row.name, "External integration"))
        integrations.append(
            {
                "id": str(row.id),
                "key": row.name,
                "name": label,
                "description": description,
                "status": row.status,
                "configurable": row.status != "connected",
            }
        )
        seen_names.add(row.name)

    email_status = "connected" if _smtp_configured() else "pending"
    if "Email" not in seen_names:
        label, description = INTEGRATION_LABELS["Email"]
        integrations.insert(
            1,
            {
                "id": "email",
                "key": "Email",
                "name": label,
                "description": description,
                "status": email_status,
                "configurable": not _smtp_configured(),
            },
        )
    else:
        for item in integrations:
            if item["key"] == "Email":
                item["status"] = email_status
                item["configurable"] = not _smtp_configured()

    return integrations
