#!/bin/bash
# ============================================================
# BACKUP AUTOMÁTICO DE BASE DE DATOS - server_archivo
# Crea un dump de PostgreSQL en /home/andres/server_archivo/backups/
# Mantiene los últimos 7 backups
# ============================================================

BACKUP_DIR="/home/andres/server_archivo/backups"
CONTAINER="server_archivo_postgres"
DB="gestion_archivo_db"
USER="postgres"
DATE=$(date +%Y-%m-%d_%H-%M)
FILE="$BACKUP_DIR/backup_${DATE}.sql"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup..."
docker exec "$CONTAINER" pg_dump -U "$USER" "$DB" > "$FILE"

if [ $? -eq 0 ] && [ -s "$FILE" ]; then
    gzip "$FILE"
    echo "[$(date)] Backup OK: ${FILE}.gz ($(du -sh ${FILE}.gz | cut -f1))"
    # Borrar backups con más de 7 días
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete
    echo "[$(date)] Backups disponibles:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null
else
    echo "[$(date)] ERROR: backup fallido o vacío"
    rm -f "$FILE"
    exit 1
fi
