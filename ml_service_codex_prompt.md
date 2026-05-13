Crie um serviço ML em Python dentro da pasta `ml_service/` que treine um modelo para prever `stress_level` a partir do arquivo CSV `digital_diet_mental_health.csv` (local na raiz do projeto). Gere o código, arquivos e Dockerfile a seguir e explique como rodar. Requisitos: usar scikit-learn, pandas, joblib, FastAPI e uvicorn; salvar um pipeline joblib único; e criar endpoint `/predict` que aceita JSON com as colunas abaixo e retorna o `predicted_stress_level`.

Entradas esperadas (JSON):
- `daily_screen_time_hours` (float)
- `social_media_hours` (float)
- `gaming_hours` (float)
- `sleep_duration_hours` (float)
- `sleep_quality` (numeric or int)
- `caffeine_intake_mg_per_day` (float)
- `location_type` (string) — e.g. 'urban', 'suburban', 'rural' (tratar como categórica)

Saída:
- JSON com `predicted_stress_level` (float) e `model_version`/`timestamp`.

Tarefas detalhadas que o código deve fazer:
1. `ml_service/requirements.txt` com dependências: `pandas scikit-learn joblib fastapi uvicorn python-dotenv pydantic`.
2. `ml_service/train.py`:
   - Carregar `digital_diet_mental_health.csv`.
   - Validar que existe a coluna alvo `stress_level`.
   - Limpeza simples: preencher NA numéricos com mediana, categóricos com 'unknown'.
   - Criar pipeline scikit-learn: `ColumnTransformer` com `StandardScaler` para features numéricas e `OneHotEncoder(handle_unknown='ignore')` para `location_type`.
   - Usar `RandomForestRegressor(n_estimators=100, random_state=42)` (ou `GradientBoosting` se preferir), com `train_test_split(test_size=0.2, random_state=42)`.
   - Treinar pipeline completo (preprocessor + model), avaliar com MAE e R2 no conjunto de teste e imprimir métricas.
   - Salvar o pipeline completo em `ml_service/model_pipeline.joblib` usando `joblib.dump`.
   - Expor CLI: `python train.py --data ../digital_diet_mental_health.csv --out model_pipeline.joblib`.
3. `ml_service/app/main.py`:
   - Carregar `model_pipeline.joblib` ao iniciar.
   - Definir Pydantic `PredictRequest` com os campos acima e validação de tipos.
   - Endpoint POST `/predict` que:
     - Recebe JSON, converte para DataFrame (uma linha), aplica pipeline `.predict()` e responde com `{"predicted_stress_level": <float>, "model_version": "<timestamp-or-hash>"}`.
   - Endpoint GET `/health` simples.
   - Log de entrada/saída mínimo.
4. `ml_service/Dockerfile`:
   - Base `python:3.11-slim`.
   - Copiar `requirements.txt`, instalar via pip.
   - Copiar código, expor `8001`, e comando padrão para rodar uvicorn `uvicorn ml_service.app.main:app --host 0.0.0.0 --port 8001`.
5. Adicionar um serviço `ml_service` ao `docker-compose.yml` do repositório (ou instruções de como integrar), com build contexto `./ml_service` e porta `8001`.
6. Fornecer exemplos de uso:
   - Treinar local:
     ```bash
     python ml_service/train.py --data digital_diet_mental_health.csv --out ml_service/model_pipeline.joblib
     ```
   - Rodar API local:
     ```bash
     uvicorn ml_service.app.main:app --reload --host 0.0.0.0 --port 8001
     ```
   - Testar `/predict` com `curl`:
     ```bash
     curl -X POST "http://localhost:8001/predict" -H "Content-Type: application/json" -d '{
       "daily_screen_time_hours": 8.5,
       "social_media_hours": 3.0,
       "gaming_hours": 1.0,
       "sleep_duration_hours": 5.5,
       "sleep_quality": 2,
       "caffeine_intake_mg_per_day": 120,
       "location_type": "urban"
     }'
     ```
7. Observações adicionais que o Codex deve incluir no commit:
   - Salvar o artefato `model_pipeline.joblib` em `ml_service/` após treino (ou explicar que artefato só é criado após rodar `train.py`).
   - Incluir tratamento de erro para entradas inválidas no endpoint.
   - Fixar `random_state=42` para reprodutibilidade.
   - Instruções curtas para integrar o serviço com a `Next.js` frontend (ex.: chamar `POST /predict`).

Peça ao Codex para gerar os arquivos exatos: `ml_service/requirements.txt`, `ml_service/train.py`, `ml_service/app/main.py`, `ml_service/Dockerfile`, e um trecho para adicionar ao `docker-compose.yml`. Solicite que o Codex entregue o conteúdo completo de cada arquivo. Termine o output com os comandos exatos de treinamento e execução."
