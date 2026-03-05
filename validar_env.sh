#!/bin/bash

# ==============================================================================
# Script de Validación de Configuración .env
# ==============================================================================
# Este script verifica que todas las variables críticas estén configuradas
# correctamente antes del despliegue.
#
# Uso: bash validar_env.sh
# ==============================================================================

echo "================================================"
echo "  Validación de Configuración .env"
echo "================================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de errores y advertencias
ERRORS=0
WARNINGS=0

# Verificar que existe el archivo .env
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ ERROR: No se encuentra el archivo .env${NC}"
    echo "   Ejecutar: cp .env.example .env"
    exit 1
fi

echo -e "${GREEN}✅ Archivo .env encontrado${NC}"
echo ""

# Cargar variables del .env
set -a
source .env
set +a

# ==============================================================================
# VALIDACIONES DE SEGURIDAD
# ==============================================================================

echo "📋 Validando configuración de seguridad..."
echo ""

# 1. Django Secret Key
if [ "$DJANGO_SECRET_KEY" = "django-insecure-change-this-in-production" ] || [ "$DJANGO_SECRET_KEY" = "GENERAR_CON_get_random_secret_key" ]; then
    echo -e "${RED}❌ DJANGO_SECRET_KEY no ha sido cambiado${NC}"
    echo "   Generar con: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ DJANGO_SECRET_KEY configurado${NC}"
fi

# 2. JWT Secret Key
if [ "$JWT_SECRET_KEY" = "jwt-secret-change-this-in-production" ] || [ "$JWT_SECRET_KEY" = "GENERAR_ALEATORIO_CON_openssl_rand" ]; then
    echo -e "${RED}❌ JWT_SECRET_KEY no ha sido cambiado${NC}"
    echo "   Generar con: openssl rand -base64 32"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ JWT_SECRET_KEY configurado${NC}"
fi

# 3. PostgreSQL Password
if [ "$POSTGRES_PASSWORD" = "1234" ] || [ "$POSTGRES_PASSWORD" = "CAMBIAR_EN_PRODUCCION" ]; then
    echo -e "${YELLOW}⚠️  POSTGRES_PASSWORD usando valor por defecto${NC}"
    echo "   Cambiar a una contraseña segura en producción"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ POSTGRES_PASSWORD configurado${NC}"
fi

# 4. DEBUG Mode
if [ "$DEBUG" = "True" ]; then
    echo -e "${YELLOW}⚠️  DEBUG está activado (True)${NC}"
    echo "   Desactivar en producción: DEBUG=False"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ DEBUG desactivado (producción)${NC}"
fi

echo ""

# ==============================================================================
# VALIDACIONES DE RED Y DOMINIO
# ==============================================================================

echo "🌐 Validando configuración de red..."
echo ""

# 5. DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ DOMAIN no está configurado${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ DOMAIN: $DOMAIN${NC}"
fi

# 6. ALLOWED_HOSTS
if [ -z "$ALLOWED_HOSTS" ]; then
    echo -e "${RED}❌ ALLOWED_HOSTS no está configurado${NC}"
    ERRORS=$((ERRORS + 1))
elif [[ "$ALLOWED_HOSTS" != *"$DOMAIN"* ]] && [ "$DOMAIN" != "localhost" ]; then
    echo -e "${YELLOW}⚠️  DOMAIN ($DOMAIN) no está en ALLOWED_HOSTS${NC}"
    echo "   Agregar $DOMAIN a ALLOWED_HOSTS"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ ALLOWED_HOSTS: $ALLOWED_HOSTS${NC}"
fi

# 7. CORS_ALLOWED_ORIGINS
if [ -z "$CORS_ALLOWED_ORIGINS" ]; then
    echo -e "${RED}❌ CORS_ALLOWED_ORIGINS no está configurado${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ CORS_ALLOWED_ORIGINS configurado${NC}"
fi

echo ""

# ==============================================================================
# VALIDACIONES DE REPOSITORIO NAS
# ==============================================================================

echo "📁 Validando configuración del repositorio NAS..."
echo ""

# 8. NETAPP_BASE_PATH
if [ -z "$NETAPP_BASE_PATH" ]; then
    echo -e "${RED}❌ NETAPP_BASE_PATH no está configurado${NC}"
    ERRORS=$((ERRORS + 1))
elif [ ! -d "$NETAPP_BASE_PATH" ]; then
    echo -e "${RED}❌ Ruta del NAS no existe: $NETAPP_BASE_PATH${NC}"
    echo "   Verificar que el repositorio esté montado"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ NETAPP_BASE_PATH existe: $NETAPP_BASE_PATH${NC}"
fi

# 9. Verificar montaje CIFS
if mount | grep -q "/mnt/repositorio"; then
    echo -e "${GREEN}✅ Repositorio CIFS montado${NC}"
else
    echo -e "${YELLOW}⚠️  No se detectó montaje CIFS en /mnt/repositorio${NC}"
    echo "   Ejecutar: sudo mount -a"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ==============================================================================
# VALIDACIONES DE SSL
# ==============================================================================

echo "🔒 Validando configuración SSL..."
echo ""

# 10. SSL
if [ "$SSL_ENABLED" = "true" ]; then
    echo -e "${GREEN}✅ SSL habilitado${NC}"

    # Verificar certificados
    if [ ! -f "nginx/ssl/certificate.crt" ]; then
        echo -e "${RED}❌ Certificado SSL no encontrado: nginx/ssl/certificate.crt${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ Certificado SSL encontrado${NC}"
    fi

    if [ ! -f "nginx/ssl/private.key" ]; then
        echo -e "${RED}❌ Clave privada SSL no encontrada: nginx/ssl/private.key${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ Clave privada SSL encontrada${NC}"
    fi

    if [ "$PROTOCOL" != "https" ]; then
        echo -e "${YELLOW}⚠️  SSL habilitado pero PROTOCOL=$PROTOCOL${NC}"
        echo "   Considerar cambiar a PROTOCOL=https"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  SSL deshabilitado${NC}"
    echo "   Considerar habilitar SSL para producción"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ==============================================================================
# VALIDACIONES DE PUERTOS
# ==============================================================================

echo "🔌 Validando configuración de puertos..."
echo ""

# 11. Puertos en uso
check_port() {
    local port=$1
    local service=$2

    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${YELLOW}⚠️  Puerto $port ($service) ya está en uso${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ Puerto $port ($service) disponible${NC}"
    fi
}

check_port "$HTTP_PORT" "HTTP"
check_port "$HTTPS_PORT" "HTTPS"
check_port "$BACKEND_PORT" "Backend"
check_port "$POSTGRES_EXTERNAL_PORT" "PostgreSQL"
check_port "$REDIS_PORT" "Redis"

echo ""

# ==============================================================================
# VALIDACIONES DE EMAIL
# ==============================================================================

echo "📧 Validando configuración de email..."
echo ""

if [ "$EMAIL_HOST_USER" = "tu_email@gmail.com" ] || [ "$EMAIL_HOST_PASSWORD" = "TU_APP_PASSWORD_AQUI" ]; then
    echo -e "${YELLOW}⚠️  Credenciales de email no configuradas${NC}"
    echo "   Configurar EMAIL_HOST_USER y EMAIL_HOST_PASSWORD si se requiere envío de emails"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ Credenciales de email configuradas${NC}"
fi

echo ""

# ==============================================================================
# RESUMEN
# ==============================================================================

echo "================================================"
echo "  RESUMEN DE VALIDACIÓN"
echo "================================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ¡Configuración válida! Sin errores ni advertencias.${NC}"
    echo ""
    echo "Siguiente paso: docker compose up -d"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Configuración con $WARNINGS advertencia(s)${NC}"
    echo ""
    echo "Las advertencias no impiden el despliegue, pero se recomienda revisarlas."
    echo ""
    echo "Siguiente paso: docker compose up -d"
    exit 0
else
    echo -e "${RED}❌ Se encontraron $ERRORS error(es) y $WARNINGS advertencia(s)${NC}"
    echo ""
    echo "Por favor, corregir los errores antes de desplegar."
    echo ""
    echo "Editar: nano .env"
    exit 1
fi
