#!/bin/bash
# Script de backup antes de implementar sistema de compartición
# Fecha: $(date +%Y-%m-%d_%H-%M-%S)

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/andres/backups/sharing_feature_$TIMESTAMP"
PROJECT_DIR="/home/andres/server_archivo"

echo "🔄 Creando backup en: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup de archivos específicos que se modificarán
echo "📁 Backup de archivos del proyecto..."
cp -r "$PROJECT_DIR/backend/config/settings.py" "$BACKUP_DIR/"
cp -r "$PROJECT_DIR/backend/config/urls.py" "$BACKUP_DIR/"
cp -r "$PROJECT_DIR/backend/files" "$BACKUP_DIR/files_app_backup"
cp -r "$PROJECT_DIR/backend/users" "$BACKUP_DIR/users_app_backup"
cp -r "$PROJECT_DIR/frontend/src" "$BACKUP_DIR/frontend_src_backup"

# Backup de la base de datos
echo "💾 Backup de base de datos..."
docker exec server_archivo_postgres pg_dump -U archivo_user archivo_db > "$BACKUP_DIR/database_backup.sql"

# Backup de docker-compose
echo "🐳 Backup de configuración Docker..."
cp "$PROJECT_DIR/docker-compose.yml" "$BACKUP_DIR/"

# Crear archivo de información del backup
cat > "$BACKUP_DIR/backup_info.txt" << EOF
Backup creado: $(date)
Proyecto: Sistema de Gestión de Archivos IGAC
Feature: Sistema de compartición de links (solo superadmin)

Archivos respaldados:
- backend/config/settings.py
- backend/config/urls.py
- backend/files/ (app completa)
- backend/users/ (app completa)
- frontend/src/ (código fuente completo)
- Base de datos PostgreSQL
- docker-compose.yml

Para restaurar este backup, ejecutar:
bash /home/andres/server_archivo/scripts/rollback_sharing.sh $TIMESTAMP
EOF

echo "✅ Backup completado en: $BACKUP_DIR"
echo "📝 Información del backup guardada en: $BACKUP_DIR/backup_info.txt"
echo ""
echo "Para restaurar este backup más tarde:"
echo "bash /home/andres/server_archivo/scripts/rollback_sharing.sh $TIMESTAMP"
