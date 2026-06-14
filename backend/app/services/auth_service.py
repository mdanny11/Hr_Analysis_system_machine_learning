import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import UserRole
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.organization import Department
from app.models.user import AccessRequest, AccessRequestStatus, PasswordResetToken, RefreshToken, User, UserStatus
from app.schemas.auth import UserOut
from app.services.audit_service import log_audit


def serialize_user(user: User, department_name: str | None = None) -> dict:
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        avatar_url=user.avatar_url,
        department=department_name or (user.department.name if user.department else None),
        last_login_at=user.last_login_at,
        status=user.status,
        mfa_enabled=user.mfa_enabled,
    ).model_dump(by_alias=True)


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"},
        )
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_INACTIVE", "message": "Account is not active"},
        )
    return user


def issue_tokens(db: Session, user: User, ip_address: str) -> dict:
    user.last_login_at = datetime.now(timezone.utc)
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    token_hash = hashlib.sha256(refresh.encode()).hexdigest()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
    )
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="LOGIN",
        resource="System",
        details="User logged in successfully",
        ip_address=ip_address,
    )
    db.commit()
    db.refresh(user)
    return {
        "accessToken": access,
        "refreshToken": refresh,
        "tokenType": "bearer",
        "user": serialize_user(user),
    }


def revoke_refresh_token(db: Session, refresh_token: str) -> None:
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()


def create_access_request(db: Session, payload: dict) -> AccessRequest:
    reference_id = f"AR-{secrets.token_hex(4).upper()}"
    request = AccessRequest(
        name=payload["name"],
        email=payload["email"],
        department=payload["department"],
        job_title=payload["job_title"],
        requested_role=payload["requested_role"],
        justification=payload["justification"],
        manager_email=payload["manager_email"],
        status=AccessRequestStatus.PENDING,
        reference_id=reference_id,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def initiate_password_reset(db: Session, email: str) -> str:
    code = f"{secrets.randbelow(900000) + 100000}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.query(PasswordResetToken).filter(PasswordResetToken.email == email).delete()
    db.add(PasswordResetToken(email=email, token=code, expires_at=expires))
    db.commit()
    return code


def verify_reset_code(db: Session, email: str, code: str) -> bool:
    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == email,
            PasswordResetToken.token == code,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    return record is not None


def reset_password(db: Session, email: str, code: str, new_password: str) -> None:
    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == email,
            PasswordResetToken.token == code,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_CODE", "message": "Invalid or expired verification code"},
        )
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "User not found"},
        )
    user.password_hash = hash_password(new_password)
    record.used_at = datetime.now(timezone.utc)
    db.commit()


def get_department_by_name(db: Session, name: str | None) -> Department | None:
    if not name:
        return None
    return db.query(Department).filter(Department.name == name).first()


def create_user_record(db: Session, data: dict, actor: User | None, ip_address: str) -> User:
    department = get_department_by_name(db, data.get("department"))
    user = User(
        email=data["email"],
        password_hash=hash_password(data["password"]),
        name=data["name"],
        role=data["role"],
        department_id=department.id if department else None,
        avatar_url=data.get("avatar"),
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    log_audit(
        db,
        user_id=actor.id if actor else None,
        user_name=actor.name if actor else "System",
        action="CREATE",
        resource="User",
        details=f"Created user {user.email}",
        ip_address=ip_address,
    )
    db.commit()
    db.refresh(user)
    return user
