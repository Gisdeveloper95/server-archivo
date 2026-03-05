# API REST Endpoints - Sistema de Gestion de Archivos IGAC

## Resumen

- **Framework:** Django REST Framework
- **Autenticacion:** JWT (JSON Web Tokens)
- **Base URL:** `/api/`
- **Formato:** JSON
- **Paginacion:** Basada en pagina (page, per_page)

---

## Diagrama General de API

```mermaid
flowchart TB
    subgraph CLIENT["Cliente"]
        FE["Frontend React"]
        EXT["Clientes Externos"]
    end

    subgraph AUTH["Autenticacion"]
        JWT["JWT Token"]
        REFRESH["Refresh Token"]
    end

    subgraph ENDPOINTS["API Endpoints"]
        direction TB

        subgraph AUTH_EP["Auth"]
            LOGIN["/auth/login"]
            LOGOUT["/auth/logout"]
            ME["/auth/me"]
            CHANGE_PWD["/auth/change_password"]
        end

        subgraph USER_EP["Users"]
            USERS["/users"]
            USER_DETAIL["/users/{id}"]
            PERMS["/permissions"]
        end

        subgraph FILE_EP["Files"]
            BROWSE["/file-ops/browse"]
            UPLOAD["/file-ops/upload"]
            DOWNLOAD["/file-ops/download"]
            DELETE["/file-ops/delete"]
            RENAME["/file-ops/rename"]
            SEARCH["/file-ops/search"]
        end

        subgraph SMART_EP["Smart Naming"]
            VALIDATE["/file-ops/smart-validate"]
            SMART_RENAME["/file-ops/smart-rename"]
            DICT_SEARCH["/file-ops/dictionary-search"]
        end

        subgraph ADMIN_EP["Admin"]
            ADMIN_USERS["/admin/users"]
            AUDIT["/audit"]
            STATS["/stats"]
            GROQ["/groq-stats"]
        end

        subgraph SHARE_EP["Sharing"]
            LINKS["/sharing"]
            PUBLIC["/sharing/access/{token}"]
        end

        subgraph TRASH_EP["Trash"]
            TRASH_LIST["/trash"]
            RESTORE["/trash/{id}/restore"]
        end

        subgraph NOTIF_EP["Notifications"]
            NOTIF_LIST["/notifications"]
            NOTIF_READ["/notifications/{id}/read"]
        end
    end

    CLIENT --> AUTH
    AUTH --> ENDPOINTS
```

---

## 1. Autenticacion (`/api/auth/`)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Iniciar sesion | No |
| POST | `/auth/logout` | Cerrar sesion | Si |
| GET | `/auth/me` | Obtener usuario actual | Si |
| POST | `/auth/change_password` | Cambiar contrasena | Si |
| POST | `/auth/refresh` | Refrescar token JWT | Si |
| POST | `/auth/forgot-password` | Solicitar reset password | No |
| POST | `/auth/reset-password` | Resetear contrasena | No |

### Request/Response Examples

```yaml
# POST /api/auth/login
Request:
  email: "usuario@igac.gov.co"
  password: "********"

Response:
  access: "eyJhbGciOiJIUzI1NiIs..."
  refresh: "eyJhbGciOiJIUzI1NiIs..."
  user:
    id: 1
    username: "usuario"
    email: "usuario@igac.gov.co"
    full_name: "Usuario Ejemplo"
    role: "consultation_edit"
```

---

## 2. Usuarios (`/api/users/`)

| Metodo | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `/users` | Listar usuarios | Si | Admin+ |
| POST | `/users` | Crear usuario | Si | Admin+ |
| GET | `/users/{id}` | Detalle usuario | Si | Admin+ |
| PUT | `/users/{id}` | Actualizar usuario | Si | Admin+ |
| DELETE | `/users/{id}` | Eliminar usuario | Si | Superadmin |
| GET | `/users/me` | Usuario actual | Si | Todos |
| GET | `/users/by_role` | Filtrar por rol | Si | Admin+ |

---

## 3. Permisos (`/api/permissions/`)

| Metodo | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `/permissions` | Listar permisos | Si | Admin+ |
| POST | `/permissions` | Crear permiso | Si | Admin+ |
| GET | `/permissions/{id}` | Detalle permiso | Si | Admin+ |
| PUT | `/permissions/{id}` | Actualizar permiso | Si | Admin+ |
| DELETE | `/permissions/{id}` | Eliminar permiso | Si | Admin+ |
| GET | `/permissions/by_user?user_id=X` | Permisos de usuario | Si | Admin+ |
| GET | `/permissions/by_path?path=X` | Permisos de ruta | Si | Admin+ |
| POST | `/permissions/{id}/revoke` | Revocar permiso | Si | Admin+ |

### Estructura de Permiso

```yaml
UserPermission:
  id: 1
  user: 5
  base_path: "/proyectos/2024"
  can_read: true
  can_write: true
  can_delete: false
  can_create_directories: true
  edit_permission_level: "upload_own"  # upload_only | upload_own | upload_all
  inheritance_mode: "total"  # total | blocked | limited_depth | partial_write
  blocked_paths: ["/proyectos/2024/confidencial"]
  read_only_paths: ["/proyectos/2024/archivos_finales"]
  max_depth: null  # o numero para limited_depth
  expires_at: "2025-12-31T23:59:59Z"
  is_active: true
```

---

## 4. Operaciones de Archivos (`/api/file-ops/`)

### 4.1 Navegacion y Listado

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/file-ops/browse?path=X` | Navegar directorio | Si |
| GET | `/file-ops/search?q=X&path=Y` | Buscar archivos | Si |
| GET | `/file-ops/path_info?path=X` | Info caracteres disponibles | Si |
| GET | `/file-ops/check-permissions?path=X` | Verificar permisos | Si |

```yaml
# GET /api/file-ops/browse?path=/proyectos
Response:
  path: "/proyectos"
  items:
    - name: "2024"
      path: "/proyectos/2024"
      is_directory: true
      size: 0
      size_formatted: "15 elementos"
      item_count: 15
      modified_date: "2024-01-15T10:30:00Z"
      can_write: true
      can_delete: false
    - name: "informe.pdf"
      path: "/proyectos/informe.pdf"
      is_directory: false
      size: 1048576
      size_formatted: "1.0 MB"
      extension: ".pdf"
      modified_date: "2024-01-14T15:45:00Z"
  breadcrumbs:
    - name: "Inicio"
      path: ""
    - name: "proyectos"
      path: "/proyectos"
  total: 2
```

### 4.2 Operaciones CRUD

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | `/file-ops/upload` | Subir archivo(s) | Si |
| POST | `/file-ops/upload-batch` | Subir carpeta completa | Si |
| POST | `/file-ops/create-folder` | Crear carpeta | Si |
| GET | `/file-ops/download?path=X` | Descargar archivo | Si |
| GET | `/file-ops/download_folder?path=X` | Descargar carpeta ZIP | Si |
| GET | `/file-ops/view?path=X` | Ver archivo inline | Si |
| POST | `/file-ops/delete` | Eliminar (a papelera) | Si |
| POST | `/file-ops/delete-batch` | Eliminar multiples | Si |
| POST | `/file-ops/rename` | Renombrar | Si |
| POST | `/file-ops/copy_item` | Copiar archivo/carpeta | Si |
| POST | `/file-ops/move_item` | Mover archivo/carpeta | Si |

```yaml
# POST /api/file-ops/upload
Content-Type: multipart/form-data
Request:
  path: "/proyectos/2024"
  files: [archivo1.pdf, archivo2.xlsx]

Response:
  success: true
  uploaded:
    - name: "archivo1.pdf"
      path: "/proyectos/2024/archivo1.pdf"
    - name: "archivo2.xlsx"
      path: "/proyectos/2024/archivo2.xlsx"
  errors: []
```

### 4.3 Detalles y Metadatos

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/file-ops/file-details?path=X` | Detalles de archivo | Si |
| GET | `/file-ops/folder_details?path=X` | Detalles de carpeta | Si |
| GET | `/file-ops/folder_permissions?path=X` | Permisos de carpeta | Si |

```yaml
# GET /api/file-ops/file-details?path=/proyectos/informe.pdf
Response:
  success: true
  file:
    name: "informe.pdf"
    path: "/proyectos/informe.pdf"
    windows_path: "\\\\NAS\\DirGesCat\\proyectos\\informe.pdf"
    extension: ".pdf"
    mime_type: "application/pdf"
    size: 1048576
    size_formatted: "1.0 MB"
    created_at: 1705312200
    modified_at: 1705398600
  upload_info:
    uploaded_by: "usuario"
    uploaded_by_full_name: "Usuario Ejemplo"
    uploaded_at: "2024-01-15T10:30:00Z"
    ip_address: "192.168.1.100"
  access_history:
    - action: "download"
      user: "otro_usuario"
      date: "2024-01-16T09:00:00Z"
      ip: "192.168.1.101"
  stats:
    total_downloads: 5
    total_views: 12
```

---

## 5. Smart Naming - IA (`/api/file-ops/`)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | `/file-ops/smart-validate/` | Validar nombre IGAC | Si |
| POST | `/file-ops/smart-rename/` | Sugerencia con IA | Si |
| POST | `/file-ops/smart-rename-batch/` | Sugerencias batch | Si |
| POST | `/file-ops/validate-batch` | Validar multiples | Si |
| GET | `/file-ops/dictionary-search/?q=X` | Buscar en diccionario | Si |
| GET | `/file-ops/naming-exemptions/` | Exenciones del usuario | Si |

```yaml
# POST /api/file-ops/smart-validate/
Request:
  name: "Mi Documento Final (v2).xlsx"
  current_path: "/proyectos"

Response:
  success: true
  valid: false
  errors:
    - "Espacios no permitidos, usar guion bajo"
    - "Parentesis no permitidos"
    - "Palabra prohibida: final"
  warnings:
    - "Se agregara fecha actual: 20240115"
  original_name: "Mi Documento Final (v2).xlsx"
  formatted_name: "mi_documento_v2_20240115.xlsx"
  formatted_base: "mi_documento_v2_20240115"
  extension: ".xlsx"
  format_changes:
    - "Espacios reemplazados por _"
    - "Parentesis eliminados"
    - "Convertido a minusculas"
    - "Palabra 'final' removida"
  parts_analysis:
    - type: "generic"
      value: "mi"
      source: "preserved"
    - type: "dictionary"
      value: "documento"
      meaning: "DOC"
      source: "dictionary"
    - type: "number"
      value: "v2"
      source: "preserved"
    - type: "date"
      value: "20240115"
      source: "warning"
  unknown_parts: []
  needs_ai: false
  detected_date: null
  user_exemptions:
    exempt_from_naming_rules: false
    exempt_from_path_limit: false
    exempt_from_name_length: false
```

```yaml
# POST /api/file-ops/smart-rename/
Request:
  name: "presentacion proyecto catastro.pptx"
  current_path: "/proyectos/catastro"

Response:
  success: true
  original_name: "presentacion proyecto catastro.pptx"
  suggested_name: "pres_proy_cat_20240115.pptx"
  suggested_base: "pres_proy_cat_20240115"
  valid: true
  errors: []
  warnings: []
  format_changes:
    - "Abreviado: presentacion -> pres"
    - "Abreviado: proyecto -> proy"
    - "Abreviado: catastro -> cat"
    - "Fecha agregada"
  used_ai: true
  ai_metadata:
    model: "llama-3.3-70b-versatile"
    tokens_used: 150
    response_time_ms: 450
  parts_analysis:
    - type: "dictionary"
      value: "pres"
      meaning: "Presentacion"
    - type: "dictionary"
      value: "proy"
      meaning: "Proyecto"
    - type: "dictionary"
      value: "cat"
      meaning: "Catastro"
    - type: "date"
      value: "20240115"
```

---

## 6. Diccionario (`/api/dictionary/`)

| Metodo | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `/dictionary` | Listar terminos | Si | Todos |
| GET | `/dictionary/{id}` | Detalle termino | Si | Todos |
| POST | `/dictionary` | Crear termino | Si | Superadmin |
| PUT | `/dictionary/{id}` | Actualizar termino | Si | Superadmin |
| DELETE | `/dictionary/{id}` | Eliminar termino | Si | Superadmin |
| GET | `/dictionary/active` | Solo terminos activos | Si | Todos |
| POST | `/dictionary/{id}/toggle-active` | Activar/desactivar | Si | Superadmin |
| GET | `/dictionary/export-csv` | Exportar a CSV | Si | Todos |

```yaml
DictionaryTerm:
  id: 1
  key: "proy"
  value: "Proyecto"
  description: "Abreviacion estandar para proyecto"
  category: "general"
  is_active: true
  created_by: "admin"
  created_at: "2024-01-01T00:00:00Z"
```

---

## 7. Abreviaciones IA (`/api/ai-abbreviations/`)

| Metodo | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `/ai-abbreviations` | Listar abreviaciones | Si | Superadmin |
| GET | `/ai-abbreviations/{id}` | Detalle | Si | Superadmin |
| GET | `/ai-abbreviations/summary` | Resumen estadisticas | Si | Superadmin |
| POST | `/ai-abbreviations/{id}/approve` | Aprobar | Si | Superadmin |
| POST | `/ai-abbreviations/{id}/reject` | Rechazar | Si | Superadmin |
| POST | `/ai-abbreviations/{id}/correct` | Corregir | Si | Superadmin |
| POST | `/ai-abbreviations/{id}/add-to-dictionary` | Agregar a diccionario | Si | Superadmin |

---

## 8. Favoritos (`/api/favorites/`)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/favorites` | Listar favoritos | Si |
| POST | `/favorites` | Agregar favorito | Si |
| DELETE | `/favorites/{id}` | Eliminar favorito | Si |
| POST | `/favorites/reorder` | Reordenar favoritos | Si |

---

## 9. Auditoria (`/api/audit/`)

| Metodo | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `/audit` | Listar logs | Si | Admin+ |
| GET | `/audit/{id}` | Detalle log | Si | Admin+ |
| GET | `/audit/stats` | Estadisticas | Si | Admin+ |
| GET | `/audit/directory-audit?path=X` | Auditoria por directorio | Si | Admin+ |
| GET | `/audit/file-tracking?path=X` | Seguimiento archivo | Si | Admin+ |
| GET | `/audit/dashboard` | Dashboard auditoria | Si | Admin+ |
| POST | `/audit/analyze-zip` | Analizar ZIP | Si | Admin+ |

### Filtros de Auditoria

```yaml
# GET /api/audit/?user=5&action=download&from=2024-01-01&to=2024-01-31&path=/proyectos
Response:
  count: 150
  next: "/api/audit/?page=2&..."
  previous: null
  results:
    - id: 1234
      user: 5
      username: "usuario"
      user_role: "consultation_edit"
      action: "download"
      target_path: "/proyectos/informe.pdf"
      target_name: "informe.pdf"
      file_size: 1048576
      ip_address: "192.168.1.100"
      user_agent: "Mozilla/5.0..."
      success: true
      timestamp: "2024-01-15T10:30:00Z"
```

---

## 10. Estadisticas (`/api/stats/`)

| Metodo | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `/stats` | Estadisticas globales | Si | Admin+ |
| GET | `/stats/user_stats` | Stats por usuario | Si | Admin+ |

```yaml
# GET /api/stats
Response:
  total_files: 125000
  total_directories: 8500
  total_size_bytes: 5368709120
  total_size_formatted: "5.0 GB"
  users:
    total: 85
    active: 78
    by_role:
      consultation: 50
      consultation_edit: 20
      admin: 10
      superadmin: 5
  recent_activity:
    uploads_today: 45
    downloads_today: 230
    active_users_today: 35
```

---

## 11. GROQ Stats (`/api/groq-stats/`)

| Metodo | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `/groq-stats` | Listar API keys | Si | Admin+ |
| GET | `/groq-stats/{id}` | Detalle key | Si | Admin+ |
| GET | `/groq-stats/pool-summary` | Resumen pool | Si | Admin+ |
| POST | `/groq-stats/{id}/reset-stats` | Resetear stats | Si | Superadmin |
| POST | `/groq-stats/{id}/toggle-active` | Activar/desactivar | Si | Superadmin |

---

## 12. Administracion (`/api/admin/`)

| Metodo | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `/admin/users` | Listar usuarios | Si | Superadmin |
| POST | `/admin/users` | Crear usuario | Si | Superadmin |
| PATCH | `/admin/users/{id}` | Editar usuario | Si | Superadmin |
| DELETE | `/admin/users/{id}` | Eliminar usuario | Si | Superadmin |
| POST | `/admin/users/{id}/resend-credentials` | Reenviar credenciales | Si | Superadmin |
| GET | `/admin/users/{id}/permissions` | Ver permisos | Si | Superadmin |
| POST | `/admin/users/{id}/permissions` | Asignar permisos | Si | Superadmin |
| DELETE | `/admin/permissions/{id}` | Eliminar permiso | Si | Superadmin |
| PATCH | `/admin/permissions/{id}` | Actualizar permiso | Si | Superadmin |
| GET | `/admin/permissions/{id}/download-excel` | Descargar Excel | Si | Superadmin |
| GET | `/admin/groups/{name}/download-excel` | Excel grupo | Si | Superadmin |
| PATCH | `/admin/users/groups/{name}/routes/{path}/permissions` | Permisos grupo | Si | Superadmin |

---

## 13. Compartir (`/api/sharing/`)

| Metodo | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `/sharing` | Listar links | Si | Superadmin |
| POST | `/sharing/create_share` | Crear link | Si | Superadmin |
| GET | `/sharing/{id}` | Detalle link | Si | Superadmin |
| PATCH | `/sharing/{id}` | Actualizar link | Si | Superadmin |
| DELETE | `/sharing/{id}` | Eliminar link | Si | Superadmin |
| POST | `/sharing/{id}/deactivate` | Desactivar | Si | Superadmin |
| GET | `/sharing/{id}/stats` | Estadisticas | Si | Superadmin |

### Endpoints Publicos (Sin Auth)

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/sharing/access/{token}` | Acceder via link |
| GET | `/sharing/download/{token}` | Descargar via link |

```yaml
# GET /api/sharing/access/{token}
Response:
  success: true
  file_info:
    name: "documento.pdf"
    size_formatted: "2.5 MB"
    extension: ".pdf"
  share_info:
    created_by: "admin"
    expires_at: "2024-02-01T00:00:00Z"
    max_downloads: 10
    current_downloads: 3
    requires_password: false
  can_download: true
```

---

## 14. Papelera (`/api/trash/`)

| Metodo | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `/trash` | Listar papelera | Si | Superadmin |
| GET | `/trash/{id}` | Detalle item | Si | Superadmin |
| DELETE | `/trash/{id}` | Eliminar permanente | Si | Superadmin |
| POST | `/trash/{id}/restore` | Restaurar | Si | Superadmin |
| POST | `/trash/{id}/share` | Generar link descarga | Si | Superadmin |
| GET | `/trash/stats` | Estadisticas | Si | Superadmin |
| DELETE | `/trash/cleanup` | Limpiar expirados | Si | Superadmin |
| GET | `/trash/by-path?path=X` | Items de ruta | Si | Superadmin |
| GET | `/trash/config` | Configuracion | Si | Superadmin |
| PUT | `/trash/config/update` | Actualizar config | Si | Superadmin |

```yaml
TrashItem:
  id: "abc123-uuid"
  original_path: "/proyectos/documento.pdf"
  original_name: "documento.pdf"
  trash_path: "/.trash/abc123_documento.pdf"
  size: 1048576
  size_formatted: "1.0 MB"
  deleted_by: "usuario"
  deleted_at: "2024-01-15T10:30:00Z"
  expires_at: "2024-02-14T10:30:00Z"  # 30 dias
  can_restore: true
```

---

## 15. Notificaciones (`/api/notifications/`)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | Listar notificaciones | Si |
| GET | `/notifications/{id}` | Detalle | Si |
| PATCH | `/notifications/{id}/read` | Marcar como leida | Si |
| POST | `/notifications/mark-all-read` | Marcar todas leidas | Si |
| DELETE | `/notifications/{id}` | Eliminar | Si |
| GET | `/notifications/unread-count` | Contador no leidas | Si |
| GET | `/notifications/attachment-download/{id}` | Descargar adjunto | Si |

### Tipos de Notificaciones

```yaml
NotificationTypes:
  - file_shared      # Archivo compartido contigo
  - permission_granted  # Permiso otorgado
  - permission_revoked  # Permiso revocado
  - file_deleted     # Archivo eliminado de tu carpeta
  - system_message   # Mensaje del sistema
  - mention         # Mencionado en comentario
```

---

## 16. Colores de Directorios (`/api/file-ops/`)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/file-ops/directory-colors` | Obtener colores | Si |
| POST | `/file-ops/set-directory-color` | Establecer color | Si |
| POST | `/file-ops/remove-directory-color` | Eliminar color | Si |
| POST | `/file-ops/set-directory-colors-batch` | Colores batch | Si |

---

## 17. Office Online (`/api/office/`)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | `/office/open` | Abrir en Office 365 | Si |
| POST | `/office/save` | Guardar desde Office | Si |

---

## Codigos de Respuesta HTTP

| Codigo | Significado |
|--------|-------------|
| 200 | OK - Operacion exitosa |
| 201 | Created - Recurso creado |
| 204 | No Content - Eliminado |
| 400 | Bad Request - Datos invalidos |
| 401 | Unauthorized - Token invalido/expirado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: archivo existe) |
| 413 | Payload Too Large - Archivo muy grande |
| 429 | Too Many Requests - Rate limit |
| 500 | Server Error - Error interno |

---

## Formato de Errores

```yaml
# Error estandar
{
  "success": false,
  "error": "Mensaje de error descriptivo",
  "code": "ERROR_CODE",
  "details": {
    "field": ["Error especifico del campo"]
  }
}

# Error de validacion DRF
{
  "detail": "No autenticado.",
  "code": "not_authenticated"
}
```

---

## Headers Requeridos

```yaml
# Autenticacion
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Content Type (JSON)
Content-Type: application/json

# Content Type (Upload)
Content-Type: multipart/form-data
```

---

## Rate Limiting

- **Autenticacion:** 5 intentos / minuto
- **API General:** 100 requests / minuto
- **Uploads:** 10 uploads / minuto
- **IA (GROQ):** 30 requests / minuto (pool de keys)

---

## Diagrama de Seguridad

```mermaid
flowchart TB
    subgraph REQUEST["Request Entrante"]
        REQ["HTTP Request"]
    end

    subgraph AUTH_LAYER["Capa de Autenticacion"]
        JWT_CHECK["Verificar JWT"]
        TOKEN_VALID{"Token valido?"}
        REFRESH{"Token refresh?"}
    end

    subgraph PERM_LAYER["Capa de Permisos"]
        ROLE_CHECK["Verificar rol"]
        PATH_CHECK["Verificar permisos ruta"]
        ACTION_CHECK["Verificar accion permitida"]
    end

    subgraph AUDIT_LAYER["Capa de Auditoria"]
        LOG["Registrar accion"]
    end

    subgraph RESPONSE["Respuesta"]
        SUCCESS["200 OK"]
        UNAUTH["401 Unauthorized"]
        FORBIDDEN["403 Forbidden"]
    end

    REQ --> JWT_CHECK
    JWT_CHECK --> TOKEN_VALID
    TOKEN_VALID -->|No| REFRESH
    REFRESH -->|No| UNAUTH
    REFRESH -->|Si| JWT_CHECK
    TOKEN_VALID -->|Si| ROLE_CHECK
    ROLE_CHECK --> PATH_CHECK
    PATH_CHECK --> ACTION_CHECK
    ACTION_CHECK -->|Denegado| FORBIDDEN
    ACTION_CHECK -->|Permitido| LOG
    LOG --> SUCCESS
```
