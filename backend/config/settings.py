"""
Django settings for Sistema de Gestión de Archivos NetApp - IGAC
"""

import os
from pathlib import Path
from datetime import timedelta
import environ

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent

# Environ setup
env = environ.Env(
    DEBUG=(bool, False)
)

# Read .env file
env_file = BASE_DIR / '.env'
if env_file.exists():
    environ.Env.read_env(env_file)

# ==============================================================================
# CORE SETTINGS
# ==============================================================================

SECRET_KEY = env('SECRET_KEY', default='django-insecure-CHANGE-THIS-IN-PRODUCTION')
DEBUG = env('DEBUG', default=True)
# SECURITY: Removed '*' to prevent Host Header Injection attacks
# Add your specific domains to ALLOWED_HOSTS environment variable
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[
    'localhost',
    '127.0.0.1',
    '172.29.48.1',
    'gestionarchivo.duckdns.org',
])

# ==============================================================================
# APPLICATIONS
# ==============================================================================

INSTALLED_APPS = [
    # Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'django_celery_beat',

    # Local apps
    'users.apps.UsersConfig',
    'files.apps.FilesConfig',
    'audit.apps.AuditConfig',
    'dictionary.apps.DictionaryConfig',
    'groq_stats.apps.GroqStatsConfig',
    'sharing.apps.SharingConfig',
    'trash.apps.TrashConfig',
    'notifications.apps.NotificationsConfig',
]

# ==============================================================================
# MIDDLEWARE
# ==============================================================================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS debe ir temprano
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'users.middleware.PermissionExpirationMiddleware',  # Desactiva permisos vencidos automáticamente
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'config.middleware.SecurityHeadersMiddleware',  # Headers de seguridad adicionales
    'audit.middleware.AuditMiddleware',  # Custom middleware para auditoría
]

# ==============================================================================
# ROUTING
# ==============================================================================

ROOT_URLCONF = 'config.urls'

# Disable trailing slash requirement for REST API
APPEND_SLASH = True

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ==============================================================================
# DATABASES
# ==============================================================================

DATABASES = {
    'default': {
        'ENGINE': env('DB_ENGINE', default='django.db.backends.postgresql'),
        'NAME': env('DB_NAME', default='gestion_archivo_db'),
        'USER': env('DB_USER', default='postgres'),
        'PASSWORD': env('DB_PASSWORD', default='1234'),
        'HOST': env('POSTGRES_HOST', default=env('DB_HOST', default='localhost')),
        'PORT': env('POSTGRES_PORT', default=env('DB_PORT', default='5432')),
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'connect_timeout': 10,
            'client_encoding': 'UTF8',
        }
    },
    # Base de datos de NetApp Index (para migración)
    'netapp_index': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('NETAPP_DB_NAME', default='netapp_index'),
        'USER': env('NETAPP_DB_USER', default='postgres'),
        'PASSWORD': env('NETAPP_DB_PASSWORD', default='1234'),
        'HOST': env('NETAPP_DB_HOST', default='localhost'),
        'PORT': env('NETAPP_DB_PORT', default='5432'),
        'OPTIONS': {
            'client_encoding': 'UTF8',
        }
    }
}

# ==============================================================================
# AUTHENTICATION
# ==============================================================================

AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ==============================================================================
# REST FRAMEWORK
# ==============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'EXCEPTION_HANDLER': 'utils.exceptions.custom_exception_handler',
}

# ==============================================================================
# JWT SETTINGS
# ==============================================================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=env.int('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=env.int('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('JWT_SECRET_KEY', default=SECRET_KEY),
    'VERIFYING_KEY': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# ==============================================================================
# CORS SETTINGS
# ==============================================================================

# En desarrollo, permitir todos los orígenes
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = env.list(
        'CORS_ALLOWED_ORIGINS',
        default=[
            'http://localhost:4545',  # Vite dev server
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:4545',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
        ]
    )

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# ==============================================================================
# IN-MEMORY CACHE (No requiere Redis)
# ==============================================================================

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'gestion_archivo_cache',
        'TIMEOUT': 300,  # 5 minutos por defecto
        'OPTIONS': {
            'MAX_ENTRIES': 1000
        }
    }
}

# Session using Redis
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# ==============================================================================
# CELERY SETTINGS
# ==============================================================================

CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/2')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/2')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'America/Bogota'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutos

# ==============================================================================
# INTERNATIONALIZATION
# ==============================================================================

LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

# ==============================================================================
# STATIC & MEDIA FILES
# ==============================================================================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ==============================================================================
# FILE HANDLING
# ==============================================================================

# NetApp Repository
NETAPP_PATH = env('NETAPP_PATH', default=r'\\repositorio')

# SMB Configuration (for smbprotocol)
SMB_SERVER = env('SMB_SERVER', default='172.21.54.20')
SMB_SHARE = env('SMB_SHARE', default='DirGesCat')
SMB_USERNAME = env('SMB_USERNAME', default='')
SMB_PASSWORD = env('SMB_PASSWORD', default='')
SMB_DOMAIN = env('SMB_DOMAIN', default='IGAC')
SMB_BASE_PATH = env('SMB_BASE_PATH', default='')

# Legacy settings (mantener compatibilidad)
NETAPP_SMB_USERNAME = env('NETAPP_SMB_USERNAME', default=env('SMB_USERNAME', default=''))
NETAPP_SMB_PASSWORD = env('NETAPP_SMB_PASSWORD', default=env('SMB_PASSWORD', default=''))
NETAPP_SMB_DOMAIN = env('NETAPP_SMB_DOMAIN', default=env('SMB_DOMAIN', default=''))

# File upload limits
DATA_UPLOAD_MAX_MEMORY_SIZE = env.int('MAX_UPLOAD_SIZE_MB', default=2048) * 1024 * 1024  # En bytes
FILE_UPLOAD_MAX_MEMORY_SIZE = DATA_UPLOAD_MAX_MEMORY_SIZE
MAX_PATH_LENGTH = env.int('MAX_PATH_LENGTH', default=260)

# Dictionary file
DICTIONARY_FILE_PATH = BASE_DIR.parent / 'diccionario_archivo.json'

# ==============================================================================
# TRASH / PAPELERA DE RECICLAJE
# ==============================================================================

# Habilitar/deshabilitar papelera
TRASH_ENABLED = env.bool('TRASH_ENABLED', default=True)

# Ruta relativa de la papelera dentro del repositorio
TRASH_PATH = env('TRASH_PATH', default='04_bk/bk_temp_subproy/.trash')

# Tamaño máximo de archivo/directorio para respaldar en papelera (en GB)
# Archivos mayores se eliminan directamente sin respaldo
TRASH_MAX_SIZE_GB = env.float('TRASH_MAX_SIZE_GB', default=5.0)

# Días de retención antes de eliminar automáticamente
TRASH_RETENTION_DAYS = env.int('TRASH_RETENTION_DAYS', default=30)

# ==============================================================================
# LOGGING
# ==============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': env('LOG_LEVEL', default='INFO'),
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': env('LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'users': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'files': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'audit': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# ==============================================================================
# SECURITY SETTINGS
# ==============================================================================

if not DEBUG:
    # SECURE_SSL_REDIRECT = True  # ❌ DISABLED - Nginx handles SSL termination
    # Causes redirect loop when nginx proxies HTTP to backend
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# ==============================================================================
# DEFAULT SETTINGS
# ==============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==============================================================================
# CUSTOM SETTINGS
# ==============================================================================

# Roles disponibles
USER_ROLES = (
    ('consultation', 'Consulta'),
    ('consultation_edit', 'Consulta + Edición'),
    ('admin', 'Administrador'),
    ('superadmin', 'Super Administrador'),
)

# Email domain for IGAC
IGAC_EMAIL_DOMAIN = '@igac.gov.co'

# Acciones de auditoría
AUDIT_ACTIONS = (
    ('upload', 'Subir Archivo'),
    ('download', 'Descargar'),
    ('delete', 'Eliminar'),
    ('rename', 'Renombrar'),
    ('create_folder', 'Crear Carpeta'),
    ('move', 'Mover'),
    ('copy', 'Copiar'),
)

# ==============================================================================
# NETAPP CONFIGURATION
# ==============================================================================

# Ruta base de NetApp
NETAPP_BASE_PATH = env(
    'NETAPP_BASE_PATH',
    default=str('/netapp')
)

# Límite de caracteres para rutas completas
MAX_PATH_LENGTH = env.int('MAX_PATH_LENGTH', default=260)

# ==============================================================================
# AI CONFIGURATION (GROQ + OLLAMA LOCAL)
# ==============================================================================

# --- OLLAMA LOCAL (Prioridad 1 - IA Local) ---
# Servidor Ollama local para independencia de APIs externas
OLLAMA_ENABLED = env.bool('OLLAMA_ENABLED', default=True)
OLLAMA_BASE_URL = env('OLLAMA_BASE_URL', default='http://host.docker.internal:11434')
OLLAMA_MODEL = env('OLLAMA_MODEL', default='llama3.2:3b')
OLLAMA_TIMEOUT = env.int('OLLAMA_TIMEOUT', default=30)  # segundos

# --- GROQ API (Prioridad 2 - Fallback cloud) ---
# API Keys de GROQ (soporta pool de múltiples keys separadas por comas)
# Ejemplo: GROQ_API_KEYS=key1,key2,key3,key4,key5
# También soporta formato antiguo GROQ_API_KEY para una sola key (compatibilidad)
GROQ_API_KEYS = env('GROQ_API_KEYS', default='')
GROQ_API_KEY = env('GROQ_API_KEY', default='')  # Formato antiguo (compatibilidad)

# Modelo a usar
GROQ_MODEL = env('GROQ_MODEL', default='llama-3.3-70b-versatile')

# Parámetros del modelo
GROQ_MAX_TOKENS = env.int('GROQ_MAX_TOKENS', default=1000)
GROQ_TEMPERATURE = env.float('GROQ_TEMPERATURE', default=0.3)

# ==============================================================================
# MICROSOFT 365 / AZURE AD CONFIGURATION
# ==============================================================================

# Azure AD Application credentials
AZURE_CLIENT_ID = env('AZURE_CLIENT_ID', default='')
AZURE_CLIENT_SECRET = env('AZURE_CLIENT_SECRET', default='')
AZURE_TENANT_ID = env('AZURE_TENANT_ID', default='')

# OneDrive temporary folder for collaborative editing
ONEDRIVE_TEMP_FOLDER = env('ONEDRIVE_TEMP_FOLDER', default='NetApp_Temp')

# Tiempo de expiración de sesión de edición (en segundos)
OFFICE_EDIT_SESSION_TIMEOUT = env.int('OFFICE_EDIT_SESSION_TIMEOUT', default=3600)  # 1 hora

# ==============================================================================
# ONLYOFFICE CONFIGURATION
# ==============================================================================

# OnlyOffice Cloud API Key
ONLYOFFICE_API_KEY = env('ONLYOFFICE_API_KEY', default='')

# OnlyOffice JWT Secret (para firmar tokens)
ONLYOFFICE_JWT_SECRET = env('ONLYOFFICE_JWT_SECRET', default='')

# OnlyOffice Document Server URL
ONLYOFFICE_EDITOR_URL = env('ONLYOFFICE_EDITOR_URL', default='https://documentserver.onlyoffice.com')

# OnlyOffice API URL
ONLYOFFICE_API_URL = env('ONLYOFFICE_API_URL', default='https://api.onlyoffice.com')

# Preferir OnlyOffice sobre Microsoft (si ambos están configurados)
USE_ONLYOFFICE = env.bool('USE_ONLYOFFICE', default=True)

# ==============================================================================
# EMAIL CONFIGURATION (Para notificaciones)
# ==============================================================================

EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='archivo@igac.gov.co')

# URL del frontend para links en emails
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:4545')

# ==============================================================================
# AUDIT LOG RETENTION
# ==============================================================================

# Días de retención de logs de auditoría (1 año + 1 día = 366)
AUDIT_LOG_RETENTION_DAYS = env.int('AUDIT_LOG_RETENTION_DAYS', default=366)
