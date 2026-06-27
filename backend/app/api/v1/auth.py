from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.core.responses import Meta, success_response
from app.database import get_db
from app.dependencies import get_client_ip, get_current_user, require_admin
from app.models.user import User
from app.schemas.auth import (
    AccessRequestCreate,
    AdminResetPasswordRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ProfileUpdateRequest,
    RefreshRequest,
    ResetPasswordRequest,
    UserCreate,
    UserOut,
    UserUpdate,
    VerifyCodeRequest,
)
from app.services.audit_service import log_audit
from app.services.auth_service import (
    admin_reset_user_password,
    authenticate_user,
    change_user_password,
    create_access_request,
    create_user_record,
    initiate_password_reset,
    issue_tokens,
    refresh_access_token,
    reset_password,
    revoke_refresh_token,
    serialize_user,
    update_user_profile,
    verify_reset_code,
)
from app.services.user_export_service import export_users_csv

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    data = issue_tokens(db, user, get_client_ip(request))
    return success_response(data)


@router.post("/logout")
def logout(
    payload: RefreshRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    revoke_refresh_token(db, payload.refresh_token)
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action="LOGOUT",
        resource="System",
        details="User logged out",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return success_response({"message": "Logged out successfully"})


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return success_response(serialize_user(user))


@router.patch("/me")
def update_me(
    payload: ProfileUpdateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = update_user_profile(db, user, payload.model_dump(exclude_unset=True), get_client_ip(request))
    return success_response(serialize_user(updated))


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    change_user_password(db, user, payload.current_password, payload.new_password, get_client_ip(request))
    return success_response({"message": "Password changed successfully"})


@router.post("/refresh")
def refresh_tokens(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    data = refresh_access_token(db, payload.refresh_token, get_client_ip(request))
    return success_response(data)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    code = initiate_password_reset(db, payload.email)
    settings = get_settings()
    response: dict = {"message": "Verification code sent"}
    if settings.debug:
        response["devCode"] = code
    return success_response(response)


@router.post("/verify-code")
def verify_code(payload: VerifyCodeRequest, db: Session = Depends(get_db)):
    valid = verify_reset_code(db, payload.email, payload.code)
    return success_response({"valid": valid})


@router.post("/reset-password")
def reset_password_endpoint(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_password(db, payload.email, payload.code, payload.new_password)
    return success_response({"message": "Password reset successfully"})


@router.post("/access-requests")
def submit_access_request(payload: AccessRequestCreate, db: Session = Depends(get_db)):
    record = create_access_request(db, payload.model_dump())
    return success_response(
        {
            "referenceId": record.reference_id,
            "status": record.status.value,
            "message": "Access request submitted successfully",
        }
    )


users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("")
def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).options(joinedload(User.department)).filter(User.deleted_at.is_(None)).all()
    return success_response([serialize_user(u) for u in users])


@users_router.get("/export")
def export_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    csv_content = export_users_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="users_export.csv"'},
    )


@users_router.post("")
def create_user(
    payload: UserCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = create_user_record(db, payload.model_dump(), admin, get_client_ip(request))
    return success_response(serialize_user(user))


@users_router.patch("/{user_id}")
def update_user(
    user_id: str,
    payload: UserUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "User not found"})
    data = payload.model_dump(exclude_unset=True)
    if "department" in data:
        from app.services.auth_service import get_department_by_name

        dept = get_department_by_name(db, data.pop("department"))
        user.department_id = dept.id if dept else None
    if "avatar" in data:
        user.avatar_url = data.pop("avatar")
    for key, value in data.items():
        setattr(user, key, value)
    log_audit(
        db,
        user_id=admin.id,
        user_name=admin.name,
        action="UPDATE",
        resource="User",
        details=f"Updated user {user.email}",
        ip_address=get_client_ip(request),
    )
    db.commit()
    db.refresh(user)
    return success_response(serialize_user(user))


@users_router.delete("/{user_id}")
def delete_user(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone

    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "User not found"})
    user.deleted_at = datetime.now(timezone.utc)
    log_audit(
        db,
        user_id=admin.id,
        user_name=admin.name,
        action="DELETE",
        resource="User",
        details=f"Deleted user {user.email}",
        ip_address=get_client_ip(request),
    )
    db.commit()
    return success_response({"message": "User deleted"})


@users_router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: str,
    payload: AdminResetPasswordRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    from uuid import UUID

    user = admin_reset_user_password(db, UUID(user_id), payload.password, admin, get_client_ip(request))
    return success_response({"message": "Password reset successfully", "user": serialize_user(user)})
