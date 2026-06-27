import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

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
    existing_user = db.query(User).filter(User.email == payload["email"], User.deleted_at.is_(None)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "EMAIL_EXISTS", "message": "A user with this email already exists"},
        )
    pending = (
        db.query(AccessRequest)
        .filter(
            AccessRequest.email == payload["email"],
            AccessRequest.status == AccessRequestStatus.PENDING,
        )
        .first()
    )
    if pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "REQUEST_EXISTS", "message": "A pending access request already exists for this email"},
        )
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


def serialize_access_request(record: AccessRequest) -> dict:
    from app.schemas.auth import AccessRequestDetailOut

    reviewer_name = record.reviewed_by.name if record.reviewed_by else None
    return AccessRequestDetailOut(
        id=record.id,
        reference_id=record.reference_id,
        name=record.name,
        email=record.email,
        department=record.department,
        job_title=record.job_title,
        requested_role=record.requested_role,
        justification=record.justification,
        manager_email=record.manager_email,
        status=record.status.value,
        submitted_at=record.created_at,
        reviewed_at=record.reviewed_at,
        reviewed_by=reviewer_name,
        rejection_reason=record.rejection_reason,
    ).model_dump(by_alias=True)


def list_access_requests(db: Session, status: AccessRequestStatus | None = None) -> list[AccessRequest]:
    query = db.query(AccessRequest).options(joinedload(AccessRequest.reviewed_by))
    if status:
        query = query.filter(AccessRequest.status == status)
    return query.order_by(AccessRequest.created_at.desc()).all()


def get_access_request(db: Session, request_id: UUID) -> AccessRequest:
    record = (
        db.query(AccessRequest)
        .options(joinedload(AccessRequest.reviewed_by))
        .filter(AccessRequest.id == request_id)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Access request not found"},
        )
    return record


def approve_access_request(
    db: Session,
    request_id: UUID,
    role: UserRole,
    password: str,
    admin: User,
    ip_address: str,
) -> tuple[AccessRequest, User]:
    record = get_access_request(db, request_id)
    if record.status != AccessRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_STATUS", "message": "Only pending requests can be approved"},
        )
    existing_user = db.query(User).filter(User.email == record.email, User.deleted_at.is_(None)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "EMAIL_EXISTS", "message": "A user with this email already exists"},
        )
    user = create_user_record(
        db,
        {
            "email": record.email,
            "password": password,
            "name": record.name,
            "role": role,
            "department": record.department,
        },
        admin,
        ip_address,
        commit=False,
    )
    record.status = AccessRequestStatus.APPROVED
    record.reviewed_by_id = admin.id
    record.reviewed_at = datetime.now(timezone.utc)
    log_audit(
        db,
        user_id=admin.id,
        user_name=admin.name,
        action="APPROVE",
        resource="AccessRequest",
        details=f"Approved access request {record.reference_id} for {record.email}",
        ip_address=ip_address,
    )
    db.commit()
    db.refresh(record)
    db.refresh(user)
    return record, user


def reject_access_request(
    db: Session,
    request_id: UUID,
    admin: User,
    reason: str | None,
    ip_address: str,
) -> AccessRequest:
    record = get_access_request(db, request_id)
    if record.status != AccessRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_STATUS", "message": "Only pending requests can be rejected"},
        )
    record.status = AccessRequestStatus.REJECTED
    record.reviewed_by_id = admin.id
    record.reviewed_at = datetime.now(timezone.utc)
    record.rejection_reason = reason
    log_audit(
        db,
        user_id=admin.id,
        user_name=admin.name,
        action="REJECT",
        resource="AccessRequest",
        details=f"Rejected access request {record.reference_id} for {record.email}",
        ip_address=ip_address,
    )
    db.commit()
    db.refresh(record)
    return record


def admin_reset_user_password(
    db: Session,
    user_id: UUID,
    new_password: str,
    admin: User,
    ip_address: str,
) -> User:
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "User not found"},
        )
    user.password_hash = hash_password(new_password)
    log_audit(
        db,
        user_id=admin.id,
        user_name=admin.name,
        action="RESET_PASSWORD",
        resource="User",
        details=f"Reset password for {user.email}",
        ip_address=ip_address,
    )
    db.commit()
    db.refresh(user)
    return user


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


def create_user_record(
    db: Session, data: dict, actor: User | None, ip_address: str, *, commit: bool = True
) -> User:
    existing = db.query(User).filter(User.email == data["email"], User.deleted_at.is_(None)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "EMAIL_EXISTS", "message": "A user with this email already exists"},
        )
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
    if commit:
        db.commit()
        db.refresh(user)
    return user


def refresh_access_token(db: Session, refresh_token: str, ip_address: str) -> dict:
    from jose import JWTError

    from app.core.security import parse_token_subject

    try:
        subject = parse_token_subject(refresh_token, expected_type="refresh")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired refresh token"},
        )
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired refresh token"},
        )
    user = db.query(User).filter(User.id == subject, User.deleted_at.is_(None)).first()
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_INACTIVE", "message": "Account is not active"},
        )
    record.revoked_at = datetime.now(timezone.utc)
    return issue_tokens(db, user, ip_address)


def change_user_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
    ip_address: str,
) -> None:
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_PASSWORD", "message": "Current password is incorrect"},
        )
    user.password_hash = hash_password(new_password)
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="CHANGE_PASSWORD",
        resource="User",
        details=f"User {user.email} changed password",
        ip_address=ip_address,
    )
    db.commit()


def update_user_profile(db: Session, user: User, data: dict, ip_address: str) -> User:
    if "name" in data and data["name"] is not None:
        user.name = data["name"]
    if "mfa_enabled" in data and data["mfa_enabled"] is not None:
        user.mfa_enabled = data["mfa_enabled"]
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="UPDATE",
        resource="Profile",
        details=f"Updated profile for {user.email}",
        ip_address=ip_address,
    )
    db.commit()
    db.refresh(user)
    return user
