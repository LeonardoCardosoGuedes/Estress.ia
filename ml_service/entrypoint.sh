#!/bin/sh
set -eu

TRACKING_URI="${MLFLOW_TRACKING_URI:-sqlite:////mlflow/mlflow.db}"
DEFAULT_ARTIFACT_ROOT="${MLFLOW_DEFAULT_ARTIFACT_ROOT:-file:///mlflow/mlartifacts}"
EXPERIMENT_NAME="${MLFLOW_EXPERIMENT_NAME:-stressia-stress-prediction}"
MODEL_URI_FILE="${MODEL_URI_FILE:-/mlflow/model_uri.txt}"
DATA_PATH="${DATA_PATH:-/data/digital_diet_mental_health.csv}"
HOST="${MLFLOW_HOST:-0.0.0.0}"
TRACKING_PORT="${MLFLOW_TRACKING_PORT:-5000}"
SERVING_PORT="${MLFLOW_SERVING_PORT:-8001}"

export MLFLOW_TRACKING_URI="$TRACKING_URI"
export MLFLOW_EXPERIMENT_NAME="$EXPERIMENT_NAME"
export MLFLOW_DEFAULT_ARTIFACT_ROOT="$DEFAULT_ARTIFACT_ROOT"

mkdir -p /mlflow/mlartifacts "$(dirname "$MODEL_URI_FILE")"

if [ "${FORCE_RETRAIN:-false}" = "true" ] || [ ! -s "$MODEL_URI_FILE" ]; then
  python /app/ml_service/train.py \
    --data "$DATA_PATH" \
    --tracking-uri "$TRACKING_URI" \
    --model-uri-file "$MODEL_URI_FILE"
fi

mlflow server \
  --backend-store-uri "$TRACKING_URI" \
  --default-artifact-root "$DEFAULT_ARTIFACT_ROOT" \
  --host "$HOST" \
  --port "$TRACKING_PORT" &

TRACKING_PID="$!"
trap 'kill "$TRACKING_PID" 2>/dev/null || true' INT TERM EXIT

sleep 2

MODEL_URI="$(cat "$MODEL_URI_FILE")"
echo "Serving MLflow model: $MODEL_URI"

exec mlflow models serve \
  --model-uri "$MODEL_URI" \
  --host "$HOST" \
  --port "$SERVING_PORT" \
  --env-manager local
