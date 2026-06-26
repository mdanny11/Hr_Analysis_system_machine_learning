from fastapi import APIRouter

from app.api.v1 import (
    access_requests,
    audit,
    auth,
    dashboard,
    departments,
    employees,
    health,
    models,
    operations,
    predictions,
    risk,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(auth.users_router)
api_router.include_router(access_requests.router)
api_router.include_router(employees.router)
api_router.include_router(departments.router)
api_router.include_router(dashboard.router)
api_router.include_router(dashboard.analytics_router)
api_router.include_router(audit.router)
# Phase 2
api_router.include_router(models.router)
api_router.include_router(predictions.router)
api_router.include_router(risk.router)
# Phase 3
api_router.include_router(operations.reports_router)
api_router.include_router(operations.engagement_router)
api_router.include_router(operations.surveys_router)
api_router.include_router(operations.feedback_router)
api_router.include_router(operations.alerts_router)
api_router.include_router(operations.decisions_router)
api_router.include_router(operations.interventions_router)
api_router.include_router(operations.action_items_router)
api_router.include_router(operations.succession_router)
api_router.include_router(operations.data_router)
api_router.include_router(operations.pipelines_router)
api_router.include_router(operations.benchmarks_router)
api_router.include_router(operations.settings_router)
api_router.include_router(operations.notifications_router)
