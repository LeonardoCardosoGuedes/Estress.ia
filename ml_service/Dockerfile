FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt /app/ml_service/requirements.txt
RUN pip install --no-cache-dir -r /app/ml_service/requirements.txt

COPY . /app/ml_service

EXPOSE 5000 8001

ENTRYPOINT ["sh", "/app/ml_service/entrypoint.sh"]
