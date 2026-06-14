import enum
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Enum, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class EmployeeStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on-leave"


class AttritionRisk(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Department(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "departments"

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    head_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    attrition_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    avg_satisfaction: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    budget: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    manager_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", use_alter=True), nullable=True
    )

    employees = relationship("Employee", back_populates="department")
    users = relationship("User", back_populates="department", foreign_keys="User.department_id")


class Employee(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "employees"

    employee_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False
    )
    position: Mapped[str] = mapped_column(String(255), nullable=False)
    hire_date: Mapped[date] = mapped_column(Date, nullable=False)
    salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(32), nullable=False)
    years_at_company: Mapped[int] = mapped_column(Integer, nullable=False)
    performance_score: Mapped[float] = mapped_column(Float, nullable=False)
    satisfaction_score: Mapped[float] = mapped_column(Float, nullable=False)
    work_life_balance: Mapped[float] = mapped_column(Float, nullable=False)
    last_promotion_years: Mapped[int] = mapped_column(Integer, nullable=False)
    training_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    overtime_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    attrition_risk: Mapped[AttritionRisk] = mapped_column(
        Enum(AttritionRisk, name="attrition_risk"), nullable=False
    )
    attrition_probability: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[EmployeeStatus] = mapped_column(
        Enum(EmployeeStatus, name="employee_status"), nullable=False
    )
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    deleted_at: Mapped[date | None] = mapped_column(Date, nullable=True)

    department = relationship("Department", back_populates="employees")
    skills = relationship("EmployeeSkill", back_populates="employee", cascade="all, delete-orphan")
    certifications = relationship(
        "EmployeeCertification", back_populates="employee", cascade="all, delete-orphan"
    )
    employment_events = relationship(
        "EmploymentEvent", back_populates="employee", cascade="all, delete-orphan"
    )
    compensation_records = relationship(
        "CompensationRecord", back_populates="employee", cascade="all, delete-orphan"
    )


class EmployeeSkill(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "employee_skills"

    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    skill_name: Mapped[str] = mapped_column(String(255), nullable=False)
    proficiency: Mapped[str] = mapped_column(String(64), nullable=False)
    years_experience: Mapped[int] = mapped_column(Integer, default=0)

    employee = relationship("Employee", back_populates="skills")


class EmployeeCertification(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "employee_certifications"

    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    issuer: Mapped[str] = mapped_column(String(255), nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    employee = relationship("Employee", back_populates="certifications")


class EmploymentEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "employment_events"

    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)

    employee = relationship("Employee", back_populates="employment_events")


class CompensationRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "compensation_records"

    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    base_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    bonus: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    stock_options: Mapped[int] = mapped_column(Integer, default=0)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)

    employee = relationship("Employee", back_populates="compensation_records")
