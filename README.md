# Estress.ia

Estress.ia e uma aplicacao web para registrar habitos digitais e indicadores de descanso, prever nivel de estresse academico com aprendizado de maquina e apresentar alertas, metricas, graficos e recomendacoes em um dashboard interativo.

Google Sites do projeto: https://sites.google.com/d/1vyuxtBs6DBwLFJJjCeZ0BMbyBJBTdmhB/p/1WpOHxx4JqBKabjMsSzKi_nCKchwLRTSj/edit

## Informacoes Academicas

- Disciplina: Machine Learning e Projeto 6
- Instituicao de ensino: CESAR School
- Solucao desenvolvida: Estress.ia

## Membros

| Membro | Usuario no GitHub |
| --- | --- |
| Davi Gomes | @daviruy61 |
| Antonio Paulo | @apabs |
| Heloisa Tanaka | @helotanaka |
| Larissa Sobrinho | @lariisantos |
| João Pedro | @jotapeans |
| Leonardo Cardoso | @LeonardoCardosoGuedes |
| Clara Machado | @ClaraMachadoAj |

## Descricao da Solucao

O Estress.ia acompanha a rotina de estudantes a partir de dados como horas de sono, qualidade do sono, tempo de tela, redes sociais, jogos, consumo de cafeina e tipo de localidade. Esses dados sao enviados para um modelo servido pelo MLflow, que retorna uma previsao numerica de estresse. A aplicacao salva os registros no banco de dados e exibe historico, metricas, visualizacoes, risco, alertas e recomendacoes personalizadas.

O projeto cobre o fluxo de MLOps com leitura da base `digital_diet_mental_health.csv`, treinamento e comparacao de modelos scikit-learn, validacao, busca de hiperparametros, rastreamento de experimentos com MLflow, salvamento do melhor modelo, model serving e consumo das previsoes pela aplicacao Next.js.

## Arquitetura

- `web`: aplicacao Next.js com React, TypeScript, Prisma e dashboard. No Docker, fica no perfil opcional `full`.
- `postgres`: banco relacional usado pela aplicacao.
- `pgadmin`: interface opcional para administracao do banco.
- `mlflow`: treinamento automatico, tracking de experimentos e model serving.

O fluxo principal e:

1. O usuario preenche o registro diario em `/registro`.
2. A API Next envia as features para `MLFLOW_MODEL_URL/invocations`.
3. O MLflow retorna `predictions`.
4. A API salva o registro com o valor de `stress` previsto.
5. O dashboard usa os registros para graficos, indicadores, alertas e recomendacoes.

## Requisitos

- Node.js e npm para rodar a aplicacao web no Windows.
- Docker com Docker Compose para rodar os servicos pelo WSL.
- Python apenas se desejar treinar o modelo localmente sem Docker.

## Fluxo Recomendado: Docker no WSL + npm no Windows

Use este fluxo se o Docker esta no terminal WSL e o `npm` esta no terminal do Windows.

No WSL:

```bash
cd //Estress.ia
docker compose up --build
```

Esse comando sobe Postgres, pgAdmin e MLflow. O servico `web` nao sobe por padrao para nao disputar a porta `3000` com o Next rodando no Windows.

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

A configuracao local esperada em `.env` é:

```env
DATABASE_URL="postgresql://stressia:stressia123@localhost:5432/stressia?schema=public"
MLFLOW_MODEL_URL=http://localhost:8001
JWT_SECRET="uma-senha-secreta-aqui"
```

## Rodar Tudo com Docker

Para subir tambem a aplicacao web dentro do Docker:

```bash
docker compose --profile full up --build
```

Servicos:

- App: `http://localhost:3000`
- MLflow UI: `http://localhost:5000`
- MLflow model serving: `http://localhost:8001`
- pgAdmin: `http://localhost:5050`
- Postgres: `localhost:5432`

## Treinar ou Retreinar o Modelo no Docker

Na primeira subida, o container `mlflow` treina os modelos, registra os experimentos e grava o URI do melhor modelo em `/mlflow/model_uri.txt` dentro do volume `mlflow_data`.

Para forcar novo treino no WSL:

```bash
FORCE_RETRAIN=true docker compose up --build mlflow
```

Para uma rodada mais leve de teste:

```bash
TRAIN_REPEATS=3 SEARCH_ITERATIONS=4 FORCE_RETRAIN=true docker compose up --build mlflow
```

Variaveis uteis do treino:

- `TRAIN_REPEATS`: numero de repeticoes do repeated holdout.
- `CV_FOLDS`: numero de folds da validacao cruzada.
- `SEARCH_ITERATIONS`: numero maximo de iteracoes das buscas aleatorias.
- `LOO_MAX_ROWS`: limite de linhas para executar Leave-One-Out; use `0` para desativar.
- `SKLEARN_N_JOBS`: paralelismo usado pelo scikit-learn.
- `MODEL_FILTER`: lista opcional de modelos, por exemplo `knn,decision_tree,random_forest,adaboost`.

## Testar o Modelo Servido pelo MLflow

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

O valor exato varia conforme o treino e o melhor modelo selecionado.

## Treino Local sem Docker

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

## Compilar e Executar a Aplicacao Web

Instale as dependencias:

```powershell
npm install
```

Aplique as migracoes do banco:

```powershell
npm run db:migrate
```

Rode em desenvolvimento:

```powershell
npm run dev
```

Gere o build de producao:

```powershell
npm run build
```

Execute o build:

```powershell
npm start
```

## Variaveis Importantes

- `DATABASE_URL`: conexao do Prisma com Postgres.
- `JWT_SECRET`: chave usada para assinar sessao.
- `MLFLOW_MODEL_URL`: URL do MLflow Model Serving. No Docker, use `http://mlflow:8001`; localmente, use `http://localhost:8001`.
