from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.responses import success_response
from app.database import get_db
from app.dependencies import get_client_ip, require_permission
from app.models.user import User
from app.services import ml_service
from app.services.audit_service import log_audit

router = APIRouter(prefix="/models", tags=["models"])


class PredictRequest(BaseModel):
    threshold: float = Field(default=0.5, ge=0, le=100)


def _log_model_action(
    db: Session,
    *,
    user: User,
    request: Request,
    action: str,
    details: str,
) -> None:
    log_audit(
        db,
        user_id=user.id,
        user_name=user.name,
        action=action,
        resource="ML Models",
        details=details,
        ip_address=get_client_ip(request),
    )
    db.commit()


@router.get("")
def list_models(
    _: User = Depends(require_permission("models.view")),
    db: Session = Depends(get_db),
):
    return success_response(ml_service.list_models(db))


@router.get("/comparison/ab-test")
def model_comparison(
    _: User = Depends(require_permission("models.view")),
    db: Session = Depends(get_db),
):
    return success_response(ml_service.get_model_comparison(db))


@router.post("/train-and-predict")
def train_and_predict(
    payload: PredictRequest,
    request: Request,
    user: User = Depends(require_permission("predictions.run")),
    db: Session = Depends(get_db),
):
    result = ml_service.train_and_run_predictions(db, user, payload.threshold)
    _log_model_action(
        db,
        user=user,
        request=request,
        action="RUN_MODEL",
        details=f"Train & predict all models; {result['predictions']['atRiskCount']} at-risk employees",
    )
    return success_response(result)


@router.post("/retrain-all")
def retrain_all(
    request: Request,
    user: User = Depends(require_permission("models.train")),
    db: Session = Depends(get_db),
):
    results = ml_service.retrain_all_models(db)
    _log_model_action(
        db,
        user=user,
        request=request,
        action="RUN_MODEL",
        details=f"Retrained {len(results)} production models",
    )
    return success_response(results)


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
    request: Request,
    user: User = Depends(require_permission("predictions.run")),
    db: Session = Depends(get_db),
):
    model = ml_service.get_model(db, model_id)
    result = ml_service.run_predictions(db, user, model_id, payload.threshold)
    _log_model_action(
        db,
        user=user,
        request=request,
        action="RUN_MODEL",
        details=f"Ran predictions with {model.name}; {result['atRiskCount']} at-risk employees",
    )
    return success_response(result)


@router.post("/{model_id}/retrain")
def retrain(
    model_id: UUID,
    request: Request,
    user: User = Depends(require_permission("models.train")),
    db: Session = Depends(get_db),
):
    updated = ml_service.retrain_model(db, model_id)
    _log_model_action(
        db,
        user=user,
        request=request,
        action="RUN_MODEL",
        details=f"Retrained {updated['name']}; F1 {updated['f1Score']:.1%}, AUC {updated['auc']:.1%}",
    )
    return success_response(updated)


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


@router.get("/{model_id}/drift")
def feature_drift(
    model_id: UUID,
    user: User = Depends(require_permission("models.view")),
    db: Session = Depends(get_db),
):
    ml_service.get_model(db, model_id)
    return success_response(ml_service.get_feature_drift(db, user))


@router.get("/{model_id}/feedback")
def prediction_feedback(
    model_id: UUID,
    threshold: float = 70.0,
    user: User = Depends(require_permission("models.view")),
    db: Session = Depends(get_db),
):
    ml_service.get_model(db, model_id)
    return success_response(ml_service.get_prediction_feedback(db, user, threshold=threshold))
