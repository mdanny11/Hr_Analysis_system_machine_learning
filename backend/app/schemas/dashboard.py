from datetime import datetime
from uuid import UUID

from app.core.responses import CamelModel


class KpiMetrics(CamelModel):
    total_employees: int
    active_employees: int
    attrition_rate: float
    avg_tenure: float
    avg_satisfaction: float
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    open_positions: int
    monthly_turnover: int
    retention_rate: float
    avg_performance: float


class AttritionTrendPoint(CamelModel):
    month: str
    actual: int
    predicted: int
    hired: int


class AuditLogOut(CamelModel):
    id: UUID
    user_id: UUID | None = None
    user_name: str
    action: str
    resource: str
    details: str
    ip_address: str
    timestamp: datetime
