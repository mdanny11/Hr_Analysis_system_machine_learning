import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class ModelType(str, enum.Enum):
    RANDOM_FOREST = "random-forest"
    XGBOOST = "xgboost"
    NEURAL_NETWORK = "neural-network"


class ModelStatus(str, enum.Enum):
    ACTIVE = "active"
    TRAINING = "training"
    DEPRECATED = "deprecated"


class PredictionRunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AttritionRiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class PredictionModel(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "prediction_models"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[ModelType] = mapped_column(Enum(ModelType, name="model_type"), nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False)
    precision: Mapped[float] = mapped_column(Float, nullable=False)
    recall: Mapped[float] = mapped_column(Float, nullable=False)
    f1_score: Mapped[float] = mapped_column(Float, nullable=False)
    auc: Mapped[float] = mapped_column(Float, nullable=False)
    last_trained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[ModelStatus] = mapped_column(Enum(ModelStatus, name="model_status"), nullable=False)
    artifact_path: Mapped[str | None] = mapped_column(String(512), nullable=True)


class ModelFeatureImportance(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "model_feature_importance"

    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prediction_models.id"))
    feature_name: Mapped[str] = mapped_column(String(255), nullable=False)
    importance: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False)


class PredictionRun(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "prediction_runs"

    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prediction_models.id"))
    triggered_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    threshold: Mapped[float] = mapped_column(Float, default=0.5)
    status: Mapped[PredictionRunStatus] = mapped_column(
        Enum(PredictionRunStatus, name="prediction_run_status"), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EmployeePrediction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "employee_predictions"

    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prediction_runs.id"))
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    probability: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[AttritionRiskLevel] = mapped_column(
        Enum(AttritionRiskLevel, name="attrition_risk_level"), nullable=False
    )


class ModelPerformanceHistory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "model_performance_history"

    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prediction_models.id"))
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False)
    precision: Mapped[float] = mapped_column(Float, nullable=False)
    recall: Mapped[float] = mapped_column(Float, nullable=False)
    f1_score: Mapped[float] = mapped_column(Float, nullable=False)
    auc: Mapped[float] = mapped_column(Float, nullable=False)


class ModelDriftMetric(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "model_drift_metrics"

    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prediction_models.id"))
    feature_name: Mapped[str] = mapped_column(String(255), nullable=False)
    drift_score: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False)


class ModelVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "model_versions"

    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prediction_models.id"))
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    artifact_path: Mapped[str | None] = mapped_column(String(512), nullable=True)


class RetrainingSchedule(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "retraining_schedules"

    model_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prediction_models.id"))
    frequency: Mapped[str] = mapped_column(String(64), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
