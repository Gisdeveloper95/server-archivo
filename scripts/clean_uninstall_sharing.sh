#!/bin/bash
# Script para desinstalar COMPLETAMENTE el sistema de compartición
# sin usar backup (limpieza manual)

PROJECT_DIR="/home/andres/server_archivo"

echo "⚠️  ADVERTENCIA: Esto eliminará PERMANENTEMENTE el sistema de compartición"
echo "Esta acción NO se puede deshacer sin un backup previo"
echo ""
read -p "¿Está seguro? (escriba 'ELIMINAR' para continuar): " confirm

if [ "$confirm" != "ELIMINAR" ]; then
    echo "❌ Desinstalación cancelada"
    exit 0
fi

echo "🔄 Iniciando desinstalación limpia..."

# Detener contenedores
echo "🛑 Deteniendo contenedores..."
cd "$PROJECT_DIR"
docker compose down

# 1. Eliminar app sharing del backend
echo "🗑️  Eliminando app 'sharing'..."
rm -rf "$PROJECT_DIR/backend/sharing"

# 2. Eliminar migraciones de sharing
echo "🗑️  Eliminando migraciones de sharing..."
rm -rf "$PROJECT_DIR/backend/sharing/migrations"

# 3. Limpiar settings.py (remover 'sharing' de INSTALLED_APPS)
echo "📝 Limpiando settings.py..."
sed -i "/    'sharing',/d" "$PROJECT_DIR/backend/config/settings.py"

# 4. Limpiar urls.py (remover rutas de sharing)
echo "📝 Limpiando urls.py..."
# Esto requiere edición manual, solo mostramos las líneas a eliminar
echo "⚠️  MANUAL: Editar backend/config/urls.py y eliminar:"
echo "   - from sharing.views import ShareLinkViewSet"
echo "   - router.register(r'sharing', ShareLinkViewSet, basename='sharing')"
echo "   - path('shared/<str:token>', ...)"

# 5. Eliminar tablas de BD (requiere conexión a BD)
echo "💾 Eliminando tablas de base de datos..."
docker compose up -d postgres
sleep 3
docker exec -i server_archivo_postgres psql -U archivo_user -d archivo_db << EOF
DROP TABLE IF EXISTS share_link_accesses CASCADE;
DROP TABLE IF EXISTS share_links CASCADE;
EOF

# 6. Eliminar componentes del frontend
echo "💻 Eliminando componentes del frontend..."
rm -f "$PROJECT_DIR/frontend/src/pages/ShareLinks.tsx"
rm -f "$PROJECT_DIR/frontend/src/pages/SharedAccess.tsx"
rm -f "$PROJECT_DIR/frontend/src/components/ShareLinkModal.tsx"
rm -f "$PROJECT_DIR/frontend/src/api/sharing.ts"

# 7. Limpiar rutas del frontend
echo "⚠️  MANUAL: Editar frontend/src/App.tsx y eliminar rutas de sharing"

# Reconstruir contenedores
echo "🔨 Reconstruyendo contenedores..."
docker compose up -d --build

echo ""
echo "✅ Desinstalación completada"
echo ""
echo "⚠️  PASOS MANUALES PENDIENTES:"
echo "1. Editar backend/config/urls.py (eliminar imports y rutas de sharing)"
echo "2. Editar frontend/src/App.tsx (eliminar rutas de sharing)"
echo "3. Verificar que no queden referencias en otros archivos"
echo ""
echo "Para verificar:"
echo "  grep -r 'sharing' backend/"
echo "  grep -r 'ShareLink' frontend/src/"
