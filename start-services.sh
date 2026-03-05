#!/bin/bash
# ============================================================
# INICIO DE SERVICIOS - server_archivo
# Ejecutar después de reiniciar WSL si los servicios no están corriendo
# Uso: bash /home/andres/server_archivo/start-services.sh
# ============================================================

cd /home/andres/server_archivo

echo "=== Iniciando servicios server_archivo ==="

# Levantar todos los containers (los que ya corrían se mantienen)
docker compose up -d

# Esperar que el backend y frontend estén listos
echo "Esperando backend y frontend..."
sleep 5

# Asegurarse que nginx arranque (puede fallar por timing al inicio)
NGINX_STATUS=$(docker inspect server_archivo_nginx --format='{{.State.Status}}' 2>/dev/null)
if [ "$NGINX_STATUS" != "running" ]; then
    echo "Nginx no está corriendo ($NGINX_STATUS), reiniciando..."
    docker start server_archivo_nginx
    sleep 2
fi

echo ""
echo "=== Estado de contenedores ==="
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "server_archivo|NAME"

echo ""
echo "=== Verificando respuesta ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>&1)
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Nginx respondiendo (HTTP $HTTP_CODE)"
else
    echo "✗ Nginx no responde (HTTP $HTTP_CODE)"
fi
