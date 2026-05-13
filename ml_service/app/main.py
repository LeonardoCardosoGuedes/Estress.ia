from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


load_dotenv()

logger = logging.getLogger("stressia-ml")
logging.basicConfig(level=logging.INFO)

FEATURE_COLUMNS = [
    "daily_screen_time_hours",
    "social_media_hours",
    "gaming_hours",
    "sleep_duration_hours",
    "sleep_quality",
    "caffeine_intake_mg_per_day",
    "location_type",
]

DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[1] / "model_pipeline.joblib"
MODEL_PATH = Path(os.getenv("MODEL_PATH", DEFAULT_MODEL_PATH)).resolve()
MODEL_VERSION = os.getenv("MODEL_VERSION", datetime.now(timezone.utc).isoformat())

app = FastAPI(title="Stressia ML Service", version="1.0.0")
model_pipeline = None


class PredictRequest(BaseModel):
    daily_screen_time_hours: float = Field(..., ge=0, le=24)
    social_media_hours: float = Field(..., ge=0, le=24)
    gaming_hours: float = Field(..., ge=0, le=24)
    sleep_duration_hours: float = Field(..., ge=0, le=24)
    sleep_quality: int = Field(..., ge=1, le=10)
    caffeine_intake_mg_per_day: float = Field(..., ge=0)
    location_type: str = Field(..., min_length=1)


class PredictResponse(BaseModel):
    predicted_stress_level: float
    model_version: str
    timestamp: str


@app.on_event("startup")
def load_model() -> None:
    global model_pipeline
    if not MODEL_PATH.exists():
        logger.warning("Model pipeline not found at %s", MODEL_PATH)
        return

    model_pipeline = joblib.load(MODEL_PATH)
    logger.info("Loaded model pipeline from %s", MODEL_PATH)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok" if model_pipeline is not None else "model_missing",
        "model_path": str(MODEL_PATH),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest) -> PredictResponse:
    if model_pipeline is None:
        raise HTTPException(
            status_code=503,
            detail="Model pipeline is not loaded. Run train.py to create model_pipeline.joblib.",
        )

    row = payload.model_dump()
    row["location_type"] = row["location_type"].strip().lower()
    frame = pd.DataFrame([row], columns=FEATURE_COLUMNS)

    try:
        predicted = float(model_pipeline.predict(frame)[0])
    except Exception as exc:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=400, detail=f"Invalid prediction input: {exc}") from exc

    timestamp = datetime.now(timezone.utc).isoformat()
    logger.info("Prediction input=%s output=%.4f", row, predicted)

    return PredictResponse(
        predicted_stress_level=predicted,
        model_version=MODEL_VERSION,
        timestamp=timestamp,
    )
