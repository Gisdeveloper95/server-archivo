#!/bin/bash
# ============================================================
# DEPLOY COMPLETO - server_archivo
# Ejecutar cuando se hagan cambios al código (frontend o backend)
#
# Uso:
#   ./rebuild-frontend.sh           → solo frontend
#   ./rebuild-frontend.sh --all     → frontend + reiniciar backend
#   ./rebuild-frontend.sh --backend → solo reiniciar backend
# ============================================================

set -e

REBUILD_FRONTEND=true
RESTART_BACKEND=false

# Parsear argumentos
for arg in "$@"; do
  case $arg in
    --all)
      RESTART_BACKEND=true
      ;;
    --backend)
      REBUILD_FRONTEND=false
      RESTART_BACKEND=true
      ;;
  esac
done

echo ""
echo "======================================"
echo " DEPLOY - server_archivo"
echo "======================================"

cd "$(dirname "$0")"

# ── BACKEND ──────────────────────────────
if [ "$RESTART_BACKEND" = true ]; then
  echo ""
  echo "🐍 Reiniciando backend Django..."
  docker-compose restart backend
  sleep 3
  # Verificar que arrancó bien
  if docker logs server_archivo_backend --tail 3 2>&1 | grep -q "Starting development server"; then
    echo "   ✅ Backend OK"
  else
    echo "   ⚠️  Revisar logs: docker logs server_archivo_backend --tail 20"
  fi
fi

# ── FRONTEND ─────────────────────────────
if [ "$REBUILD_FRONTEND" = true ]; then
  echo ""
  echo "📦 Compilando frontend (TypeScript + Vite build)..."

  if ! docker ps --format '{{.Names}}' | grep -q "server_archivo_frontend"; then
    echo "   ❌ Contenedor 'server_archivo_frontend' no está corriendo."
    echo "      Ejecuta: docker-compose up -d"
    exit 1
  fi

  docker exec server_archivo_frontend npm run build
  echo "   ✅ Build completado → frontend/dist/"
fi

echo ""
echo "======================================"
echo " ✅ DEPLOY COMPLETADO"
echo "======================================"
echo ""
echo " → Recarga el navegador con Ctrl+Shift+R"
echo ""
