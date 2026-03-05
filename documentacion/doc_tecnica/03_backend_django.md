# 4. Backend - Django REST Framework

## 4.1 Estructura del Proyecto

```
backend/
├── config/                 # Configuración principal Django
│   ├── __init__.py
│   ├── settings.py        # Configuración general
│   ├── urls.py            # URLs principales
│   ├── celery.py          # Configuración Celery
│   ├── middleware.py      # Middleware personalizado
│   └── wsgi.py
├── users/                  # App de usuarios y permisos
│   ├── models.py          # User, UserPermission, UserFavorite
│   ├── views.py           # ViewSets de autenticación
│   ├── views_admin.py     # ViewSets de administración
│   ├── serializers.py     # Serializers de usuario
│   ├── middleware.py      # Middleware de expiración de permisos
│   └── permissions.py     # Clases de permisos personalizados
├── files/                  # App de operaciones de archivos
│   ├── models.py          # Directory, DirectoryColor
│   ├── views.py           # FileViewSet (browse, upload, download)
│   └── serializers.py
├── audit/                  # App de auditoría
│   ├── models.py          # AuditLog, PermissionChangeLog
│   ├── views.py           # AuditLogViewSet
│   ├── middleware.py      # Middleware de auditoría
│   └── signals.py         # Señales para registro automático
├── dictionary/             # App de diccionario IGAC
│   ├── models.py          # DictionaryTerm, AIGeneratedAbbreviation
│   ├── views.py           # DictionaryViewSet
│   └── management/        # Comandos de gestión
├── groq_stats/            # App de estadísticas GROQ
│   ├── models.py          # GroqAPIKey
│   └── views.py           # GroqStatsViewSet
├── sharing/               # App de compartir archivos
│   ├── models.py          # ShareLink, ShareLinkAccess
│   └── views.py           # ShareLinkViewSet
├── trash/                 # App de papelera
│   ├── models.py          # TrashItem, TrashConfig
│   ├── views.py           # TrashViewSet
│   └── tasks.py           # Tareas Celery
├── notifications/         # App de notificaciones
│   ├── models.py          # Notification, MessageThread, Message
│   └── views.py           # NotificationViewSet
├── services/              # Servicios compartidos
│   ├── smb_service.py     # Servicio de acceso a NAS
│   ├── smart_naming.py    # Servicio de nomenclatura inteligente
│   └── groq_service.py    # Servicio de IA GROQ
├── manage.py
├── requirements.txt
└── Dockerfile
```

---

## 4.2 Configuración (settings.py)

### Aplicaciones Instaladas

```python
INSTALLED_APPS = [
    # Django Core
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third Party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'django_celery_beat',

    # Apps Locales
    'users.apps.UsersConfig',
    'files.apps.FilesConfig',
    'audit.apps.AuditConfig',
    'dictionary.apps.DictionaryConfig',
    'groq_stats.apps.GroqStatsConfig',
    'sharing.apps.SharingConfig',
    'trash.apps.TrashConfig',
    'notifications.apps.NotificationsConfig',
]
```

### Configuración REST Framework

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}
```

### Configuración JWT

```python
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('JWT_SECRET_KEY'),
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

### Middleware Personalizado

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'users.middleware.PermissionExpirationMiddleware',  # Expiración de permisos
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'config.middleware.SecurityHeadersMiddleware',      # Headers de seguridad
    'audit.middleware.AuditMiddleware',                 # Auditoría automática
]
```

---

## 4.3 Modelo de Usuario

### Clase User

El sistema utiliza un modelo de usuario personalizado que extiende `AbstractUser`:

```python
class User(AbstractUser):
    """
    Modelo de usuario personalizado con roles y exenciones
    """
    ROLE_CHOICES = (
        ('consultation', 'Consulta'),
        ('consultation_edit', 'Consulta + Edición'),
        ('admin', 'Administrador'),
        ('superadmin', 'Super Administrador'),
    )

    # Campos base
    email = models.EmailField('Email', unique=True)
    username = models.CharField('Username', max_length=150, unique=True)
    first_name = models.CharField('Nombre', max_length=150)
    last_name = models.CharField('Apellido', max_length=150)

    # Rol y permisos
    role = models.CharField('Rol', max_length=20, choices=ROLE_CHOICES)
    phone = models.CharField('Teléfono', max_length=20, blank=True, null=True)
    department = models.CharField('Dependencia', max_length=200, blank=True, null=True)
    position = models.CharField('Cargo', max_length=200, blank=True, null=True)

    # Permisos especiales de diccionario
    can_manage_dictionary = models.BooleanField(default=False)

    # Exenciones de validación
    exempt_from_naming_rules = models.BooleanField(default=False)
    exempt_from_path_limit = models.BooleanField(default=False)
    exempt_from_name_length = models.BooleanField(default=False)
    exemption_reason = models.TextField(blank=True, null=True)
    exemption_granted_by = models.ForeignKey('self', null=True, blank=True)
    exemption_granted_at = models.DateTimeField(null=True, blank=True)

    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('self', null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
```

### Jerarquía de Roles

| Rol | Nivel | Capacidades |
|-----|-------|-------------|
| `consultation` | 1 | Solo lectura en rutas asignadas |
| `consultation_edit` | 2 | Lectura + Escritura con validación IGAC |
| `admin` | 3 | Gestión de usuarios + Sin validación IGAC |
| `superadmin` | 4 | Acceso total al sistema |

---

## 4.4 Modelo de Permisos

### Clase UserPermission

```python
class UserPermission(models.Model):
    """
    Permisos granulares por ruta para cada usuario
    """
    EDIT_LEVEL_CHOICES = (
        ('upload_only', 'Solo subir'),
        ('upload_own', 'Subir + Eliminar propios'),
        ('upload_all', 'Subir + Eliminar todos'),
    )

    INHERITANCE_CHOICES = (
        ('total', 'Herencia total'),
        ('blocked', 'Sin herencia'),
        ('limited_depth', 'Profundidad limitada'),
        ('partial_write', 'Solo lectura en subdirectorios'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    base_path = models.TextField()
    group_name = models.CharField(max_length=100, blank=True, null=True)

    # Permisos básicos
    can_read = models.BooleanField(default=True)
    can_write = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_create_directories = models.BooleanField(default=True)
    exempt_from_dictionary = models.BooleanField(default=False)

    # Nivel de edición granular
    edit_permission_level = models.CharField(max_length=20, choices=EDIT_LEVEL_CHOICES)

    # Herencia de permisos
    inheritance_mode = models.CharField(max_length=20, choices=INHERITANCE_CHOICES)
    blocked_paths = models.JSONField(default=list)
    read_only_paths = models.JSONField(default=list)
    max_depth = models.PositiveIntegerField(null=True, blank=True)

    # Control de vigencia
    is_active = models.BooleanField(default=True)
    granted_by = models.ForeignKey(User, null=True, related_name='permissions_granted')
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    # Notificaciones de expiración
    expiration_notified_7days = models.BooleanField(default=False)
    expiration_notified_3days = models.BooleanField(default=False)

    notes = models.TextField(blank=True, null=True)
```

### Flujo de Verificación de Permisos

```
┌─────────────────────────────────────────────────────────────┐
│                    VERIFICACIÓN DE PERMISO                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ ¿Es superadmin? │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │ SÍ                          │ NO
              ▼                             ▼
    ┌─────────────────┐          ┌─────────────────────┐
    │ ACCESO TOTAL    │          │ Buscar permisos     │
    └─────────────────┘          │ para la ruta        │
                                 └──────────┬──────────┘
                                            │
                              ┌─────────────┴─────────────┐
                              │ ¿Permiso activo           │
                              │ y no expirado?            │
                              └─────────────┬─────────────┘
                                            │
                     ┌──────────────────────┴───────────────────────┐
                     │ SÍ                                          │ NO
                     ▼                                             ▼
           ┌─────────────────────┐                     ┌─────────────────┐
           │ Verificar herencia  │                     │ ACCESO DENEGADO │
           │ y paths bloqueados  │                     └─────────────────┘
           └──────────┬──────────┘
                      │
           ┌──────────┴──────────┐
           │ ¿Path bloqueado?    │
           └──────────┬──────────┘
                      │
        ┌─────────────┴─────────────┐
        │ SÍ                        │ NO
        ▼                           ▼
┌─────────────────┐     ┌─────────────────────────┐
│ ACCESO DENEGADO │     │ Retornar nivel de       │
└─────────────────┘     │ permiso (read/write/del)│
                        └─────────────────────────┘
```

---

## 4.5 Servicio SMB (smb_service.py)

### Propósito

El servicio SMB maneja todas las operaciones de archivos contra el NAS NetApp.

### Funciones Principales

| Función | Descripción |
|---------|-------------|
| `list_directory(path)` | Lista contenido de directorio |
| `create_directory(path)` | Crea un nuevo directorio |
| `delete_item(path)` | Mueve item a papelera |
| `rename_item(old, new)` | Renombra archivo/carpeta |
| `copy_item(src, dst)` | Copia archivo/carpeta |
| `move_item(src, dst)` | Mueve archivo/carpeta |
| `get_file_stream(path)` | Obtiene stream para descarga |
| `save_uploaded_file(path, file)` | Guarda archivo subido |

### Ejemplo de Implementación

```python
class SMBService:
    def __init__(self):
        self.base_path = settings.NETAPP_BASE_PATH

    def list_directory(self, relative_path: str) -> list:
        """
        Lista el contenido de un directorio.
        Retorna lista de items con metadatos.
        """
        full_path = os.path.join(self.base_path, relative_path.lstrip('/'))

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Directorio no encontrado: {relative_path}")

        items = []
        for entry in os.scandir(full_path):
            stat_info = entry.stat()
            is_dir = entry.is_dir()

            # Contar elementos si es directorio
            item_count = None
            if is_dir:
                try:
                    item_count = len(os.listdir(entry.path))
                except (PermissionError, OSError):
                    item_count = None

            items.append({
                'name': entry.name,
                'path': os.path.join(relative_path, entry.name),
                'is_directory': is_dir,
                'size': stat_info.st_size if not is_dir else 0,
                'modified_date': stat_info.st_mtime,
                'created_date': stat_info.st_ctime,
                'extension': os.path.splitext(entry.name)[1].lower() if not is_dir else None,
                'item_count': item_count,
            })

        return items
```

---

## 4.6 Servicio de Nomenclatura Inteligente (smart_naming.py)

### Propósito

Valida y sugiere nombres de archivos según las 12 reglas IGAC, integrando IA cuando es necesario.

### Reglas de Validación IGAC

| # | Regla | Ejemplo Incorrecto | Correcto |
|---|-------|-------------------|----------|
| 1 | Solo caracteres permitidos (a-z, 0-9, _) | `archivo@2024.pdf` | `archivo_2024.pdf` |
| 2 | Sin espacios | `mi archivo.pdf` | `mi_archivo.pdf` |
| 3 | Sin tildes ni ñ | `información.pdf` | `informacion.pdf` |
| 4 | Sin mayúsculas | `MiArchivo.PDF` | `miarchivo.pdf` |
| 5 | Sin caracteres especiales | `archivo(v2).pdf` | `archivo_v2.pdf` |
| 6 | Sin palabras prohibidas | `informe_final.pdf` | `informe_20240115.pdf` |
| 7 | Máximo 50 caracteres | `nombre_muy_largo...` | `nombre_corto.pdf` |
| 8 | Sin guiones bajos consecutivos | `archivo__doble.pdf` | `archivo_doble.pdf` |
| 9 | No empieza/termina con _ | `_archivo_.pdf` | `archivo.pdf` |
| 10 | Fecha formato AAAAMMDD | `archivo_15-01-2024.pdf` | `archivo_20240115.pdf` |
| 11 | Sin vocales dobles (excepto rr, ll) | `coordiinadas.pdf` | `coordenadas.pdf` |
| 12 | Usar abreviaciones del diccionario | `proyecto_catastro.pdf` | `proy_cat.pdf` |

### Flujo de Validación

```python
def smart_validate(name: str, current_path: str = None) -> dict:
    """
    Valida un nombre de archivo según reglas IGAC.

    Returns:
        {
            'valid': bool,
            'errors': list,
            'warnings': list,
            'formatted_name': str,
            'parts_analysis': list,
            'needs_ai': bool,
            'user_exemptions': dict
        }
    """
```

---

## 4.7 API ViewSets

### Estructura General

Todos los ViewSets siguen el patrón Django REST Framework:

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class FileViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """GET /api/files/"""
        pass

    @action(detail=False, methods=['get'])
    def browse(self, request):
        """GET /api/file-ops/browse?path=/"""
        pass

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """POST /api/file-ops/upload"""
        pass
```

### ViewSets Principales

| ViewSet | Base URL | Descripción |
|---------|----------|-------------|
| `AuthViewSet` | `/api/auth/` | Autenticación (login, logout, me) |
| `UserViewSet` | `/api/users/` | CRUD de usuarios |
| `UserPermissionViewSet` | `/api/permissions/` | CRUD de permisos |
| `FileViewSet` | `/api/file-ops/` | Operaciones de archivos |
| `DictionaryViewSet` | `/api/dictionary/` | Gestión del diccionario |
| `AuditLogViewSet` | `/api/audit/` | Logs de auditoría |
| `ShareLinkViewSet` | `/api/sharing/` | Enlaces compartidos |
| `TrashViewSet` | `/api/trash/` | Papelera de reciclaje |
| `NotificationViewSet` | `/api/notifications/` | Notificaciones |

---

## 4.8 Serializers

### Ejemplo: UserSerializer

```python
class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    permissions_count = serializers.SerializerMethodField()
    naming_exemptions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'role', 'phone', 'department', 'position',
            'is_active', 'can_manage_dictionary',
            'exempt_from_naming_rules', 'exempt_from_path_limit',
            'exempt_from_name_length', 'naming_exemptions',
            'permissions_count', 'created_at', 'last_login'
        ]

    def get_permissions_count(self, obj):
        return obj.userpermission_set.filter(is_active=True).count()

    def get_naming_exemptions(self, obj):
        return {
            'exempt_from_naming_rules': obj.exempt_from_naming_rules,
            'exempt_from_path_limit': obj.exempt_from_path_limit,
            'exempt_from_name_length': obj.exempt_from_name_length,
            'is_privileged_role': obj.role in ['admin', 'superadmin']
        }
```

---

## 4.9 Middleware Personalizado

### AuditMiddleware

Registra automáticamente todas las operaciones de archivos:

```python
class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Solo registrar operaciones de archivos exitosas
        if request.path.startswith('/api/file-ops/') and response.status_code < 400:
            self._log_operation(request, response)

        return response

    def _log_operation(self, request, response):
        from audit.models import AuditLog

        action_map = {
            'upload': 'upload',
            'download': 'download',
            'delete': 'delete',
            'rename': 'rename',
            # ...
        }
        # Crear registro de auditoría
```

### PermissionExpirationMiddleware

Verifica y desactiva permisos expirados:

```python
class PermissionExpirationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Desactivar permisos expirados del usuario
            UserPermission.objects.filter(
                user=request.user,
                is_active=True,
                expires_at__lt=timezone.now()
            ).update(is_active=False, revoked_at=timezone.now())

        return self.get_response(request)
```

---

## 4.10 Señales (Signals)

### Registro Automático de Cambios

```python
# audit/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from users.models import UserPermission
from .models import PermissionChangeLog

@receiver(post_save, sender=UserPermission)
def log_permission_change(sender, instance, created, **kwargs):
    """Registra cambios en permisos"""
    PermissionChangeLog.objects.create(
        permission=instance,
        action='created' if created else 'updated',
        changed_by=get_current_user(),
        old_values=get_old_values(),
        new_values=get_new_values(instance)
    )
```

---

## 4.11 Tareas Celery

### Definición de Tareas

```python
# trash/tasks.py
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

@shared_task
def clean_expired_trash_items():
    """
    Elimina permanentemente items de papelera
    que hayan expirado (>30 días por defecto).
    """
    from .models import TrashItem, TrashConfig

    config = TrashConfig.get_config()
    expiry_date = timezone.now() - timedelta(days=config.retention_days)

    expired_items = TrashItem.objects.filter(
        deleted_at__lt=expiry_date
    )

    for item in expired_items:
        item.permanent_delete()

    return f"Eliminados {expired_items.count()} items expirados"
```

### Programación de Tareas

```python
# config/celery.py
from celery.schedules import crontab

app.conf.beat_schedule = {
    'clean-expired-trash': {
        'task': 'trash.tasks.clean_expired_trash_items',
        'schedule': crontab(hour=3, minute=0),  # 3:00 AM diario
    },
    'check-permission-expiry': {
        'task': 'users.tasks.check_permission_expiry',
        'schedule': crontab(hour=6, minute=0),  # 6:00 AM diario
    },
    'clean-old-attachments': {
        'task': 'notifications.tasks.clean_old_attachments',
        'schedule': crontab(hour=4, minute=0),  # 4:00 AM diario
    },
}
```

---

## 4.12 Manejo de Errores

### Excepciones Personalizadas

```python
# config/exceptions.py
from rest_framework.exceptions import APIException

class PermissionDeniedError(APIException):
    status_code = 403
    default_detail = 'No tiene permisos para esta operación'
    default_code = 'permission_denied'

class PathNotFoundError(APIException):
    status_code = 404
    default_detail = 'Ruta no encontrada'
    default_code = 'path_not_found'

class NamingValidationError(APIException):
    status_code = 400
    default_detail = 'El nombre no cumple con las reglas IGAC'
    default_code = 'naming_validation_error'
```

### Handler Global de Excepciones

```python
# config/exception_handler.py
from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data['success'] = False
        response.data['error_code'] = getattr(exc, 'default_code', 'error')

    return response
```
