from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.responses import success_response
from app.database import get_db
from app.dependencies import require_permission
from app.models.user import User
from app.services import ml_service

router = APIRouter(prefix="/models", tags=["models"])


class PredictRequest(BaseModel):
    threshold: float = Field(default=0.5, ge=0, le=100)


@router.get("")
def list_models(
    _: User = Depends(require_permission("models.view")),
    db: Session = Depends(get_db),
):
    return success_response(ml_service.list_models(db))


@router.get("/{model_id}")
def get_model(
    model_id: UUID,
    _: User = Depends(require_permission("models.view")),
    db: Session = Depends(get_db),
):
    model = ml_service.get_model(db, model_id)
    return success_response(ml_service._serialize_model(model))


@router.get("/{model_id}/feature-importance")
def feature_importance(
    model_id: UUID,
    _: User = Depends(require_permission("predictions.view")),
    db: Session = Depends(get_db),
):
    return success_response(ml_service.get_feature_importance(db, model_id))


@router.post("/{model_id}/predict")
def predict(
    model_id: UUID,
    payload: PredictRequest,
    user: User = Depends(require_permission("predictions.run")),
    db: Session = Depends(get_db),
):
    return success_response(ml_service.run_predictions(db, user, model_id, payload.threshold))


@router.post("/{model_id}/retrain")
def retrain(
    model_id: UUID,
    _: User = Depends(require_permission("models.train")),
    db: Session = Depends(get_db),
):
    return success_response(ml_service.retrain_model(db, model_id))


@router.get("/{model_id}/performance/history")
def performance_history(
    model_id: UUID,
    _: User = Depends(require_permission("models.view")),
    db: Session = Depends(get_db),
):
    return success_response(ml_service.get_performance_history(db, model_id))


@router.get("/{model_id}/versions")
def model_versions(
    model_id: UUID,
    _: User = Depends(require_permission("models.view")),
    db: Session = Depends(get_db),
):
    return success_response(ml_service.get_model_versions(db, model_id))
