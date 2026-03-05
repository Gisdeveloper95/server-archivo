# 📋 ARQUITECTURA TÉCNICA - EXPLORADOR DE ARCHIVOS

## 1. ESTRUCTURA GENERAL

### Componente Principal: `FileExplorer.tsx`
**Ruta:** `frontend/src/pages/FileExplorer.tsx` (1226 líneas)

El componente FileExplorer es una página compleja que orquesta:
- Navegación de directorios
- Visualización de archivos (lista o árbol)
- Operaciones de archivo (copy, move, delete, rename, upload)
- Gestión de permisos y accesos
- Modalidades múltiples (upload, create folder, info, etc.)
- Sincronización de estado

---

## 2. DEPENDENCIAS

### 2.1 Hooks Personalizados (9)
```
useToast()              → Sistema de notificaciones (success, error, warning)
useModal()              → Modales de confirmación y prompts
useClipboardWithConflicts() → Gestión copy/cut/paste con resolución de conflictos
usePathPermissions()    → Verificación permisos en ruta actual
useDirectoryColors()    → Almacenamiento de colores de directorios
useAuthStore()          → Estado de autenticación del usuario (Zustand)
useNavigate()           → Navegación React Router
useSearchParams()       → Lectura de parámetros URL
useState()              → Estado local del componente
useEffect()             → Efectos secundarios y ciclo de vida
```

### 2.2 Módulos API (5)
```
filesApi               → GET /browse - listar archivos, GET /favorites
fileOpsApi            → POST /copy, /move, /delete, /rename
favoritesApi          → POST /add-favorite, DELETE /remove-favorite
authApi               → GET /auth/my-access - permisos del usuario
directoryColorsApi    → POST/DELETE colores de directorios
```

### 2.3 Componentes Hijo (21)
```
UI LAYOUT:
├── Layout              → Wrapper principal (navbar + sidebar)
├── Breadcrumbs         → Navegación por ruta (migas de pan)
├── ToastContainer      → Sistema de notificaciones

VISUALIZACIÓN:
├── FileListWithSelection  → Tabla de archivos con checkboxes (paginada)
├── FileTreeView          → Vista árbol de directorios
├── Pagination            → Controles de paginación
├── SortDropdown          → Ordenamiento de columnas
├── ViewModeToggle        → Cambio entre vista lista/árbol

MODALES DE OPERACIONES:
├── UploadModal              → Subida de archivos
├── UploadFolderModal        → Subida de carpetas
├── CreateFolderModal        → Crear nueva carpeta
├── RenameModal              → Renombrar archivo/carpeta
├── DeleteConfirmModal       → Confirmación eliminación

MODALES DE INFORMACIÓN:
├── FolderInfoModal          → Detalles de carpeta (tamaño, fecha)
├── FileInfoModal            → Detalles de archivo
├── FileDetailsModal         → Panel completo de detalles
├── ConflictModal            → Resolución de conflictos paste

MODALES DE PERMISOS/COMPARTICIÓN:
├── FolderPermissionsModal   → Gestionar permisos en carpeta
├── PathAccessModal          → Acceso a ruta específica
├── ManageAccessModal        → Gestionar accesos de usuarios
├── ShareLinkModal           → Crear enlaces compartidos
├── MyAccesses               → Panel de accesos del usuario
```

---

## 3. ESTADO DEL COMPONENTE (30+ variables)

### 3.1 Datos Principales
```typescript
data: BrowseResponse | null           // Respuesta de /browse
currentPath: string                   // Ruta actual navegando
currentPage: number                   // Página actual (paginación)
loading: boolean                      // Cargando archivos
error: string                         // Mensaje de error
permissionsLoading: boolean           // Cargando permisos
```

### 3.2 Filtros y Búsqueda
```typescript
filters: {
  extension?: string    // Filtrar por extensión
  year?: number         // Filtrar por año
  month?: number        // Filtrar por mes
}
searchTerm: string      // Búsqueda de texto
```

### 3.3 Vista y Modo
```typescript
viewMode: ViewMode      // 'list' | 'tree'
isDraggingOver: boolean // Drag & drop activo
dropTargetPath: string  // Ruta destino drag
draggedFiles: FileList  // Archivos en drag
```

### 3.4 Modales (11 flags)
```typescript
isUploadModalOpen: boolean
isUploadFolderModalOpen: boolean
isRenameModalOpen: boolean
isCreateFolderModalOpen: boolean
isFolderInfoModalOpen: boolean
isFileInfoModalOpen: boolean
isFileDetailsModalOpen: boolean
isFolderPermissionsModalOpen: boolean
isShareLinkModalOpen: boolean
isPathAccessModalOpen: boolean
isManageAccessModalOpen: boolean
isDeleteConfirmModalOpen: boolean
```

### 3.5 Contexto de Operaciones
```typescript
itemToRename: { name, path, isDirectory } | null
itemToDelete: FileItem | null
selectedFolder: FileItem | null
selectedFile: FileItem | null
itemToShare: FileItem | null
uploadTargetPath: string | null
```

### 3.6 Accesos y Permisos
```typescript
isSuperAdmin: boolean         // Es super administrador
accesses: any[]               // Accesos disponibles del usuario
showingAccesses: boolean      // Mostrando panel de accesos
permissions: PermissionInfo   // Permisos en ruta actual
```

### 3.7 Estado de Portapapeles
```typescript
from useClipboardWithConflicts():
├── clipboardData        // Archivos en portapapeles
├── copyFiles()          // Copiar archivos
├── cutFiles()           // Cortar archivos
├── pasteFiles()         // Pegar archivos
├── cancelClipboard()    // Limpiar portapapeles
├── isPasting: boolean   // Pegando en progreso
├── currentOperation     // 'copy' | 'cut' | null
├── hasClipboard: boolean// Hay algo en portapapeles
├── conflictInfo         // Información de conflictos
└── resolveCurrentConflict() // Resolver conflicto
```

---

## 4. FLUJOS PRINCIPALES

### 4.1 CICLO DE CARGA
```
ComponenteMount
  ↓
loadAccesses() → GET /auth/my-access
  ├─ Obtener is_superadmin
  ├─ Obtener accesses[]
  └─ Decidir: mostrar accesos o ruta
  ↓
searchParams.get('path') → Lee URL
  ├─ Si ?path=X → setCurrentPath(X)
  ├─ Si no → si no superadmin → setShowingAccesses(true)
  └─ setCurrentPage(1)
  ↓
useEffect([currentPath, currentPage, filters])
  ↓
loadFiles()
  ├─ Validar permisos: permissions = await usePathPermissions()
  ├─ GET /browse?path=X&page=Y&search=Z&filters
  ├─ setData(response)
  ├─ Actualizar clipboardStore si hay archivos pegables
  └─ Mostrar lista o árbol según viewMode
```

### 4.2 FLUJO DE NAVEGACIÓN
```
Usuario cliclea carpeta en FileList
  ↓
handleFolderClick(folder: FileItem)
  ├─ navigate(`/explorar?path=${folder.path}`)
  ├─ searchParams listener activa
  ├─ setCurrentPath(folder.path)
  ├─ setCurrentPage(1)
  └─ loadFiles() automático
  ↓
Breadcrumbs: Usuario cliclea migas
  ├─ navegar a ruta padre
  └─ Mismo flujo anterior
```

### 4.3 FLUJO DE UPLOAD
```
Usuario cliclea botón Upload
  ↓
setIsUploadModalOpen(true)
  ↓
<UploadModal>
  ├─ Elegir archivos
  ├─ POST /files/upload?path=currentPath
  ├─ Mostrar progreso
  └─ onUploadComplete → showSuccess() + loadFiles()
  ↓
setIsUploadModalOpen(false)
```

### 4.4 FLUJO DE COPY/PASTE
```
Usuario selecciona archivos + "Copiar"
  ↓
copyFiles(selectedFiles, currentPath)
  ├─ Guardar en clipboardStore
  ├─ currentOperation = 'copy'
  ├─ Mostrar toast: "Copiado"
  └─ selectedFiles.clear()
  ↓
Usuario navega a otra carpeta
  ↓
Usuario cliclea "Pegar"
  ├─ pasteFiles()
  │  ├─ POST /file-ops/paste
  │  ├─ Backend comprueba conflictos
  │  └─ Si hay conflictos → conflictInfo
  ├─ Si conflictos → <ConflictModal>
  │  └─ Usuario decide: replace, keep both, skip
  │  └─ resolveCurrentConflict(action)
  └─ loadFiles() para actualizar lista
```

### 4.5 FLUJO DE DELETE
```
Usuario selecciona archivo + "Eliminar"
  ↓
setItemToDelete(file)
setIsDeleteConfirmModalOpen(true)
  ↓
<DeleteConfirmModal>
  ├─ Usuario confirma
  ├─ DELETE /file-ops/delete
  ├─ Backend mueve a papelera (soft delete)
  └─ loadFiles()
```

### 4.6 FLUJO DE PERMISOS
```
Usuario entra a FileExplorer
  ↓
usePathPermissions(currentPath)
  ├─ GET /files/{fileId}/permissions
  ├─ Retorna: can_read, can_write, can_delete, can_share
  └─ Guarda en estado "permissions"
  ↓
Renderizar botones según permisos:
├─ can_read   → Ver archivos
├─ can_write  → Upload, Rename, Create Folder
├─ can_delete → Delete
└─ can_share  → Share, Set Permissions
```

### 4.7 FLUJO DE BÚSQUEDA/FILTROS
```
Usuario escribe en buscador
  ↓
debounce 300ms
  ↓
setSearchTerm(value)
  ↓
useEffect([searchTerm]) dispara
  ↓
setCurrentPage(1) // Reset a primera página
  ↓
loadFiles() con parámetros:
  GET /browse?path=X&search=TERMINO&page=1
  ├─ Backend busca en nombre de archivo
  ├─ LIKE '%TERMINO%'
  └─ Retorna archivos que coinciden
```

### 4.8 FLUJO DE ARRASTRAR Y SOLTAR (DRAG & DROP)
```
Usuario arrastra archivos sobre zona
  ↓
handleDragOver()
  ├─ setIsDraggingOver(true)
  └─ setDropTargetPath(currentPath)
  ↓
handleDrop()
  ├─ Obtener archivos del evento
  ├─ Si hay currentPath → moveFiles()
  │  └─ POST /file-ops/move
  ├─ Si no → uploadFiles()
  │  └─ POST /files/upload
  └─ loadFiles()
```

---

## 5. INTEGRACIÓN CON COMPONENTES

### FileListWithSelection (Tabla)
```
Props recibidos:
├─ data: FileItem[]           // Datos de archivos
├─ loading: boolean
├─ currentPath: string
├─ permissions: PermissionInfo
├─ onSelectFile(file)
├─ onSelectFolder(folder)
├─ onDeleteClick(file)
├─ onRenameClick(file)
├─ onFileDoubleClick(file)
├─ onFileRightClick(file)
└─ directoryColors

Comportamientos:
├─ Click → seleccionar archivo
├─ Doble click → si carpeta: navigate; si archivo: descargar
├─ Right click → contexto menu
├─ Checkbox → selección múltiple
└─ Drag → initiate drag & drop

Emite eventos:
└─ Selecciones → Parent actualiza estado
```

### FileTreeView (Árbol)
```
Props recibidos:
├─ currentPath: string
├─ permissions: PermissionInfo
├─ onPathChange(newPath)
└─ colors: directoryColors

Funcionalidad:
├─ Cargar árbol completo desde root
├─ Expandir/contraer carpetas
├─ Mostrar niveles anidados
├─ Resaltar carpeta actual
├─ Click en carpeta → onPathChange()
└─ Permisos controlan visibilidad

Emite:
└─ onPathChange(path) → FileExplorer actualiza currentPath
```

### Modales
```
Cada modal es controlado por:
├─ Flag de estado: isXxxModalOpen
├─ Datos contexto: itemToRename, selectedFile, etc.
└─ Callbacks de cierre

Flujo:
1. Usuario acción → setIsXxxModalOpen(true)
2. Modal abre
3. Usuario completa acción
4. Modal llama callback → API call
5. En éxito → setIsXxxModalOpen(false) + showSuccess() + loadFiles()
6. En error → showError()
```

---

## 6. LLAMADAS A API

### Archivo Cargado
```typescript
GET /files/browse?path=PATH&page=PAGE&search=TERM
  Retorna:
  {
    items: FileItem[],
    total_items: number,
    total_pages: number,
    current_page: number,
    parent_path: string,
    can_create_folder: boolean,
    can_upload: boolean,
    total_size: number,
    available_space: number
  }
```

### Operaciones de Archivo
```typescript
POST /files/upload              // Subir archivo
POST /file-ops/copy             // Copiar archivos
POST /file-ops/move             // Mover archivos
POST /file-ops/delete           // Eliminar (soft delete)
POST /file-ops/rename           // Renombrar
POST /file-ops/paste            // Pegar con resolución conflictos

GET /files/{id}/permissions     // Obtener permisos
POST /files/{id}/set-permissions // Establecer permisos
```

### Compartición
```typescript
POST /sharing/create-link       // Crear enlace público
DELETE /sharing/{linkId}        // Eliminar enlace
POST /sharing/{linkId}/manage   // Gestionar accesos
```

### Usuario
```typescript
GET /auth/my-access             // Obtener accesos del usuario
GET /users/profile              // Perfil del usuario
```

---

## 7. OPTIMIZACIONES IMPLEMENTADAS

### 7.1 Debouncing
```typescript
// Búsqueda: 300ms de delay para no llamar API en cada tecla
const debouncedSearch = useCallback(
  debounce((term) => {
    setCurrentPage(1);
    loadFiles();
  }, 300),
  []
);
```

### 7.2 Lazy Loading
```typescript
// Paginación: cargar 50 archivos por página
// Actualizar solo cuando cambia página
useEffect([currentPath, currentPage, filters])
```

### 7.3 Caché en localStorage
```typescript
// Vista (lista/árbol) guardada en localStorage
const [viewMode] = useState(() => {
  const saved = localStorage.getItem('file_explorer_view_mode');
  return saved || 'list';
});
```

### 7.4 Sincronización de Estado
```typescript
// Portapapeles sincronizado entre pestañas
// Via Zustand store (persistido en localStorage)
useClipboardWithConflicts() lanza eventos globales
```

---

## 8. MANEJO DE ERRORES

### 8.1 Niveles de Error
```
Crítico (Bloquea UI):
  └─ Error cargando datos → Mostrar <AlertCircle> en UI
  └─ Error autenticación → Redirigir a login

Warning (Notificación):
  └─ Error en operación → Toast error
  └─ Permiso denegado → Toast warning

Info (Notificación):
  └─ Operación exitosa → Toast success
```

### 8.2 Recuperación
```
loadFiles() + retry:
├─ Intenta 1x
├─ Si error → mostrar: "Error al cargar. Reintentando..."
├─ Delay 2s
├─ Intenta 2x
└─ Si sigue errando → mostrar error permanente

Cancelar si el usuario navega a otra ruta:
  useEffect cleanup → Abortar request anterior
```

---

## 9. PERMISOS Y SEGURIDAD

### 9.1 Control de Acceso Basado en Ruta (PBAC)
```
Para cada currentPath:
  1. GET /files/{id}/permissions
  2. Verificar: can_read, can_write, can_delete, can_share
  3. Renderizar UI condicional:
     └─ Upload button solo si can_write
     └─ Delete button solo si can_delete
     └─ Share button solo si can_share
```

### 9.2 Super Admin Override
```
Si isSuperAdmin = true:
  └─ Mostrar todos los permisos
  └─ Poder navegar a cualquier ruta
  └─ Poder ver estadísticas globales
```

### 9.3 JWT Token
```
Cada request incluye:
  Authorization: Bearer <JWT_TOKEN>
  
Backend valida en middleware:
  ├─ Token válido
  ├─ Usuario no expirado
  ├─ Usuario tiene acceso a ruta
  └─ Usuario tiene permiso para operación
```

---

## 10. RENDIMIENTO

### 10.1 Métricos
```
Inicial carga:     ~200-500ms (depende tamaño carpeta)
Navegación:        ~100-300ms
Search:            ~150-400ms (con 300ms debounce)
Paste conflictos:  ~500-1000ms (si hay muchos archivos)
```

### 10.2 Limitaciones
```
Máximo archivos por página: 50
Máximo resultados búsqueda: 1000
Máximo tamaño upload: 5GB
Máximo archivos simultaneos: 10
```

### 10.3 Caché
```
Frontend:
  ├─ localStorage: viewMode
  ├─ useState: data, permissions
  └─ Zustand: clipboard, auth

Backend:
  ├─ Redis: permisos
  └─ DB: archivos
```

---

## 11. REFERENCIAS CRUZADAS

Ver también:
- [16 Módulos API](../DIAGRAMA_VISUAL_FRONTEND.md#módulos-api)
- [9 Custom Hooks](../DIAGRAMA_VISUAL_FRONTEND.md#custom-hooks)
- [3 Zustand Stores](../DIAGRAMA_VISUAL_FRONTEND.md#estado-zustand)
- [Backend APIs en detalle](../00-SUPER-DIAGRAMA-BACKEND-EXPLICACION.md)

---

## 12. PRÓXIMOS PASOS PARA DESARROLLADORES

1. **Para agregar nueva operación:**
   - Crear modal componente
   - Agregar estado isXxxModalOpen
   - Agregar API call en fileOpsApi
   - Agregar button en FileList
   - Llamar loadFiles() en callback
   - Agregar permisos check

2. **Para agregar filtro:**
   - Extender objeto `filters`
   - Agregar UI control (dropdown/input)
   - Pasar a loadFiles() como param
   - Backend implementa filtración

3. **Para nueva vista:**
   - Crear componente ViewType
   - Extender ViewModeToggle
   - Guardar preferencia en localStorage
   - Renderizar condicional en FileExplorer

4. **Para caché más agresivo:**
   - Implementar SWR (stale-while-revalidate)
   - O React Query para sincronización automática
   - O WebSocket para actualizaciones en tiempo real
