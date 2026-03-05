# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# System deps (agregar netcat para healthchecks)
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source (mounted in compose, but keep default)
COPY . /app

# Asegurar que el entrypoint tenga permisos de ejecución
RUN chmod +x /app/docker-entrypoint.sh 2>/dev/null || true

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Crear directorio de logs
RUN mkdir -p /app/logs && chmod -R 777 /app/logs

EXPOSE 8000

CMD ["bash", "-lc", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]