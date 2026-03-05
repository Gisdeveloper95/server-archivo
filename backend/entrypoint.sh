#!/bin/bash
set -e

# Create logs directory with correct permissions
mkdir -p /app/logs
chmod 775 /app/logs

# Run migrations
python manage.py migrate

# Start Django development server
python manage.py runserver 0.0.0.0:8000
