# Papelera de Reciclaje - Documentación Técnica

## Descripción General

Sistema de respaldo automático para archivos y directorios eliminados, con retención configurable y capacidad de restauración.

---

## Configuración (.env)

```env
# Papelera de Reciclaje
TRASH_ENABLED=true
TRASH_PATH=04_bk/bk_temp_subproy/.trash
TRASH_MAX_SIZE_GB=5
TRASH_RETENTION_DAYS=30
```

| Variable | Descripción | Default |
|----------|-------------|---------|
| `TRASH_ENABLED` | Habilitar/deshabilitar papelera | `true` |
| `TRASH_PATH` | Ruta relativa dentro del repositorio | `04_bk/bk_temp_subproy/.trash` |
| `TRASH_MAX_SIZE_GB` | Tamaño máximo para respaldar (GB) | `5` |
| `TRASH_RETENTION_DAYS` | Días antes de eliminar automáticamente | `30` |

---

## Arquitectura

### Ruta Física de Papelera
```
/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/04_bk/bk_temp_subproy/.trash/
├── a8f3c2e1-b7d4-4e9f-c9a1-b3d5x7f2a1b9.data      ← Archivo
├── c2d4f6a8-1234-5678-9abc-def012345678.tar.gz    ← Directorio comprimido
└── ...
```

### Modelo de Datos (TrashItem)

```python
class TrashItem(models.Model):
    # Identificación
    trash_id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    # Info original
    original_name = models.CharField(max_length=255)
    original_path = models.TextField()  # Ruta completa original
    is_directory = models.BooleanField(default=False)

    # Metadata
    size_bytes = models.BigIntegerField()
    file_count = models.IntegerField(default=1)  # Para directorios
    file_hash = models.CharField(max_length=64, null=True)  # SHA256
    mime_type = models.CharField(max_length=100, null=True)

    # Auditoría
    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    deleted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    # Estado
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pendiente'),
        ('storing', 'Almacenando'),
        ('stored', 'Almacenado'),
        ('restoring', 'Restaurando'),
        ('restored', 'Restaurado'),
        ('expired', 'Expirado'),
        ('error', 'Error'),
    ], default='pending')

    # Metadata adicional (JSON)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = 'trash_items'
        ordering = ['-deleted_at']
        indexes = [
            models.Index(fields=['original_path']),
            models.Index(fields=['deleted_by']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['status']),
        ]
```

---

## Flujo de Eliminación

```
Usuario solicita eliminar
        ↓
┌───────────────────────────────────────┐
│ 1. Verificar permisos (existente)     │
│ 2. Obtener info del archivo/dir       │
│ 3. Calcular tamaño total              │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│ ¿Tamaño <= TRASH_MAX_SIZE (5GB)?      │
├─────────────┬─────────────────────────┤
│     SÍ      │          NO             │
│     ↓       │          ↓              │
│  Papelera   │   Eliminar directo      │
│             │   (sin respaldo)        │
└─────────────┴─────────────────────────┘
        ↓ (Si va a papelera)
┌───────────────────────────────────────┐
│ 4. Generar trash_id único (UUID)      │
│ 5. Crear registro en DB (TrashItem)   │
│    - Estado: "pending"                │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│ 6. COPIAR a papelera:                 │
│    - Archivo: copy directo → .data    │
│    - Directorio: tar.gz comprimido    │
│    (con progreso si es grande)        │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│ 7. Verificar integridad (hash SHA256) │
│ 8. Actualizar DB estado: "stored"     │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│ 9. ELIMINAR original                  │
│ 10. Registrar auditoría               │
│ 11. Limpiar índice DB (File/Directory)│
└───────────────────────────────────────┘
```

---

## Flujo de Restauración

```
Usuario solicita restaurar
        ↓
┌───────────────────────────────────────┐
│ 1. Verificar permisos                 │
│    - ¿Es superadmin? → OK             │
│    - ¿Es su área? → OK                │
│    - ¿Lo eliminó él? → OK             │
│    - Sino → DENEGAR                   │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│ 2. Verificar ruta destino             │
│    - ¿Existe el directorio padre?     │
│    - ¿Ya existe archivo con ese       │
│      nombre en destino?               │
└───────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────┐
│ Si existe conflicto de nombre:                       │
│                                                      │
│ Opciones:                                            │
│ - Reemplazar existente                               │
│ - Renombrar como "{nombre}_restored.{ext}"           │
│ - Restaurar en otra ubicación                        │
└─────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│ 3. COPIAR desde papelera:             │
│    - Archivo: copy .data → original   │
│    - Directorio: extraer tar.gz       │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│ 4. Verificar integridad               │
│ 5. Actualizar/crear índice en DB      │
│ 6. Registrar auditoría (restore)      │
│ 7. Marcar TrashItem como "restored"   │
│    (se elimina de papelera)           │
└───────────────────────────────────────┘
```

---

## Permisos de Acceso

| Rol | Ver papelera | Restaurar | Eliminar permanente |
|-----|-------------|-----------|---------------------|
| **Superadmin** | TODO (global) | TODO | TODO |
| **Admin de área** | Solo su área | Solo su área | Solo su área |
| **Usuario normal** | Solo lo que eliminó | Solo lo que eliminó | NO |

---

## API Endpoints

### Listar items en papelera
```
GET /api/trash/
GET /api/trash/?path=/Financiero/
GET /api/trash/?deleted_by=juan
GET /api/trash/?from_date=2026-01-01&to_date=2026-01-31
```

**Response:**
```json
{
  "count": 15,
  "results": [
    {
      "trash_id": "a8f3c2e1-b7d4-4e9f-c9a1-b3d5x7f2a1b9",
      "original_name": "factura_2025.pdf",
      "original_path": "/Financiero/2025/",
      "is_directory": false,
      "size_bytes": 245760,
      "size_formatted": "240 KB",
      "deleted_by": {
        "id": 5,
        "username": "juan.perez",
        "full_name": "Juan Pérez"
      },
      "deleted_at": "2026-01-01T10:30:00Z",
      "expires_at": "2026-01-31T10:30:00Z",
      "days_until_expiry": 30,
      "status": "stored"
    }
  ]
}
```

### Detalle de item
```
GET /api/trash/{trash_id}/
```

### Restaurar item
```
POST /api/trash/{trash_id}/restore/
```

**Body (opcional):**
```json
{
  "conflict_resolution": "rename",  // "replace", "rename", "new_path"
  "new_path": "/Financiero/Restaurados/"  // solo si conflict_resolution="new_path"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Restaurado exitosamente",
  "restored_path": "/Financiero/2025/factura_2025.pdf"
}
```

### Eliminar permanentemente
```
DELETE /api/trash/{trash_id}/
```

### Limpiar expirados (manual)
```
DELETE /api/trash/expired/
```

### Estadísticas
```
GET /api/trash/stats/
```

**Response:**
```json
{
  "total_items": 45,
  "total_size_bytes": 1073741824,
  "total_size_formatted": "1.0 GB",
  "by_status": {
    "stored": 42,
    "expired": 3
  },
  "expiring_soon": 5,  // En próximos 7 días
  "oldest_item": "2025-12-15T08:00:00Z",
  "newest_item": "2026-01-01T10:30:00Z"
}
```

### Generar link de descarga (desde papelera)
```
POST /api/trash/{trash_id}/share/
```

**Body:**
```json
{
  "permission": "download",
  "expires_hours": 24,
  "max_downloads": 5,
  "password": "opcional123",
  "require_email": false
}
```

**Response:**
```json
{
  "success": true,
  "share_url": "https://gestionarchivo.duckdns.org/s/abc123xyz",
  "expires_at": "2026-01-02T10:30:00Z",
  "token": "abc123xyz"
}
```

---

## Interfaz de Usuario

### 1. Badge en toolbar de directorio
```
┌────────────────────────────────────────────────────────┐
│ 📁 /Financiero/2025/                                   │
│ [⬆️ Subir] [📁 Nueva carpeta] [📄 Subir archivo] [🗑️ 3]│
└────────────────────────────────────────────────────────┘
                                                      ↑
                                            Badge con cantidad
                                            de items eliminados
                                            de este directorio
```

### 2. Modal "Versiones anteriores" (click en badge o menú contextual)
```
┌─────────────────────────────────────────────────────────┐
│ 🗑️ Elementos eliminados de "Financiero"        [✕]     │
├─────────────────────────────────────────────────────────┤
│ 📄 factura_2025.pdf                           240 KB    │
│    Eliminado: 01/01/2026 10:30 por juan.perez           │
│    Expira en: 30 días                                   │
│    [🔄 Restaurar] [🔗 Compartir] [👁️ Vista previa]     │
├─────────────────────────────────────────────────────────┤
│ 📁 reportes_antiguos/                         145 MB    │
│    Eliminado: 28/12/2025 15:45 por maria.garcia         │
│    Expira en: 27 días                                   │
│    [🔄 Restaurar] [🔗 Compartir] [📂 Ver contenido]    │
├─────────────────────────────────────────────────────────┤
│ 📄 borrador.docx                               52 KB    │
│    Eliminado: 25/12/2025 09:15 por juan.perez           │
│    Expira en: 24 días                                   │
│    [🔄 Restaurar] [🔗 Compartir] [👁️ Vista previa]     │
└─────────────────────────────────────────────────────────┘
```

### 3. Página global de Papelera (/papelera) - Solo Superadmin
```
┌─────────────────────────────────────────────────────────────┐
│ 🗑️ Papelera de Reciclaje                                    │
├─────────────────────────────────────────────────────────────┤
│ Estadísticas:                                               │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────────┐ │
│ │   45    │ │  1.2 GB │ │    5    │ │ Limpiar expirados  │ │
│ │ Items   │ │ Espacio │ │Por expirar│ │      [Ejecutar]    │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Filtros:                                                    │
│ [🔍 Buscar nombre...] [Usuario ▼] [Fecha ▼] [Ruta ▼]       │
├─────────────────────────────────────────────────────────────┤
│ ☐ │ Nombre            │ Ruta original      │ Eliminado por  │
│───┼───────────────────┼────────────────────┼────────────────│
│ ☐ │ 📄 factura.pdf    │ /Financiero/2025/  │ juan.perez     │
│ ☐ │ 📁 proyecto/      │ /Proyectos/        │ maria.garcia   │
│ ☐ │ 📄 reporte.xlsx   │ /Contabilidad/     │ admin          │
├─────────────────────────────────────────────────────────────┤
│ Seleccionados: 0                                            │
│ [🔄 Restaurar seleccionados] [🗑️ Eliminar permanentemente] │
└─────────────────────────────────────────────────────────────┘
```

---

## Tareas Programadas (Celery)

### Limpieza automática de expirados
```python
@celery_app.task
def cleanup_expired_trash():
    """
    Ejecutar diariamente a las 3:00 AM
    Elimina items cuyo expires_at < now()
    """
    from trash.models import TrashItem
    from django.utils import timezone

    expired = TrashItem.objects.filter(
        expires_at__lt=timezone.now(),
        status='stored'
    )

    for item in expired:
        # Eliminar archivo físico
        trash_path = get_trash_file_path(item.trash_id)
        if os.path.exists(trash_path):
            os.remove(trash_path)

        # Marcar como expirado
        item.status = 'expired'
        item.save()

        # Log de auditoría
        AuditLog.objects.create(
            action='trash_expired',
            target_path=item.original_path,
            target_name=item.original_name,
            details={'trash_id': str(item.trash_id)}
        )
```

### Configuración Celery Beat
```python
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-trash': {
        'task': 'trash.tasks.cleanup_expired_trash',
        'schedule': crontab(hour=3, minute=0),  # 3:00 AM diario
    },
}
```

---

## Notas de Implementación

### Compresión de directorios
- Se usa `tar.gz` para directorios
- Preserva estructura, permisos y metadata
- Comando: `tar -czf {trash_id}.tar.gz -C {parent_dir} {dir_name}`

### Hash de integridad
- SHA256 del archivo/tar.gz
- Se verifica al restaurar
- Si falla verificación, se notifica pero se permite restaurar

### Progreso para archivos grandes
- Archivos > 100MB muestran barra de progreso
- Se actualiza cada 5% o cada 10 segundos
- WebSocket o polling según configuración del frontend

### Límites del sistema
- Linux PATH_MAX: ~4096 caracteres (sin problemas)
- Nombre archivo: máximo 255 caracteres por componente
- UUID en nombre: 36 caracteres + extensión

---

## Auditoría

Todas las operaciones se registran en AuditLog:

| Acción | Descripción |
|--------|-------------|
| `delete` | Archivo/directorio movido a papelera |
| `delete_permanent` | Eliminación sin papelera (> 5GB) |
| `trash_restore` | Restauración desde papelera |
| `trash_delete` | Eliminación permanente desde papelera |
| `trash_expired` | Eliminación automática por expiración |
| `trash_share` | Link de descarga generado desde papelera |

---

## Migración y Rollback

### Migración inicial
```bash
python manage.py makemigrations trash
python manage.py migrate
```

### Crear directorio de papelera
```bash
mkdir -p /mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/04_bk/bk_temp_subproy/.trash
chmod 755 /mnt/repositorio/.../bk_temp_subproy/.trash
```

### Rollback
Si se desea deshabilitar:
1. Cambiar `TRASH_ENABLED=false` en .env
2. Los archivos se eliminarán directamente sin pasar por papelera
3. Los items existentes en papelera permanecen hasta expirar

---

*Documento generado: 2026-01-01*
*Versión: 1.0*
