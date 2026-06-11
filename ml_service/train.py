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
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


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
RANDOM_FOREST_PARAMS = {
    "n_estimators": 500,
    "max_depth": 3,
    "min_samples_leaf": 50,
    "min_samples_split": 100,
    "max_features": "sqrt",
}


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


def build_pipeline(random_state: int = 42) -> Pipeline:
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
    model = RandomForestRegressor(**RANDOM_FOREST_PARAMS, random_state=random_state)
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model),
        ]
    )


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


def log_dataset_artifacts(training_frame: pd.DataFrame, output_dir: Path) -> None:
    profile = build_dataset_profile(training_frame)
    profile_path = output_dir / "dataset_profile.json"
    profile_path.write_text(json.dumps(profile, indent=2, default=float), encoding="utf-8")

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


def train(
    data_path: Path,
    repeats: int,
    validation_size: float,
    test_size: float,
    random_state: int,
    model_uri_file: Path | None,
    registered_model_name: str | None,
    run_name: str,
) -> str:
    if repeats < 1:
        raise ValueError("repeats must be at least 1.")

    X, y, training_frame = load_training_data(data_path)
    results: list[HoldoutResult] = []
    best_pipeline: Pipeline | None = None
    best_result: HoldoutResult | None = None

    ensure_experiment(EXPERIMENT_NAME, DEFAULT_ARTIFACT_ROOT)
    with mlflow.start_run(run_name=run_name) as run:
        mlflow.set_tag("project", "Stressia")
        mlflow.set_tag("model_use_case", "student_stress_level_prediction")
        mlflow.log_param("target_column", TARGET_COLUMN)
        mlflow.log_param("feature_columns", ",".join(FEATURE_COLUMNS))
        mlflow.log_param("numeric_features", ",".join(NUMERIC_FEATURES))
        mlflow.log_param("categorical_features", ",".join(CATEGORICAL_FEATURES))
        mlflow.log_param("validation_size", validation_size)
        mlflow.log_param("test_size", test_size)
        mlflow.log_param("repeats", repeats)
        mlflow.log_param("base_random_state", random_state)
        mlflow.log_param("data_path", str(data_path))
        mlflow.log_params({f"random_forest_{key}": value for key, value in RANDOM_FOREST_PARAMS.items()})

        for repeat in range(1, repeats + 1):
            seed = random_state + repeat - 1
            X_train, X_validation, X_test, y_train, y_validation, y_test = split_train_validation_test(
                X,
                y,
                validation_size=validation_size,
                test_size=test_size,
                random_state=seed,
            )

            pipeline = build_pipeline(random_state=seed)
            pipeline.fit(X_train, y_train)

            result = HoldoutResult(
                repeat=repeat,
                seed=seed,
                train=evaluate_split(pipeline, X_train, y_train),
                validation=evaluate_split(pipeline, X_validation, y_validation),
                test=evaluate_split(pipeline, X_test, y_test),
            )
            results.append(result)

            for split_name in ("train", "validation", "test"):
                metrics = getattr(result, split_name)
                mlflow.log_metric(f"{split_name}_mae", metrics.mae, step=repeat)
                mlflow.log_metric(f"{split_name}_r2", metrics.r2, step=repeat)
                mlflow.log_metric(f"{split_name}_rows", metrics.rows, step=repeat)

            if best_result is None or result.validation.mae < best_result.validation.mae:
                best_result = result
                best_pipeline = pipeline

            print(
                f"Repeat {repeat:02d} seed={seed} | "
                f"train MAE={result.train.mae:.4f} R2={result.train.r2:.4f} | "
                f"validation MAE={result.validation.mae:.4f} R2={result.validation.r2:.4f} | "
                f"test MAE={result.test.mae:.4f} R2={result.test.r2:.4f}"
            )

        if best_pipeline is None or best_result is None:
            raise RuntimeError("Training failed before producing a model.")

        summary = summarize_results(results)
        log_summary_metrics(summary)
        mlflow.log_metric("best_validation_mae", best_result.validation.mae)
        mlflow.log_metric("best_validation_r2", best_result.validation.r2)
        mlflow.log_metric("best_test_mae", best_result.test.mae)
        mlflow.log_metric("best_test_r2", best_result.test.r2)
        mlflow.log_param("best_repeat", best_result.repeat)
        mlflow.log_param("best_seed", best_result.seed)

        input_example = X.head(5)
        signature = infer_signature(input_example, best_pipeline.predict(input_example))
        mlflow.sklearn.log_model(
            sk_model=best_pipeline,
            artifact_path="model",
            signature=signature,
            input_example=input_example,
        )

        with tempfile.TemporaryDirectory() as tmp:
            artifact_dir = Path(tmp)
            log_dataset_artifacts(training_frame, artifact_dir)
            log_evaluation_artifacts(results, summary, artifact_dir)
            mlflow.log_artifacts(str(artifact_dir), artifact_path="analysis")

        model_uri = f"runs:/{run.info.run_id}/model"
        try_register_model(model_uri, registered_model_name)

        if model_uri_file is not None:
            model_uri_file.parent.mkdir(parents=True, exist_ok=True)
            model_uri_file.write_text(model_uri, encoding="utf-8")

        print("\nRepeated hold-out summary:")
        print(summary.to_string(index=False, float_format=lambda value: f"{value:.4f}"))
        print(
            "\nBest model selected by validation MAE: "
            f"repeat={best_result.repeat} seed={best_result.seed} "
            f"validation MAE={best_result.validation.mae:.4f} "
            f"test MAE={best_result.test.mae:.4f}"
        )
        print(f"MLflow run_id: {run.info.run_id}")
        print(f"MLflow model URI: {model_uri}")
        if model_uri_file is not None:
            print(f"Saved model URI to: {model_uri_file}")
        return model_uri


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train and log the Stressia stress prediction model in MLflow.")
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
        help="File where the latest logged MLflow model URI will be written.",
    )
    parser.add_argument(
        "--registered-model-name",
        default=os.getenv("REGISTERED_MODEL_NAME", ""),
        help="Optional MLflow registered model name. Leave empty when using a file-only backend.",
    )
    parser.add_argument(
        "--run-name",
        default=os.getenv("MLFLOW_RUN_NAME", "random-forest-repeated-holdout"),
        help="MLflow run name.",
    )
    parser.add_argument(
        "--repeats",
        type=int,
        default=10,
        help="Number of repeated hold-out runs.",
    )
    parser.add_argument(
        "--validation-size",
        type=float,
        default=0.2,
        help="Validation set proportion of the full dataset.",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Test set proportion of the full dataset.",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Base random seed used for repeated hold-out splits.",
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
    )
