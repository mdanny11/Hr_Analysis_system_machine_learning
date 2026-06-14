from decimal import Decimal
from uuid import UUID

from app.core.responses import CamelModel


class DepartmentOut(CamelModel):
    id: UUID
    name: str
    head_count: int
    attrition_rate: float
    avg_satisfaction: float
    budget: Decimal


class DepartmentRiskOut(CamelModel):
    id: UUID
    name: str
    head_count: int
    attrition_rate: float
    avg_satisfaction: float
    budget: Decimal
    high_risk: int
    medium_risk: int
    low_risk: int
