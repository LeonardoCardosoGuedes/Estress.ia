# Stressia

Stressia e uma aplicacao web para registrar habitos digitais e indicadores de descanso, prever nivel de estresse e apresentar alertas e recomendacoes em dashboard.

## Checklist AV2

- Analise e modelagem: `ml_service/train.py` treina um pipeline scikit-learn com repeated hold-out, registra metricas e artefatos de analise no MLflow.
- MLflow: o container `mlflow` expoe a UI de tracking em `http://localhost:5000` e o modelo em `http://localhost:8001/invocations`.
- Dashboard: a aplicacao Next.js expoe o dashboard em `http://localhost:3000/dashboard`.
- Docker: `docker-compose.yml` sobe Postgres, pgAdmin e MLflow por padrao; a aplicacao web tambem roda em Docker com o perfil `full`.
- Integracao: `src/app/api/records/route.ts` chama o modelo servido pelo MLflow e salva a predicao no banco via Prisma.

## Arquitetura

- `web`: Next.js, React, TypeScript, Prisma e dashboard. Fica no perfil opcional `full`.
- `postgres`: banco relacional da aplicacao.
- `pgadmin`: administracao opcional do banco.
- `mlflow`: treino automatico na primeira subida, tracking de experimentos e model serving.

O fluxo principal e:

1. O usuario preenche o registro diario em `/registro`.
2. A API Next envia as features para `MLFLOW_MODEL_URL/invocations`.
3. O MLflow retorna `predictions`.
4. A API salva o registro com `stress` previsto.
5. O dashboard usa os registros para graficos, risco, alertas e recomendacoes.

## Fluxo WSL + Windows

Use este fluxo se o Docker esta no terminal WSL e o `npm` esta no terminal do Windows.

No WSL:

```bash
cd /mnt/c/Users/davir/Desktop/Estress.ia
docker compose up --build
```

Isso sobe Postgres, pgAdmin e MLflow. O servico `web` nao sobe por padrao para nao disputar a porta `3000` com o Next rodando no Windows. O MLflow usa SQLite em `/mlflow/mlflow.db` dentro do volume `mlflow_data`, evitando o backend de arquivos antigo.

No terminal do Windows, na pasta do projeto:

```powershell
npm install
npm run db:migrate
npm run dev
```

URLs nesse fluxo:

- App Next: `http://localhost:3000`
- MLflow UI: `http://localhost:5000`
- MLflow model serving: `http://localhost:8001`
- pgAdmin: `http://localhost:5050`
- Postgres: `localhost:5432`

A configuracao local ja esta em `.env`:

```env
DATABASE_URL="postgresql://stressia:stressia123@localhost:5432/stressia?schema=public"
MLFLOW_MODEL_URL=http://localhost:8001
```

## Rodar tudo com Docker

```bash
docker compose --profile full up --build
```

Servicos:

- App: `http://localhost:3000`
- MLflow UI: `http://localhost:5000`
- MLflow model serving: `http://localhost:8001`
- pgAdmin: `http://localhost:5050`
- Postgres: `localhost:5432`

Na primeira subida, o container `mlflow` treina o modelo e grava o URI em `/mlflow/model_uri.txt` dentro do volume `mlflow_data`. Para forcar novo treino no WSL:

```bash
FORCE_RETRAIN=true docker compose up --build mlflow
```

Se voce acabou de ver o erro `filesystem tracking backend ... is in maintenance mode`, pare o Compose com `Ctrl+C` e rode:

```bash
docker compose up --build --force-recreate mlflow
```

Evite `docker compose down -v` se voce quiser preservar os dados do Postgres, porque esse comando remove todos os volumes do Compose.

## Testar o modelo

Com o Docker rodando:

```bash
curl -X POST "http://localhost:8001/invocations" \
  -H "Content-Type: application/json" \
  -d '{
    "dataframe_records": [
      {
        "daily_screen_time_hours": 8.5,
        "social_media_hours": 3.0,
        "gaming_hours": 1.0,
        "sleep_duration_hours": 5.5,
        "sleep_quality": 2,
        "caffeine_intake_mg_per_day": 120,
        "location_type": "urban"
      }
    ]
  }'
```

Resposta esperada:

```json
{"predictions":[6.12]}
```

O valor exato varia conforme o treino.

## Treino local sem Docker

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r ml_service/requirements.txt
python ml_service/train.py --data digital_diet_mental_health.csv --tracking-uri sqlite:///mlruns/mlflow.db --model-uri-file ml_service/model_uri.txt
```

Subir a UI local:

```bash
mlflow ui --backend-store-uri sqlite:///mlruns/mlflow.db --port 5000
```

Servir o modelo local no PowerShell:

```powershell
$modelUri = Get-Content ml_service/model_uri.txt
mlflow models serve --model-uri $modelUri --host 0.0.0.0 --port 8001 --env-manager local
```

## Variaveis importantes

- `DATABASE_URL`: conexao do Prisma com Postgres.
- `JWT_SECRET`: chave usada para assinar sessao.
- `MLFLOW_MODEL_URL`: URL do MLflow Model Serving. No Docker, use `http://mlflow:8001`; localmente, use `http://localhost:8001`.
