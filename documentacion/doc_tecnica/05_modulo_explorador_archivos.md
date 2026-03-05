# 5. Módulo: Explorador de Archivos

## 5.1 Descripción General

El Explorador de Archivos es el módulo central del sistema, proporcionando una interfaz web completa para navegar, buscar y gestionar archivos almacenados en el NAS NetApp.

### Funcionalidades Principales

| Funcionalidad | Descripción |
|---------------|-------------|
| **Navegación** | Exploración jerárquica de directorios |
| **Vistas** | Lista, grilla y árbol |
| **Búsqueda** | Local y global con filtros |
| **Filtros** | Por extensión, fecha, tamaño |
| **Ordenamiento** | Por nombre, fecha, tamaño, tipo |
| **Operaciones** | Subir, descargar, copiar, mover, renombrar, eliminar |
| **Selección múltiple** | Operaciones en lote |
| **Breadcrumbs** | Navegación contextual |
| **Vista previa** | Previsualización de archivos |

---

## 5.2 Arquitectura del Módulo

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXPLORADOR DE ARCHIVOS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    FileExplorer.tsx                      │    │
│  │  ┌─────────────┬─────────────┬─────────────────────┐    │    │
│  │  │ Breadcrumbs │ FilterPanel │   ViewModeToggle    │    │    │
│  │  └─────────────┴─────────────┴─────────────────────┘    │    │
│  │                                                          │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │                                                  │    │    │
│  │  │    FileList / FileTreeView / GridView           │    │    │
│  │  │                                                  │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  ┌─────────────┬─────────────┬─────────────────────┐    │    │
│  │  │ActionsMenu  │ Pagination  │   SortDropdown      │    │    │
│  │  └─────────────┴─────────────┴─────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    API Layer                             │    │
│  │  files.ts → /api/file-ops/browse                        │    │
│  │  fileOps.ts → /api/file-ops/*                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Backend                               │    │
│  │  FileOperationsViewSet → SMBService → NetApp NAS        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5.3 Endpoints del Backend

### 5.3.1 Navegación de Archivos

```
GET /api/file-ops/browse
```

**Parámetros:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `path` | string | Ruta relativa al punto de montaje |
| `page` | int | Número de página (default: 1) |
| `per_page` | int | Items por página (default: 50, max: 100) |
| `extension` | string | Filtrar por extensión |
| `search` | string | Búsqueda en nombres |
| `show_hidden` | bool | Mostrar archivos ocultos |

**Response:**

```json
{
  "success": true,
  "path": "/Documentos/Proyectos",
  "items": [
    {
      "name": "informe_2025.pdf",
      "path": "/Documentos/Proyectos/informe_2025.pdf",
      "is_directory": false,
      "size": 1048576,
      "size_formatted": "1 MB",
      "modified_date": "2025-01-06T10:30:00",
      "extension": "pdf",
      "can_write": true,
      "can_delete": true,
      "can_rename": true
    }
  ],
  "total": 45,
  "breadcrumbs": [
    {"name": "Raíz", "path": "/"},
    {"name": "Documentos", "path": "/Documentos"},
    {"name": "Proyectos", "path": "/Documentos/Proyectos"}
  ]
}
```

### 5.3.2 Operaciones de Archivos

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/file-ops/download` | GET | Descargar archivo/ZIP |
| `/api/file-ops/view` | GET | Ver archivo en navegador |
| `/api/file-ops/file-details` | GET | Metadatos detallados |
| `/api/upload/upload` | POST | Subir archivos |
| `/api/upload/create-folder` | POST | Crear directorio |
| `/api/file-ops/rename` | POST | Renombrar |
| `/api/file-ops/copy` | POST | Copiar |
| `/api/file-ops/move` | POST | Mover |
| `/api/file-ops/delete` | POST | Eliminar (a papelera) |
| `/api/file-ops/download-zip` | POST | Descargar múltiples como ZIP |

---

## 5.4 Servicio SMB (Backend)

El `SMBService` es la capa de abstracción entre Django y el sistema de archivos NAS.

```python
# services/smb_service.py

class SMBService:
    """Servicio para operaciones con el sistema de archivos NAS"""

    def __init__(self):
        self.base_path = settings.NAS_MOUNT_PATH  # /mnt/netapp

    def build_full_path(self, relative_path: str) -> str:
        """Construye la ruta absoluta del sistema de archivos"""
        if not relative_path:
            return self.base_path
        # Sanitizar y unir rutas
        clean_path = relative_path.lstrip('/')
        return os.path.join(self.base_path, clean_path)

    def list_directory(self, path: str) -> List[Dict]:
        """Lista contenidos de un directorio"""
        full_path = self.build_full_path(path)

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Ruta no encontrada: {path}")

        items = []
        for entry in os.scandir(full_path):
            stat = entry.stat()
            items.append({
                'name': entry.name,
                'path': os.path.join(path, entry.name),
                'is_directory': entry.is_dir(),
                'size': stat.st_size if not entry.is_dir() else None,
                'modified_date': datetime.fromtimestamp(stat.st_mtime),
                'created_date': datetime.fromtimestamp(stat.st_ctime),
            })
        return items

    def copy_file(self, src: str, dst: str) -> bool:
        """Copia archivo o directorio"""
        src_path = self.build_full_path(src)
        dst_path = self.build_full_path(dst)

        if os.path.isdir(src_path):
            shutil.copytree(src_path, dst_path)
        else:
            shutil.copy2(src_path, dst_path)
        return True

    def move_file(self, src: str, dst: str) -> bool:
        """Mueve archivo o directorio"""
        src_path = self.build_full_path(src)
        dst_path = self.build_full_path(dst)
        shutil.move(src_path, dst_path)
        return True

    def delete_file(self, path: str) -> bool:
        """Elimina archivo o directorio"""
        full_path = self.build_full_path(path)
        if os.path.isdir(full_path):
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)
        return True
```

---

## 5.5 Verificación de Permisos

Cada operación verifica permisos del usuario antes de ejecutarse:

```python
# services/permission_service.py

class PermissionService:
    @staticmethod
    def check_path_access(user, path: str, action: str) -> dict:
        """
        Verifica si el usuario tiene permiso para la acción en la ruta.

        Args:
            user: Usuario autenticado
            path: Ruta relativa
            action: 'read', 'write', 'delete', 'create_dir'

        Returns:
            dict con 'allowed' y 'reason'
        """
        # Superadmin tiene acceso total
        if user.role == 'superadmin':
            return {'allowed': True, 'reason': 'Superadmin access'}

        # Buscar permisos específicos para la ruta
        from users.models import UserPermission

        permissions = UserPermission.objects.filter(
            user=user,
            is_active=True
        )

        for perm in permissions:
            if path.startswith(perm.base_path):
                # Verificar si la ruta está bloqueada
                if any(path.startswith(bp) for bp in perm.blocked_paths):
                    continue

                # Verificar acción específica
                if action == 'read' and perm.can_read:
                    return {'allowed': True, 'reason': 'Read permitted'}
                if action == 'write' and perm.can_write:
                    # Verificar si es ruta de solo lectura
                    if any(path.startswith(rp) for rp in perm.read_only_paths):
                        return {'allowed': False, 'reason': 'Read-only path'}
                    return {'allowed': True, 'reason': 'Write permitted'}
                if action == 'delete' and perm.can_delete:
                    return {'allowed': True, 'reason': 'Delete permitted'}
                if action == 'create_dir' and perm.can_create_directories:
                    return {'allowed': True, 'reason': 'Create directory permitted'}

        return {'allowed': False, 'reason': 'No permission found'}
```

---

## 5.6 Flujo de Navegación

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE NAVEGACIÓN                          │
└─────────────────────────────────────────────────────────────────┘

    Usuario hace clic en directorio
              │
              ▼
    ┌─────────────────┐
    │ FileExplorer    │
    │ setCurrentPath()│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ filesApi.       │
    │ browseLive()    │
    └────────┬────────┘
             │ GET /api/file-ops/browse?path=/nueva/ruta
             ▼
    ┌─────────────────────────────────────────────────────────┐
    │                     BACKEND                              │
    ├─────────────────────────────────────────────────────────┤
    │                                                          │
    │  1. Validar autenticación (JWT)                         │
    │  2. Verificar permisos de lectura                       │
    │  3. Construir ruta absoluta                             │
    │  4. Listar directorio con os.scandir()                  │
    │  5. Enriquecer con permisos individuales                │
    │  6. Generar breadcrumbs                                 │
    │  7. Registrar acceso en auditoría                       │
    │                                                          │
    └────────────────────────┬────────────────────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────────────────┐
    │                    RESPONSE                              │
    │  { path, items[], total, breadcrumbs[] }                │
    └────────────────────────┬────────────────────────────────┘
                             │
                             ▼
    ┌─────────────────┐
    │ Estado          │
    │ actualizado     │
    │ (React state)   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Re-render       │
    │ FileList/Grid   │
    └─────────────────┘
```

---

## 5.7 Componentes Frontend

### FileExplorer.tsx

Componente principal que orquesta la navegación:

```typescript
// Estructura simplificada
const FileExplorer = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'tree'>('list');
  const [selectedItems, setSelectedItems] = useState<FileItem[]>([]);
  const [filters, setFilters] = useState<FilterState>({});

  // Cargar archivos cuando cambia la ruta
  useEffect(() => {
    loadFiles(currentPath, filters);
  }, [currentPath, filters]);

  const loadFiles = async (path: string, filters: FilterState) => {
    const response = await filesApi.browseLive({ path, ...filters });
    if (response.success) {
      setFiles(response.data.files);
    }
  };

  // Navegación
  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedItems([]);
  };

  // Doble clic en item
  const handleDoubleClick = (item: FileItem) => {
    if (item.is_directory) {
      handleNavigate(item.path);
    } else {
      filesApi.viewFile(item.path);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header con breadcrumbs y controles */}
        <div className="flex items-center justify-between p-4">
          <Breadcrumbs items={breadcrumbs} onNavigate={handleNavigate} />
          <div className="flex items-center gap-2">
            <FilterPanel filters={filters} onChange={setFilters} />
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
            <SortDropdown sortField={sortField} onChange={setSortField} />
          </div>
        </div>

        {/* Lista de archivos */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'list' && (
            <FileList
              files={sortedFiles}
              selectedItems={selectedItems}
              onSelect={handleSelect}
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
            />
          )}
          {viewMode === 'tree' && (
            <FileTreeView
              currentPath={currentPath}
              onNavigate={handleNavigate}
            />
          )}
        </div>

        {/* Barra de acciones */}
        {selectedItems.length > 0 && (
          <ActionsMenu
            items={selectedItems}
            onCopy={handleCopy}
            onMove={handleMove}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        )}
      </div>
    </Layout>
  );
};
```

### FileList.tsx

Muestra archivos en formato de lista:

| Columna | Descripción |
|---------|-------------|
| Checkbox | Selección múltiple |
| Icono | Tipo de archivo/carpeta |
| Nombre | Con indicador de color para carpetas |
| Tamaño | Formateado (KB, MB, GB) |
| Fecha modificación | Relativa o absoluta |
| Acciones | Menú contextual |

### FileTreeView.tsx

Vista jerárquica con expansión lazy-load:

- Carga bajo demanda al expandir nodos
- Indicador de elementos en cada carpeta
- Colores personalizados por directorio
- Highlight de directorio actual

---

## 5.8 Subida de Archivos

### Modal de Subida

```typescript
// UploadModal.tsx
const UploadModal = ({ currentPath, onClose, onSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    setUploading(true);
    try {
      await filesApi.uploadFiles(currentPath, files);
      onSuccess();
      onClose();
    } catch (error) {
      // Manejar error
    }
    setUploading(false);
  };

  return (
    <Modal>
      <DropZone onDrop={setFiles} />
      <FileList files={files} onRemove={removeFile} />
      <ProgressBar progress={progress} />
      <Button onClick={handleUpload} loading={uploading}>
        Subir {files.length} archivo(s)
      </Button>
    </Modal>
  );
};
```

### Backend de Subida

```python
# upload/views.py

class UploadViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Subir archivos al directorio especificado"""
        path = request.data.get('path', '')
        files = request.FILES.getlist('files')

        if not files:
            return Response({'error': 'No hay archivos'}, status=400)

        # Verificar permisos de escritura
        permission = PermissionService.check_path_access(
            request.user, path, 'write'
        )
        if not permission['allowed']:
            return Response({'error': permission['reason']}, status=403)

        smb = SMBService()
        uploaded = []
        errors = []

        for file in files:
            try:
                # Validar nombre con reglas IGAC
                validation = smart_naming_service.validate_name(
                    file.name, path, request.user
                )
                if not validation['valid']:
                    # Usar nombre sugerido o rechazar
                    if validation.get('suggested_name'):
                        filename = validation['suggested_name']
                    else:
                        errors.append({
                            'file': file.name,
                            'errors': validation['errors']
                        })
                        continue
                else:
                    filename = validation['formatted_name']

                # Guardar archivo
                dest_path = os.path.join(
                    smb.build_full_path(path),
                    filename
                )
                with open(dest_path, 'wb') as f:
                    for chunk in file.chunks():
                        f.write(chunk)

                uploaded.append(filename)

                # Auditoría
                AuditLog.objects.create(
                    user=request.user,
                    action='upload',
                    target_path=os.path.join(path, filename),
                    file_size=file.size,
                    success=True
                )

            except Exception as e:
                errors.append({'file': file.name, 'error': str(e)})

        return Response({
            'success': len(uploaded) > 0,
            'uploaded': uploaded,
            'errors': errors
        })
```

---

## 5.9 Descarga de Archivos

### Descarga Individual

```python
@action(detail=False, methods=['get'])
def download(self, request):
    """Descargar archivo individual"""
    path = request.query_params.get('path', '')

    # Verificar permisos
    permission = PermissionService.check_path_access(
        request.user, path, 'read'
    )
    if not permission['allowed']:
        return Response({'error': 'Sin permiso'}, status=403)

    smb = SMBService()
    full_path = smb.build_full_path(path)

    if not os.path.exists(full_path):
        return Response({'error': 'Archivo no encontrado'}, status=404)

    # Auditoría
    AuditLog.objects.create(
        user=request.user,
        action='download',
        target_path=path,
        file_size=os.path.getsize(full_path),
        success=True
    )

    # Respuesta de descarga
    response = FileResponse(
        open(full_path, 'rb'),
        as_attachment=True,
        filename=os.path.basename(full_path)
    )
    return response
```

### Descarga Múltiple (ZIP)

```python
@action(detail=False, methods=['post'], url_path='download-zip')
def download_zip(self, request):
    """Descargar múltiples archivos como ZIP"""
    paths = request.data.get('paths', [])

    if not paths:
        return Response({'error': 'No hay rutas'}, status=400)

    smb = SMBService()

    # Crear ZIP temporal
    temp_file = tempfile.NamedTemporaryFile(delete=True, suffix='.zip')
    with zipfile.ZipFile(temp_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for path in paths:
            # Verificar permiso para cada archivo
            permission = PermissionService.check_path_access(
                request.user, path, 'read'
            )
            if not permission['allowed']:
                continue

            full_path = smb.build_full_path(path)
            if os.path.isfile(full_path):
                zf.write(full_path, os.path.basename(full_path))
            elif os.path.isdir(full_path):
                for root, dirs, files in os.walk(full_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, full_path)
                        zf.write(file_path, arcname)

    temp_file.seek(0)
    return FileResponse(
        temp_file,
        content_type='application/zip',
        as_attachment=True,
        filename='descarga.zip'
    )
```

---

## 5.10 Diagrama de Estados de Archivo

```
┌─────────────────────────────────────────────────────────────────┐
│                  ESTADOS DE UN ARCHIVO                          │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │   NUEVO     │
                    │  (Upload)   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │ ACTIVO     │ │ BLOQUEADO  │ │ COMPARTIDO │
     │ (Normal)   │ │ (Sin perm) │ │ (Link)     │
     └─────┬──────┘ └────────────┘ └─────┬──────┘
           │                              │
           │    ┌─────────────────────────┘
           │    │
           ▼    ▼
     ┌─────────────┐
     │  ELIMINADO  │
     │ (Papelera)  │
     └──────┬──────┘
            │
     ┌──────┴──────┐
     ▼             ▼
┌─────────┐  ┌──────────────┐
│RESTAURADO│  │  ELIMINADO   │
│         │  │  PERMANENTE  │
└─────────┘  └──────────────┘
```

---

## 5.11 Seguridad

### Validaciones

1. **Path Traversal Prevention**
   ```python
   def sanitize_path(path: str) -> str:
       # Eliminar ../ y otros intentos de escape
       path = os.path.normpath(path)
       if '..' in path:
           raise SecurityError("Path traversal detected")
       return path
   ```

2. **Validación de Extensiones**
   ```python
   BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.vbs']

   def validate_extension(filename: str) -> bool:
       ext = os.path.splitext(filename)[1].lower()
       return ext not in BLOCKED_EXTENSIONS
   ```

3. **Límites de Tamaño**
   ```python
   MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB

   def validate_size(file) -> bool:
       return file.size <= MAX_FILE_SIZE
   ```

---

*Figura 5.1: Arquitectura del Módulo Explorador de Archivos*
