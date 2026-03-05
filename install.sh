#!/bin/bash
# ==============================================================================
# INSTALADOR - SERVER ARCHIVO (version pruebas)
# ==============================================================================
# Uso:
#   ./install.sh              Instalacion online (descarga imagenes de internet)
#   ./install.sh --offline    Instalacion sin internet (usa docker_images_offline/)
#   ./install.sh --export     Exporta imagenes para instalacion offline
# ==============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OFFLINE_DIR="${SCRIPT_DIR}/docker_images_offline"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---------- Verificaciones previas ----------

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker no esta instalado."
        echo "  Instalar con: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi
    if ! docker info &> /dev/null; then
        log_error "Docker daemon no esta corriendo o no tienes permisos."
        echo "  Intentar: sudo systemctl start docker"
        echo "  Agregar usuario al grupo: sudo usermod -aG docker \$USER"
        exit 1
    fi
    log_ok "Docker $(docker --version | awk '{print $3}') detectado"
}

check_compose() {
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        log_error "Docker Compose no esta instalado."
        exit 1
    fi
    log_ok "Docker Compose detectado ($COMPOSE_CMD)"
}

check_disk() {
    local available_gb
    available_gb=$(df -BG "$SCRIPT_DIR" | awk 'NR==2{print $4}' | tr -d 'G')
    if [ "$available_gb" -lt 10 ]; then
        log_warn "Solo ${available_gb}GB disponibles. Se recomiendan al menos 10GB."
        read -p "Continuar de todas formas? (s/n): " resp
        [[ "$resp" != "s" && "$resp" != "S" ]] && exit 1
    else
        log_ok "Espacio en disco: ${available_gb}GB disponibles"
    fi
}

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_EXAMPLE" ]; then
            log_warn "No se encontro .env - copiando desde .env.example"
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            log_warn "IMPORTANTE: Editar .env con los valores correctos antes de continuar"
            echo ""
            echo "  nano ${ENV_FILE}"
            echo ""
            read -p "Presiona Enter cuando hayas editado el .env..."
        else
            log_error "No se encontro .env ni .env.example"
            exit 1
        fi
    fi
    # Validar variables criticas
    local missing=()
    for var in POSTGRES_PASSWORD DJANGO_SECRET_KEY JWT_SECRET_KEY; do
        val=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
        if [ -z "$val" ] || [ "$val" = "CAMBIAR_EN_PRODUCCION" ] || [ "$val" = "GENERAR_CON_get_random_secret_key" ] || [ "$val" = "GENERAR_ALEATORIO_CON_openssl_rand" ]; then
            missing+=("$var")
        fi
    done
    if [ ${#missing[@]} -gt 0 ]; then
        log_warn "Las siguientes variables tienen valores por defecto (cambiar en produccion):"
        for v in "${missing[@]}"; do
            echo "  - $v"
        done
    fi
    log_ok "Archivo .env encontrado"
}

# ---------- Funciones de imagenes ----------

# Imagenes base usadas en docker-compose.yml
BASE_IMAGES=(
    "postgres:15-alpine"
    "redis:7-alpine"
    "nginx:alpine"
    "ollama/ollama:latest"
    "quay.io/keycloak/keycloak:23.0"
)

pull_images() {
    log_info "Descargando imagenes base de Docker Hub..."
    for img in "${BASE_IMAGES[@]}"; do
        if docker image inspect "$img" > /dev/null 2>&1; then
            log_ok "$img ya existe localmente"
        else
            log_info "Descargando $img..."
            if docker pull "$img"; then
                log_ok "$img descargada"
            else
                log_warn "No se pudo descargar $img (se construira durante el build)"
            fi
        fi
    done
}

export_images() {
    log_info "Exportando imagenes para instalacion offline..."
    mkdir -p "$OFFLINE_DIR"

    for img in "${BASE_IMAGES[@]}"; do
        if ! docker image inspect "$img" > /dev/null 2>&1; then
            log_info "Descargando $img primero..."
            docker pull "$img"
        fi
        local filename
        filename=$(echo "$img" | tr '/:' '_').tar.gz
        log_info "Exportando $img -> $filename"
        docker save "$img" | gzip > "${OFFLINE_DIR}/${filename}"
        log_ok "$filename ($(du -h "${OFFLINE_DIR}/${filename}" | cut -f1))"
    done

    # Exportar modelo Ollama si existe
    local ollama_container="server_archivo_ollama"
    if docker ps --format '{{.Names}}' | grep -q "$ollama_container"; then
        local model
        model=$(grep "^OLLAMA_MODEL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
        if [ -n "$model" ]; then
            local model_check
            model_check=$(docker exec "$ollama_container" ollama list 2>/dev/null | grep "$model" || true)
            if [ -n "$model_check" ]; then
                log_info "Exportando modelo Ollama: $model"
                local ollama_data="${SCRIPT_DIR}/ollama_data"
                if [ -d "$ollama_data/models" ]; then
                    tar -czf "${OFFLINE_DIR}/ollama_model_${model//:/_}.tar.gz" -C "$ollama_data" models/
                    log_ok "Modelo exportado ($(du -h "${OFFLINE_DIR}/ollama_model_${model//:/_}.tar.gz" | cut -f1))"
                fi
            fi
        fi
    fi

    echo ""
    log_ok "Imagenes exportadas en: $OFFLINE_DIR"
    ls -lh "$OFFLINE_DIR"
    echo ""
    echo "Para instalar en servidor sin internet:"
    echo "  1. Copiar todo el directorio del proyecto al servidor"
    echo "  2. Ejecutar: ./install.sh --offline"
}

load_images() {
    if [ ! -d "$OFFLINE_DIR" ]; then
        log_error "No se encontro directorio $OFFLINE_DIR"
        echo "  Primero ejecutar en un equipo con internet: ./install.sh --export"
        exit 1
    fi
    log_info "Cargando imagenes desde archivos offline..."
    for tarfile in "$OFFLINE_DIR"/*.tar.gz; do
        [ -f "$tarfile" ] || continue
        local basename
        basename=$(basename "$tarfile")
        # Saltar archivos de modelo ollama
        if [[ "$basename" == ollama_model_* ]]; then
            continue
        fi
        log_info "Cargando $basename..."
        gunzip -c "$tarfile" | docker load
        log_ok "$basename cargado"
    done

    # Restaurar modelo Ollama si existe el archivo
    for tarfile in "$OFFLINE_DIR"/ollama_model_*.tar.gz; do
        [ -f "$tarfile" ] || continue
        log_info "Restaurando modelo Ollama desde $tarfile..."
        local ollama_data="${SCRIPT_DIR}/ollama_data"
        mkdir -p "$ollama_data"
        tar -xzf "$tarfile" -C "$ollama_data"
        log_ok "Modelo Ollama restaurado"
    done
}

# ---------- Build y arranque ----------

build_services() {
    log_info "Construyendo servicios (backend, frontend, celery)..."
    cd "$SCRIPT_DIR"
    DOCKER_BUILDKIT=0 $COMPOSE_CMD build --no-cache
    log_ok "Build completado"
}

start_services() {
    log_info "Levantando todos los servicios..."
    cd "$SCRIPT_DIR"
    $COMPOSE_CMD up -d
    log_ok "Servicios iniciados"
}

install_ollama_model() {
    source "$ENV_FILE" 2>/dev/null || true
    if [ "${OLLAMA_ENABLED}" != "true" ]; then
        log_info "Ollama deshabilitado (OLLAMA_ENABLED != true). Saltando."
        return
    fi

    local model="${OLLAMA_MODEL:-llama3.2:3b}"
    local container="server_archivo_ollama"

    log_info "Verificando modelo Ollama: $model"

    # Esperar a que el contenedor este listo
    local retries=0
    while [ $retries -lt 12 ]; do
        if docker exec "$container" ollama list &>/dev/null; then
            break
        fi
        retries=$((retries + 1))
        log_info "Esperando que Ollama este listo... ($retries/12)"
        sleep 5
    done

    if [ $retries -ge 12 ]; then
        log_warn "Ollama no responde. El modelo se puede instalar despues manualmente:"
        echo "  docker exec -it $container ollama pull $model"
        return
    fi

    # Verificar si el modelo ya existe
    if docker exec "$container" ollama list 2>/dev/null | grep -q "$model"; then
        log_ok "Modelo $model ya esta instalado"
    else
        log_info "Descargando modelo $model (esto puede tardar varios minutos)..."
        if docker exec "$container" ollama pull "$model"; then
            log_ok "Modelo $model instalado correctamente"
        else
            log_warn "No se pudo descargar el modelo. Intentar manualmente:"
            echo "  docker exec -it $container ollama pull $model"
        fi
    fi
}

verify_services() {
    echo ""
    log_info "=== Estado de los servicios ==="
    cd "$SCRIPT_DIR"
    $COMPOSE_CMD ps
    echo ""

    # Verificar servicios clave
    local services=("server_archivo_postgres" "server_archivo_redis" "server_archivo_backend" "server_archivo_frontend" "server_archivo_nginx" "server_archivo_ollama" "server_archivo_keycloak")
    local all_ok=true

    for svc in "${services[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${svc}$"; then
            log_ok "$svc esta corriendo"
        else
            log_warn "$svc NO esta corriendo"
            all_ok=false
        fi
    done

    echo ""
    if [ "$all_ok" = true ]; then
        source "$ENV_FILE" 2>/dev/null || true
        log_ok "=== Instalacion completada exitosamente ==="
        echo ""
        echo "  Aplicacion:  ${PROTOCOL:-http}://${DOMAIN:-localhost}"
        echo "  Backend API: ${PROTOCOL:-http}://${DOMAIN:-localhost}/api"
        echo "  Keycloak:    http://${KEYCLOAK_HOSTNAME:-localhost}:${KEYCLOAK_PORT:-8085}"
        echo ""
    else
        log_warn "Algunos servicios no estan corriendo. Revisar logs:"
        echo "  $COMPOSE_CMD logs -f"
    fi
}

# ---------- Main ----------

main() {
    echo "============================================================"
    echo "  INSTALADOR - SERVER ARCHIVO (pruebas)"
    echo "============================================================"
    echo ""

    case "${1:-}" in
        --export)
            check_docker
            check_env
            pull_images
            export_images
            ;;
        --offline)
            check_docker
            check_compose
            check_disk
            check_env
            load_images
            build_services
            start_services
            install_ollama_model
            verify_services
            ;;
        "")
            check_docker
            check_compose
            check_disk
            check_env
            pull_images
            build_services
            start_services
            install_ollama_model
            verify_services
            ;;
        *)
            echo "Uso: $0 [--offline|--export]"
            echo ""
            echo "  (sin parametros)  Instalacion online (requiere internet)"
            echo "  --offline         Instalacion sin internet (requiere --export previo)"
            echo "  --export          Exporta imagenes Docker para instalacion offline"
            exit 1
            ;;
    esac
}

main "$@"
