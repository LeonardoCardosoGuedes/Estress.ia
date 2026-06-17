from __future__ import annotations

import argparse
import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import mlflow
import mlflow.sklearn
import pandas as pd
from mlflow.models import infer_signature
from mlflow.tracking import MlflowClient
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import AdaBoostRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import (
    GridSearchCV,
    KFold,
    LeaveOneOut,
    RandomizedSearchCV,
    cross_validate,
    train_test_split,
)
from sklearn.neighbors import KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeRegressor


TARGET_COLUMN = "stress_level"
EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME", "stressia-stress-prediction")
DEFAULT_ARTIFACT_ROOT = os.getenv("MLFLOW_DEFAULT_ARTIFACT_ROOT", "file:./mlartifacts")

NUMERIC_FEATURES = [
    "daily_screen_time_hours",
    "social_media_hours",
    "gaming_hours",
    "sleep_duration_hours",
    "sleep_quality",
    "caffeine_intake_mg_per_day",
]
CATEGORICAL_FEATURES = ["location_type"]
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES
SCORING = {"mae": "neg_mean_absolute_error", "r2": "r2"}


@dataclass(frozen=True)
class SplitMetrics:
    rows: int
    mae: float
    r2: float


@dataclass(frozen=True)
class HoldoutResult:
    repeat: int
    seed: int
    train: SplitMetrics
    validation: SplitMetrics
    test: SplitMetrics


@dataclass(frozen=True)
class ModelSpec:
    name: str
    display_name: str
    estimator: Any
    search_type: str
    param_grid: dict[str, list[Any]]
    default_n_iter: int | None = None


@dataclass(frozen=True)
class ModelRunResult:
    model_name: str
    display_name: str
    run_id: str
    model_uri: str
    search_type: str
    best_params: dict[str, Any]
    best_repeat: int
    best_seed: int
    search_cv_mae: float
    search_cv_r2: float
    cross_validation_mae: float
    cross_validation_r2: float
    validation_mae: float
    validation_r2: float
    test_mae: float
    test_r2: float


def build_pipeline(estimator: Any) -> Pipeline:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="unknown")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", estimator),
        ]
    )


def estimator_for_seed(spec: ModelSpec, random_state: int) -> Any:
    estimator = clone(spec.estimator)
    if "random_state" in estimator.get_params():
        estimator.set_params(random_state=random_state)
    return estimator


def build_tuned_pipeline(spec: ModelSpec, best_params: dict[str, Any], random_state: int) -> Pipeline:
    pipeline = build_pipeline(estimator_for_seed(spec, random_state))
    pipeline.set_params(**best_params)
    return pipeline


def build_model_specs(random_state: int, search_iterations: int) -> list[ModelSpec]:
    return [
        ModelSpec(
            name="knn",
            display_name="KNN Regressor",
            estimator=KNeighborsRegressor(),
            search_type="grid",
            param_grid={
                "model__n_neighbors": [3, 5, 9, 15, 25],
                "model__weights": ["uniform", "distance"],
                "model__p": [1, 2],
            },
        ),
        ModelSpec(
            name="decision_tree",
            display_name="Decision Tree Regressor",
            estimator=DecisionTreeRegressor(random_state=random_state),
            search_type="grid",
            param_grid={
                "model__max_depth": [3, 5, 8, None],
                "model__min_samples_leaf": [5, 20, 50],
                "model__min_samples_split": [10, 50, 100],
            },
        ),
        ModelSpec(
            name="random_forest",
            display_name="Random Forest Regressor",
            estimator=RandomForestRegressor(random_state=random_state),
            search_type="random",
            param_grid={
                "model__n_estimators": [100, 200, 300, 500],
                "model__max_depth": [3, 5, 8, None],
                "model__min_samples_leaf": [5, 20, 50],
                "model__min_samples_split": [10, 50, 100],
                "model__max_features": ["sqrt", 0.6, 1.0],
            },
            default_n_iter=search_iterations,
        ),
        ModelSpec(
            name="adaboost",
            display_name="AdaBoost Regressor",
            estimator=AdaBoostRegressor(random_state=random_state),
            search_type="random",
            param_grid={
                "model__n_estimators": [50, 100, 200, 300],
                "model__learning_rate": [0.03, 0.05, 0.1, 0.2, 0.5],
                "model__loss": ["linear", "square", "exponential"],
            },
            default_n_iter=search_iterations,
        ),
    ]


def load_training_data(data_path: Path) -> tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    if not data_path.exists():
        raise FileNotFoundError(f"CSV not found: {data_path}")

    df = pd.read_csv(data_path)
    missing_columns = [column for column in FEATURE_COLUMNS + [TARGET_COLUMN] if column not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    X = df[FEATURE_COLUMNS].copy()
    y = pd.to_numeric(df[TARGET_COLUMN], errors="coerce")
    valid_target = y.notna()
    X = X.loc[valid_target]
    y = y.loc[valid_target]

    if X.empty:
        raise ValueError("No valid rows available after target validation.")

    training_frame = X.copy()
    training_frame[TARGET_COLUMN] = y
    return X, y, training_frame


def split_train_validation_test(
    X: pd.DataFrame,
    y: pd.Series,
    validation_size: float,
    test_size: float,
    random_state: int,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, pd.Series]:
    if validation_size <= 0 or test_size <= 0:
        raise ValueError("validation_size and test_size must be greater than 0.")
    if validation_size + test_size >= 1:
        raise ValueError("validation_size + test_size must be less than 1.")

    X_train_validation, X_test, y_train_validation, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
    )
    validation_fraction = validation_size / (1 - test_size)
    X_train, X_validation, y_train, y_validation = train_test_split(
        X_train_validation,
        y_train_validation,
        test_size=validation_fraction,
        random_state=random_state,
    )

    return X_train, X_validation, X_test, y_train, y_validation, y_test


def split_train_validation_test_with_train_validation(
    X: pd.DataFrame,
    y: pd.Series,
    validation_size: float,
    test_size: float,
    random_state: int,
) -> tuple[
    pd.DataFrame,
    pd.DataFrame,
    pd.DataFrame,
    pd.DataFrame,
    pd.Series,
    pd.Series,
    pd.Series,
    pd.Series,
]:
    X_train_validation, X_test, y_train_validation, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
    )
    validation_fraction = validation_size / (1 - test_size)
    X_train, X_validation, y_train, y_validation = train_test_split(
        X_train_validation,
        y_train_validation,
        test_size=validation_fraction,
        random_state=random_state,
    )
    return (
        X_train,
        X_validation,
        X_test,
        X_train_validation,
        y_train,
        y_validation,
        y_test,
        y_train_validation,
    )


def evaluate_split(pipeline: Pipeline, X: pd.DataFrame, y: pd.Series) -> SplitMetrics:
    predictions = pipeline.predict(X)
    return SplitMetrics(
        rows=len(X),
        mae=mean_absolute_error(y, predictions),
        r2=r2_score(y, predictions),
    )


def results_to_frame(results: list[HoldoutResult]) -> pd.DataFrame:
    rows = []
    for result in results:
        for split_name in ("train", "validation", "test"):
            metrics = getattr(result, split_name)
            rows.append(
                {
                    "repeat": result.repeat,
                    "seed": result.seed,
                    "split": split_name,
                    "rows": metrics.rows,
                    "mae": metrics.mae,
                    "r2": metrics.r2,
                }
            )
    return pd.DataFrame(rows)


def summarize_results(results: list[HoldoutResult]) -> pd.DataFrame:
    frame = results_to_frame(results)
    return (
        frame.groupby("split")
        .agg(
            rows_mean=("rows", "mean"),
            mae_mean=("mae", "mean"),
            mae_std=("mae", "std"),
            r2_mean=("r2", "mean"),
            r2_std=("r2", "std"),
        )
        .reset_index()
    )


def build_dataset_profile(training_frame: pd.DataFrame) -> dict[str, Any]:
    return {
        "rows": int(training_frame.shape[0]),
        "columns": list(training_frame.columns),
        "target": TARGET_COLUMN,
        "features": {
            "numeric": NUMERIC_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
        },
        "missing_values": training_frame.isna().sum().astype(int).to_dict(),
        "target_describe": training_frame[TARGET_COLUMN].describe().to_dict(),
        "numeric_describe": training_frame[NUMERIC_FEATURES].describe().to_dict(),
        "location_type_counts": training_frame["location_type"].value_counts(dropna=False).to_dict(),
    }


def json_default(value: Any) -> Any:
    if hasattr(value, "item"):
        return value.item()
    if isinstance(value, Path):
        return str(value)
    return str(value)


def log_dataset_artifacts(training_frame: pd.DataFrame, output_dir: Path) -> None:
    profile = build_dataset_profile(training_frame)
    profile_path = output_dir / "dataset_profile.json"
    profile_path.write_text(json.dumps(profile, indent=2, default=json_default), encoding="utf-8")

    schema_path = output_dir / "feature_schema.json"
    schema_path.write_text(
        json.dumps(
            {
                "target": TARGET_COLUMN,
                "feature_columns": FEATURE_COLUMNS,
                "numeric_features": NUMERIC_FEATURES,
                "categorical_features": CATEGORICAL_FEATURES,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def log_evaluation_artifacts(
    results: list[HoldoutResult],
    summary: pd.DataFrame,
    output_dir: Path,
) -> None:
    results_to_frame(results).to_csv(output_dir / "repeated_holdout_metrics.csv", index=False)
    summary.to_csv(output_dir / "repeated_holdout_summary.csv", index=False)
    (output_dir / "repeated_holdout_summary.json").write_text(
        summary.to_json(orient="records", indent=2),
        encoding="utf-8",
    )


def log_search_artifacts(search: GridSearchCV | RandomizedSearchCV, output_dir: Path) -> None:
    pd.DataFrame(search.cv_results_).to_csv(output_dir / "hyperparameter_search_results.csv", index=False)
    (output_dir / "best_params.json").write_text(
        json.dumps(search.best_params_, indent=2, default=json_default),
        encoding="utf-8",
    )


def log_summary_metrics(summary: pd.DataFrame) -> None:
    for row in summary.to_dict(orient="records"):
        split = row["split"]
        for metric_name in ("rows_mean", "mae_mean", "mae_std", "r2_mean", "r2_std"):
            value = row.get(metric_name)
            if pd.notna(value):
                mlflow.log_metric(f"{split}_{metric_name}", float(value))


def try_register_model(model_uri: str, registered_model_name: str | None) -> None:
    if not registered_model_name:
        return

    try:
        registered = mlflow.register_model(model_uri, registered_model_name)
    except Exception as exc:
        mlflow.set_tag("model_registry_status", f"registration_failed: {exc}")
        print(f"Model registry skipped: {exc}")
        return

    mlflow.set_tag("model_registry_status", "registered")
    mlflow.set_tag("registered_model_name", registered.name)
    mlflow.set_tag("registered_model_version", registered.version)


def ensure_experiment(experiment_name: str, artifact_location: str) -> None:
    client = MlflowClient()
    experiment = client.get_experiment_by_name(experiment_name)
    if experiment is None:
        client.create_experiment(experiment_name, artifact_location=artifact_location)
    mlflow.set_experiment(experiment_name)


def param_space_size(param_grid: dict[str, list[Any]]) -> int:
    total = 1
    for values in param_grid.values():
        total *= len(values)
    return total


def make_search(
    spec: ModelSpec,
    random_state: int,
    cv_folds: int,
    search_iterations: int,
    n_jobs: int,
) -> GridSearchCV | RandomizedSearchCV:
    pipeline = build_pipeline(estimator_for_seed(spec, random_state))
    cv = KFold(n_splits=cv_folds, shuffle=True, random_state=random_state)

    if spec.search_type == "grid":
        return GridSearchCV(
            estimator=pipeline,
            param_grid=spec.param_grid,
            scoring=SCORING,
            refit="mae",
            cv=cv,
            n_jobs=n_jobs,
            return_train_score=True,
        )

    n_iter = spec.default_n_iter if spec.default_n_iter is not None else search_iterations
    n_iter = max(1, min(n_iter, param_space_size(spec.param_grid)))
    return RandomizedSearchCV(
        estimator=pipeline,
        param_distributions=spec.param_grid,
        n_iter=n_iter,
        scoring=SCORING,
        refit="mae",
        cv=cv,
        n_jobs=n_jobs,
        random_state=random_state,
        return_train_score=True,
    )


def run_cross_validation(
    pipeline: Pipeline,
    X: pd.DataFrame,
    y: pd.Series,
    cv_folds: int,
    random_state: int,
    n_jobs: int,
) -> dict[str, float]:
    cv = KFold(n_splits=cv_folds, shuffle=True, random_state=random_state)
    scores = cross_validate(
        pipeline,
        X,
        y,
        scoring=SCORING,
        cv=cv,
        n_jobs=n_jobs,
        return_train_score=False,
    )
    return {
        "cross_validation_mae_mean": float(-scores["test_mae"].mean()),
        "cross_validation_mae_std": float(scores["test_mae"].std()),
        "cross_validation_r2_mean": float(scores["test_r2"].mean()),
        "cross_validation_r2_std": float(scores["test_r2"].std()),
    }


def run_leave_one_out_if_applicable(
    pipeline: Pipeline,
    X: pd.DataFrame,
    y: pd.Series,
    loo_max_rows: int,
    n_jobs: int,
) -> dict[str, float | str | bool | int]:
    if loo_max_rows <= 0:
        return {
            "leave_one_out_applicable": False,
            "leave_one_out_rows": len(X),
            "leave_one_out_reason": "disabled by loo_max_rows",
        }
    if len(X) > loo_max_rows:
        return {
            "leave_one_out_applicable": False,
            "leave_one_out_rows": len(X),
            "leave_one_out_reason": f"skipped because {len(X)} rows exceeds loo_max_rows={loo_max_rows}",
        }

    scores = cross_validate(
        pipeline,
        X,
        y,
        scoring=SCORING,
        cv=LeaveOneOut(),
        n_jobs=n_jobs,
        return_train_score=False,
    )
    return {
        "leave_one_out_applicable": True,
        "leave_one_out_rows": len(X),
        "leave_one_out_mae_mean": float(-scores["test_mae"].mean()),
        "leave_one_out_mae_std": float(scores["test_mae"].std()),
        "leave_one_out_r2_mean": float(scores["test_r2"].mean()),
        "leave_one_out_r2_std": float(scores["test_r2"].std()),
    }


def run_repeated_holdout(
    spec: ModelSpec,
    best_params: dict[str, Any],
    X: pd.DataFrame,
    y: pd.Series,
    validation_size: float,
    test_size: float,
    repeats: int,
    random_state: int,
) -> tuple[list[HoldoutResult], Pipeline, HoldoutResult, pd.DataFrame, pd.Series]:
    results: list[HoldoutResult] = []
    best_pipeline: Pipeline | None = None
    best_result: HoldoutResult | None = None
    best_train_validation_X: pd.DataFrame | None = None
    best_train_validation_y: pd.Series | None = None

    for repeat in range(1, repeats + 1):
        seed = random_state + repeat - 1
        (
            X_train,
            X_validation,
            X_test,
            X_train_validation,
            y_train,
            y_validation,
            y_test,
            y_train_validation,
        ) = split_train_validation_test_with_train_validation(
            X,
            y,
            validation_size=validation_size,
            test_size=test_size,
            random_state=seed,
        )

        pipeline = build_tuned_pipeline(spec, best_params, random_state=seed)
        pipeline.fit(X_train, y_train)

        result = HoldoutResult(
            repeat=repeat,
            seed=seed,
            train=evaluate_split(pipeline, X_train, y_train),
            validation=evaluate_split(pipeline, X_validation, y_validation),
            test=evaluate_split(pipeline, X_test, y_test),
        )
        results.append(result)

        if best_result is None or result.validation.mae < best_result.validation.mae:
            best_result = result
            best_pipeline = pipeline
            best_train_validation_X = X_train_validation
            best_train_validation_y = y_train_validation

        print(
            f"{spec.name} repeat {repeat:02d} seed={seed} | "
            f"train MAE={result.train.mae:.4f} R2={result.train.r2:.4f} | "
            f"validation MAE={result.validation.mae:.4f} R2={result.validation.r2:.4f} | "
            f"test MAE={result.test.mae:.4f} R2={result.test.r2:.4f}"
        )

    if (
        best_pipeline is None
        or best_result is None
        or best_train_validation_X is None
        or best_train_validation_y is None
    ):
        raise RuntimeError(f"Training failed before producing a model for {spec.name}.")

    final_pipeline = build_tuned_pipeline(spec, best_params, random_state=best_result.seed)
    final_pipeline.fit(best_train_validation_X, best_train_validation_y)
    return results, final_pipeline, best_result, best_train_validation_X, best_train_validation_y


def log_common_run_context(
    data_path: Path,
    validation_size: float,
    test_size: float,
    repeats: int,
    random_state: int,
    cv_folds: int,
    search_iterations: int,
    loo_max_rows: int,
    n_jobs: int,
) -> None:
    mlflow.set_tag("project", "Stressia")
    mlflow.set_tag("model_use_case", "student_stress_level_prediction")
    mlflow.log_param("target_column", TARGET_COLUMN)
    mlflow.log_param("feature_columns", ",".join(FEATURE_COLUMNS))
    mlflow.log_param("numeric_features", ",".join(NUMERIC_FEATURES))
    mlflow.log_param("categorical_features", ",".join(CATEGORICAL_FEATURES))
    mlflow.log_param("validation_size", validation_size)
    mlflow.log_param("test_size", test_size)
    mlflow.log_param("repeated_holdout_repeats", repeats)
    mlflow.log_param("base_random_state", random_state)
    mlflow.log_param("cross_validation_folds", cv_folds)
    mlflow.log_param("search_iterations", search_iterations)
    mlflow.log_param("loo_max_rows", loo_max_rows)
    mlflow.log_param("sklearn_n_jobs", n_jobs)
    mlflow.log_param("data_path", str(data_path))


def log_leave_one_out_result(result: dict[str, float | str | bool | int]) -> None:
    for key, value in result.items():
        if isinstance(value, bool):
            mlflow.log_param(key, value)
        elif isinstance(value, (int, float)):
            mlflow.log_metric(key, float(value))
        else:
            mlflow.set_tag(key, str(value))


def run_model_experiment(
    spec: ModelSpec,
    X: pd.DataFrame,
    y: pd.Series,
    training_frame: pd.DataFrame,
    data_path: Path,
    repeats: int,
    validation_size: float,
    test_size: float,
    random_state: int,
    registered_model_name: str | None,
    run_name: str,
    cv_folds: int,
    search_iterations: int,
    loo_max_rows: int,
    n_jobs: int,
) -> ModelRunResult:
    (
        X_train,
        _X_validation,
        _X_test,
        X_train_validation,
        y_train,
        _y_validation,
        _y_test,
        y_train_validation,
    ) = split_train_validation_test_with_train_validation(
        X,
        y,
        validation_size=validation_size,
        test_size=test_size,
        random_state=random_state,
    )

    with mlflow.start_run(run_name=f"{run_name}-{spec.name}") as run:
        mlflow.set_tag("model_name", spec.name)
        mlflow.set_tag("model_display_name", spec.display_name)
        log_common_run_context(
            data_path=data_path,
            validation_size=validation_size,
            test_size=test_size,
            repeats=repeats,
            random_state=random_state,
            cv_folds=cv_folds,
            search_iterations=search_iterations,
            loo_max_rows=loo_max_rows,
            n_jobs=n_jobs,
        )
        mlflow.log_param("model_family", spec.display_name)
        mlflow.log_param("hyperparameter_search_type", spec.search_type)
        mlflow.log_param("hyperparameter_search_space_size", param_space_size(spec.param_grid))

        search = make_search(
            spec=spec,
            random_state=random_state,
            cv_folds=cv_folds,
            search_iterations=search_iterations,
            n_jobs=n_jobs,
        )
        search.fit(X_train, y_train)
        best_params = dict(search.best_params_)
        best_index = int(search.best_index_)
        search_cv_mae = float(-search.best_score_)
        search_cv_r2 = float(search.cv_results_["mean_test_r2"][best_index])

        mlflow.log_params({f"best_{key}": value for key, value in best_params.items()})
        mlflow.log_metric("search_best_cv_mae", search_cv_mae)
        mlflow.log_metric("search_best_cv_r2", search_cv_r2)

        cv_pipeline = build_tuned_pipeline(spec, best_params, random_state=random_state)
        cv_metrics = run_cross_validation(
            pipeline=cv_pipeline,
            X=X_train_validation,
            y=y_train_validation,
            cv_folds=cv_folds,
            random_state=random_state,
            n_jobs=n_jobs,
        )
        mlflow.log_metrics(cv_metrics)

        loo_pipeline = build_tuned_pipeline(spec, best_params, random_state=random_state)
        loo_result = run_leave_one_out_if_applicable(
            pipeline=loo_pipeline,
            X=X_train_validation,
            y=y_train_validation,
            loo_max_rows=loo_max_rows,
            n_jobs=n_jobs,
        )
        log_leave_one_out_result(loo_result)

        results, final_pipeline, best_result, _best_X, _best_y = run_repeated_holdout(
            spec=spec,
            best_params=best_params,
            X=X,
            y=y,
            validation_size=validation_size,
            test_size=test_size,
            repeats=repeats,
            random_state=random_state,
        )

        summary = summarize_results(results)
        log_summary_metrics(summary)
        mlflow.log_metric("best_validation_mae", best_result.validation.mae)
        mlflow.log_metric("best_validation_r2", best_result.validation.r2)
        mlflow.log_metric("best_test_mae", best_result.test.mae)
        mlflow.log_metric("best_test_r2", best_result.test.r2)
        mlflow.log_param("best_repeat", best_result.repeat)
        mlflow.log_param("best_seed", best_result.seed)

        input_example = X.head(5)
        signature = infer_signature(input_example, final_pipeline.predict(input_example))
        mlflow.sklearn.log_model(
            sk_model=final_pipeline,
            artifact_path="model",
            signature=signature,
            input_example=input_example,
        )

        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            log_dataset_artifacts(training_frame, artifact_dir)
            log_evaluation_artifacts(results, summary, artifact_dir)
            log_search_artifacts(search, artifact_dir)
            mlflow.log_artifacts(str(artifact_dir), artifact_path="analysis")

        model_uri = f"runs:/{run.info.run_id}/model"
        try_register_model(model_uri, registered_model_name)

        print(f"\n{spec.display_name} repeated hold-out summary:")
        print(summary.to_string(index=False, float_format=lambda value: f"{value:.4f}"))
        print(
            f"Best {spec.name} selected by validation MAE: "
            f"repeat={best_result.repeat} seed={best_result.seed} "
            f"validation MAE={best_result.validation.mae:.4f} "
            f"test MAE={best_result.test.mae:.4f}"
        )
        print(f"MLflow run_id: {run.info.run_id}")
        print(f"MLflow model URI: {model_uri}\n")

        return ModelRunResult(
            model_name=spec.name,
            display_name=spec.display_name,
            run_id=run.info.run_id,
            model_uri=model_uri,
            search_type=spec.search_type,
            best_params=best_params,
            best_repeat=best_result.repeat,
            best_seed=best_result.seed,
            search_cv_mae=search_cv_mae,
            search_cv_r2=search_cv_r2,
            cross_validation_mae=cv_metrics["cross_validation_mae_mean"],
            cross_validation_r2=cv_metrics["cross_validation_r2_mean"],
            validation_mae=best_result.validation.mae,
            validation_r2=best_result.validation.r2,
            test_mae=best_result.test.mae,
            test_r2=best_result.test.r2,
        )


def results_to_comparison_frame(results: list[ModelRunResult]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "model_name": result.model_name,
                "display_name": result.display_name,
                "run_id": result.run_id,
                "model_uri": result.model_uri,
                "search_type": result.search_type,
                "best_repeat": result.best_repeat,
                "best_seed": result.best_seed,
                "search_cv_mae": result.search_cv_mae,
                "search_cv_r2": result.search_cv_r2,
                "cross_validation_mae": result.cross_validation_mae,
                "cross_validation_r2": result.cross_validation_r2,
                "validation_mae": result.validation_mae,
                "validation_r2": result.validation_r2,
                "test_mae": result.test_mae,
                "test_r2": result.test_r2,
                "best_params": json.dumps(result.best_params, default=json_default),
            }
            for result in results
        ]
    )


def log_comparison_run(
    results: list[ModelRunResult],
    best_result: ModelRunResult,
    training_frame: pd.DataFrame,
    data_path: Path,
    repeats: int,
    validation_size: float,
    test_size: float,
    random_state: int,
    run_name: str,
    cv_folds: int,
    search_iterations: int,
    loo_max_rows: int,
    n_jobs: int,
) -> None:
    with mlflow.start_run(run_name=f"{run_name}-comparison") as run:
        mlflow.set_tag("run_role", "model_comparison_summary")
        mlflow.set_tag("best_model_name", best_result.model_name)
        mlflow.set_tag("best_model_uri", best_result.model_uri)
        log_common_run_context(
            data_path=data_path,
            validation_size=validation_size,
            test_size=test_size,
            repeats=repeats,
            random_state=random_state,
            cv_folds=cv_folds,
            search_iterations=search_iterations,
            loo_max_rows=loo_max_rows,
            n_jobs=n_jobs,
        )
        mlflow.log_param("candidate_models", ",".join(result.model_name for result in results))
        mlflow.log_param("best_model_name", best_result.model_name)
        mlflow.log_param("best_model_run_id", best_result.run_id)
        mlflow.log_param("best_model_uri", best_result.model_uri)
        mlflow.log_metric("best_validation_mae", best_result.validation_mae)
        mlflow.log_metric("best_validation_r2", best_result.validation_r2)
        mlflow.log_metric("best_test_mae", best_result.test_mae)
        mlflow.log_metric("best_test_r2", best_result.test_r2)

        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            comparison = results_to_comparison_frame(results).sort_values("validation_mae")
            comparison.to_csv(artifact_dir / "model_comparison.csv", index=False)
            (artifact_dir / "model_comparison.json").write_text(
                comparison.to_json(orient="records", indent=2),
                encoding="utf-8",
            )
            log_dataset_artifacts(training_frame, artifact_dir)
            mlflow.log_artifacts(str(artifact_dir), artifact_path="analysis")

        print(f"MLflow comparison run_id: {run.info.run_id}")


def filter_model_specs(specs: list[ModelSpec], model_filter: str) -> list[ModelSpec]:
    if not model_filter:
        return specs

    wanted = {name.strip().lower() for name in model_filter.split(",") if name.strip()}
    selected = [spec for spec in specs if spec.name in wanted]
    missing = sorted(wanted - {spec.name for spec in selected})
    if missing:
        raise ValueError(f"Unknown model(s) in --model-filter: {', '.join(missing)}")
    if len(selected) < 2:
        raise ValueError("--model-filter must select at least two models to meet the project specification.")
    return selected


def train(
    data_path: Path,
    repeats: int,
    validation_size: float,
    test_size: float,
    random_state: int,
    model_uri_file: Path | None,
    registered_model_name: str | None,
    run_name: str,
    cv_folds: int,
    search_iterations: int,
    loo_max_rows: int,
    n_jobs: int,
    model_filter: str,
) -> str:
    if repeats < 1:
        raise ValueError("repeats must be at least 1.")
    if cv_folds < 2:
        raise ValueError("cv_folds must be at least 2.")
    if search_iterations < 1:
        raise ValueError("search_iterations must be at least 1.")

    X, y, training_frame = load_training_data(data_path)
    specs = filter_model_specs(build_model_specs(random_state, search_iterations), model_filter)

    ensure_experiment(EXPERIMENT_NAME, DEFAULT_ARTIFACT_ROOT)
    print(
        "Training Stressia candidates: "
        + ", ".join(f"{spec.name} ({spec.search_type})" for spec in specs)
    )

    results = [
        run_model_experiment(
            spec=spec,
            X=X,
            y=y,
            training_frame=training_frame,
            data_path=data_path,
            repeats=repeats,
            validation_size=validation_size,
            test_size=test_size,
            random_state=random_state,
            registered_model_name=registered_model_name,
            run_name=run_name,
            cv_folds=cv_folds,
            search_iterations=search_iterations,
            loo_max_rows=loo_max_rows,
            n_jobs=n_jobs,
        )
        for spec in specs
    ]

    best_result = min(results, key=lambda result: result.validation_mae)
    log_comparison_run(
        results=results,
        best_result=best_result,
        training_frame=training_frame,
        data_path=data_path,
        repeats=repeats,
        validation_size=validation_size,
        test_size=test_size,
        random_state=random_state,
        run_name=run_name,
        cv_folds=cv_folds,
        search_iterations=search_iterations,
        loo_max_rows=loo_max_rows,
        n_jobs=n_jobs,
    )

    if model_uri_file is not None:
        model_uri_file.parent.mkdir(parents=True, exist_ok=True)
        model_uri_file.write_text(best_result.model_uri, encoding="utf-8")

    print("\nModel comparison:")
    comparison = results_to_comparison_frame(results).sort_values("validation_mae")
    print(
        comparison[
            [
                "model_name",
                "search_type",
                "cross_validation_mae",
                "validation_mae",
                "test_mae",
                "model_uri",
            ]
        ].to_string(index=False, float_format=lambda value: f"{value:.4f}")
    )
    print(
        "\nBest model selected by validation MAE: "
        f"{best_result.model_name} validation MAE={best_result.validation_mae:.4f} "
        f"test MAE={best_result.test_mae:.4f}"
    )
    print(f"Best MLflow model URI: {best_result.model_uri}")
    if model_uri_file is not None:
        print(f"Saved best model URI to: {model_uri_file}")

    return best_result.model_uri


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train, compare and log Stressia ML models in MLflow.")
    parser.add_argument(
        "--data",
        default=os.getenv("DATA_PATH", "../digital_diet_mental_health.csv"),
        help="Path to digital_diet_mental_health.csv.",
    )
    parser.add_argument(
        "--tracking-uri",
        default=os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlruns/mlflow.db"),
        help="MLflow tracking URI. Use sqlite:////mlflow/mlflow.db in Docker or http://localhost:5000 for a server.",
    )
    parser.add_argument(
        "--model-uri-file",
        default=os.getenv("MODEL_URI_FILE", "model_uri.txt"),
        help="File where the best logged MLflow model URI will be written.",
    )
    parser.add_argument(
        "--registered-model-name",
        default=os.getenv("REGISTERED_MODEL_NAME", ""),
        help="Optional MLflow registered model name. Leave empty when using a file-only backend.",
    )
    parser.add_argument(
        "--run-name",
        default=os.getenv("MLFLOW_RUN_NAME", "model-comparison"),
        help="Base MLflow run name. A run is created for each candidate model.",
    )
    parser.add_argument(
        "--repeats",
        type=int,
        default=int(os.getenv("TRAIN_REPEATS", "10")),
        help="Number of repeated hold-out runs per tuned model.",
    )
    parser.add_argument(
        "--validation-size",
        type=float,
        default=float(os.getenv("VALIDATION_SIZE", "0.2")),
        help="Validation set proportion of the full dataset.",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=float(os.getenv("TEST_SIZE", "0.2")),
        help="Test set proportion of the full dataset.",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=int(os.getenv("RANDOM_STATE", "42")),
        help="Base random seed used for splits, CV and searches.",
    )
    parser.add_argument(
        "--cv-folds",
        type=int,
        default=int(os.getenv("CV_FOLDS", "5")),
        help="Number of folds used by cross-validation and hyperparameter search.",
    )
    parser.add_argument(
        "--search-iterations",
        type=int,
        default=int(os.getenv("SEARCH_ITERATIONS", "8")),
        help="Maximum iterations for randomized searches.",
    )
    parser.add_argument(
        "--loo-max-rows",
        type=int,
        default=int(os.getenv("LOO_MAX_ROWS", "200")),
        help="Run Leave-One-Out only when the train/validation split has at most this many rows. Use 0 to disable.",
    )
    parser.add_argument(
        "--n-jobs",
        type=int,
        default=int(os.getenv("SKLEARN_N_JOBS", "1")),
        help="Parallel jobs used by scikit-learn searches and cross-validation.",
    )
    parser.add_argument(
        "--model-filter",
        default=os.getenv("MODEL_FILTER", ""),
        help="Optional comma-separated model names. Available: knn,decision_tree,random_forest,adaboost.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    mlflow.set_tracking_uri(args.tracking_uri)
    train(
        data_path=Path(args.data).resolve(),
        repeats=args.repeats,
        validation_size=args.validation_size,
        test_size=args.test_size,
        random_state=args.random_state,
        model_uri_file=Path(args.model_uri_file).resolve() if args.model_uri_file else None,
        registered_model_name=args.registered_model_name or None,
        run_name=args.run_name,
        cv_folds=args.cv_folds,
        search_iterations=args.search_iterations,
        loo_max_rows=args.loo_max_rows,
        n_jobs=args.n_jobs,
        model_filter=args.model_filter,
    )
