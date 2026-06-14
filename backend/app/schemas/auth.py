from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from app.core.permissions import UserRole
from app.core.responses import CamelModel
from app.models.user import UserStatus


class UserOut(CamelModel):
    id: UUID
    email: EmailStr
    name: str
    role: UserRole
    avatar: str | None = Field(default=None, validation_alias="avatar_url")
    department: str | None = None
    last_login: datetime | None = Field(default=None, validation_alias="last_login_at")
    status: UserStatus | None = None
    mfa_enabled: bool | None = None


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class TokenResponse(CamelModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(CamelModel):
    refresh_token: str


class ForgotPasswordRequest(CamelModel):
    email: EmailStr


class VerifyCodeRequest(CamelModel):
    email: EmailStr
    code: str


class ResetPasswordRequest(CamelModel):
    email: EmailStr
    code: str
    new_password: str


class AccessRequestCreate(CamelModel):
    name: str
    email: EmailStr
    department: str
    job_title: str
    requested_role: UserRole
    justification: str
    manager_email: EmailStr


class AccessRequestOut(CamelModel):
    reference_id: str
    status: str
    message: str


class UserCreate(CamelModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    role: UserRole
    department: str | None = None
    avatar: str | None = None


class UserUpdate(CamelModel):
    name: str | None = None
    role: UserRole | None = None
    department: str | None = None
    avatar: str | None = None
    status: UserStatus | None = None
    mfa_enabled: bool | None = None
