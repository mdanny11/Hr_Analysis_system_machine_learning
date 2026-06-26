from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import EmailStr, Field

from app.core.responses import CamelModel
from app.models.organization import AttritionRisk, EmployeeStatus


class EmployeeOut(CamelModel):
    id: UUID
    employee_id: str
    first_name: str
    last_name: str
    email: EmailStr
    department: str
    position: str
    hire_date: date
    salary: Decimal
    age: int
    gender: str
    years_at_company: int
    performance_score: float
    satisfaction_score: float
    work_life_balance: float
    last_promotion_years: int
    training_hours: int
    overtime_hours: int
    attrition_risk: AttritionRisk
    attrition_probability: int
    status: EmployeeStatus
    avatar: str | None = Field(default=None, validation_alias="avatar_url")


class EmployeeCreate(CamelModel):
    employee_id: str | None = None
    first_name: str
    last_name: str
    email: EmailStr
    department: str
    position: str
    hire_date: date
    salary: Decimal
    age: int
    gender: str
    years_at_company: int = 0
    performance_score: float = 7.0
    satisfaction_score: float = 7.0
    work_life_balance: float = 7.0
    last_promotion_years: int = 0
    training_hours: int = 0
    overtime_hours: int = 0
    status: EmployeeStatus = EmployeeStatus.ACTIVE


class EmployeeUpdate(CamelModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    department: str | None = None
    position: str | None = None
    hire_date: date | None = None
    salary: Decimal | None = None
    age: int | None = None
    gender: str | None = None
    years_at_company: int | None = None
    performance_score: float | None = None
    satisfaction_score: float | None = None
    work_life_balance: float | None = None
    last_promotion_years: int | None = None
    training_hours: int | None = None
    overtime_hours: int | None = None
    status: EmployeeStatus | None = None


class EmployeeStats(CamelModel):
    total: int
    active: int
    on_leave: int
    inactive: int
    high_risk: int
    medium_risk: int
    low_risk: int
    avg_performance: float
    avg_satisfaction: float


class SkillOut(CamelModel):
    id: UUID
    skill_name: str
    proficiency: str
    years_experience: int


class CertificationOut(CamelModel):
    id: UUID
    name: str
    issuer: str
    issue_date: date
    expiry_date: date | None = None


class TimelineEventOut(CamelModel):
    id: UUID
    event_type: str
    title: str
    description: str
    event_date: date


class CompensationOut(CamelModel):
    base_salary: Decimal
    bonus: Decimal
    stock_options: int
    effective_date: date
    total_compensation: Decimal
