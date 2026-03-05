# 📋 ARQUITECTURA TÉCNICA - ADMINISTRACIÓN Y AUDITORÍA

## 1. MÓDULO DE ADMINISTRACIÓN

### 1.1 Página Principal: `Administration.tsx`
**Ruta:** `frontend/src/pages/Administration.tsx` (62 líneas)

**Estructura:**
```
Administration (Página raíz)
├─ Tabs: 'users' | 'permissions'
└─ Tab Content:
   ├─ UserManagement (Tab usuarios)
   └─ PermissionManagement (Tab permisos)
```

### 1.2 Gestión de Usuarios: `UserManagement.tsx`

**Componentes Hijo (4):**
```
UserManagement
├─ CreateUserModal      → Crear nuevo usuario (email, nombre, rol)
├─ EditUserModal        → Editar usuario (actualizar datos, rol, estado)
├─ UserAuditModal       → Ver auditoría específica del usuario
└─ ToastContainer       → Notificaciones
```

**Estado (11 variables):**
```typescript
users: User[]                    // Lista de usuarios
loading: boolean                 // Cargando usuarios
error: string                    // Mensaje de error
isCreateModalOpen: boolean       // Modal crear abierto
isEditModalOpen: boolean         // Modal editar abierto
isAuditModalOpen: boolean        // Modal auditoría abierto
selectedUser: User | null        // Usuario seleccionado
searchTerm: string               // Búsqueda de usuarios
selectedUserIds: number[]        // Para generar reportes
generatingReport: boolean        // Generando CSV
```

**API Calls:**
```typescript
GET /api/admin/users             // Listar todos los usuarios
POST /api/admin/users            // Crear nuevo usuario
PATCH /api/admin/users/{id}      // Editar usuario
DELETE /api/admin/users/{id}     // Eliminar usuario
GET /api/admin/users/{id}/audit  // Auditoría del usuario
POST /api/admin/users/export     // Exportar CSV de usuarios
```

**Flujo:**
```
Usuario entra a Administración
  ↓
UserManagement monta
  ↓
loadUsers() → GET /api/admin/users
  ↓
Mostrar tabla de usuarios con columnas:
  ├─ Username
  ├─ Email
  ├─ Nombre Completo
  ├─ Rol (SUPERADMIN|EDITOR|VIEWER)
  ├─ Estado (Activo/Inactivo)
  ├─ Último login
  └─ Acciones (Edit, Delete, Audit, CSV)
  ↓
Usuario cliclea:
  ├─ "Crear Usuario" → setIsCreateModalOpen(true)
  │  └─ CreateUserModal → POST /api/admin/users
  │  └─ Sistema genera contraseña aleatoria
  │  └─ Envía email con credenciales
  │  └─ loadUsers() para actualizar lista
  │
  ├─ "Editar" → setIsEditModalOpen(true), setSelectedUser(user)
  │  └─ EditUserModal → PATCH /api/admin/users/{id}
  │  └─ Cambiar rol, estado, datos personales
  │  └─ loadUsers()
  │
  ├─ "Auditoría" → setIsAuditModalOpen(true)
  │  └─ UserAuditModal → GET /api/admin/users/{id}/audit
  │  └─ Ver todas las acciones del usuario en el sistema
  │
  ├─ "Eliminar" → confirm dialog
  │  └─ DELETE /api/admin/users/{id}
  │  └─ Soft delete (usuario marked as inactive)
  │  └─ Sus permisos se heredan
  │  └─ loadUsers()
  │
  └─ "Generar Reporte" → POST /api/admin/users/export
     └─ Descargar CSV con datos de usuarios seleccionados
```

### 1.3 Gestión de Permisos: `PermissionManagement.tsx`

**Componentes Hijo (6):**
```
PermissionManagement (3 tabs)
├─ Tab 1: Individual
│  ├─ AssignPermissionModal      → Asignar permiso a usuario
│  ├─ EditPermissionModal        → Editar permisos existentes
│  └─ ViewPermissionModal        → Ver detalles de permiso
│
├─ Tab 2: Bulk Assignment
│  └─ BulkPermissionAssignment   → Asignar múltiples permisos
│     ├─ UserAutocompleteSelector → Seleccionar usuarios
│     └─ RouteMultiInput          → Seleccionar rutas
│
└─ Tab 3: Groups
   └─ GroupManagement            → Gestionar grupos de usuarios
```

**Estado (13 variables):**
```typescript
users: User[]                           // Lista usuarios
selectedUser: User | null               // Usuario actual
permissions: Permission[]               // Permisos del usuario
loading: boolean                        // Cargando
error: string                           // Error message
isAssignModalOpen: boolean              // Modal asignar
isEditModalOpen: boolean                // Modal editar
isViewModalOpen: boolean                // Modal ver
permissionToEdit: Permission | null     // Permiso a editar
permissionToView: Permission | null     // Permiso a ver
searchTerm: string                      // Buscar usuario
permissionSearchTerm: string             // Buscar permiso
activeTab: 'individual'|'bulk'|'groups' // Tab activo
isBulkModalOpen: boolean                // Modal bulk abierto
```

**Modelo Permission:**
```typescript
interface Permission {
  id: number;
  user: User;
  base_path: string;                    // Ruta base: /datos/proyecto
  can_read: boolean;                    // Puede leer
  can_write: boolean;                   // Puede escribir/modificar
  can_delete: boolean;                  // Puede eliminar
  can_create_directories?: boolean;     // Puede crear carpetas
  exempt_from_dictionary: boolean;      // Exento del diccionario de nombres
  
  // Niveles de edición
  edit_permission_level?: 'upload_only' | 'upload_own' | 'upload_all';
  // upload_only: solo subir, no modificar
  // upload_own: subir y modificar propios
  // upload_all: subir y modificar cualquiera
  
  // Herencia a subcarpetas
  inheritance_mode?: 'total' | 'blocked' | 'limited_depth';
  // total: todos los permisos heredados
  // blocked: no heredados (solo base_path)
  // limited_depth: heredados hasta N niveles
  
  blocked_paths?: string[];             // Rutas bloqueadas dentro de base_path
  read_only_subdirs?: string[];         // Solo lectura en subruts
  max_depth?: number | null;            // Profundidad máxima heredar
  notes?: string;                       // Notas administrativas
  granted_at: string;                   // Fecha concesión
  granted_by: string;                   // Admin que concedió
  expires_at?: string | null;           // Fecha expiración (opcional)
}
```

**API Calls:**
```typescript
GET /api/admin/users                           // Listar usuarios
GET /api/admin/users/{userId}/permissions     // Permisos de usuario
POST /api/admin/permissions                   // Asignar permiso
PATCH /api/admin/permissions/{permId}         // Editar permiso
DELETE /api/admin/permissions/{permId}        // Revocar permiso
POST /api/admin/permissions/bulk               // Asignar múltiples
GET /api/admin/groups                         // Listar grupos
POST /api/admin/groups                        // Crear grupo
PATCH /api/admin/groups/{groupId}             // Editar grupo
DELETE /api/admin/groups/{groupId}            // Eliminar grupo
```

**Flujo:**
```
Usuario entra a Tab "Permisos"
  ↓
loadUsers() → GET /api/admin/users
  ↓
Usuario selecciona un usuario
  ↓
loadUserPermissions(userId) → GET /api/admin/users/{userId}/permissions
  ↓
Mostrar tabla de permisos con:
  ├─ Ruta base
  ├─ Permisos (R/W/D/Create)
  ├─ Nivel herencia
  ├─ Profundidad heredar
  ├─ Estado (Activo/Expirado)
  └─ Acciones (View, Edit, Delete)
  ↓
Usuario cliclea:
  ├─ "Asignar Permiso" → setIsAssignModalOpen(true)
  │  └─ AssignPermissionModal
  │     ├─ Selector ruta: /datos/proyecto/2025
  │     ├─ Checkboxes: can_read, can_write, can_delete, can_create_directories
  │     ├─ Dropdown: inheritance_mode
  │     ├─ Input: max_depth
  │     ├─ MultiInput: blocked_paths
  │     ├─ Date: expires_at (opcional)
  │     └─ POST /api/admin/permissions
  │     └─ loadUserPermissions(userId)
  │
  ├─ "Editar" → setIsEditModalOpen(true), setPermissionToEdit(perm)
  │  └─ EditPermissionModal → PATCH /api/admin/permissions/{id}
  │  └─ Cambiar todos los campos
  │  └─ loadUserPermissions(userId)
  │
  ├─ "Ver" → setIsViewModalOpen(true), setPermissionToView(perm)
  │  └─ ViewPermissionModal (read-only)
  │  └─ Mostrar toda la configuración en detalle
  │
  └─ "Revocar" → confirm dialog
     └─ DELETE /api/admin/permissions/{id}
     └─ Usuario pierde acceso a ruta
     └─ loadUserPermissions(userId)

Tab "Asignación Masiva":
  ↓
BulkPermissionAssignment
  ├─ UserAutocompleteSelector: Seleccionar múltiples usuarios
  ├─ RouteMultiInput: Agregar múltiples rutas
  ├─ Checkbox: Permisos comunes (R/W/D)
  ├─ Botón: "Asignar a todos"
  │  └─ POST /api/admin/permissions/bulk
  │     {users: [1,2,3], paths: ['/x','/y'], permissions: {...}}
  └─ Mostrar resumen: "3 usuarios, 2 rutas = 6 permisos"

Tab "Grupos":
  ↓
GroupManagement
  ├─ Listar grupos existentes
  ├─ Crear grupo nuevo → POST /api/admin/groups
  ├─ Editar grupo → PATCH /api/admin/groups/{id}
  ├─ Agregar/quitar usuarios del grupo
  ├─ Asignar permisos al grupo (heredan todos los usuarios)
  └─ Eliminar grupo → DELETE /api/admin/groups/{id}
```

---

## 2. MÓDULO DE AUDITORÍA

### 2.1 Página Principal: `Audit.tsx`

**Ruta:** `frontend/src/pages/Audit.tsx` (1425 líneas)

**3 Tabs Principales:**
```
Audit (Página raíz, 3 tabs)
├─ Tab 1: "Movimiento de Usuarios" (Dashboard de actividad)
├─ Tab 2: "Auditoría por Directorio" (Cambios en carpeta)
└─ Tab 3: "Seguimiento de Archivo" (Historia de archivo)
```

### 2.2 Tab 1: Dashboard de Usuarios

**Estado (9 variables):**
```typescript
// Filtros
filterUsername: string                  // Filtrar por usuario
filterAction: string[]                  // Filtrar por acciones (múltiple)
filterDateFrom: string                  // Desde fecha
filterDateTo: string                    // Hasta fecha
filterSuccess: string                   // Exitoso/Error

// Datos
dashboardLogs: AuditLog[]               // Registros
totalLogs: number                       // Total de registros
currentPage: number                     // Página actual
logsPerPage: 50                         // Items por página

// Opciones de filtro
availableUsernames: string[]            // Autocomplete usuarios
availableActions: string[]              // Acciones disponibles
```

**AuditLog Model:**
```typescript
interface AuditLog {
  id: number;
  user: number;
  username: string;
  user_role: string;                    // SUPERADMIN|EDITOR|VIEWER
  action: string;                       // CREATE|UPLOAD|DOWNLOAD|DELETE|etc
  target_path?: string;                 // /datos/proyecto/archivo.pdf
  target_name?: string;                 // Nombre del archivo
  file_size?: number;                   // Tamaño en bytes
  details?: any;                        // JSON con detalles de operación
  ip_address?: string;                  // IP del cliente
  user_agent?: string;                  // Navegador/cliente
  success: boolean;                     // Operación exitosa
  error_message?: string;               // Si hubo error
  timestamp: string;                    // ISO date: 2026-01-16T14:30:00Z
}
```

**Acciones Auditadas:**
```
Operaciones de archivo:
  - UPLOAD                 Subir archivo
  - DOWNLOAD               Descargar archivo
  - DELETE                 Eliminar archivo
  - RESTORE                Restaurar de papelera
  - RENAME                 Renombrar
  - MOVE                   Mover a otra carpeta
  - COPY                   Copiar

Operaciones de carpeta:
  - CREATE_FOLDER          Crear carpeta
  - DELETE_FOLDER          Eliminar carpeta
  - RENAME_FOLDER          Renombrar carpeta

Permisos:
  - CHANGE_PERMISSIONS     Cambiar permisos
  - SHARE_FILE             Crear enlace compartido
  - REVOKE_ACCESS          Revocar acceso

Sistema:
  - LOGIN                  Iniciar sesión
  - LOGOUT                 Cerrar sesión
  - CREATE_USER            Crear usuario
  - DELETE_USER            Eliminar usuario
  - EDIT_USER              Modificar usuario
```

**API Calls:**
```typescript
GET /api/audit/logs                     // Listar logs general
  ?username=user
  &action=UPLOAD,DOWNLOAD
  &date_from=2026-01-01
  &date_to=2026-01-31
  &success=true
  &page=1
  &limit=50

GET /api/audit/available-filters        // Usuarios y acciones disponibles
POST /api/audit/export                  // Exportar registros CSV
```

**Flujo Dashboard:**
```
Usuario entra a Tab "Movimiento de Usuarios"
  ↓
Cargar filtros disponibles:
  GET /api/audit/available-filters
  ├─ availableUsernames: ["admin", "user1", "user2"]
  └─ availableActions: ["UPLOAD", "DOWNLOAD", "DELETE", ...]
  ↓
Mostrar tabla con 50 logs por página:
  GET /api/audit/logs?page=1&limit=50
  ↓
Tabla muestra:
  ├─ Timestamp (01/16/2026 14:30)
  ├─ Usuario (admin)
  ├─ Rol (SUPERADMIN)
  ├─ Acción (UPLOAD)
  ├─ Ruta (/datos/proyecto)
  ├─ Archivo (documento.pdf)
  ├─ Tamaño (2.5 MB)
  ├─ IP Address (192.168.1.100)
  ├─ Navegador (Chrome 120)
  ├─ Estado (✓ Exitoso)
  └─ Icono de acción (color según tipo)
  ↓
Usuario filtra:
  ├─ Escribe en "Usuario" → autocomplete
  ├─ Selecciona acciones múltiples (Shift+Click)
  ├─ Elige rango fechas (date picker)
  ├─ Elige éxito/error (dropdown)
  ├─ Cliclea "Aplicar Filtros"
  │  └─ GET /api/audit/logs?username=X&action=Y&date_from=Z&success=true
  └─ Tabla se actualiza
  ↓
Usuario cliclea "Exportar":
  POST /api/audit/export
  ├─ Descarga CSV con filtros aplicados
  └─ Abre en Excel/Google Sheets
```

### 2.3 Tab 2: Auditoría por Directorio

**Estado (8 variables):**
```typescript
directoryPath: string                   // /datos/proyecto
directoryDateFrom: string               // Desde fecha
directoryDateTo: string                 // Hasta fecha
directoryUsername: string               // Filtrar usuario
directoryAction: string                 // Filtrar acción
directoryResults: any                   // Resultados búsqueda
loading: boolean                        // Cargando
showExportDropdown: 'directory'|...     // Dropdown exportar
```

**API Calls:**
```typescript
GET /api/audit/directory/{path}         // Auditoría de carpeta
  ?date_from=2026-01-01
  &date_to=2026-01-31
  &username=user
  &action=UPLOAD
```

**Flujo:**
```
Usuario entra a Tab "Auditoría por Directorio"
  ↓
Ingresa ruta: /datos/proyecto/2025
  ↓
Usuario cliclea "Buscar"
  ↓
GET /api/audit/directory//datos/proyecto/2025
  ├─ Backend busca todos los cambios en esa ruta
  ├─ Incluyendo archivos dentro
  └─ Retorna logs
  ↓
Mostrar resultados:
  ├─ Total de cambios: 342
  ├─ Período: 01/01 - 01/16/2026
  ├─ Usuarios involucrados: 5
  ├─ Tabla con logs de esa carpeta
  │  ├─ Timestamp
  │  ├─ Usuario
  │  ├─ Acción
  │  ├─ Detalle (qué archivo/subcarpeta)
  │  └─ Estado
  └─ Botón "Descargar CSV"
```

### 2.4 Tab 3: Seguimiento de Archivo

**Estado (8 variables):**
```typescript
filename: string                        // Nombre o ruta archivo
fileDateFrom: string                    // Desde fecha
fileDateTo: string                      // Hasta fecha
fileUsername: string                    // Filtrar usuario
fileAction: string                      // Filtrar acción
fileResults: any                        // Historial archivo
loading: boolean                        // Cargando
```

**API Calls:**
```typescript
GET /api/audit/file                     // Buscar por nombre
  ?name=documento.pdf
  &date_from=2026-01-01
  &date_to=2026-01-31

GET /api/audit/file/{fileId}            // Historial de archivo específico
```

**Flujo:**
```
Usuario entra a Tab "Seguimiento de Archivo"
  ↓
Ingresa nombre: "documento.pdf"
  ↓
Usuario cliclea "Buscar"
  ↓
GET /api/audit/file?name=documento.pdf
  ├─ Backend busca en toda la estructura
  ├─ Retorna todas las versiones/copias
  └─ Muestra historial completo
  ↓
Mostrar cronología:
  ├─ 01/16/2026 14:30 - admin - UPLOAD - /datos/proyecto
  │  └─ Archivo subido (2.5 MB)
  ├─ 01/16/2026 14:35 - user1 - DOWNLOAD - /datos/proyecto
  │  └─ Descargado
  ├─ 01/16/2026 15:00 - admin - RENAME
  │  └─ Renombrado a "documento_v2.pdf"
  ├─ 01/16/2026 15:15 - user2 - COPY
  │  └─ Copiado a /datos/backup
  ├─ 01/17/2026 09:00 - admin - DELETE
  │  └─ Movido a papelera
  └─ 01/17/2026 09:05 - admin - RESTORE
     └─ Restaurado de papelera
  ↓
Botón "Ver Detalles":
  └─ Modal con información completa:
     ├─ Ruta actual
     ├─ Tamaño
     ├─ Propietario original
     ├─ Fecha creación
     ├─ Última modificación
     ├─ Historial completo de cambios
     └─ JSON raw del archivo
```

---

## 3. INTEGRACIÓN BACKEND

### 3.1 Apps Django para Admin

**admin/views.py:**
```
ViewSet: UserViewSet
  - list()           → GET /admin/users
  - create()         → POST /admin/users
  - retrieve()       → GET /admin/users/{id}
  - update()         → PATCH /admin/users/{id}
  - destroy()        → DELETE /admin/users/{id}
  - audit()          → GET /admin/users/{id}/audit
  - export()         → POST /admin/users/export

ViewSet: PermissionViewSet
  - list()           → GET /admin/permissions
  - create()         → POST /admin/permissions
  - retrieve()       → GET /admin/permissions/{id}
  - update()         → PATCH /admin/permissions/{id}
  - destroy()        → DELETE /admin/permissions/{id}
  - bulk_assign()    → POST /admin/permissions/bulk

ViewSet: GroupViewSet
  - list()           → GET /admin/groups
  - create()         → POST /admin/groups
  - retrieve()       → GET /admin/groups/{id}
  - update()         → PATCH /admin/groups/{id}
  - destroy()        → DELETE /admin/groups/{id}
  - add_member()     → POST /admin/groups/{id}/add-member
  - remove_member()  → DELETE /admin/groups/{id}/members/{userId}
```

**auth/permissions.py:**
```
IsAdmin:
  - Solo SUPERADMIN puede crear/editar/borrar usuarios
  - Solo SUPERADMIN puede gestionar permisos

IsAuthenticatedAndAdmin:
  - Debe estar autenticado
  - Debe tener rol SUPERADMIN
```

**Modelos:**
```
User
  - id
  - username
  - email
  - first_name, last_name
  - role (SUPERADMIN|EDITOR|VIEWER)
  - is_active
  - created_at
  - last_login
  - password (hashed)

Permission
  - id
  - user (FK)
  - base_path
  - can_read, can_write, can_delete, can_create_directories
  - exempt_from_dictionary
  - edit_permission_level
  - inheritance_mode
  - blocked_paths (JSON)
  - read_only_subdirs (JSON)
  - max_depth
  - notes
  - granted_at
  - granted_by (FK to User)
  - expires_at

Group
  - id
  - name
  - description
  - members (M2M to User)
  - created_at
  - created_by (FK)

AuditLog
  - id
  - user (FK)
  - action (string)
  - target_path
  - target_name
  - file_size
  - details (JSON)
  - ip_address
  - user_agent
  - success (boolean)
  - error_message
  - timestamp
```

### 3.2 Apps Django para Audit

**audit/views.py:**
```
ViewSet: AuditLogViewSet
  - list()           → GET /audit/logs (con filtros)
  - retrieve()       → GET /audit/logs/{id}
  - available_filters() → GET /audit/available-filters
  - export()         → POST /audit/export

View: DirectoryAuditView
  - get()            → GET /audit/directory/{path}

View: FileAuditView
  - get()            → GET /audit/file?name=X
  - get_by_id()      → GET /audit/file/{id}
```

**audit/middleware.py:**
```
AuditMiddleware:
  ├─ Intercepta cada request
  ├─ Registra en AuditLog:
  │  ├─ Usuario
  │  ├─ Acción detectada
  │  ├─ Ruta afectada
  │  ├─ IP address
  │  ├─ User agent
  │  └─ Resultado (success/error)
  └─ Para operaciones de archivo:
     ├─ Detecta upload → UPLOAD action
     ├─ Detecta download → DOWNLOAD action
     ├─ Detecta delete → DELETE action
     ├─ Detecta rename → RENAME action
     └─ etc.
```

**Signals:**
```
post_save(User) → AuditLog: CREATE_USER
pre_delete(User) → AuditLog: DELETE_USER
post_save(Permission) → AuditLog: CHANGE_PERMISSIONS
pre_delete(Permission) → AuditLog: REVOKE_ACCESS
```

---

## 4. FLUJOS DE SEGURIDAD

### 4.1 Validación de Acceso

```
Request a /api/admin/* llega
  ↓
AuthMiddleware verifica JWT
  ├─ Token válido?
  └─ Usuario expirado?
  ↓
IsAdmin permission check
  ├─ ¿Es SUPERADMIN?
  └─ Si no → 403 Forbidden
  ↓
Operation allowed
  ├─ CREATE_USER → Solo SUPERADMIN
  ├─ DELETE_USER → Solo SUPERADMIN
  ├─ VIEW_USERS → Solo SUPERADMIN
  └─ etc.
  ↓
AuditMiddleware registra:
  ├─ Quién hizo la operación
  ├─ Qué operación
  ├─ Resultado (éxito/error)
  └─ AuditLog saved to DB
```

### 4.2 Auditoria de Cambios

```
Admin cambia permisos de user1
  ├─ Frontend: POST /api/admin/permissions/{id}
  │  {can_write: true, expires_at: "2026-06-16"}
  ├─ Backend recibe
  ├─ Valida permisos del admin
  ├─ Actualiza Permission model
  ├─ AuditMiddleware registra:
  │  └─ User: admin
  │  └─ Action: CHANGE_PERMISSIONS
  │  └─ Target: user1
  │  └─ Details: {changed_fields: {can_write, expires_at}}
  │  └─ Success: true
  └─ Retorna 200 OK
```

---

## 5. OPTIMIZACIONES

### 5.1 Caché en Admin
```
- Usuarios: Caché 5 minutos (raro cambio)
- Permisos: Caché 1 minuto (pueden cambiar frecuente)
- Grupos: Caché 5 minutos
- Invalidar cuando hay POST/PATCH/DELETE
```

### 5.2 Paginación en Audit
```
- 50 logs por página (reducir carga)
- Índices en DB:
  └─ (user, timestamp)
  └─ (action, timestamp)
  └─ (target_path, timestamp)
- Búsqueda: LIKE '%term%' con límite 1000
```

### 5.3 Exportar CSV
```
- Generar en background (Celery task)
- Avisarle al usuario cuando esté listo
- Guardar temporalmente
- Descargar ZIP si es muy grande
```

---

## 6. REFERENCIAS CRUZADAS

Ver también:
- [Módulos API Frontend](../DIAGRAMA_VISUAL_FRONTEND.md#módulos-api)
- [Custom Hooks](../DIAGRAMA_VISUAL_FRONTEND.md#custom-hooks)
- [Backend Architecture](../00-SUPER-DIAGRAMA-BACKEND-EXPLICACION.md)

---

## 7. SIGUIENTES PASOS

**Para agregar nueva funcionalidad admin:**
1. Crear ViewSet en `backend/admin/views.py`
2. Registrar en URL routing
3. Crear componente en `frontend/src/components/admin/`
4. Integrar en `Administration.tsx` o nueva página
5. Agregar API module en `frontend/src/api/admin.ts`
6. Auditar en `admin/middleware.py` o signals
7. Testar permisos SUPERADMIN

**Para agregar nueva acción auditada:**
1. Definir nombre ACTION en constantes backend
2. Registrar en `AuditLog.action` choices
3. Agregar capture en middleware/signals
4. Actualizar `availableActions` endpoint
5. Agregar ícono en `Audit.tsx`
6. Testar que se registre correctamente
