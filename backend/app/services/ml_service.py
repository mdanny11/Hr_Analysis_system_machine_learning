from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

import joblib
import numpy as np
from fastapi import HTTPException, status
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sqlalchemy.orm import Session, joinedload

from app.models.ml import (
    AttritionRiskLevel,
    ModelFeatureImportance,
    ModelPerformanceHistory,
    ModelStatus,
    ModelType,
    ModelVersion,
    PredictionModel,
    PredictionRun,
    PredictionRunStatus,
    EmployeePrediction,
)
from app.models.organization import AttritionRisk, Employee
from app.models.user import User
from app.services.employee_service import get_department_scope, list_employees_query, serialize_employee

ARTIFACTS_DIR = Path(__file__).resolve().parents[2] / "artifacts"
FEATURE_COLUMNS = [
    "satisfaction_score",
    "years_at_company",
    "work_life_balance",
    "last_promotion_years",
    "overtime_hours",
    "performance_score",
    "training_hours",
]


def _serialize_model(model: PredictionModel) -> dict:
    return {
        "id": str(model.id),
        "name": model.name,
        "type": model.type.value,
        "accuracy": model.accuracy,
        "precision": model.precision,
        "recall": model.recall,
        "f1Score": model.f1_score,
        "auc": model.auc,
        "lastTrained": model.last_trained_at.isoformat(),
        "status": model.status.value,
    }


def list_models(db: Session) -> list[dict]:
    models = db.query(PredictionModel).order_by(PredictionModel.name).all()
    return [_serialize_model(m) for m in models]


def get_model(db: Session, model_id: UUID) -> PredictionModel:
    model = db.query(PredictionModel).filter(PredictionModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"code": "NOT_FOUND", "message": "Model not found"})
    return model


def get_feature_importance(db: Session, model_id: UUID) -> list[dict]:
    get_model(db, model_id)
    rows = (
        db.query(ModelFeatureImportance)
        .filter(ModelFeatureImportance.model_id == model_id)
        .order_by(ModelFeatureImportance.importance.desc())
        .all()
    )
    return [
        {
            "feature": row.feature_name,
            "importance": row.importance,
            "category": row.category,
        }
        for row in rows
    ]


def _employee_features(employee: Employee) -> list[float]:
    return [
        employee.satisfaction_score,
        employee.years_at_company,
        employee.work_life_balance,
        employee.last_promotion_years,
        employee.overtime_hours,
        employee.performance_score,
        employee.training_hours,
    ]


def _risk_level(probability: float) -> AttritionRiskLevel:
    if probability < 0.3:
        return AttritionRiskLevel.LOW
    if probability < 0.6:
        return AttritionRiskLevel.MEDIUM
    return AttritionRiskLevel.HIGH


def _to_attrition_risk(probability: float) -> AttritionRisk:
    if probability < 0.3:
        return AttritionRisk.LOW
    if probability < 0.6:
        return AttritionRisk.MEDIUM
    return AttritionRisk.HIGH


def run_predictions(
    db: Session,
    user: User,
    model_id: UUID,
    threshold: float = 0.5,
) -> dict:
    model = get_model(db, model_id)
    employees = list_employees_query(db, user).options(joinedload(Employee.department)).all()

    run = PredictionRun(
        model_id=model.id,
        triggered_by_user_id=user.id,
        threshold=threshold,
        status=PredictionRunStatus.RUNNING,
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.flush()

    threshold_pct = threshold * 100 if threshold <= 1 else threshold
    predictions: list[dict] = []

    for employee in employees:
        probability = employee.attrition_probability / 100
        risk_level = _risk_level(probability)
        db.add(
            EmployeePrediction(
                run_id=run.id,
                employee_id=employee.id,
                probability=probability,
                risk_level=risk_level,
            )
        )
        employee.attrition_probability = int(round(probability * 100))
        employee.attrition_risk = _to_attrition_risk(probability)
        if probability * 100 >= threshold_pct:
            predictions.append(serialize_employee(employee))

    run.status = PredictionRunStatus.COMPLETED
    run.completed_at = datetime.now(timezone.utc)
    db.commit()

    predictions.sort(key=lambda item: item["attritionProbability"], reverse=True)
    return {
        "runId": str(run.id),
        "modelId": str(model.id),
        "modelName": model.name,
        "threshold": threshold_pct,
        "analyzedCount": len(employees),
        "atRiskCount": len(predictions),
        "atRiskEmployees": predictions[:50],
    }


def get_at_risk_employees(db: Session, user: User, threshold: float = 0.5) -> list[dict]:
    threshold_pct = threshold * 100 if threshold <= 1 else threshold
    employees = (
        list_employees_query(db, user)
        .options(joinedload(Employee.department))
        .filter(Employee.attrition_probability >= threshold_pct)
        .order_by(Employee.attrition_probability.desc())
        .limit(100)
        .all()
    )
    return [serialize_employee(e) for e in employees]


def retrain_model(db: Session, model_id: UUID) -> dict:
    model = get_model(db, model_id)
    model.status = ModelStatus.TRAINING
    db.flush()

    employees = db.query(Employee).filter(Employee.deleted_at.is_(None)).all()
    if len(employees) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INSUFFICIENT_DATA", "message": "Not enough employee data to train model"},
        )

    X = np.array([_employee_features(e) for e in employees])
    y = np.array([1 if e.attrition_risk == AttritionRisk.HIGH else 0 for e in employees])

    if y.sum() == 0 or y.sum() == len(y):
        y = np.array([1 if e.attrition_probability >= 60 else 0 for e in employees])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    classifier = RandomForestClassifier(n_estimators=100, random_state=42)
    classifier.fit(X_train, y_train)
    y_pred = classifier.predict(X_test)
    y_prob = classifier.predict_proba(X_test)[:, 1] if hasattr(classifier, "predict_proba") else y_pred

    accuracy = float(accuracy_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    try:
        auc = float(roc_auc_score(y_test, y_prob))
    except ValueError:
        auc = model.auc

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    artifact_path = ARTIFACTS_DIR / f"{model.id}.joblib"
    joblib.dump(classifier, artifact_path)

    model.accuracy = round(accuracy, 3)
    model.precision = round(precision, 3)
    model.recall = round(recall, 3)
    model.f1_score = round(f1, 3)
    model.auc = round(auc, 3)
    model.last_trained_at = datetime.now(timezone.utc)
    model.status = ModelStatus.ACTIVE
    model.artifact_path = str(artifact_path)

    importances = classifier.feature_importances_
    db.query(ModelFeatureImportance).filter(ModelFeatureImportance.model_id == model.id).delete()
    categories = ["Engagement", "Tenure", "Wellbeing", "Career", "Workload", "Performance", "Development"]
    feature_names = [
        "Satisfaction Score",
        "Years at Company",
        "Work-Life Balance",
        "Last Promotion (Years)",
        "Overtime Hours",
        "Performance Score",
        "Training Hours",
    ]
    for name, importance, category in zip(feature_names, importances, categories):
        db.add(
            ModelFeatureImportance(
                model_id=model.id,
                feature_name=name,
                importance=float(importance),
                category=category,
            )
        )

    db.add(
        ModelPerformanceHistory(
            model_id=model.id,
            recorded_at=datetime.now(timezone.utc),
            accuracy=model.accuracy,
            precision=model.precision,
            recall=model.recall,
            f1_score=model.f1_score,
            auc=model.auc,
        )
    )
    db.add(
        ModelVersion(
            model_id=model.id,
            version=datetime.now(timezone.utc).strftime("v%Y%m%d.%H%M"),
            status="deployed",
            deployed_at=datetime.now(timezone.utc),
            artifact_path=str(artifact_path),
        )
    )
    db.commit()
    db.refresh(model)
    return _serialize_model(model)


def get_performance_history(db: Session, model_id: UUID) -> list[dict]:
    get_model(db, model_id)
    rows = (
        db.query(ModelPerformanceHistory)
        .filter(ModelPerformanceHistory.model_id == model_id)
        .order_by(ModelPerformanceHistory.recorded_at)
        .all()
    )
    return [
        {
            "recordedAt": row.recorded_at.isoformat(),
            "accuracy": row.accuracy,
            "precision": row.precision,
            "recall": row.recall,
            "f1Score": row.f1_score,
            "auc": row.auc,
        }
        for row in rows
    ]


def get_model_versions(db: Session, model_id: UUID) -> list[dict]:
    get_model(db, model_id)
    rows = (
        db.query(ModelVersion)
        .filter(ModelVersion.model_id == model_id)
        .order_by(ModelVersion.deployed_at.desc())
        .all()
    )
    return [
        {
            "id": str(row.id),
            "version": row.version,
            "status": row.status,
            "deployedAt": row.deployed_at.isoformat() if row.deployed_at else None,
        }
        for row in rows
    ]
