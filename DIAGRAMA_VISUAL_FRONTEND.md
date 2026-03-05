# 🎨 Diagrama Visual - Arquitectura Frontend Server Archivo

## 1️⃣ ARQUITECTURA EN CAPAS

```mermaid
graph TB
    UI["🎨 CAPA UI<br/>React Components<br/>59 Componentes"]
    HOOK["🎣 CAPA HOOKS<br/>Lógica Compartida<br/>9 Custom Hooks"]
    STATE["🧠 CAPA STATE<br/>Zustand<br/>3 Stores"]
    API["📡 CAPA API<br/>Axios Client<br/>16 Módulos API"]
    BACKEND["🔧 BACKEND<br/>Django REST API"]
    DB["💾 BASE DE DATOS<br/>PostgreSQL"]
    
    UI -->|Usa| HOOK
    HOOK -->|Actualiza| STATE
    HOOK -->|Llama| API
    STATE -->|Consulta| API
    API -->|HTTP| BACKEND
    BACKEND -->|Query| DB
    
    style UI fill:#ff9999
    style HOOK fill:#99ccff
    style STATE fill:#99ff99
    style API fill:#ffcc99
    style BACKEND fill:#cc99ff
    style DB fill:#ffff99
```

---

## 2️⃣ RELACIONES ENTRE PÁGINAS Y COMPONENTES PRINCIPALES

```mermaid
graph TD
    APP["App.tsx<br/>Root Component"]
    ROUTER["React Router<br/>7 Routes"]
    
    APP --> ROUTER
    
    ROUTER -->|/| FILEEXP["📁 FileExplorer<br/>Página Principal"]
    ROUTER -->|/dashboard| DASHBOARD["📊 Dashboard"]
    ROUTER -->|/search| SEARCH["🔍 Search"]
    ROUTER -->|/messages| MESSAGES["💬 Messages"]
    ROUTER -->|/administration| ADMIN["👥 Administration"]
    ROUTER -->|/audit| AUDIT["📋 Audit"]
    ROUTER -->|/share-links| SHARELINKS["🔗 ShareLinks"]
    ROUTER -->|/login| LOGIN["🔐 Login"]
    
    FILEEXP -->|Usa| FILETREE["FileTreeView<br/>TreeNode"]
    FILEEXP -->|Usa| FILELIST["FileList<br/>FileListWithSelection"]
    FILEEXP -->|Usa| BREADCRUMB["Breadcrumbs"]
    FILEEXP -->|Usa| ACTMENU["ActionsMenu"]
    
    FILELIST -->|Usa| FILEICON["FileIcon"]
    FILELIST -->|Usa| UPLOAD["UploadModal<br/>UploadFolderModal"]
    
    ACTMENU -->|Abre| MODALS["RenameModal<br/>CreateFolderModal<br/>DeleteConfirmModal<br/>FileDetailsModal"]
    
    MODALS -->|Llama| HOOKS["useClipboard<br/>useFileSort<br/>useTreeData"]
    
    HOOKS -->|Ejecuta| API["API Client<br/>files.ts<br/>fileOps.ts"]
    
    DASHBOARD -->|Usa| WIDGET1["GroqStatsWidget"]
    DASHBOARD -->|Usa| WIDGET2["AISystemWidget"]
    
    ADMIN -->|Usa| USERS["UserManagement<br/>CreateUserModal<br/>EditUserModal"]
    ADMIN -->|Usa| PERMS["PermissionManagement<br/>AssignPermissionModal"]
    
    style APP fill:#ff6666
    style ROUTER fill:#ff9999
    style FILEEXP fill:#99ccff
    style DASHBOARD fill:#99ff99
    style ADMIN fill:#ffcc99
    style LOGIN fill:#cc99ff
```

---

## 3️⃣ FLUJO DE DATOS Y ESTADO GLOBAL

```mermaid
graph LR
    USER["👤 Usuario<br/>Interacción"]
    COMP["🎨 Componentes<br/>React"]
    HOOK["🎣 Custom Hooks<br/>Lógica"]
    STORE["🧠 Zustand Store<br/>Estado Global"]
    API["📡 API Client<br/>Axios"]
    BACKEND["🔧 Backend<br/>Django"]
    
    USER -->|Click/Input| COMP
    COMP -->|Llama función| HOOK
    HOOK -->|Lee/Escribe| STORE
    HOOK -->|Petición HTTP| API
    STORE -->|Escucha cambios| COMP
    API -->|Request| BACKEND
    BACKEND -->|Response| API
    API -->|Actualiza| STORE
    STORE -->|Re-render| COMP
    COMP -->|Muestra resultado| USER
    
    style USER fill:#ffcccc
    style COMP fill:#ccffcc
    style HOOK fill:#ccccff
    style STORE fill:#ffffcc
    style API fill:#ffccff
    style BACKEND fill:#ccffff
```

---

## 4️⃣ ESTRUCTURA DE COMPONENTES (ÁRBOL JERÁRQUICO)

```mermaid
graph TD
    LAYOUT["Layout.tsx<br/>Componente Padre"]
    
    LAYOUT -->|Contiene| NAV["Navbar<br/>Logo + Menu"]
    LAYOUT -->|Contiene| SIDEBAR["Sidebar<br/>Navegación Principal"]
    LAYOUT -->|Contiene| MAIN["Main Content<br/>Área de Contenido"]
    LAYOUT -->|Contiene| TOAST["Toast<br/>Notificaciones"]
    LAYOUT -->|Contiene| NOTIF["NotificationBell<br/>Campana"]
    
    MAIN -->|Página Activa| PAGECOMP["Componentes<br/>de Página"]
    
    PAGECOMP -->|FileExplorer| FE["FileTreeView +<br/>FileList"]
    PAGECOMP -->|Dashboard| DASH["Widgets"]
    PAGECOMP -->|Admin| ADM["User/Permission<br/>Components"]
    PAGECOMP -->|Audit| AUD["Audit Table"]
    
    FE -->|Elementos| ELEM["FileIcon<br/>TreeNode<br/>Breadcrumbs"]
    
    FE -->|Acciones| MODALS["Modales:<br/>Upload, Rename,<br/>Delete, Details"]
    
    MODALS -->|Comunica| HOOKS["useFileSort<br/>useClipboard<br/>useTreeData"]
    
    HOOKS -->|Llama| STORE["authStore<br/>clipboardStore<br/>notificationStore"]
    
    STORE -->|Usa| API["files.ts<br/>fileOps.ts<br/>auth.ts"]
    
    style LAYOUT fill:#ff9999
    style NAV fill:#ffcccc
    style SIDEBAR fill:#ffcccc
    style TOAST fill:#ffffcc
    style FE fill:#99ccff
    style MODALS fill:#ccccff
    style HOOKS fill:#99ff99
    style STORE fill:#ffffcc
    style API fill:#ffccff
```

---

## 5️⃣ RELACIONES ENTRE STORES (ZUSTAND)

```mermaid
graph TB
    AUTHSTORE["🔐 authStore<br/>─────────────<br/>user: User<br/>token: JWT<br/>refreshToken<br/>isAuthenticated<br/><br/>Actions:<br/>login()<br/>logout()<br/>setUser()"]
    
    CLIPSTORE["📋 clipboardStore<br/>─────────────<br/>items: File[]<br/>mode: copy|move<br/>conflicts: []<br/><br/>Actions:<br/>copy()<br/>move()<br/>paste()<br/>clear()"]
    
    NOTIFSTORE["🔔 notificationStore<br/>─────────────<br/>toasts: Toast[]<br/>notifications: Notif[]<br/><br/>Actions:<br/>addToast()<br/>removeToast()<br/>addNotification()"]
    
    COMP["🎨 Componentes"]
    HOOKS["🎣 Hooks"]
    
    COMP -->|Suscribe| AUTHSTORE
    COMP -->|Suscribe| CLIPSTORE
    COMP -->|Suscribe| NOTIFSTORE
    
    HOOKS -->|Lee/Escribe| AUTHSTORE
    HOOKS -->|Lee/Escribe| CLIPSTORE
    HOOKS -->|Lee/Escribe| NOTIFSTORE
    
    AUTHSTORE -.->|Persistencia| LOCALSTORAGE["localStorage<br/>user, token"]
    CLIPSTORE -.->|En memoria| SESSION["Session State"]
    NOTIFSTORE -.->|En memoria| SESSION
    
    style AUTHSTORE fill:#ff9999
    style CLIPSTORE fill:#99ccff
    style NOTIFSTORE fill:#ffffcc
    style LOCALSTORAGE fill:#ffcccc
```

---

## 6️⃣ MÓDULOS DE API Y SUS FUNCIONES

```mermaid
graph TB
    APICLIENT["API Client<br/>axios instance<br/>Base URL<br/>Interceptores"]
    
    APICLIENT -->|Auth| AUTH["auth.ts<br/>login()<br/>logout()<br/>refreshToken()"]
    
    APICLIENT -->|Files| FILES["files.ts<br/>getFiles()<br/>getTree()<br/>navigate()"]
    
    APICLIENT -->|File Ops| FILEOPS["fileOps.ts<br/>copy()<br/>move()<br/>delete()<br/>rename()"]
    
    APICLIENT -->|Sharing| SHARING["sharing.ts<br/>createLink()<br/>getLinks()<br/>deleteLink()<br/>manageAccess()"]
    
    APICLIENT -->|Users| USERS["users.ts<br/>getUsers()<br/>createUser()<br/>editUser()<br/>deleteUser()"]
    
    APICLIENT -->|Admin| ADMIN["admin.ts<br/>getGroups()<br/>createGroup()<br/>assignPermissions()"]
    
    APICLIENT -->|Audit| AUDIT["audit.ts<br/>getAuditLog()<br/>getUserAudit()"]
    
    APICLIENT -->|Stats| STATS["stats.ts<br/>getStats()<br/>getUsage()"]
    
    APICLIENT -->|AI| AIABB["aiAbbreviations.ts<br/>getDictionary()<br/>addEntry()<br/>editEntry()"]
    
    APICLIENT -->|Notifications| NOTIF["notifications.ts<br/>getNotifications()<br/>markAsRead()"]
    
    style APICLIENT fill:#ffcccc
    style AUTH fill:#ff9999
    style FILES fill:#99ccff
    style FILEOPS fill:#99ccff
    style SHARING fill:#99ff99
    style USERS fill:#ffcc99
    style ADMIN fill:#ffcc99
```

---

## 7️⃣ FLUJO COMPLETO: DESCARGAR ARCHIVO

```mermaid
sequenceDiagram
    participant User as 👤 Usuario
    participant UI as 🎨 FileList
    participant Hook as 🎣 useFileSort
    participant Store as 🧠 Zustand
    participant API as 📡 Axios
    participant Backend as 🔧 Django
    
    User->>UI: Click en archivo
    UI->>UI: Detecta evento
    UI->>Hook: llamar download()
    Hook->>Store: Leer authStore
    Hook->>API: GET /api/files/download/{id}
    API->>Backend: HTTP GET + JWT Token
    Backend->>Backend: Validar permisos
    Backend->>Backend: Preparar archivo
    Backend-->>API: File Stream
    API-->>Hook: Blob
    Hook->>Hook: Trigger descarga
    Hook->>Store: addToast('Success')
    Store-->>UI: notify update
    UI->>UI: Mostrar Toast
    UI-->>User: ✅ Archivo descargado
```

---

## 8️⃣ FLUJO COMPLETO: CREAR CARPETA

```mermaid
sequenceDiagram
    participant User as 👤 Usuario
    participant Modal as 🎨 CreateFolderModal
    participant Hook as 🎣 useTreeData
    participant API as 📡 axios
    participant Backend as 🔧 Django
    participant Store as 🧠 Zustand
    
    User->>Modal: Click "New Folder"
    Modal->>Modal: Input nombre
    User->>Modal: Click "Create"
    Modal->>Hook: creatFolder(name)
    Hook->>API: POST /api/files/create-folder
    API->>Backend: HTTP POST + datos
    Backend->>Backend: Validar permisos
    Backend->>Backend: Crear carpeta BD
    Backend-->>API: {folder_id, name}
    API-->>Hook: Response
    Hook->>Store: notificationStore.addToast()
    Hook->>Hook: Refetch tree data
    Store-->>Modal: Toast success
    Modal->>Modal: Cerrar modal
    Hook-->>User: Actualizar árbol
```

---

## 9️⃣ RELACIONES COMPONENTES - MODALES

```mermaid
graph TB
    FILEEXP["📁 FileExplorer<br/>Página Principal"]
    
    FILEEXP -->|Abre| UPLOAD["UploadModal"]
    FILEEXP -->|Abre| CREATEF["CreateFolderModal"]
    FILEEXP -->|Abre| RENAME["RenameModal"]
    FILEEXP -->|Abre| DELETE["DeleteConfirmModal"]
    FILEEXP -->|Abre| FILEDET["FileDetailsModal"]
    FILEEXP -->|Abre| FOLDERDET["FolderDetailsModal"]
    FILEEXP -->|Abre| CONFLICT["ConflictModal"]
    FILEEXP -->|Abre| MANAGE["ManageAccessModal"]
    FILEEXP -->|Abre| SHARELINK["ShareLinkModal"]
    
    UPLOAD -->|Llama| API["fileOps.ts<br/>upload()"]
    CREATEF -->|Llama| API
    RENAME -->|Llama| API
    DELETE -->|Llama| API
    CONFLICT -->|Llama| API
    MANAGE -->|Llama| API
    SHARELINK -->|Llama| API
    
    API -->|Actualiza| STORE["clipboardStore<br/>notificationStore"]
    
    STORE -->|Notifica| FILEEXP
    FILEEXP -->|Re-render| FILETREE["FileTreeView"]
    FILEEXP -->|Re-render| FILELIST["FileList"]
    
    style FILEEXP fill:#99ccff
    style UPLOAD fill:#ffcccc
    style CREATEF fill:#ffcccc
    style RENAME fill:#ffcccc
    style DELETE fill:#ffcccc
    style CONFLICT fill:#ffcccc
    style MANAGE fill:#ffcccc
    style SHARELINK fill:#ffcccc
    style API fill:#ffcc99
    style STORE fill:#ffffcc
```

---

## 🔟 RELACIONES PÁGINA ADMINISTRACIÓN

```mermaid
graph TB
    ADMIN["👥 Administration<br/>Página Admin"]
    
    ADMIN -->|Tab 1| USERS["👤 UserManagement<br/>Listado de usuarios"]
    ADMIN -->|Tab 2| PERMS["🔐 PermissionManagement<br/>Gestión de permisos"]
    ADMIN -->|Tab 3| GROUPS["👨‍👩‍👧 GroupManagement<br/>Gestión de grupos"]
    ADMIN -->|Tab 4| AUDIT["📋 UserAuditModal<br/>Auditoría de usuario"]
    
    USERS -->|Abre| CREATE["CreateUserModal"]
    USERS -->|Abre| EDIT["EditUserModal"]
    USERS -->|Llama| USERSAPI["users.ts"]
    
    PERMS -->|Abre| ASSIGN["AssignPermissionModal"]
    PERMS -->|Abre| EDITPERM["EditPermissionModal"]
    PERMS -->|Abre| VIEWPERM["ViewPermissionModal"]
    PERMS -->|Llama| ADMINAPI["admin.ts"]
    
    GROUPS -->|Llama| ADMINAPI
    
    AUDIT -->|Llama| AUDITAPI["audit.ts"]
    
    USERSAPI -->|API| BACKEND["Backend API"]
    ADMINAPI -->|API| BACKEND
    AUDITAPI -->|API| BACKEND
    
    BACKEND -->|Respuesta| STORE["notificationStore"]
    STORE -->|Actualiza| ADMIN
    
    style ADMIN fill:#ffcc99
    style USERS fill:#ffcccc
    style PERMS fill:#ffcccc
    style GROUPS fill:#ffcccc
    style AUDIT fill:#ffcccc
    style CREATE fill:#ffffcc
    style EDIT fill:#ffffcc
```

---

## 1️⃣1️⃣ CUSTOM HOOKS Y SUS DEPENDENCIAS

```mermaid
graph TB
    TREE["useTreeData<br/>─────────<br/>getTree()<br/>navigate()<br/>expand/collapse"]
    
    SORT["useFileSort<br/>─────────<br/>sortBy()<br/>filterBy()<br/>applySort()"]
    
    CLIP["useClipboard<br/>─────────<br/>copy()<br/>paste()<br/>move()"]
    
    CLIPCONF["useClipboardWithConflicts<br/>─────────<br/>detectConflicts()<br/>resolveConflict()"]
    
    PERMS["usePathPermissions<br/>─────────<br/>hasPermission()<br/>validatePath()"]
    
    MODAL["useModal<br/>─────────<br/>openModal()<br/>closeModal()"]
    
    TOAST["useToast<br/>─────────<br/>showToast()<br/>hideToast()"]
    
    THEME["useTheme<br/>─────────<br/>toggleTheme()<br/>setTheme()"]
    
    COLORS["useDirectoryColors<br/>─────────<br/>setColor()<br/>getColor()"]
    
    TREE -->|Usa| STORE1["authStore"]
    SORT -->|Usa| STORE1
    CLIP -->|Usa| STORE2["clipboardStore"]
    CLIPCONF -->|Usa| STORE2
    PERMS -->|Usa| STORE1
    MODAL -->|Usa| STORE2
    TOAST -->|Usa| STORE3["notificationStore"]
    THEME -->|Usa| CONTEXT["ThemeContext"]
    COLORS -->|Usa| STORE1
    
    TREE -->|Llama| API1["files.ts"]
    SORT -->|Llama| API1
    CLIP -->|Llama| API2["fileOps.ts"]
    CLIPCONF -->|Llama| API2
    PERMS -->|Llama| API1
    COLORS -->|Llama| API3["directoryColors.ts"]
    
    style TREE fill:#99ccff
    style SORT fill:#99ccff
    style CLIP fill:#99ccff
    style CLIPCONF fill:#99ccff
    style PERMS fill:#99ccff
    style MODAL fill:#99ccff
    style TOAST fill:#99ccff
    style THEME fill:#99ccff
    style COLORS fill:#99ccff
    style STORE1 fill:#ffffcc
    style STORE2 fill:#ffffcc
    style STORE3 fill:#ffffcc
    style CONTEXT fill:#ffcccc
```

---

## 1️⃣2️⃣ FLUJO DE AUTENTICACIÓN

```mermaid
graph TD
    LOGIN["🔐 Login Page"]
    FORM["Formulario Login"]
    HOOK["useAuth Hook"]
    API["auth.ts"]
    BACKEND["Backend Valida"]
    RESPONSE["Response JWT"]
    STORE["authStore"]
    REDIRECT["Redirige a /"]
    
    LOGIN -->|Renderiza| FORM
    FORM -->|Llena credenciales| USER["Usuario ingresa<br/>email + password"]
    USER -->|Submit| HOOK
    HOOK -->|POST login| API
    API -->|HTTP| BACKEND
    BACKEND -->|Valida credenciales| DB["PostgreSQL"]
    DB -->|Usuario encontrado| BACKEND
    BACKEND -->|Genera JWT| RESPONSE
    RESPONSE -->|Token + User Data| HOOK
    HOOK -->|Guarda| STORE
    STORE -->|localStorage| STORAGE["Browser Storage"]
    STORE -->|Notifica| LOGIN
    LOGIN -->|Re-render| REDIRECT
    REDIRECT -->|Navega a| FILEEXP["FileExplorer"]
    
    style LOGIN fill:#ff9999
    style FORM fill:#ffcccc
    style HOOK fill:#99ccff
    style API fill:#ffcc99
    style BACKEND fill:#cc99ff
    style STORE fill:#ffffcc
    style STORAGE fill:#ffcccc
    style FILEEXP fill:#99ff99
```

---

## 1️⃣3️⃣ MATRIZ DE DEPENDENCIAS (COMPONENTES - HOOKS)

```
                useTree  useSort  useClip  usePerm  useModal  useToast  useTheme
FileExplorer      ✅       ✅       ✅       ✅        ✅        ✅         ✅
FileList          ✅       ✅       ✅                 ✅        ✅
FileTreeView      ✅                                  ✅
UploadModal                         ✅                 ✅        ✅
CreateFolderModal                   ✅        ✅       ✅        ✅
RenameModal                         ✅                 ✅        ✅
DeleteConfirm                       ✅                 ✅        ✅
FileDetails       ✅       ✅                  ✅       ✅
ManageAccess                        ✅        ✅       ✅        ✅
ShareLinkModal                      ✅        ✅       ✅        ✅
Dashboard                                              ✅        ✅         ✅
Administration    ✅       ✅                          ✅        ✅
Audit             ✅       ✅                          ✅        ✅
```

---

## 1️⃣4️⃣ MATRIZ DE DEPENDENCIAS (COMPONENTES - API)

```
              files  fileOps  sharing  auth  users  admin  audit  stats  AI
FileExplorer   ✅      ✅       ✅               ✅      ✅      ✅      ✅
UploadModal            ✅                       ✅
CreateFolder           ✅
DeleteConfirm          ✅
RenameModal            ✅
ShareLink              ✅       ✅              ✅
ManageAccess           ✅       ✅              ✅
Dashboard              ✅                              ✅      ✅       ✅
Admin                  ✅                ✅     ✅      ✅
Users                                     ✅     ✅      ✅
Audit                                      ✅     ✅
Search         ✅      ✅       ✅              ✅      ✅
Notifications                                        ✅       ✅
```

---

## 1️⃣5️⃣ CICLO DE VIDA DE UN COMPONENTE (FileExplorer)

```mermaid
graph TD
    MOUNT["🔌 MOUNT<br/>Componente se monta"]
    INIT["⚙️ INIT<br/>useEffect(() => {<br/>- load auth<br/>- load tree<br/>- load permissions<br/>})"]
    RENDER["🎨 RENDER<br/>Renderiza:<br/>- FileTreeView<br/>- FileList<br/>- Breadcrumbs<br/>- ActionMenu"]
    INTERACT["👆 INTERACT<br/>Usuario interactúa:<br/>- Click en archivo<br/>- Abre modal<br/>- Copy/Paste"]
    UPDATE["🔄 UPDATE<br/>useCallback llamadas:<br/>- handleDownload<br/>- handleDelete<br/>- handleRename"]
    STORE["🧠 STORE<br/>Zustand actualiza:<br/>- notificationStore<br/>- clipboardStore<br/>- authStore"]
    RERENDER["🎨 RE-RENDER<br/>Componentes suscritos<br/>se re-renderizan"]
    UNMOUNT["❌ UNMOUNT<br/>Componente se desmonta<br/>Limpia listeners"]
    
    MOUNT -->|useEffect| INIT
    INIT -->|Datos cargados| RENDER
    RENDER -->|Usuario| INTERACT
    INTERACT -->|Trigger| UPDATE
    UPDATE -->|Escribe estado| STORE
    STORE -->|Notifica| RERENDER
    RERENDER -->|Si el usuario navega| UNMOUNT
    
    style MOUNT fill:#ff9999
    style INIT fill:#ffcccc
    style RENDER fill:#99ccff
    style INTERACT fill:#ffcccc
    style UPDATE fill:#99ff99
    style STORE fill:#ffffcc
    style RERENDER fill:#99ccff
    style UNMOUNT fill:#cc99ff
```

---

## 1️⃣6️⃣ RESUMEN VISUAL: COMPONENTES POR TIPO

```mermaid
pie title Distribución de 59 Componentes
    "Layout & Navegación" : 5
    "Componentes de Archivo" : 10
    "Modales" : 12
    "Administración" : 12
    "UI Utilities" : 8
    "Widgets & Especiales" : 12
```

---

## 1️⃣7️⃣ RESUMEN: APIS POR CATEGORÍA

```mermaid
pie title 16 Módulos API
    "Auth" : 1
    "Files & FileOps" : 2
    "Sharing & Access" : 2
    "Users & Admin" : 2
    "Audit & Monitoring" : 2
    "Data & Stats" : 2
    "AI & Utils" : 3
```

---

## 📊 RESUMEN VISUAL DE LA ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTACIÓN                              │
│  React Components (59) | Pages (13) | Modales (12)           │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                    LÓGICA                                     │
│  Custom Hooks (9) | ThemeContext | Utilidades               │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                  ESTADO GLOBAL                                │
│  Zustand Stores (3): Auth | Clipboard | Notifications        │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                  COMUNICACIÓN                                 │
│  API Client (Axios) | 16 Módulos API | Interceptores        │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND                                      │
│  Django REST API | PostgreSQL | Autenticación JWT            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 CONCLUSIÓN VISUAL

La arquitectura frontend sigue el patrón:

```
┌──────────────────────────────────────────────────┐
│  COMPONENTES (Presentación)                      │
│  Reutilizables | Responsivos | Accesibles       │
└─────────────────┬────────────────────────────────┘
                  │ Usa
┌─────────────────▼────────────────────────────────┐
│  HOOKS (Lógica Compartida)                       │
│  Custom | Reutilizables | Testeables            │
└─────────────────┬────────────────────────────────┘
                  │ Actualiza/Lee
┌─────────────────▼────────────────────────────────┐
│  ZUSTAND STORES (Estado Global)                  │
│  Reactividad | Persistencia | Suscripción        │
└─────────────────┬────────────────────────────────┘
                  │ Llama
┌─────────────────▼────────────────────────────────┐
│  API CLIENT (Comunicación HTTP)                  │
│  Axios | Interceptores | Error Handling          │
└─────────────────┬────────────────────────────────┘
                  │ HTTP
┌─────────────────▼────────────────────────────────┐
│  BACKEND (Lógica de Servidor)                    │
│  Django | PostgreSQL | Autenticación             │
└──────────────────────────────────────────────────┘
```

**Esta es una arquitectura moderna, escalable y bien estructurada que permite:**
✅ Mantenimiento fácil
✅ Testing simplificado
✅ Reutilización de código
✅ Escalabilidad
✅ Separación de responsabilidades
