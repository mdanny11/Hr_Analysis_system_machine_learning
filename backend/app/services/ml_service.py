from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

import joblib
import numpy as np
from fastapi import HTTPException, status
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import CalibratedClassifierCV
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
from app.models.organization import AttritionRisk, Employee, EmployeeStatus
from app.models.user import User
from app.services.employee_service import list_employees_query, serialize_employee

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
FEATURE_LABELS = [
    "Satisfaction Score",
    "Years at Company",
    "Work-Life Balance",
    "Last Promotion (Years)",
    "Overtime Hours",
    "Performance Score",
    "Training Hours",
]
FEATURE_CATEGORIES = ["Engagement", "Tenure", "Wellbeing", "Career", "Workload", "Performance", "Development"]
MIN_TRAINING_SAMPLES = 20
CV_FOLDS = 5


def _serialize_model(model: PredictionModel) -> dict:
    production_score = round(model.f1_score * 0.6 + model.auc * 0.4, 3)
    return {
        "id": str(model.id),
        "name": model.name,
        "type": model.type.value,
        "accuracy": model.accuracy,
        "precision": model.precision,
        "recall": model.recall,
        "f1Score": model.f1_score,
        "auc": model.auc,
        "productionScore": production_score,
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


def _load_model_artifact(model: PredictionModel) -> tuple[object | None, float]:
    if not model.artifact_path:
        return None, 0.5
    artifact = Path(model.artifact_path)
    if not artifact.is_file():
        fallback = ARTIFACTS_DIR / f"{model.id}.joblib"
        if not fallback.is_file():
            return None, 0.5
        artifact = fallback
    loaded = joblib.load(artifact)
    if isinstance(loaded, dict) and "model" in loaded:
        return loaded["model"], float(loaded.get("decision_threshold", 0.5))
    return loaded, 0.5


def _predict_positive_probability(classifier, features: np.ndarray) -> float:
    if hasattr(classifier, "predict_proba"):
        return float(classifier.predict_proba(features)[0][1])
    return float(classifier.predict(features)[0])


def _score_employee(employee: Employee, classifier) -> float:
    if classifier is not None:
        features = np.array([_employee_features(employee)])
        return _predict_positive_probability(classifier, features)
    from app.services.employee_service import _calculate_risk

    _, pct = _calculate_risk(
        employee.satisfaction_score,
        employee.years_at_company,
        employee.last_promotion_years,
        employee.overtime_hours,
        employee.work_life_balance,
    )
    return pct / 100


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
    classifier, _decision_threshold = _load_model_artifact(model)

    for employee in employees:
        probability = _score_employee(employee, classifier)
        probability_pct = int(round(probability * 100))
        risk_level = _risk_level(probability)
        db.add(
            EmployeePrediction(
                run_id=run.id,
                employee_id=employee.id,
                probability=probability,
                risk_level=risk_level,
            )
        )
        employee.attrition_probability = probability_pct
        employee.attrition_risk = _to_attrition_risk(probability)
        if probability_pct >= threshold_pct:
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


def _training_matrix(employees: list[Employee]) -> tuple[np.ndarray, np.ndarray]:
    X = np.array([_employee_features(employee) for employee in employees], dtype=float)
    y = _training_labels(employees)
    return X, y


def _training_labels(employees: list[Employee]) -> np.ndarray:
    labels: list[int] = []
    for employee in employees:
        left_company = employee.status == EmployeeStatus.INACTIVE
        high_risk = (
            employee.attrition_risk == AttritionRisk.HIGH
            or employee.attrition_probability >= 65
        )
        labels.append(1 if left_company or high_risk else 0)

    y = np.array(labels, dtype=int)
    if y.sum() == 0 or y.sum() == len(y):
        probabilities = np.array([employee.attrition_probability for employee in employees], dtype=float)
        cutoff = float(np.percentile(probabilities, 75))
        y = (probabilities >= cutoff).astype(int)
    return y


def _build_classifier(model_type: ModelType, sample_count: int = 0):
    calibration_folds = 2 if sample_count >= 800 else 3
    if model_type == ModelType.XGBOOST:
        base = HistGradientBoostingClassifier(
            max_depth=10,
            learning_rate=0.05,
            max_iter=300 if sample_count >= 800 else 400,
            min_samples_leaf=5,
            l2_regularization=0.1,
            random_state=42,
        )
        return CalibratedClassifierCV(base, method="sigmoid", cv=calibration_folds)
    if model_type == ModelType.NEURAL_NETWORK:
        return Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "clf",
                    MLPClassifier(
                        hidden_layer_sizes=(48, 24),
                        alpha=0.001,
                        max_iter=500 if sample_count >= 800 else 800,
                        early_stopping=True,
                        validation_fraction=0.15,
                        learning_rate_init=0.001,
                        random_state=42,
                    ),
                ),
            ]
        )
    base = RandomForestClassifier(
        n_estimators=300 if sample_count >= 800 else 400,
        max_depth=12,
        min_samples_leaf=1,
        max_features="sqrt",
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )
    return CalibratedClassifierCV(base, method="sigmoid", cv=calibration_folds)


def _extract_feature_importances(classifier, X: np.ndarray, y: np.ndarray) -> np.ndarray:
    estimator = classifier
    if isinstance(classifier, CalibratedClassifierCV):
        estimator = classifier.estimator
    if isinstance(estimator, Pipeline):
        estimator = estimator.named_steps.get("clf", estimator)

    if hasattr(estimator, "feature_importances_"):
        return np.array(estimator.feature_importances_, dtype=float)

    try:
        result = permutation_importance(
            classifier,
            X,
            y,
            n_repeats=8,
            random_state=42,
            n_jobs=1,
        )
        importances = np.maximum(result.importances_mean, 0)
        total = importances.sum()
        if total > 0:
            return importances / total
    except Exception:
        pass
    return np.full(len(FEATURE_COLUMNS), 1 / len(FEATURE_COLUMNS))


def _balance_training_set(X: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    positive_idx = np.where(y == 1)[0]
    negative_idx = np.where(y == 0)[0]
    if len(positive_idx) == 0 or len(negative_idx) == 0:
        return X, y

    max_positive = len(negative_idx)
    repeat_count = max(0, max_positive - len(positive_idx))
    repeat_count = min(repeat_count, len(positive_idx) * 3)
    if repeat_count == 0:
        return X, y

    rng = np.random.default_rng(42)
    extra_idx = rng.choice(positive_idx, size=repeat_count, replace=True)
    X_balanced = np.vstack([X, X[extra_idx]])
    y_balanced = np.concatenate([y, y[extra_idx]])
    shuffle_idx = rng.permutation(len(y_balanced))
    return X_balanced[shuffle_idx], y_balanced[shuffle_idx]


def _sample_weights(y: np.ndarray) -> np.ndarray:
    total = len(y)
    positive = max(int(y.sum()), 1)
    negative = max(total - positive, 1)
    weight_positive = total / (2 * positive)
    weight_negative = total / (2 * negative)
    return np.where(y == 1, weight_positive, weight_negative)


def _find_best_threshold(y_true: np.ndarray, y_prob: np.ndarray) -> float:
    best_threshold = 0.5
    best_f1 = -1.0
    for threshold in np.arange(0.10, 0.91, 0.025):
        y_pred = (y_prob >= threshold).astype(int)
        score = float(f1_score(y_true, y_pred, zero_division=0))
        if score > best_f1:
            best_f1 = score
            best_threshold = float(threshold)
    return best_threshold


def _fit_classifier(classifier, X_train: np.ndarray, y_train: np.ndarray) -> None:
    X_balanced, y_balanced = _balance_training_set(X_train, y_train)
    weights = _sample_weights(y_balanced)
    if isinstance(classifier, CalibratedClassifierCV):
        classifier.fit(X_balanced, y_balanced, sample_weight=weights)
        return
    if isinstance(classifier, HistGradientBoostingClassifier):
        classifier.fit(X_balanced, y_balanced, sample_weight=weights)
        return
    if isinstance(classifier, Pipeline):
        classifier.fit(X_balanced, y_balanced)
        return
    classifier.fit(X_balanced, y_balanced)


def _evaluate_classifier(
    classifier,
    X_test: np.ndarray,
    y_test: np.ndarray,
) -> tuple[dict[str, float], float]:
    y_prob = np.array(
        [_predict_positive_probability(classifier, row.reshape(1, -1)) for row in X_test],
        dtype=float,
    )
    threshold = _find_best_threshold(y_test, y_prob)
    y_pred = (y_prob >= threshold).astype(int)
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1Score": float(f1_score(y_test, y_pred, zero_division=0)),
    }
    try:
        metrics["auc"] = float(roc_auc_score(y_test, y_prob))
    except ValueError:
        metrics["auc"] = 0.0
    return metrics, threshold


def _cross_validate_f1(classifier, X: np.ndarray, y: np.ndarray) -> float:
    positive_count = int(y.sum())
    negative_count = len(y) - positive_count
    if positive_count < 2 or negative_count < 2:
        return 0.0
    folds = min(CV_FOLDS, positive_count, negative_count)
    cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)
    scores = cross_val_score(classifier, X, y, cv=cv, scoring="f1", n_jobs=1)
    return float(scores.mean())


def _persist_training_results(
    db: Session,
    model: PredictionModel,
    classifier,
    metrics: dict[str, float],
    cv_f1: float,
    training_samples: int,
    positive_rate: float,
    decision_threshold: float,
) -> dict:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    artifact_path = ARTIFACTS_DIR / f"{model.id}.joblib"
    joblib.dump(
        {
            "model": classifier,
            "decision_threshold": decision_threshold,
            "model_type": model.type.value,
        },
        artifact_path,
    )

    model.accuracy = round(metrics["accuracy"], 3)
    model.precision = round(metrics["precision"], 3)
    model.recall = round(metrics["recall"], 3)
    model.f1_score = round(metrics["f1Score"], 3)
    model.auc = round(metrics["auc"], 3)
    model.last_trained_at = datetime.now(timezone.utc)
    model.status = ModelStatus.ACTIVE
    model.artifact_path = str(artifact_path)

    db.query(ModelFeatureImportance).filter(ModelFeatureImportance.model_id == model.id).delete()
    employees = db.query(Employee).filter(Employee.deleted_at.is_(None)).all()
    X, y = _training_matrix(employees)
    importances = _extract_feature_importances(classifier, X, y)
    for name, importance, category in zip(FEATURE_LABELS, importances, FEATURE_CATEGORIES):
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

    payload = _serialize_model(model)
    payload["trainingMetrics"] = {
        "cvF1": round(cv_f1, 3),
        "trainingSamples": training_samples,
        "positiveRate": round(positive_rate, 3),
        "testAccuracy": model.accuracy,
        "testF1": model.f1_score,
        "testAuc": model.auc,
        "decisionThreshold": round(decision_threshold, 2),
        "productionScore": round(model.f1_score * 0.6 + model.auc * 0.4, 3),
    }
    return payload


def retrain_model(db: Session, model_id: UUID) -> dict:
    model = get_model(db, model_id)
    model.status = ModelStatus.TRAINING
    db.flush()

    employees = db.query(Employee).filter(Employee.deleted_at.is_(None)).all()
    if len(employees) < MIN_TRAINING_SAMPLES:
        model.status = ModelStatus.ACTIVE
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INSUFFICIENT_DATA", "message": "Not enough employee data to train model"},
        )

    X, y = _training_matrix(employees)
    positive_rate = float(y.mean())
    if y.sum() < 5:
        model.status = ModelStatus.ACTIVE
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "IMBALANCED_DATA",
                "message": "Too few high-risk examples to train reliably. Add inactive employees or high-risk records.",
            },
        )

    classifier = _build_classifier(model.type, len(employees))
    cv_f1 = _cross_validate_f1(classifier, X, y) if len(employees) < 800 else 0.0

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )
    _fit_classifier(classifier, X_train, y_train)
    metrics, decision_threshold = _evaluate_classifier(classifier, X_test, y_test)
    if cv_f1 == 0.0:
        cv_f1 = metrics["f1Score"]

    return _persist_training_results(
        db,
        model,
        classifier,
        metrics,
        cv_f1,
        len(X_train),
        positive_rate,
        decision_threshold,
    )


def retrain_all_models(db: Session) -> list[dict]:
    models = db.query(PredictionModel).order_by(PredictionModel.name).all()
    results: list[dict] = []
    errors: list[str] = []
    for model in models:
        if model.status == ModelStatus.DEPRECATED:
            continue
        try:
            results.append(retrain_model(db, model.id))
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
            errors.append(f"{model.name}: {detail.get('message', 'training failed')}")
    if not results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "TRAINING_FAILED",
                "message": errors[0] if len(errors) == 1 else "All models failed to train. " + "; ".join(errors),
            },
        )
    results.sort(key=lambda item: item.get("productionScore", 0), reverse=True)
    return results


def train_and_run_predictions(db: Session, user: User, threshold: float = 0.5) -> dict:
    trained_models = retrain_all_models(db)
    if not trained_models:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "NO_MODELS", "message": "No models available to train"},
        )
    recommended = trained_models[0]
    prediction_result = run_predictions(db, user, UUID(recommended["id"]), threshold)
    return {
        "recommendedModel": recommended,
        "trainedModels": trained_models,
        "predictions": prediction_result,
    }


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
    version_rows = (
        db.query(ModelVersion)
        .filter(ModelVersion.model_id == model_id)
        .order_by(ModelVersion.deployed_at.desc())
        .all()
    )
    history_rows = (
        db.query(ModelPerformanceHistory)
        .filter(ModelPerformanceHistory.model_id == model_id)
        .order_by(ModelPerformanceHistory.recorded_at.desc())
        .all()
    )
    versions: list[dict] = []
    for index, row in enumerate(version_rows):
        matched = next(
            (
                history
                for history in history_rows
                if row.deployed_at
                and abs((history.recorded_at - row.deployed_at).total_seconds()) <= 5
            ),
            history_rows[index] if index < len(history_rows) else None,
        )
        versions.append(
            {
                "id": str(row.id),
                "version": row.version,
                "status": "active" if index == 0 else "archived",
                "deployedAt": row.deployed_at.isoformat() if row.deployed_at else None,
                "accuracy": matched.accuracy if matched else None,
                "changes": "Automated retrain on employee dataset",
            }
        )
    return versions


def get_feature_drift(db: Session, user: User) -> list[dict]:
    employees = list_employees_query(db, user).all()
    if len(employees) < 20:
        return []

    sorted_employees = sorted(employees, key=lambda employee: employee.created_at or datetime.min.replace(tzinfo=timezone.utc))
    midpoint = max(1, len(sorted_employees) // 2)
    baseline_group = sorted_employees[:midpoint]
    current_group = sorted_employees[midpoint:]

    feature_specs = [
        ("Satisfaction Score", lambda employee: float(employee.satisfaction_score)),
        ("Overtime Hours", lambda employee: float(employee.overtime_hours)),
        ("Years at Company", lambda employee: float(employee.years_at_company)),
        ("Salary (RWF)", lambda employee: float(employee.salary)),
        ("Performance Score", lambda employee: float(employee.performance_score)),
        ("Training Hours", lambda employee: float(employee.training_hours)),
    ]

    drift_rows: list[dict] = []
    for feature_name, getter in feature_specs:
        baseline_values = [getter(employee) for employee in baseline_group]
        current_values = [getter(employee) for employee in current_group]
        baseline = float(np.mean(baseline_values))
        current = float(np.mean(current_values))
        if baseline == 0:
            drift_pct = 0.0
        else:
            drift_pct = ((current - baseline) / baseline) * 100
        abs_drift = abs(drift_pct)
        status = "alert" if abs_drift >= 15 else "warning" if abs_drift >= 8 else "ok"
        drift_rows.append(
            {
                "feature": feature_name,
                "baseline": round(baseline, 2),
                "current": round(current, 2),
                "drift": round(drift_pct, 1),
                "status": status,
            }
        )
    drift_rows.sort(key=lambda row: abs(row["drift"]), reverse=True)
    return drift_rows


def get_prediction_feedback(db: Session, user: User, *, threshold: float = 70.0) -> dict:
    employees = list_employees_query(db, user).all()
    true_positives = 0
    false_positives = 0
    true_negatives = 0
    false_negatives = 0

    for employee in employees:
        predicted_high_risk = employee.attrition_probability >= threshold
        actually_left = employee.status == EmployeeStatus.INACTIVE

        if predicted_high_risk and actually_left:
            true_positives += 1
        elif predicted_high_risk and not actually_left:
            false_positives += 1
        elif not predicted_high_risk and actually_left:
            false_negatives += 1
        else:
            true_negatives += 1

    total = true_positives + false_positives + true_negatives + false_negatives
    overall_accuracy = (true_positives + true_negatives) / total if total else 0.0
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) else 0.0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) else 0.0

    return {
        "threshold": threshold,
        "truePositives": true_positives,
        "falsePositives": false_positives,
        "trueNegatives": true_negatives,
        "falseNegatives": false_negatives,
        "overallAccuracy": round(overall_accuracy, 3),
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "pendingFeedback": max(0, len(employees) - total),
        "predictionsMade": len(employees),
        "verifiedOutcomes": true_positives + false_positives + true_negatives + false_negatives,
    }


def get_model_comparison(db: Session) -> dict:
    models = sorted(list_models(db), key=lambda model: model["productionScore"], reverse=True)
    if not models:
        return {"modelA": None, "modelB": None, "metrics": []}
    if len(models) == 1:
        return {"modelA": models[0], "modelB": None, "metrics": []}

    model_a = models[0]
    model_b = models[1]
    metric_specs = [
        ("accuracy", "Accuracy"),
        ("precision", "Precision"),
        ("recall", "Recall"),
        ("f1Score", "F1 Score"),
        ("auc", "AUC-ROC"),
    ]
    metrics: list[dict] = []
    wins_a = 0
    wins_b = 0
    for key, label in metric_specs:
        value_a = float(model_a[key])
        value_b = float(model_b[key])
        winner = "A" if value_a >= value_b else "B"
        if winner == "A":
            wins_a += 1
        else:
            wins_b += 1
        diff_pct = abs(value_a - value_b) * 100
        metrics.append(
            {
                "metric": label,
                "modelA": value_a,
                "modelB": value_b,
                "winner": winner,
                "diff": f"{'+' if value_a >= value_b else '-'}{diff_pct:.1f}%",
            }
        )

    return {
        "modelA": model_a,
        "modelB": model_b,
        "metrics": metrics,
        "overallWinner": "A" if wins_a >= wins_b else "B",
    }
