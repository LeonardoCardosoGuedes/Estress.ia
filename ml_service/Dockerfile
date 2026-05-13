FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt /app/ml_service/requirements.txt
RUN pip install --no-cache-dir -r /app/ml_service/requirements.txt

COPY . /app/ml_service

EXPOSE 8001

CMD ["uvicorn", "ml_service.app.main:app", "--host", "0.0.0.0", "--port", "8001"]
