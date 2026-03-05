#!/bin/bash

# ==============================================================================
# AUDITORÍA DE SEGURIDAD - SERVER ARCHIVO
# ==============================================================================
# Script de análisis de vulnerabilidades y configuraciones inseguras
# ==============================================================================

echo "======================================================================="
echo "  AUDITORÍA DE SEGURIDAD - SERVER ARCHIVO"
echo "======================================================================="
echo ""
echo "Fecha: $(date)"
echo ""

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

CRITICAL=0
HIGH=0
MEDIUM=0
LOW=0
INFO=0

# ==============================================================================
# 1. ANÁLISIS DE SECRETOS Y CREDENCIALES
# ==============================================================================

echo -e "${BLUE}[1] ANÁLISIS DE SECRETOS Y CREDENCIALES${NC}"
echo "======================================================================="

# 1.1 Django Secret Key
echo -n "1.1 Django Secret Key: "
DJANGO_SECRET=$(grep "^DJANGO_SECRET_KEY=" .env | cut -d'=' -f2)
if [[ "$DJANGO_SECRET" == *"insecure"* ]] || [[ "$DJANGO_SECRET" == *"change-this"* ]]; then
    echo -e "${RED}[CRÍTICO] Secret key por defecto detectado${NC}"
    echo "    → Riesgo: Permite descifrar sesiones, cookies firmadas, y tokens CSRF"
    CRITICAL=$((CRITICAL + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

# 1.2 JWT Secret Key
echo -n "1.2 JWT Secret Key: "
JWT_SECRET=$(grep "^JWT_SECRET_KEY=" .env | cut -d'=' -f2)
if [[ "$JWT_SECRET" == *"secret"* ]] || [[ "$JWT_SECRET" == *"change-this"* ]] || [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}[CRÍTICO] JWT secret key débil o por defecto${NC}"
    echo "    → Riesgo: Permite forjar tokens de autenticación"
    CRITICAL=$((CRITICAL + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

# 1.3 PostgreSQL Password
echo -n "1.3 PostgreSQL Password: "
PG_PASS=$(grep "^POSTGRES_PASSWORD=" .env | cut -d'=' -f2)
if [ "$PG_PASS" == "1234" ] || [ ${#PG_PASS} -lt 8 ]; then
    echo -e "${RED}[ALTO] Contraseña de base de datos débil${NC}"
    echo "    → Riesgo: Acceso no autorizado a la base de datos"
    HIGH=$((HIGH + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

# 1.4 Credenciales en archivos
echo -n "1.4 Credenciales hardcodeadas en código: "
HARDCODED=$(find backend frontend -type f \( -name "*.py" -o -name "*.ts" -o -name "*.js" -o -name "*.tsx" \) -exec grep -l "password.*=.*['\"]" {} \; 2>/dev/null | wc -l)
if [ $HARDCODED -gt 0 ]; then
    echo -e "${YELLOW}[ADVERTENCIA] $HARDCODED archivos con posibles credenciales${NC}"
    MEDIUM=$((MEDIUM + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

# 1.5 API Keys expuestas
echo -n "1.5 API Keys en código: "
API_KEYS=$(grep -r "gsk_" backend frontend --include="*.py" --include="*.js" --include="*.ts" 2>/dev/null | wc -l)
if [ $API_KEYS -gt 0 ]; then
    echo -e "${RED}[ALTO] API keys hardcodeadas detectadas${NC}"
    echo "    → Riesgo: Fuga de credenciales en repositorio"
    HIGH=$((HIGH + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

echo ""

# ==============================================================================
# 2. CONFIGURACIÓN DE DJANGO
# ==============================================================================

echo -e "${BLUE}[2] CONFIGURACIÓN DE DJANGO${NC}"
echo "======================================================================="

# 2.1 DEBUG Mode
echo -n "2.1 DEBUG Mode: "
DEBUG=$(grep "^DEBUG=" .env | cut -d'=' -f2)
if [ "$DEBUG" == "True" ]; then
    echo -e "${RED}[CRÍTICO] DEBUG=True en producción${NC}"
    echo "    → Riesgo: Expone información sensible, stack traces, configuración"
    CRITICAL=$((CRITICAL + 1))
else
    echo -e "${GREEN}[OK] DEBUG=False${NC}"
fi

# 2.2 ALLOWED_HOSTS
echo -n "2.2 ALLOWED_HOSTS configurado: "
ALLOWED_HOSTS=$(grep "^ALLOWED_HOSTS=" .env | cut -d'=' -f2)
if [ -z "$ALLOWED_HOSTS" ] || [[ "$ALLOWED_HOSTS" == "*" ]]; then
    echo -e "${RED}[ALTO] ALLOWED_HOSTS no configurado o permite cualquier host${NC}"
    echo "    → Riesgo: Ataques de Host Header Injection"
    HIGH=$((HIGH + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

# 2.3 Verificar settings.py para configuraciones inseguras
echo -n "2.3 SECURE_SSL_REDIRECT: "
if grep -q "SECURE_SSL_REDIRECT.*=.*True" backend/*/settings.py 2>/dev/null; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] No configurado${NC}"
    echo "    → Recomendación: Forzar HTTPS en Django"
    MEDIUM=$((MEDIUM + 1))
fi

echo -n "2.4 SESSION_COOKIE_SECURE: "
if grep -q "SESSION_COOKIE_SECURE.*=.*True" backend/*/settings.py 2>/dev/null; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] No configurado${NC}"
    echo "    → Riesgo: Cookies de sesión pueden enviarse por HTTP"
    MEDIUM=$((MEDIUM + 1))
fi

echo -n "2.5 CSRF_COOKIE_SECURE: "
if grep -q "CSRF_COOKIE_SECURE.*=.*True" backend/*/settings.py 2>/dev/null; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] No configurado${NC}"
    echo "    → Riesgo: Cookies CSRF pueden enviarse por HTTP"
    MEDIUM=$((MEDIUM + 1))
fi

echo -n "2.6 SECURE_HSTS_SECONDS: "
if grep -q "SECURE_HSTS_SECONDS" backend/*/settings.py 2>/dev/null; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] No configurado${NC}"
    MEDIUM=$((MEDIUM + 1))
fi

echo ""

# ==============================================================================
# 3. SEGURIDAD DE ARCHIVOS Y PERMISOS
# ==============================================================================

echo -e "${BLUE}[3] SEGURIDAD DE ARCHIVOS Y PERMISOS${NC}"
echo "======================================================================="

# 3.1 Permisos del archivo .env
echo -n "3.1 Permisos de .env: "
ENV_PERMS=$(stat -c "%a" .env 2>/dev/null)
if [ "$ENV_PERMS" != "600" ] && [ "$ENV_PERMS" != "400" ]; then
    echo -e "${RED}[ALTO] Permisos inseguros: $ENV_PERMS${NC}"
    echo "    → Riesgo: Otros usuarios pueden leer secretos"
    echo "    → Acción: chmod 600 .env"
    HIGH=$((HIGH + 1))
else
    echo -e "${GREEN}[OK] $ENV_PERMS${NC}"
fi

# 3.2 Permisos de claves SSL
echo -n "3.2 Permisos de private.key: "
if [ -f "nginx/ssl/private.key" ]; then
    KEY_PERMS=$(stat -c "%a" nginx/ssl/private.key 2>/dev/null)
    if [ "$KEY_PERMS" != "600" ] && [ "$KEY_PERMS" != "400" ]; then
        echo -e "${YELLOW}[ADVERTENCIA] Permisos: $KEY_PERMS${NC}"
        MEDIUM=$((MEDIUM + 1))
    else
        echo -e "${GREEN}[OK] $KEY_PERMS${NC}"
    fi
else
    echo -e "${YELLOW}[INFO] No existe${NC}"
fi

# 3.3 Archivos .git expuestos
echo -n "3.3 Directorio .git protegido: "
if [ -d ".git" ]; then
    if grep -q "location.*\.git" nginx/conf.d/*.conf 2>/dev/null; then
        echo -e "${GREEN}[OK]${NC}"
    else
        echo -e "${YELLOW}[ADVERTENCIA] .git no está protegido en nginx${NC}"
        echo "    → Riesgo: Exposición de código fuente e historial"
        MEDIUM=$((MEDIUM + 1))
    fi
else
    echo -e "${GREEN}[OK] No hay .git${NC}"
fi

# 3.4 Archivos de backup
echo -n "3.4 Archivos de backup expuestos: "
BACKUPS=$(find . -type f \( -name "*.bak" -o -name "*.backup" -o -name "*~" -o -name "*.sql" \) 2>/dev/null | wc -l)
if [ $BACKUPS -gt 0 ]; then
    echo -e "${YELLOW}[ADVERTENCIA] $BACKUPS archivos de backup encontrados${NC}"
    LOW=$((LOW + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

echo ""

# ==============================================================================
# 4. SEGURIDAD DE RED Y NGINX
# ==============================================================================

echo -e "${BLUE}[4] SEGURIDAD DE RED Y NGINX${NC}"
echo "======================================================================="

# 4.1 Rate limiting
echo -n "4.1 Rate limiting configurado: "
if grep -q "limit_req" nginx/conf.d/*.conf 2>/dev/null; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] No configurado${NC}"
    echo "    → Riesgo: Vulnerable a ataques de fuerza bruta y DDoS"
    MEDIUM=$((MEDIUM + 1))
fi

# 4.2 Headers de seguridad
echo -n "4.2 X-Frame-Options: "
if docker exec server_archivo_nginx 2>/dev/null nginx -T 2>/dev/null | grep -q "X-Frame-Options"; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] No configurado${NC}"
    MEDIUM=$((MEDIUM + 1))
fi

echo -n "4.3 X-Content-Type-Options: "
if docker exec server_archivo_nginx 2>/dev/null nginx -T 2>/dev/null | grep -q "X-Content-Type-Options"; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] No configurado en nginx${NC}"
    MEDIUM=$((MEDIUM + 1))
fi

echo -n "4.4 Content-Security-Policy: "
if docker exec server_archivo_nginx 2>/dev/null nginx -T 2>/dev/null | grep -q "Content-Security-Policy"; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] No configurado${NC}"
    echo "    → Riesgo: Vulnerable a XSS"
    MEDIUM=$((MEDIUM + 1))
fi

# 4.5 Versión de servidor expuesta
echo -n "4.5 Server version disclosure: "
if docker exec server_archivo_nginx 2>/dev/null nginx -T 2>/dev/null | grep -q "server_tokens.*off"; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] Versión de nginx expuesta${NC}"
    LOW=$((LOW + 1))
fi

echo ""

# ==============================================================================
# 5. DEPENDENCIAS Y VULNERABILIDADES
# ==============================================================================

echo -e "${BLUE}[5] DEPENDENCIAS Y VULNERABILIDADES${NC}"
echo "======================================================================="

# 5.1 Python packages
echo -n "5.1 Verificando dependencias Python: "
if [ -f "backend/requirements.txt" ]; then
    OUTDATED=$(docker exec server_archivo_backend 2>/dev/null pip list --outdated 2>/dev/null | wc -l)
    if [ $OUTDATED -gt 3 ]; then
        echo -e "${YELLOW}[ADVERTENCIA] $OUTDATED paquetes desactualizados${NC}"
        LOW=$((LOW + 1))
    else
        echo -e "${GREEN}[OK]${NC}"
    fi
else
    echo -e "${YELLOW}[INFO] No se encuentra requirements.txt${NC}"
fi

# 5.2 npm packages
echo -n "5.2 Verificando dependencias npm: "
if [ -f "frontend/package.json" ]; then
    NPM_AUDIT=$(docker exec server_archivo_frontend 2>/dev/null npm audit --json 2>/dev/null | grep -o '"severity":"[^"]*"' | wc -l)
    if [ $NPM_AUDIT -gt 0 ]; then
        echo -e "${YELLOW}[ADVERTENCIA] Vulnerabilidades detectadas${NC}"
        echo "    → Ejecutar: docker exec server_archivo_frontend npm audit fix"
        MEDIUM=$((MEDIUM + 1))
    else
        echo -e "${GREEN}[OK]${NC}"
    fi
else
    echo -e "${YELLOW}[INFO] No se encuentra package.json${NC}"
fi

echo ""

# ==============================================================================
# 6. INYECCIÓN SQL Y VALIDACIÓN DE ENTRADA
# ==============================================================================

echo -e "${BLUE}[6] PROTECCIÓN CONTRA INYECCIÓN${NC}"
echo "======================================================================="

# 6.1 SQL Injection
echo -n "6.1 Queries SQL sin parametrizar: "
RAW_SQL=$(grep -r "execute.*%.*%" backend --include="*.py" 2>/dev/null | grep -v "#" | wc -l)
if [ $RAW_SQL -gt 0 ]; then
    echo -e "${RED}[ALTO] $RAW_SQL posibles consultas SQL sin parametrizar${NC}"
    echo "    → Riesgo: SQL Injection"
    HIGH=$((HIGH + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

# 6.2 XSS en templates
echo -n "6.2 Posibles vulnerabilidades XSS: "
UNSAFE_HTML=$(grep -r "dangerouslySetInnerHTML\|v-html\|innerHTML" frontend/src --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" 2>/dev/null | wc -l)
if [ $UNSAFE_HTML -gt 0 ]; then
    echo -e "${YELLOW}[ADVERTENCIA] $UNSAFE_HTML usos de HTML sin escape${NC}"
    MEDIUM=$((MEDIUM + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

echo ""

# ==============================================================================
# 7. LOGGING Y AUDITORÍA
# ==============================================================================

echo -e "${BLUE}[7] LOGGING Y AUDITORÍA${NC}"
echo "======================================================================="

# 7.1 Logs de acceso
echo -n "7.1 Logs de nginx habilitados: "
if grep -q "access_log" nginx/conf.d/*.conf 2>/dev/null; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] Logs no configurados${NC}"
    LOW=$((LOW + 1))
fi

# 7.2 Rotación de logs
echo -n "7.2 Rotación de logs configurada: "
if [ -f "/etc/logrotate.d/nginx" ] || [ -f "logrotate.conf" ]; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] No configurada${NC}"
    LOW=$((LOW + 1))
fi

echo ""

# ==============================================================================
# 8. AUTENTICACIÓN Y AUTORIZACIÓN
# ==============================================================================

echo -e "${BLUE}[8] AUTENTICACIÓN Y AUTORIZACIÓN${NC}"
echo "======================================================================="

# 8.1 JWT lifetime
echo -n "8.1 JWT Access Token lifetime: "
JWT_LIFETIME=$(grep "^JWT_ACCESS_TOKEN_LIFETIME_MINUTES=" .env | cut -d'=' -f2)
if [ $JWT_LIFETIME -gt 120 ]; then
    echo -e "${YELLOW}[ADVERTENCIA] Token muy duradero: ${JWT_LIFETIME}min${NC}"
    echo "    → Recomendación: ≤60 minutos"
    LOW=$((LOW + 1))
else
    echo -e "${GREEN}[OK] ${JWT_LIFETIME}min${NC}"
fi

# 8.2 Password reset
echo -n "8.2 Endpoint de reset password protegido: "
if grep -r "password_reset\|reset-password" backend --include="*.py" 2>/dev/null | grep -q "throttle\|ratelimit"; then
    echo -e "${GREEN}[OK]${NC}"
else
    echo -e "${YELLOW}[ADVERTENCIA] Sin rate limiting${NC}"
    MEDIUM=$((MEDIUM + 1))
fi

echo ""

# ==============================================================================
# 9. CORS Y SAME-ORIGIN POLICY
# ==============================================================================

echo -e "${BLUE}[9] CORS Y SAME-ORIGIN POLICY${NC}"
echo "======================================================================="

# 9.1 CORS wildcard
echo -n "9.1 CORS wildcard (*): "
CORS_ORIGINS=$(grep "^CORS_ALLOWED_ORIGINS=" .env | cut -d'=' -f2)
if [[ "$CORS_ORIGINS" == "*" ]]; then
    echo -e "${RED}[CRÍTICO] CORS permite cualquier origen${NC}"
    echo "    → Riesgo: Permite peticiones desde cualquier dominio"
    CRITICAL=$((CRITICAL + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

echo ""

# ==============================================================================
# 10. FILESYSTEM Y PATH TRAVERSAL
# ==============================================================================

echo -e "${BLUE}[10] FILESYSTEM Y PATH TRAVERSAL${NC}"
echo "======================================================================="

# 10.1 Path traversal
echo -n "10.1 Validación de paths en uploads: "
PATH_VALIDATION=$(grep -r "os\.path\.join\|pathlib\|Path" backend --include="*.py" 2>/dev/null | grep -c "resolve\|abspath")
if [ $PATH_VALIDATION -eq 0 ]; then
    echo -e "${YELLOW}[ADVERTENCIA] Posible falta de validación de paths${NC}"
    MEDIUM=$((MEDIUM + 1))
else
    echo -e "${GREEN}[OK]${NC}"
fi

# 10.2 File upload restrictions
echo -n "10.2 Restricciones de subida de archivos: "
MAX_UPLOAD=$(grep "^MAX_UPLOAD_SIZE_MB=" .env | cut -d'=' -f2)
if [ $MAX_UPLOAD -gt 2048 ]; then
    echo -e "${YELLOW}[ADVERTENCIA] Límite muy alto: ${MAX_UPLOAD}MB${NC}"
    LOW=$((LOW + 1))
else
    echo -e "${GREEN}[OK] ${MAX_UPLOAD}MB${NC}"
fi

echo ""

# ==============================================================================
# RESUMEN
# ==============================================================================

echo "======================================================================="
echo -e "${BLUE}RESUMEN DE AUDITORÍA${NC}"
echo "======================================================================="
echo ""

TOTAL=$((CRITICAL + HIGH + MEDIUM + LOW))

echo -e "${RED}[CRÍTICO]     : $CRITICAL${NC}"
echo -e "${RED}[ALTO]        : $HIGH${NC}"
echo -e "${YELLOW}[MEDIO]       : $MEDIUM${NC}"
echo -e "${YELLOW}[BAJO]        : $LOW${NC}"
echo ""
echo -e "TOTAL ISSUES  : $TOTAL"
echo ""

if [ $CRITICAL -gt 0 ]; then
    echo -e "${RED}⚠️  ACCIÓN INMEDIATA REQUERIDA - Vulnerabilidades críticas detectadas${NC}"
    exit 1
elif [ $HIGH -gt 0 ]; then
    echo -e "${YELLOW}⚠️  ACCIÓN REQUERIDA - Vulnerabilidades de alta severidad detectadas${NC}"
    exit 1
elif [ $MEDIUM -gt 0 ]; then
    echo -e "${YELLOW}⚠️  MEJORAS RECOMENDADAS - Vulnerabilidades medias detectadas${NC}"
    exit 0
else
    echo -e "${GREEN}✅ Sistema seguro - No se detectaron vulnerabilidades críticas${NC}"
    exit 0
fi
