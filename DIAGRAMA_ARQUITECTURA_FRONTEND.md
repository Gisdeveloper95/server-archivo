# 📊 Diagrama Lógico - Arquitectura Frontend Server Archivo

## 🏗️ Estructura General de la Aplicación

```
┌─────────────────────────────────────────────────────────────────┐
│                    APLICACIÓN REACT + VITE                       │
│                     (TypeScript/JavaScript)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │           ROUTER (React Router v7)          │
        │  - Manejo de rutas y navegación             │
        │  - Lazy loading de componentes              │
        └─────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴────────────────────────┐
        ▼                                              ▼
    ┌──────────────┐                          ┌──────────────────┐
    │ Auth Guard   │                          │   Pages/Rutas    │
    │ (Protección) │                          │   (13 páginas)   │
    └──────────────┘                          └──────────────────┘
```

---

## 📄 PÁGINAS PRINCIPALES (13 páginas)

```
┌────────────────────────────────────────────────────────────────────┐
│                         RUTAS Y PÁGINAS                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 1️⃣  LOGIN                  - /login                                │
│     └─ Autenticación de usuarios                                   │
│                                                                     │
│ 2️⃣  FILE EXPLORER          - /                                     │
│     └─ Navegador de archivos (vista principal)                     │
│     └─ Soporta: Grid/List view, Árbol de directorios              │
│                                                                     │
│ 3️⃣  DASHBOARD              - /dashboard                            │
│     └─ Estadísticas y resumen del sistema                          │
│     └─ Widgets: GroqStats, AISystemWidget                          │
│                                                                     │
│ 4️⃣  SEARCH                 - /search                               │
│     └─ Búsqueda global de archivos                                 │
│     └─ Filtros avanzados                                           │
│                                                                     │
│ 5️⃣  FAVORITES              - /favorites                            │
│     └─ Archivos marcados como favoritos                            │
│                                                                     │
│ 6️⃣  TRASH                  - /trash                                │
│     └─ Papelera de reciclaje                                       │
│     └─ Recuperar o eliminar permanentemente                        │
│                                                                     │
│ 7️⃣  MESSAGES               - /messages                             │
│     └─ Sistema de mensajería entre usuarios                        │
│     └─ Notificaciones en tiempo real                               │
│                                                                     │
│ 8️⃣  NOTIFICATIONS          - /notifications                        │
│     └─ Centro de notificaciones del sistema                        │
│                                                                     │
│ 9️⃣  AUDIT                  - /audit                                │
│     └─ Registro de auditoría de acciones                           │
│     └─ Historial de cambios                                        │
│                                                                     │
│ 🔟 ADMINISTRATION          - /administration                        │
│     └─ Gestión de usuarios                                         │
│     └─ Gestión de permisos                                         │
│     └─ Gestión de grupos                                           │
│     └─ Auditoría de usuarios (admin)                               │
│                                                                     │
│ 1️⃣1️⃣ SHARE LINKS           - /share-links                          │
│     └─ Gestión de enlaces de compartición                          │
│     └─ Crear/editar/eliminar enlaces públicos                      │
│                                                                     │
│ 1️⃣2️⃣ STATISTICS            - /statistics                           │
│     └─ Estadísticas detalladas del uso del sistema                 │
│                                                                     │
│ 1️⃣3️⃣ DICTIONARY MANAGEMENT - /dictionary                           │
│     └─ Gestión de diccionario de abreviaturas                      │
│     └─ Crear/editar entradas del diccionario                       │
│                                                                     │
│ 🔒 MY PERMISSIONS          - /my-permissions                       │
│     └─ Ver permisos personales del usuario                         │
│                                                                     │
│ 🔗 PUBLIC SHARE            - /share/:token                         │
│     └─ Página pública de descarga de archivos compartidos          │
│                                                                     │
│ 🔑 RESET PASSWORD          - /reset-password                       │
│ 🔑 FORGOT PASSWORD         - /forgot-password                      │
│     └─ Recuperación de contraseña                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 COMPONENTES PRINCIPALES

### Estructura de Carpetas
```
src/components/
│
├── 📦 Componentes Base
│   ├── Layout.tsx                    ← Layout principal (Nav + Sidebar)
│   ├── Toast.tsx                     ← Sistema de notificaciones
│   ├── FileIcon.tsx                  ← Iconos de archivos
│   └── Breadcrumbs.tsx               ← Navegación breadcrumb
│
├── 📁 Exploradores de Archivos
│   ├── FileTreeView.tsx              ← Árbol de directorios
│   ├── TreeNode.tsx                  ← Nodo individual del árbol
│   ├── FileList.tsx                  ← Listado de archivos
│   ├── FileListWithSelection.tsx      ← Listado con selección
│   └── ViewModeToggle.tsx             ← Toggle Grid/List
│
├── 🗂️ Modales para Archivos
│   ├── UploadModal.tsx                ← Subir archivos
│   ├── UploadFolderModal.tsx           ← Subir carpetas
│   ├── CreateFolderModal.tsx           ← Crear carpeta
│   ├── RenameModal.tsx                ← Renombrar archivo
│   ├── DeleteConfirmModal.tsx          ← Confirmar eliminación
│   ├── FileDetailsModal.tsx            ← Detalles del archivo
│   ├── FileInfoModal.tsx               ← Info del archivo
│   ├── FolderInfoModal.tsx             ← Info de la carpeta
│   └── ConflictModal.tsx               ← Resolver conflictos
│
├── 🔐 Gestión de Permisos
│   ├── ManageAccessModal.tsx           ← Gestionar acceso
│   ├── FolderPermissionsModal.tsx       ← Permisos de carpeta
│   ├── PathAccessModal.tsx             ← Permisos de ruta
│   ├── MyAccesses.tsx                  ← Mis accesos
│   └── admin/
│       ├── AssignPermissionModal.tsx
│       ├── EditPermissionModal.tsx
│       ├── ViewPermissionModal.tsx
│       ├── BulkPermissionAssignment.tsx
│       └── PermissionManagement.tsx
│
├── 🔗 Compartición
│   ├── ShareLinkModal.tsx              ← Crear enlace compartido
│   └── ShareLinks.tsx (página)         ← Gestionar enlaces
│
├── 👥 Gestión de Usuarios (Admin)
│   ├── admin/UserManagement.tsx
│   ├── admin/CreateUserModal.tsx
│   ├── admin/EditUserModal.tsx
│   ├── admin/UserAuditModal.tsx
│   ├── admin/UserAutocompleteSelector.tsx
│   ├── admin/GroupManagement.tsx
│   └── admin/RouteMultiInput.tsx
│
├── 💬 Mensajería y Notificaciones
│   ├── NotificationBell.tsx            ← Campana de notificaciones
│   ├── Admin/MessageComposer.tsx       ← Redactor de mensajes (admin)
│   └── Admin/AdminThreadList.tsx       ← Hilo de mensajes (admin)
│
├── 🎯 UI Components
│   ├── ui/AlertModal.tsx
│   ├── ui/ConfirmModal.tsx
│   └── ui/PromptModal.tsx
│
├── 🤖 IA y Diccionario
│   ├── AISystemWidget.tsx              ← Widget del sistema IA
│   ├── AIAbbreviationsManager.tsx       ← Gestor de abreviaturas IA
│   ├── GroqStatsWidget.tsx              ← Estadísticas GROQ
│   ├── dictionary/CreateDictionaryEntryModal.tsx
│   └── dictionary/EditDictionaryEntryModal.tsx
│
├── 🎨 Utilidades Visuales
│   ├── DirectoryColorPicker.tsx        ← Selector de color de carpeta
│   ├── FilterPanel.tsx                 ← Panel de filtros
│   ├── SortDropdown.tsx                ← Ordenamiento
│   ├── Pagination.tsx                  ← Paginación
│   ├── CharacterCounter.tsx            ← Contador de caracteres
│   ├── HighlightedError.tsx            ← Mostrar errores
│   ├── ValidationAlert.tsx             ← Alertas de validación
│   ├── ActionsMenu.tsx                 ← Menú de acciones
│   ├── TrashModal.tsx                  ← Modal de papelera
│   ├── SuccessModal.tsx                ← Modal de éxito
│   └── EditInOfficeButton.tsx           ← Botón editar en Office
│
└── 📋 Componentes Index
    └── index.ts                        ← Exportaciones centralizadas
```

---

## 🔗 CAPA DE API (API Client)

```
src/api/
│
├── 🔐 Autenticación
│   └── auth.ts                 - Login, Logout, Refresh Token
│
├── 📁 Operaciones de Archivos
│   ├── files.ts                - Get files, Get tree, Navigate
│   ├── fileOps.ts              - Copy, Move, Delete, Rename
│   ├── favorites.ts            - Add/Remove favorites
│   └── trash.ts                - Trash operations
│
├── 🔗 Compartición
│   └── sharing.ts              - Share links, Manage access
│
├── 👥 Usuarios y Administración
│   ├── users.ts                - User management
│   └── admin.ts                - Admin operations
│
├── 📊 Datos y Estadísticas
│   ├── stats.ts                - Estadísticas generales
│   ├── groqStats.ts            - Estadísticas GROQ
│   ├── audit.ts                - Auditoría
│   └── notifications.ts        - Notificaciones
│
├── 🤖 IA y Diccionario
│   ├── aiAbbreviations.ts      - Abreviaturas IA
│   └── directoryColors.ts      - Colores de directorios
│
├── 🔧 Cliente Base
│   └── client.ts               - Instancia de Axios configurada
│                                - Interceptores
│                                - Manejo de errores
│
└── 📌 Index
    └── index.ts                - Exportaciones centralizadas
```

---

## 🧠 STATE MANAGEMENT (Zustand)

```
src/store/
│
├── 🔐 authStore.ts
│   ├── Estado de autenticación
│   ├── Token JWT
│   ├── Datos del usuario
│   ├── Funciones login/logout
│   └── Persistencia en localStorage
│
├── 📋 clipboardStore.ts
│   ├── Archivos en portapapeles
│   ├── Modo: copy/move
│   ├── Conflictos de pasting
│   └── Historial
│
└── 🔔 notificationStore.ts
    ├── Notificaciones globales
    ├── Toast messages
    └── Alertas del sistema
```

---

## 🎣 CUSTOM HOOKS

```
src/hooks/
│
├── 📁 Operaciones de Directorios
│   └── useTreeData.ts          - Manejo del árbol de directorios
│
├── 🎨 UI y Tema
│   ├── useTheme.tsx            - Sistema de temas (Dark/Light)
│   ├── useModal.tsx            - Control de modales
│   └── useToast.ts             - Notificaciones toast
│
├── 📋 Portapapeles
│   ├── useClipboard.ts         - Operaciones copy/paste
│   ├── useClipboardWithConflicts.ts - Con manejo de conflictos
│   └── useClipboardMultiple.ts - Múltiples elementos
│
├── 🔐 Permisos
│   └── usePathPermissions.ts    - Manejo de permisos de rutas
│
├── 📊 Datos y Filtrado
│   ├── useFileSort.ts          - Ordenamiento de archivos
│   └── useDirectoryColors.ts   - Colores de directorios
│
└── 📌 Reutilizable en componentes
```

---

## 🎯 CONTEXTOS (Context API)

```
src/contexts/
│
└── 🎨 ThemeContext.tsx
    ├── Proveedor de tema global
    ├── Soporte Dark/Light mode
    ├── Configuración de estilo
    └── Persistencia en localStorage
```

---

## 🛠️ TIPOS Y UTILIDADES

```
src/types/
├── Definiciones TypeScript de interfaces y tipos

src/utils/
├── 🔒 security.ts              - Funciones de seguridad
├── 👤 roleUtils.ts             - Utilidades de roles
├── 📏 formatSize.ts            - Formato de tamaño de archivos
└── 📅 formatDate.ts            - Formato de fechas
```

---

## 🔄 FLUJO DE DATOS PRINCIPAL

```
┌────────────────────────────────────────────────────────────────────┐
│                    USUARIO EN EL NAVEGADOR                         │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │   Componentes React (Pages + UI)       │
        │   - Renderización de la interfaz      │
        │   - Interacción del usuario           │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │   Custom Hooks (useTreeData, etc)     │
        │   - Lógica de negocio                 │
        │   - Procesamiento de datos            │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │   State Management (Zustand)           │
        │   - authStore                         │
        │   - clipboardStore                    │
        │   - notificationStore                 │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │   API Client (Axios)                   │
        │   - Peticiones HTTP                   │
        │   - Interceptores                     │
        │   - Manejo de errores                 │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │        Backend (Django API)             │
        │   /api/files/                         │
        │   /api/auth/                          │
        │   /api/sharing/                       │
        │   /api/users/                         │
        │   /api/audit/                         │
        │   /api/admin/                         │
        └────────────────────────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │     Base de Datos (PostgreSQL)         │
        │   - Archivos                          │
        │   - Usuarios                          │
        │   - Permisos                          │
        │   - Auditoría                         │
        └────────────────────────────────────────┘
```

---

## 📚 TECNOLOGÍAS UTILIZADAS

```
┌────────────────────────────────────────────────────────────────────┐
│                    STACK TECNOLÓGICO                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 🔧 Framework & Bundler                                              │
│   • React 19.2.0                                                    │
│   • Vite 6.0+                                                       │
│   • TypeScript 5.x                                                  │
│   • React Router 7.9.6                                              │
│                                                                     │
│ 🎨 Styling                                                          │
│   • Tailwind CSS                                                    │
│   • PostCSS                                                         │
│   • Lucide React (Icons)                                            │
│                                                                     │
│ 📡 Estado & HTTP                                                    │
│   • Zustand 5.0.8 (State Management)                                │
│   • Axios 1.13.2 (HTTP Client)                                      │
│                                                                     │
│ 🛠️ Utilidades                                                       │
│   • jszip (Manipulación de ZIP)                                     │
│   • docx (Generación de documentos Word)                            │
│   • React Router DOM 7.9.6                                          │
│                                                                     │
│ 🧪 Desarrollo                                                       │
│   • ESLint (Linting)                                                │
│   • @types/react (TypeScript)                                       │
│   • Vite Plugin React                                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 CARACTERÍSTICAS CLAVE

### ✅ Autenticación & Autorización
- Login/Logout
- JWT Token Management
- Role-based Access Control (RBAC)
- Refresh tokens automáticos

### 📁 Gestión de Archivos
- Navegador de archivos con árbol de directorios
- Vista Grid y List
- Subida de archivos y carpetas
- Copy/Move/Delete con detección de conflictos
- Renombrado de archivos
- Papelera de reciclaje

### 🔗 Compartición
- Crear enlaces públicos de descarga
- Gestión de permisos granulares
- Acceso basado en rutas

### 👥 Administración
- Gestión de usuarios (CRUD)
- Gestión de grupos
- Asignación de permisos
- Auditoría de acciones por usuario

### 🔍 Búsqueda & Filtrado
- Búsqueda global
- Filtros por tipo de archivo
- Favoritos
- Historial de cambios

### 📊 Monitoreo
- Estadísticas de uso
- Auditoría de acciones
- Notificaciones en tiempo real
- Widgets GROQ para IA

### 🤖 IA Integrada
- Recomendaciones GROQ
- Diccionario de abreviaturas
- Análisis asistido por IA

---

## 🎯 FLUJO PRINCIPAL DE INICIO

```
1. Usuario accede a https://gestionarchivo.duckdns.org
2. React renderiza App.tsx
3. Router protege rutas según autenticación
4. Si no autenticado → Page Login
5. Si autenticado → Page FileExplorer (por defecto)
6. FileExplorer carga TreeView y FileList
7. Usando hooks:
   - useTreeData → Obtiene estructura de directorios
   - useFileSort → Ordena archivos
   - usePathPermissions → Valida permisos
8. Layout envuelve toda la aplicación
   - Navbar + Sidebar + Contenido
9. Zustand maneja estado global
   - authStore → Usuario actual
   - clipboardStore → Operaciones de archivos
10. API Client comunica con Backend Django
```

---

## 📱 RESPONSIVE DESIGN

- Tailwind CSS para diseño responsive
- Breakpoints móvil/tablet/desktop
- Componentes adaptativos

---

## 🔌 INTEGRACIONES EXTERNAS

- **GROQ API**: Análisis y recomendaciones IA
- **Backend Django**: API REST
- **PostgreSQL**: Base de datos

---

## 📖 ESTRUCTURA DE CARPETAS VISUAL

```
frontend/
├── src/
│   ├── App.tsx                      ← Componente raíz
│   ├── main.tsx                     ← Entry point
│   ├── App.css / index.css           ← Estilos globales
│   │
│   ├── api/                         ← Capa de API (16 archivos)
│   ├── components/                  ← Componentes (59 archivos)
│   ├── pages/                       ← Páginas/Rutas (13 archivos)
│   ├── hooks/                       ← Custom hooks (9 archivos)
│   ├── store/                       ← State management (3 archivos)
│   ├── contexts/                    ← React Context (1 archivo)
│   ├── types/                       ← Definiciones TypeScript
│   ├── utils/                       ← Funciones utilitarias
│   └── assets/                      ← Imágenes y recursos
│
├── public/                          ← Archivos estáticos
├── dist/                            ← Build producción
│
├── package.json                     ← Dependencias
├── tsconfig.json                    ← Configuración TypeScript
├── vite.config.ts                   ← Configuración Vite
├── tailwind.config.js               ← Configuración Tailwind
├── eslint.config.js                 ← Configuración ESLint
└── index.html                       ← HTML template
```

---

## 🚀 DESPLIEGUE

```
Desarrollo:
  npm run dev
  → Vite dev server en puerto 4545
  → HMR (Hot Module Replacement) habilitado

Producción:
  npm run build
  → Genera carpeta dist/ con assets optimizados
  → Nginx sirve archivos estáticos
  → Proxy a /api/ hacia Django Backend
```

---

## 🔄 CICLO DE VIDA TÍPICO DE UNA SOLICITUD

```
Usuario Acción (ej: Descargar archivo)
    ↓
Componente detecta evento (onClick)
    ↓
Llama a función en hook (useFileSort, useClipboard, etc)
    ↓
Hook procesa lógica y llama a API
    ↓
API Client (client.ts) hace petición HTTP con Axios
    ↓
Interceptor agrega JWT token
    ↓
Petición llega a Backend Django
    ↓
Backend procesa y responde
    ↓
Zustand store actualiza estado global
    ↓
Componentes suscritos se re-renderizan
    ↓
Usuario ve resultado (Toast de confirmación, etc)
```

---

## 📝 CONCLUSIÓN

El frontend de **Server Archivo** es una aplicación React moderna, modular y escalable que implementa:

✅ **Arquitectura limpia** con separación de responsabilidades
✅ **State management** centralizado con Zustand
✅ **Type safety** mediante TypeScript
✅ **Componentes reutilizables** para máxima reusabilidad
✅ **API client** centralizado para todas las peticiones
✅ **Hooks personalizados** para lógica compartida
✅ **Responsive design** con Tailwind CSS
✅ **Seguridad** mediante JWT y RBAC
✅ **UX mejorada** con modales, toasts y validaciones

La estructura permite:
- Fácil mantenimiento
- Escalabilidad
- Testing simplificado
- Colaboración entre desarrolladores
- Documentación clara

