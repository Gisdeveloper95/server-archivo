#!/bin/bash
set -e

echo "🚀 Starting Django Backend Entrypoint..."

# Esperar a que PostgreSQL esté listo
echo "⏳ Waiting for PostgreSQL..."
while ! nc -z ${DB_HOST:-postgres} ${DB_PORT:-5432}; do
  sleep 1
done
echo "✅ PostgreSQL is ready!"

# Esperar a que Redis esté listo
echo "⏳ Waiting for Redis..."
while ! nc -z ${REDIS_HOST:-redis} ${REDIS_PORT:-6379}; do
  sleep 1
done
echo "✅ Redis is ready!"

# Ejecutar migraciones
echo "📦 Running database migrations..."
python manage.py migrate --noinput

# Recolectar archivos estáticos
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput --clear

# Crear superusuario si no existe (opcional)
# python manage.py shell -c "from users.models import User; User.objects.create_superuser('admin', 'admin@example.com', 'admin123') if not User.objects.filter(username='admin').exists() else None"

echo "✅ Initialization complete!"
echo "🚀 Starting application..."

# Ejecutar el comando pasado (por defecto gunicorn)
exec "$@"
