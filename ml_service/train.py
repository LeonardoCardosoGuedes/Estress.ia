from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


TARGET_COLUMN = "stress_level"

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


def load_training_data(data_path: Path) -> tuple[pd.DataFrame, pd.Series]:
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

    return X, y


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


def summarize_results(results: list[HoldoutResult]) -> pd.DataFrame:
    rows = []
    for result in results:
        for split_name in ("train", "validation", "test"):
            metrics = getattr(result, split_name)
            rows.append(
                {
                    "split": split_name,
                    "mae": metrics.mae,
                    "r2": metrics.r2,
                }
            )
    return pd.DataFrame(rows).groupby("split").agg(["mean", "std"])


def train(
    data_path: Path,
    output_path: Path,
    repeats: int,
    validation_size: float,
    test_size: float,
    random_state: int,
) -> None:
    if repeats < 1:
        raise ValueError("repeats must be at least 1.")

    X, y = load_training_data(data_path)
    results: list[HoldoutResult] = []
    best_pipeline: Pipeline | None = None
    best_result: HoldoutResult | None = None

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

    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_pipeline, output_path)

    summary = summarize_results(results)
    print("\nRepeated hold-out summary:")
    print(summary.to_string(float_format=lambda value: f"{value:.4f}"))
    print(
        "\nBest model selected by validation MAE: "
        f"repeat={best_result.repeat} seed={best_result.seed} "
        f"validation MAE={best_result.validation.mae:.4f} "
        f"test MAE={best_result.test.mae:.4f}"
    )
    print(f"Saved model pipeline to: {output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the Stressia stress_level prediction model.")
    parser.add_argument(
        "--data",
        default="../digital_diet_mental_health.csv",
        help="Path to digital_diet_mental_health.csv.",
    )
    parser.add_argument(
        "--out",
        default="model_pipeline.joblib",
        help="Output path for the trained joblib pipeline.",
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
    train(
        Path(args.data).resolve(),
        Path(args.out).resolve(),
        repeats=args.repeats,
        validation_size=args.validation_size,
        test_size=args.test_size,
        random_state=args.random_state,
    )
