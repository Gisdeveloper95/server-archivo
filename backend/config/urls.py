"""
URL configuration for config project.

Sistema de Gestión de Archivos NetApp - IGAC
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny, IsAuthenticated

from users.views import AuthViewSet, UserViewSet, UserPermissionViewSet, UserFavoriteViewSet
from users.views_admin import AdminUserViewSet
from files.views import FileViewSet, StatsViewSet, open_in_office_online, save_from_office_online
# from files.views_new import FileOperationsViewSet  # COMENTADO: Archivo no existe
from dictionary.views import DictionaryViewSet, AIGeneratedAbbreviationViewSet
from audit.views import AuditLogViewSet, PermissionAuditViewSet
from groq_stats.views import GroqStatsViewSet
from sharing.views import ShareLinkViewSet

# Router principal (sin trailing slashes)
router = DefaultRouter(trailing_slash=False)

# === ENDPOINTS DE AUTENTICACIÓN ===
# /api/auth/login/ - POST - Iniciar sesión
# /api/auth/logout/ - POST - Cerrar sesión
# /api/auth/me/ - GET - Obtener usuario actual
# /api/auth/change_password/ - POST - Cambiar contraseña
# /api/auth/refresh/ - POST - Refrescar token
router.register(r'auth', AuthViewSet, basename='auth')

# === ENDPOINTS DE USUARIOS ===
# /api/users/ - GET, POST - Listar/crear usuarios
# /api/users/{id}/ - GET, PUT, PATCH, DELETE - Detalle de usuario
# /api/users/me/ - GET - Usuario actual
# /api/users/by_role/ - GET - Filtrar por rol
router.register(r'users', UserViewSet, basename='user')

# === ENDPOINTS DE PERMISOS ===
# /api/permissions/ - GET, POST - Listar/crear permisos
# /api/permissions/{id}/ - GET, PUT, PATCH, DELETE - Detalle de permiso
# /api/permissions/by_user/ - GET - Permisos de un usuario
# /api/permissions/by_path/ - GET - Permisos de una ruta
# /api/permissions/{id}/revoke/ - POST - Revocar permiso
router.register(r'permissions', UserPermissionViewSet, basename='permission')

# === ENDPOINTS DE FAVORITOS ===
# /api/favorites/ - GET, POST - Listar/crear favoritos
# /api/favorites/{id}/ - GET, DELETE - Detalle de favorito
# /api/favorites/reorder/ - POST - Reordenar favoritos
router.register(r'favorites', UserFavoriteViewSet, basename='favorite')

# === ENDPOINTS DE ARCHIVOS (Old - DB based) ===
# /api/files/ - GET - Listar archivos de BD
router.register(r'files', FileViewSet, basename='file')

# === ENDPOINTS DE OPERACIONES DE ARCHIVOS (New - NetApp direct) ===
# /api/file-ops/browse/ - GET - Navegar directorios en vivo
# /api/file-ops/create-folder/ - POST - Crear carpeta
# /api/file-ops/upload/ - POST - Subir archivo
# /api/file-ops/download/ - GET - Descargar archivo/carpeta
# /api/file-ops/delete/ - POST - Eliminar archivo/carpeta
# /api/file-ops/rename/ - POST - Renombrar
# /api/file-ops/validate-name/ - POST - Validar nombre
# /api/file-ops/suggest-name/ - POST - Sugerir nombre con GROQ AI
# /api/file-ops/path-info/ - GET - Info de caracteres disponibles
# /api/file-ops/search/ - GET - Buscar en directorio
# router.register(r'file-ops', FileOperationsViewSet, basename='file-ops')  # COMENTADO: ViewSet no existe

# === ENDPOINTS DE DICCIONARIO ===
# /api/dictionary/ - GET - Listar términos del diccionario (con búsqueda y filtros)
# /api/dictionary/{id}/ - GET, PUT, PATCH, DELETE - Detalle de término
# /api/dictionary/ - POST - Crear nuevo término (solo superadmin o can_manage_dictionary)
# /api/dictionary/active/ - GET - Obtener solo términos activos
# /api/dictionary/{id}/toggle-active/ - POST - Activar/desactivar término
# /api/dictionary/export-csv/ - GET - Exportar diccionario completo a CSV (todos los usuarios)
router.register(r'dictionary', DictionaryViewSet, basename='dictionary')

# === ENDPOINTS DE ABREVIACIONES GENERADAS POR IA ===
# /api/ai-abbreviations/ - GET - Listar abreviaciones generadas por IA
# /api/ai-abbreviations/{id}/ - GET - Detalle de abreviación
# /api/ai-abbreviations/summary/ - GET - Resumen de estadísticas
# /api/ai-abbreviations/{id}/approve/ - POST - Aprobar abreviación
# /api/ai-abbreviations/{id}/reject/ - POST - Rechazar abreviación
# /api/ai-abbreviations/{id}/correct/ - POST - Corregir abreviación
# /api/ai-abbreviations/{id}/add-to-dictionary/ - POST - Agregar al diccionario oficial
router.register(r'ai-abbreviations', AIGeneratedAbbreviationViewSet, basename='ai-abbreviations')

# === ENDPOINTS DE ESTADÍSTICAS ===
# /api/stats/ - GET - Estadísticas globales
# /api/stats/user_stats/ - GET - Estadísticas por usuario
router.register(r'stats', StatsViewSet, basename='stats')

# === ENDPOINTS DE AUDITORÍA ===
# /api/audit/ - GET - Listar logs de auditoría
# /api/audit/{id}/ - GET - Detalle de log
# /api/audit/stats/ - GET - Estadísticas de auditoría
# /api/audit/directory-audit/ - GET - Auditoría por directorio
# /api/audit/file-tracking/ - GET - Seguimiento de archivo
# /api/audit/analyze-zip/ - POST - Analizar archivo ZIP
# /api/audit/dashboard/ - GET - Dashboard de auditoría
router.register(r'audit', AuditLogViewSet, basename='audit')

# /api/permission-audit/ - GET - Historial de cambios de permisos
router.register(r'permission-audit', PermissionAuditViewSet, basename='permission-audit')

# === ENDPOINTS DE GROQ STATS ===
# /api/groq-stats/ - GET - Listar estadísticas de todas las API keys
# /api/groq-stats/{id}/ - GET - Detalle de una key específica
# /api/groq-stats/pool-summary/ - GET - Resumen agregado del pool completo
# /api/groq-stats/{id}/reset-stats/ - POST - Resetear estadísticas (solo superadmin)
# /api/groq-stats/{id}/toggle-active/ - POST - Activar/desactivar key (solo superadmin)
router.register(r'groq-stats', GroqStatsViewSet, basename='groq-stats')

# === ENDPOINTS DE ADMINISTRACIÓN (SOLO SUPERADMIN) ===
# /api/admin/users/ - GET, POST - Listar/crear usuarios
# /api/admin/users/{id}/ - PATCH, DELETE - Editar/eliminar usuario
# /api/admin/users/{id}/resend-credentials/ - POST - Reenviar credenciales
# /api/admin/users/{id}/permissions/ - GET, POST - Ver/asignar permisos
# /api/admin/permissions/{id}/ - DELETE - Eliminar permiso
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')

# === ENDPOINTS DE COMPARTICIÓN (SOLO SUPERADMIN) ===
# /api/sharing/ - GET - Listar links compartidos (solo superadmin)
# /api/sharing/{id}/ - GET, PATCH, DELETE - Detalle de link compartido
# /api/sharing/create_share/ - POST - Crear nuevo link (solo superadmin)
# /api/sharing/{id}/deactivate/ - POST - Desactivar link
# /api/sharing/{id}/stats/ - GET - Estadísticas del link
# /api/sharing/access/ - GET - Acceso público al archivo compartido (sin auth)
router.register(r'sharing', ShareLinkViewSet, basename='sharing')

# === ENDPOINTS DE PAPELERA DE RECICLAJE ===
# /api/trash/ - GET - Listar items en papelera
# /api/trash/{trash_id}/ - GET - Detalle de item
# /api/trash/{trash_id}/ - DELETE - Eliminar permanentemente
# /api/trash/{trash_id}/restore/ - POST - Restaurar item
# /api/trash/{trash_id}/share/ - POST - Generar link de descarga
# /api/trash/stats/ - GET - Estadísticas de papelera (superadmin)
# /api/trash/cleanup/ - DELETE - Limpiar expirados (superadmin)
# /api/trash/by-path/ - GET - Items eliminados de una ruta

urlpatterns = [
    # Papelera de reciclaje
    path('api/trash/', include('trash.urls')),

    # Sistema de notificaciones
    path('api/notifications/', include('notifications.urls')),

    # Admin de Django
    path('admin/', admin.site.urls),

    # === ENDPOINTS DE AUTENTICACIÓN (Function views) ===
    path('api/auth/login/', AuthViewSet.as_view({'post': 'login'}, permission_classes=[AllowAny]),  name='auth-login'),
    path('api/auth/login', AuthViewSet.as_view({'post': 'login'}, permission_classes=[AllowAny]),  name='auth-login-no-slash'),

    # === ENDPOINT PÚBLICO DE COMPARTICIÓN (sin autenticación) ===
    # Versión CON barra final
    path('api/sharing/access/<str:token>/',
         ShareLinkViewSet.as_view({'get': 'access'}, permission_classes=[AllowAny]),
         name='sharing-public-access'),
    # Versión SIN barra final
    path('api/sharing/access/<str:token>',
         ShareLinkViewSet.as_view({'get': 'access'}, permission_classes=[AllowAny]),
         name='sharing-public-access-no-slash'),
    # Descargar archivo desde link público
    path('api/sharing/download/<str:token>/',
         ShareLinkViewSet.as_view({'get': 'download'}, permission_classes=[AllowAny]),
         name='sharing-public-download'),
    path('api/sharing/download/<str:token>',
         ShareLinkViewSet.as_view({'get': 'download'}, permission_classes=[AllowAny]),
         name='sharing-public-download-no-slash'),

    # Endpoint para actualizar permisos de ruta en grupo (DEBE ir ANTES del router!)
    path('api/admin/users/groups/<str:group_name>/routes/<path:route_path>/permissions',
         AdminUserViewSet.as_view({
             'patch': 'update_route_permissions'
         }),
         name='admin-group-route-permissions'),

    # === ALIASES DE COMPATIBILIDAD: file-ops -> files ===
    # El frontend antiguo usa /api/file-ops/* pero ahora los endpoints están en /api/files/*
    # Estos aliases mantienen compatibilidad sin cambiar el frontend
    path('api/file-ops/browse', FileViewSet.as_view({'get': 'browse'}), name='file-ops-browse'),
    path('api/file-ops/path_info', FileViewSet.as_view({'get': 'path_info'}), name='file-ops-path-info'),  # Info de caracteres disponibles
    path('api/file-ops/create-folder', FileViewSet.as_view({'post': 'create_folder'}), name='file-ops-create-folder'),
    path('api/file-ops/create_folder', FileViewSet.as_view({'post': 'create_folder'}), name='file-ops-create-folder-underscore'),  # Alias con underscore
    path('api/file-ops/upload', FileViewSet.as_view({'post': 'upload'}), name='file-ops-upload'),
    path('api/file-ops/upload-batch', FileViewSet.as_view({'post': 'upload_batch'}), name='file-ops-upload-batch'),
    path('api/file-ops/upload-folder', FileViewSet.as_view({'post': 'upload_batch'}), name='file-ops-upload-folder'),  # Alias para upload-folder -> upload_batch
    path('api/file-ops/download', FileViewSet.as_view({'get': 'download'}), name='file-ops-download'),
    path('api/file-ops/view', FileViewSet.as_view({'get': 'view'}), name='file-ops-view'),
    path('api/file-ops/file-details', FileViewSet.as_view({'get': 'file_details'}), name='file-ops-file-details'),
    path('api/file-ops/file_details', FileViewSet.as_view({'get': 'file_details'}), name='file-ops-file-details-underscore'),  # Alias con underscore
    path('api/file-ops/folder_details', FileViewSet.as_view({'get': 'folder_details'}), name='file-ops-folder-details'),  # Detalles de carpeta
    path('api/file-ops/delete', FileViewSet.as_view({'post': 'delete'}), name='file-ops-delete'),
    path('api/file-ops/delete-batch', FileViewSet.as_view({'post': 'delete_batch'}), name='file-ops-delete-batch'),
    path('api/file-ops/preview-delete', FileViewSet.as_view({'post': 'preview_delete'}), name='file-ops-preview-delete'),
    path('api/file-ops/search', FileViewSet.as_view({'get': 'search'}), name='file-ops-search'),
    path('api/file-ops/rename', FileViewSet.as_view({'post': 'rename'}), name='file-ops-rename'),
    path('api/file-ops/validate-name', FileViewSet.as_view({'post': 'validate_name'}), name='file-ops-validate-name'),
    path('api/file-ops/download_folder', FileViewSet.as_view({'get': 'download_folder'}), name='file-ops-download-folder'),
    path('api/file-ops/download-batch', FileViewSet.as_view({'get': 'download_batch'}), name='file-ops-download-batch'),
    path('api/file-ops/folder_permissions', FileViewSet.as_view({'get': 'folder_permissions'}), name='file-ops-folder-permissions'),
    path('api/file-ops/copy_item', FileViewSet.as_view({'post': 'copy_item'}), name='file-ops-copy-item'),
    path('api/file-ops/move_item', FileViewSet.as_view({'post': 'move_item'}), name='file-ops-move-item'),
    # Endpoint de permisos del usuario actual para una ruta específica
    path('api/file-ops/check-permissions', FileViewSet.as_view({'get': 'check_permissions'}), name='file-ops-check-permissions'),

    # === SMART NAMING ENDPOINTS ===
    # Validación inteligente con reglas IGAC
    path('api/file-ops/smart-validate/', FileViewSet.as_view({'post': 'smart_validate'}), name='file-ops-smart-validate'),
    # Sugerencia de nombre con IA (endpoint principal)
    path('api/file-ops/smart-rename/', FileViewSet.as_view({'post': 'smart_rename'}), name='file-ops-smart-rename'),
    # Endpoint para sugerir nombre (compatible con frontend: original_name, current_path, extension)
    path('api/file-ops/suggest_name', FileViewSet.as_view({'post': 'suggest_name'}), name='file-ops-suggest-name'),
    # Sugerencia batch de nombres
    path('api/file-ops/smart-rename-batch/', FileViewSet.as_view({'post': 'smart_rename_batch'}), name='file-ops-smart-rename-batch'),
    path('api/file-ops/suggest_batch', FileViewSet.as_view({'post': 'suggest_batch'}), name='file-ops-suggest-batch'),  # Alias para frontend
    # Validación batch de archivos
    path('api/file-ops/validate-batch', FileViewSet.as_view({'post': 'validate_batch'}), name='file-ops-validate-batch'),
    # Búsqueda en diccionario
    path('api/file-ops/dictionary-search/', FileViewSet.as_view({'get': 'dictionary_search'}), name='file-ops-dictionary-search'),
    # Exenciones de nombrado del usuario
    path('api/file-ops/naming-exemptions/', FileViewSet.as_view({'get': 'naming_exemptions'}), name='file-ops-naming-exemptions'),

    # === COLORES DE DIRECTORIOS ===
    # Colores personalizados de carpetas por usuario
    path('api/file-ops/directory-colors', FileViewSet.as_view({'get': 'directory_colors'}), name='file-ops-directory-colors'),
    path('api/file-ops/set-directory-color', FileViewSet.as_view({'post': 'set_directory_color'}), name='file-ops-set-directory-color'),
    path('api/file-ops/remove-directory-color', FileViewSet.as_view({'post': 'remove_directory_color'}), name='file-ops-remove-directory-color'),
    path('api/file-ops/set-directory-colors-batch', FileViewSet.as_view({'post': 'set_directory_colors_batch'}), name='file-ops-set-directory-colors-batch'),

    # API REST
    path('api/', include(router.urls)),

    # Endpoint adicional para actualizar permisos
    path('api/admin/permissions/<int:permission_id>',
         AdminUserViewSet.as_view({
             'patch': 'update_permission',
             'delete': 'delete_permission'
         }),
         name='admin-permission-detail'),

    # Endpoints para descargar Excel de permisos
    path('api/admin/permissions/<int:permission_id>/download-excel/',
         AdminUserViewSet.as_view({
             'get': 'download_permission_excel'
         }),
         name='admin-permission-download-excel'),

    path('api/admin/groups/<str:group_name>/download-excel/',
         AdminUserViewSet.as_view({
             'get': 'download_group_excel'
         }),
         name='admin-group-download-excel'),

    # === ENDPOINTS DE OFFICE ONLINE INTEGRATION (Microsoft 365) ===
    # /api/office/open - POST - Abrir archivo en Office Online
    # /api/office/save - POST - Guardar archivo desde Office Online
    path('api/office/open', open_in_office_online, name='office-online-open'),
    path('api/office/save', save_from_office_online, name='office-online-save'),

    # Endpoints adicionales de DRF (si se necesitan)
    path('api-auth/', include('rest_framework.urls')),

    # === SERVIR ARCHIVOS ADJUNTOS DESDE LA NAS ===
    # Los archivos adjuntos de mensajes se sirven desde la NAS
    # Ruta real: /mnt/repositorio/2510SP/... (sin DirGesCat que es parte del share)
    re_path(
        r'^nas-attachments/(?P<path>.*)$',
        serve,
        {'document_root': '/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/04_bk/trans_doc_platform/message_attachments'},
        name='nas-attachments'
    ),
]
