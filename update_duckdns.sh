#!/bin/bash
# Script para actualizar DuckDNS con la IP pública actual

# Configuración
DOMAIN="gestionarchivo"
TOKEN="3fbbdfef-c2f7-4194-915e-930d6123a5dd"

# Obtener IP pública
PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || curl -s api.ipify.org)

echo "IP pública detectada: $PUBLIC_IP"

# Actualizar DuckDNS
RESPONSE=$(echo url="https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=$PUBLIC_IP" | curl -k -K -)

echo "Respuesta de DuckDNS: $RESPONSE"

if [ "$RESPONSE" == "OK" ]; then
    echo "✓ DuckDNS actualizado exitosamente!"
    echo "  Dominio: $DOMAIN.duckdns.org"
    echo "  IP: $PUBLIC_IP"
else
    echo "✗ Error actualizando DuckDNS"
fi
