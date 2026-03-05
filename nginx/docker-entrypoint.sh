#!/bin/sh
set -e

# Create conf.d directory
mkdir -p /etc/nginx/conf.d

# Select configuration based on NGINX_MODE environment variable
if [ "$NGINX_MODE" = "production" ]; then
    echo "🔒 PRODUCTION MODE - Serving static files"
    cp /etc/nginx/conf.d.available/production.conf /etc/nginx/conf.d/default.conf
else
    echo "🔧 DEVELOPMENT MODE - Proxying to Vite dev server"
    cp /etc/nginx/conf.d.available/development.conf /etc/nginx/conf.d/default.conf
fi

# Copiar configuración de gestiondato si existe
if [ -f "/etc/nginx/conf.d.available/gestiondato.conf" ]; then
    echo "📋 Agregando configuración de gestiondato.duckdns.org"
    cp /etc/nginx/conf.d.available/gestiondato.conf /etc/nginx/conf.d/gestiondato.conf
fi

# Start nginx
exec nginx -g 'daemon off;'
