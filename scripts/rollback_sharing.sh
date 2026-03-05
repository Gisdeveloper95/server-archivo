#!/bin/bash
# Script de rollback para eliminar sistema de compartición
# Uso: bash rollback_sharing.sh [TIMESTAMP]

if [ -z "$1" ]; then
    echo "❌ Error: Debe proporcionar el timestamp del backup"
    echo "Uso: bash rollback_sharing.sh YYYYMMDD_HHMMSS"
    echo ""
    echo "Backups disponibles:"
    ls -1 /home/andres/backups/ | grep sharing_feature
    exit 1
fi

TIMESTAMP=$1
BACKUP_DIR="/home/andres/backups/sharing_feature_$TIMESTAMP"
PROJECT_DIR="/home/andres/server_archivo"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Error: Backup no encontrado en $BACKUP_DIR"
    exit 1
fi

echo "⚠️  ADVERTENCIA: Esto revertirá todos los cambios del sistema de compartición"
echo "Backup a restaurar: $BACKUP_DIR"
echo ""
read -p "¿Está seguro? (escriba 'SI' para continuar): " confirm

if [ "$confirm" != "SI" ]; then
    echo "❌ Rollback cancelado"
    exit 0
fi

echo "🔄 Iniciando rollback..."

# Detener contenedores
echo "🛑 Deteniendo contenedores..."
cd "$PROJECT_DIR"
docker compose down

# Eliminar app sharing si existe
echo "🗑️  Eliminando app 'sharing'..."
rm -rf "$PROJECT_DIR/backend/sharing"

# Restaurar archivos
echo "📁 Restaurando archivos..."
cp "$BACKUP_DIR/settings.py" "$PROJECT_DIR/backend/config/"
cp "$BACKUP_DIR/urls.py" "$PROJECT_DIR/backend/config/"
rm -rf "$PROJECT_DIR/backend/files"
cp -r "$BACKUP_DIR/files_app_backup" "$PROJECT_DIR/backend/files"
rm -rf "$PROJECT_DIR/backend/users"
cp -r "$BACKUP_DIR/users_app_backup" "$PROJECT_DIR/backend/users"

# Restaurar frontend
echo "💻 Restaurando frontend..."
rm -rf "$PROJECT_DIR/frontend/src"
cp -r "$BACKUP_DIR/frontend_src_backup" "$PROJECT_DIR/frontend/src"

# Restaurar base de datos
echo "💾 Restaurando base de datos..."
docker compose up -d postgres
sleep 5
docker exec -i server_archivo_postgres psql -U archivo_user -d archivo_db < "$BACKUP_DIR/database_backup.sql"

# Restaurar docker-compose
echo "🐳 Restaurando docker-compose..."
cp "$BACKUP_DIR/docker-compose.yml" "$PROJECT_DIR/"

# Reiniciar contenedores
echo "🚀 Reiniciando contenedores..."
docker compose up -d --build

echo ""
echo "✅ Rollback completado"
echo "📊 Estado de contenedores:"
docker compose ps
echo ""
echo "📝 Si hubo problemas, revisar logs:"
echo "docker compose logs -f backend"
