# 8. Administración y Auditoría

## 8.1 Sistema de Roles y Permisos

### Descripción General

El sistema implementa un modelo de control de acceso basado en roles (RBAC) con cuatro niveles de privilegio.

### Jerarquía de Roles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **superadmin** | Administrador total | Todo el sistema |
| **admin** | Administrador delegado | Gestión de usuarios asignados |
| **consultation_edit** | Consulta y edición | Lectura/escritura según permisos |
| **consultation** | Solo consulta | Solo lectura |

### Modelo de Permisos por Ruta

```python
class UserPermission(models.Model):
    """
    Permiso granular por ruta para un usuario.
    Permite controlar acceso a directorios específicos.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    base_path = models.CharField(max_length=2000)

    # Permisos básicos
    can_read = models.BooleanField(default=True)
    can_write = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_create_directories = models.BooleanField(default=False)

    # Exención de diccionario
    exempt_from_dictionary = models.BooleanField(default=False)

    # Nivel de edición
    EDIT_LEVELS = (
        ('upload_only', 'Solo subir'),
        ('upload_own', 'Subir y editar propios'),
        ('upload_all', 'Subir y editar todos'),
    )
    edit_permission_level = models.CharField(max_length=20, choices=EDIT_LEVELS)

    # Herencia de permisos
    INHERITANCE_MODES = (
        ('total', 'Herencia total'),
        ('blocked', 'Sin herencia'),
        ('limited_depth', 'Profundidad limitada'),
        ('partial_write', 'Escritura parcial'),
    )
    inheritance_mode = models.CharField(max_length=20, choices=INHERITANCE_MODES)

    # Exclusiones
    blocked_paths = models.JSONField(default=list)
    read_only_paths = models.JSONField(default=list)

    # Límites
    max_depth = models.IntegerField(null=True)
    expires_at = models.DateTimeField(null=True)

    # Auditoría
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    granted_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
```

### Diagrama de Control de Acceso

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTROL DE ACCESO                            │
└─────────────────────────────────────────────────────────────────┘

    Petición de usuario
              │
              ▼
    ┌─────────────────────┐
    │ Verificar JWT       │
    │ (autenticación)     │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Verificar rol       │
    │ base del usuario    │
    └──────────┬──────────┘
               │
               ├─── superadmin → ACCESO TOTAL
               │
               ├─── admin → Verificar usuarios asignados
               │
               └─── otros → Verificar permisos específicos
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                  VERIFICACIÓN DE PERMISOS                    │
    │                                                              │
    │  1. Buscar UserPermission para (user, ruta)                 │
    │  2. Verificar si la ruta está en blocked_paths              │
    │  3. Verificar modo de herencia (inheritance_mode)           │
    │  4. Verificar profundidad (max_depth)                       │
    │  5. Verificar expiración (expires_at)                       │
    │  6. Verificar acción específica (read/write/delete)         │
    │  7. Para escritura: verificar read_only_paths               │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘
```

---

## 8.2 Sistema de Auditoría

### Descripción

El sistema registra **TODAS** las operaciones críticas realizadas en el sistema para cumplimiento regulatorio y trazabilidad completa.

### Modelo AuditLog

```python
class AuditLog(models.Model):
    """Registro de auditoría para todas las acciones críticas"""

    ACTION_CHOICES = (
        ('upload', 'Subir Archivo'),
        ('upload_batch', 'Subida Masiva'),
        ('download', 'Descargar'),
        ('delete', 'Eliminar'),
        ('rename', 'Renombrar'),
        ('create_folder', 'Crear Carpeta'),
        ('move', 'Mover'),
        ('copy', 'Copiar'),
        ('login', 'Inicio de sesión'),
        ('logout', 'Cierre de sesión'),
        ('update_exemptions', 'Actualizar Exenciones'),
    )

    # Usuario
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    username = models.CharField(max_length=150, db_index=True)
    user_role = models.CharField(max_length=20)

    # Acción
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    target_path = models.TextField()
    target_name = models.TextField(null=True)

    # Detalles
    file_size = models.BigIntegerField(null=True)
    details = models.JSONField(default=dict)

    # Información HTTP
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(null=True)

    # Resultado
    success = models.BooleanField(default=True)
    error_message = models.TextField(null=True)

    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
```

### Campos del Campo `details`

El campo `details` (JSON) almacena información adicional según la acción:

| Acción | Contenido de `details` |
|--------|------------------------|
| `upload` | `{original_name, final_name, used_ai, validation_passed}` |
| `download` | `{format: "file"|"zip", items_count}` |
| `delete` | `{is_directory, deleted_items: [{name, path, size}]}` |
| `rename` | `{old_name, new_name, used_smart_naming}` |
| `move` | `{source_path, destination_path}` |
| `copy` | `{source_path, destination_path}` |
| `login` | `{method: "credentials"|"token"}` |

### Ejemplo de Registro de Auditoría

```json
{
    "id": 12345,
    "username": "juan.perez",
    "user_role": "consultation_edit",
    "action": "upload",
    "target_path": "/documentos/informes",
    "target_name": "20250107_informe_cat.pdf",
    "file_size": 1048576,
    "details": {
        "original_name": "Informe de Catastro.pdf",
        "final_name": "20250107_informe_cat.pdf",
        "used_ai": true,
        "validation_passed": true
    },
    "ip_address": "192.168.1.100",
    "success": true,
    "timestamp": "2025-01-07T14:30:00Z"
}
```

---

## 8.3 Endpoints de Auditoría

### Logs de Auditoría

| Endpoint | Método | Acceso | Descripción |
|----------|--------|--------|-------------|
| `/api/audit/` | GET | Según rol | Listar logs con filtros |
| `/api/audit/stats/` | GET | Admin+ | Estadísticas generales |
| `/api/audit/dashboard/` | GET | Admin+ | Dashboard de actividad |
| `/api/audit/export-csv/` | GET | Admin+ | Exportar a CSV |
| `/api/audit/export-report-package/` | GET | Admin+ | Paquete ZIP de reportes |

### Auditoría por Directorio

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/audit/directory-audit/` | GET | Auditoría de directorio específico |
| `/api/audit/directory-audit-csv/` | GET | Exportar a CSV |
| `/api/audit/directory-audit-report-package/` | GET | Paquete completo de reportes |

### Seguimiento de Archivos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/audit/file-tracking/` | GET | Historial de un archivo |
| `/api/audit/file-tracking-csv/` | GET | Exportar seguimiento a CSV |
| `/api/audit/file-tracking-report-package/` | GET | Paquete de reportes |

### Análisis de ZIP

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/audit/analyze-zip/` | POST | Analizar contenido de ZIP |

---

## 8.4 Filtros de Auditoría

### Parámetros Disponibles

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `username` | string | Filtrar por nombre de usuario |
| `action` | string | Tipo de acción (upload, download, etc.) |
| `success` | boolean | Solo exitosos o fallidos |
| `start_date` | date | Fecha inicio (YYYY-MM-DD) |
| `end_date` | date | Fecha fin (YYYY-MM-DD) |
| `limit` | int | Cantidad de registros |
| `offset` | int | Desplazamiento para paginación |

### Ejemplo de Request

```http
GET /api/audit/?action=upload&start_date=2025-01-01&end_date=2025-01-07&limit=100&offset=0
Authorization: Bearer {token}
```

### Respuesta

```json
{
    "count": 1523,
    "results": [
        {
            "id": 12345,
            "username": "juan.perez",
            "action": "upload",
            "target_path": "/documentos",
            "target_name": "informe.pdf",
            "file_size": 1048576,
            "success": true,
            "timestamp": "2025-01-07T10:30:00Z",
            "ip_address": "192.168.1.100"
        }
    ]
}
```

---

## 8.5 Auditoría por Directorio

Permite analizar toda la actividad en un directorio específico.

### Request

```http
GET /api/audit/directory-audit/?path=/documentos/proyectos&date_from=2025-01-01&date_to=2025-01-31
Authorization: Bearer {token}
```

### Response

```json
{
    "path": "/documentos/proyectos",
    "date_range": {
        "from": "2025-01-01",
        "to": "2025-01-31"
    },
    "statistics": {
        "total_operations": 450,
        "uploads": 120,
        "downloads": 280,
        "deletes": 15,
        "renames": 25,
        "creates": 10
    },
    "top_users": [
        {"username": "maria.garcia", "total": 150},
        {"username": "carlos.lopez", "total": 120},
        {"username": "ana.martinez", "total": 80}
    ],
    "recent_operations": [...],
    "current_permissions": [
        {
            "username": "maria.garcia",
            "permissions": {
                "read": true,
                "write": true,
                "delete": false,
                "create_directories": true
            },
            "granted_by": "admin",
            "granted_at": "2025-01-01T09:00:00Z"
        }
    ],
    "permission_history": [...]
}
```

---

## 8.6 Seguimiento de Archivo

Muestra el historial completo de un archivo específico a través del tiempo.

### Request

```http
GET /api/audit/file-tracking/?filename=informe_2025.pdf&date_from=2025-01-01
Authorization: Bearer {token}
```

### Response

```json
{
    "filename": "informe_2025.pdf",
    "total_operations": 25,
    "operations_by_type": {
        "Subir Archivo": [
            {"timestamp": "2025-01-05T10:00:00Z", "username": "juan.perez", "path": "/docs"}
        ],
        "Renombrar": [
            {"timestamp": "2025-01-06T11:00:00Z", "username": "maria.garcia",
             "details": {"old_name": "informe.pdf", "new_name": "informe_2025.pdf"}}
        ],
        "Descargar": [...]
    },
    "timeline": [
        {"target_path": "/docs", "timestamp": "2025-01-05T10:00:00Z", "action": "upload"},
        {"target_path": "/docs/final", "timestamp": "2025-01-06T14:00:00Z", "action": "move"}
    ],
    "first_seen": "2025-01-05T10:00:00Z",
    "last_seen": "2025-01-07T16:30:00Z"
}
```

---

## 8.7 Auditoría de Permisos

### Modelo PermissionAudit

```python
class PermissionAudit(models.Model):
    """Registro de cambios en permisos de usuarios"""

    ACTION_CHOICES = (
        ('granted', 'Permiso Otorgado'),
        ('revoked', 'Permiso Revocado'),
        ('modified', 'Permiso Modificado'),
    )

    PERMISSION_TYPE_CHOICES = (
        ('read', 'Lectura'),
        ('write', 'Escritura'),
        ('delete', 'Eliminación'),
        ('create_directories', 'Crear Directorios'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    base_path = models.TextField()
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    permission_type = models.CharField(max_length=30, choices=PERMISSION_TYPE_CHOICES)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True)
```

### Flujo de Auditoría de Permisos

```
┌─────────────────────────────────────────────────────────────────┐
│              FLUJO DE CAMBIO DE PERMISOS                        │
└─────────────────────────────────────────────────────────────────┘

    Admin modifica permisos de usuario
              │
              ▼
    ┌─────────────────────┐
    │ Validar que el      │
    │ admin tiene permiso │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Actualizar          │
    │ UserPermission      │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────────────────────────────────────────────┐
    │               CREAR REGISTRO DE AUDITORÍA                    │
    │                                                              │
    │  PermissionAudit.objects.create(                            │
    │      user=usuario_afectado,                                 │
    │      base_path="/ruta/afectada",                            │
    │      action="modified",                                      │
    │      permission_type="write",                                │
    │      changed_by=admin_que_hizo_cambio,                      │
    │      details={                                               │
    │          "old_value": False,                                │
    │          "new_value": True,                                 │
    │          "reason": "Necesita subir archivos"                │
    │      },                                                      │
    │      ip_address=request.META.get('REMOTE_ADDR')             │
    │  )                                                          │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Notificar al        │
    │ usuario afectado    │
    └─────────────────────┘
```

---

## 8.8 Exportación de Reportes

### CSV Simple

Exporta los logs filtrados a un archivo CSV compatible con Excel.

**Columnas incluidas:**
- ID
- Usuario
- Rol
- Acción
- Tipo (Archivo/Directorio)
- Ruta
- Ruta Windows (UNC)
- Nombre Archivo
- Tamaño (bytes)
- Extensión
- Dirección IP
- Éxito
- Mensaje Error
- Fecha y Hora

### Paquete de Reportes (ZIP)

El paquete completo incluye:

| Archivo | Contenido |
|---------|-----------|
| `auditoria.csv` | Datos en formato CSV |
| `arbol_directorios.txt` | Estructura de árbol de rutas |
| `auditoria.xlsx` | Datos en formato Excel (si disponible) |
| `timeline.html` | Visualización de línea de tiempo |
| `README.txt` | Información sobre el reporte |

---

## 8.9 Dashboard de Auditoría

### Request

```http
GET /api/audit/dashboard/?period=7d
Authorization: Bearer {token}
```

### Períodos Disponibles

| Parámetro | Descripción |
|-----------|-------------|
| `24h` | Últimas 24 horas |
| `7d` | Últimos 7 días |
| `30d` | Últimos 30 días |

### Response

```json
{
    "period": "7d",
    "total_operations": 5420,
    "activity_by_day": [
        {"day": "2025-01-01", "count": 750},
        {"day": "2025-01-02", "count": 820},
        {"day": "2025-01-03", "count": 680}
    ],
    "top_users": [
        {"username": "maria.garcia", "total": 450},
        {"username": "carlos.lopez", "total": 380}
    ],
    "top_directories": [
        {"target_path": "/documentos/proyectos", "total": 1200},
        {"target_path": "/informes/2025", "total": 850}
    ],
    "recent_operations": [...],
    "statistics": {
        "uploads": 1500,
        "downloads": 3200,
        "deletes": 120,
        "renames": 350,
        "creates": 250
    }
}
```

---

## 8.10 Panel de Administración

### Funcionalidades

| Funcionalidad | Descripción | Acceso |
|---------------|-------------|--------|
| **Gestión de Usuarios** | Crear, editar, desactivar usuarios | Admin+ |
| **Gestión de Permisos** | Asignar permisos por ruta | Admin+ |
| **Estadísticas de Uso** | Métricas del sistema | Admin+ |
| **Configuración Global** | Ajustes del sistema | SuperAdmin |
| **Diccionario** | Gestionar términos | SuperAdmin |
| **Papelera** | Gestionar elementos eliminados | SuperAdmin |
| **Enlaces Compartidos** | Ver y revocar enlaces | SuperAdmin |
| **API Keys** | Gestionar keys de GROQ | SuperAdmin |

### Endpoints de Administración

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/system-stats/` | GET | Estadísticas del sistema |
| `/api/admin/users/` | GET/POST | Gestión de usuarios |
| `/api/admin/users/{id}/` | GET/PUT/DELETE | Usuario específico |
| `/api/admin/users/{id}/permissions/` | GET/POST | Permisos de usuario |
| `/api/admin/bulk-permissions/` | POST | Permisos masivos |
| `/api/admin/groq-keys/` | GET/POST | Gestión de API keys |

---

## 8.11 Diagrama de Flujo de Auditoría

```
┌─────────────────────────────────────────────────────────────────┐
│                FLUJO COMPLETO DE AUDITORÍA                      │
└─────────────────────────────────────────────────────────────────┘

    Usuario realiza operación (upload, download, etc.)
              │
              ▼
    ┌─────────────────────┐
    │ ViewSet procesa     │
    │ la operación        │
    └──────────┬──────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌─────────┐        ┌─────────┐
│ Éxito   │        │ Error   │
└────┬────┘        └────┬────┘
     │                  │
     ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CREAR REGISTRO DE AUDITORÍA                   │
│                                                                  │
│  AuditLog.objects.create(                                       │
│      user=request.user,                                         │
│      username=request.user.username,                            │
│      user_role=request.user.role,                               │
│      action='upload',                                           │
│      target_path='/documentos/informes',                        │
│      target_name='informe.pdf',                                 │
│      file_size=1048576,                                         │
│      details={...},                                             │
│      ip_address=request.META.get('REMOTE_ADDR'),                │
│      user_agent=request.META.get('HTTP_USER_AGENT'),            │
│      success=True/False,                                        │
│      error_message='...' if error else None                     │
│  )                                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Retornar respuesta  │
    │ al usuario          │
    └─────────────────────┘
```

---

## 8.12 Retención y Limpieza

### Políticas de Retención

| Tipo de Dato | Retención | Acción |
|--------------|-----------|--------|
| Logs de auditoría | 1 año | Archivado automático |
| Análisis de ZIP | 24 horas cache | Regeneración bajo demanda |
| Permisos revocados | Permanente | Registro histórico |
| Sesiones | 24 horas | Eliminación automática |

### Tarea Celery de Limpieza

```python
# tasks/audit_tasks.py

@shared_task
def cleanup_old_audit_logs():
    """Archiva logs de auditoría mayores a 1 año"""
    cutoff_date = timezone.now() - timedelta(days=365)

    # Exportar a archivo de respaldo
    old_logs = AuditLog.objects.filter(timestamp__lt=cutoff_date)
    export_to_archive(old_logs)

    # Eliminar registros antiguos
    deleted, _ = old_logs.delete()

    return f"Archivados {deleted} registros de auditoría"
```

---

*Figura 8.1: Sistema de Administración y Auditoría*
