import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Upload, FolderPlus, FolderUp, ArrowLeft, Shield } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { FileListWithSelection } from '../components/FileListWithSelection';
import { Pagination } from '../components/Pagination';
// FilterPanel removido - no se usa
import { UploadModal } from '../components/UploadModal';
import { UploadFolderModal } from '../components/UploadFolderModal';
import { RenameModal } from '../components/RenameModal';
import { CreateFolderModal } from '../components/CreateFolderModal';
import { FolderInfoModal } from '../components/FolderInfoModal';
import { FileInfoModal } from '../components/FileInfoModal';
import { FileDetailsModal } from '../components/FileDetailsModal';
import { FolderPermissionsModal } from '../components/FolderPermissionsModal';
import { ShareLinkModal } from '../components/ShareLinkModal';
import { PathAccessModal } from '../components/PathAccessModal';
import { ManageAccessModal } from '../components/ManageAccessModal';
import { MyAccesses } from '../components/MyAccesses';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { filesApi } from '../api';
import { fileOpsApi } from '../api/fileOps';
import { favoritesApi } from '../api/favorites';
import { authApi } from '../api';
import type { BrowseResponse, FileItem, BrowseParams } from '../types';
import { useAuthStore } from '../store/authStore';
import { useClipboardWithConflicts } from '../hooks/useClipboardWithConflicts';
import { usePathPermissions } from '../hooks/usePathPermissions';
import { useModal } from '../hooks/useModal';
import { useFileSort } from '../hooks/useFileSort';
import { SortDropdown } from '../components/SortDropdown';
import { ViewModeToggle, ViewMode } from '../components/ViewModeToggle';
import { FileTreeView } from '../components/FileTreeView';
import ConflictModal from '../components/ConflictModal';
import { useDirectoryColors } from '../hooks/useDirectoryColors';

const NETAPP_BASE_PATH = '\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy';

export const FileExplorer = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toasts, removeToast, success: showSuccess, error: showError, warning: showWarning } = useToast();
  const { confirm, prompt } = useModal();
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<{
    extension?: string;
    year?: number;
    month?: number;
  }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploadFolderModalOpen, setIsUploadFolderModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isFolderInfoModalOpen, setIsFolderInfoModalOpen] = useState(false);
  const [isFileInfoModalOpen, setIsFileInfoModalOpen] = useState(false);
  const [isFileDetailsModalOpen, setIsFileDetailsModalOpen] = useState(false);
  const [isFolderPermissionsModalOpen, setIsFolderPermissionsModalOpen] = useState(false);
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);
  const [isPathAccessModalOpen, setIsPathAccessModalOpen] = useState(false);
  const [isManageAccessModalOpen, setIsManageAccessModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<{ name: string; path: string; isDirectory: boolean } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FileItem | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FileItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [itemToShare, setItemToShare] = useState<FileItem | null>(null);
  const [uploadTargetPath, setUploadTargetPath] = useState<string | null>(null); // Path destino para upload desde menú de carpeta
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [accesses, setAccesses] = useState<any[]>([]);
  const [showingAccesses, setShowingAccesses] = useState(false);

  // View mode (list or tree)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Cargar preferencia guardada
    const saved = localStorage.getItem('file_explorer_view_mode');
    return (saved === 'tree' || saved === 'list') ? saved : 'list';
  });

  // Guardar preferencia de vista
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('file_explorer_view_mode', mode);
  };

  // Drag & drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  const [draggedFiles, setDraggedFiles] = useState<FileList | null>(null);

  // Clipboard para copy/paste múltiple con manejo de conflictos
  const {
    clipboardData,
    copyFiles,
    cutFiles,
    pasteFiles,
    cancelClipboard,
    isPasting,
    currentOperation,
    hasClipboard,
    conflictInfo,
    resolveCurrentConflict,
  } = useClipboardWithConflicts(currentPath, () => {
    loadFiles(); // Recargar archivos después de pegar
  });

  // Permisos del usuario para la ruta actual
  const { permissions, loading: permissionsLoading } = usePathPermissions(currentPath);

  // Colores personalizados de directorios
  const { colors: directoryColors, setColor: setDirectoryColor, removeColor: removeDirectoryColor } = useDirectoryColors();

  // Handlers para colores de directorio
  const handleSetDirectoryColor = async (file: FileItem, color: string) => {
    try {
      await setDirectoryColor(file.path, color);
      showSuccess(`Color actualizado para "${file.name}"`);
    } catch (err) {
      showError('Error al cambiar el color');
    }
  };

  const handleRemoveDirectoryColor = async (file: FileItem) => {
    try {
      await removeDirectoryColor(file.path);
      showSuccess(`Color restaurado para "${file.name}"`);
    } catch (err) {
      showError('Error al quitar el color');
    }
  };

  // Cargar accesos del usuario al iniciar
  useEffect(() => {
    loadAccesses();
  }, []);

  const loadAccesses = async () => {
    try {
      const response = await authApi.myAccess();
      setIsSuperAdmin(response.is_superadmin);
      setAccesses(response.accesses || []);

      // Si NO es superadmin y NO hay path en URL, mostrar accesos
      const pathFromUrl = searchParams.get('path');
      if (!response.is_superadmin && !pathFromUrl) {
        setShowingAccesses(true);
      }
    } catch (error) {
      console.error('Error loading accesses:', error);
    }
  };

  // Leer path de URL params al cargar
  useEffect(() => {
    const pathFromUrl = searchParams.get('path');
    console.log('Path from URL:', pathFromUrl);
    console.log('Current path:', currentPath);

    if (pathFromUrl !== null) {
      // Hay un parámetro path en la URL
      if (pathFromUrl !== currentPath) {
        console.log('Setting new path:', pathFromUrl);
        setCurrentPath(pathFromUrl);
        setCurrentPage(1);  // Reset to first page when changing path
      }
      setShowingAccesses(false); // Ocultar accesos si hay path
    } else {
      // NO hay parámetro path en la URL (/explorar sin ?path=)
      // Esto significa que queremos mostrar "Mis Accesos" (si no es superadmin)
      if (!isSuperAdmin && currentPath !== '') {
        console.log('No path in URL - showing accesses for non-superadmin');
        setShowingAccesses(true);
        setCurrentPath('');
      }
    }
  }, [searchParams, isSuperAdmin]);

  useEffect(() => {
    // Solo cargar archivos si NO estamos mostrando accesos
    if (!showingAccesses) {
      // Pequeño delay para evitar llamadas múltiples en navegación rápida
      const timeoutId = setTimeout(() => {
        loadFiles();
      }, 50); // 50ms de delay

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, currentPage, filters, searchParams, showingAccesses]);

  const loadFiles = async () => {
    // Limpiar datos inmediatamente para evitar mostrar contenido anterior
    setData(null);
    setLoading(true);
    setError('');

    try {
      // Usar currentPath directamente (ya sincronizado por useEffect anterior)
      const effectivePath = currentPath || '';

      console.log('🔄 Loading files with path:', effectivePath);

      const params: BrowseParams = {
        path: effectivePath || undefined,
        page: currentPage,
        per_page: 50,
        ...filters,
        // No enviamos searchTerm al backend, filtramos del lado del cliente
      };

      const response = await filesApi.browseLive(params);

      if (response.success) {
        setData(response.data);
        setError(''); // Limpiar errores previos al navegar exitosamente
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      const status = err.response?.status;
      const errorMessage = err.response?.data?.error || err.response?.data?.message;

      if (status === 403) {
        // Error de permisos - mensaje claro
        setError(`🔒 Acceso Denegado: ${errorMessage || 'No tienes permisos para acceder a este directorio.'}\n\nPuede que el directorio esté bloqueado en tu configuración de permisos o que no tengas acceso heredado desde directorios superiores.`);
      } else if (status === 404) {
        // Directorio no existe
        setError(`📁 Directorio No Encontrado: ${errorMessage || 'La ruta especificada no existe.'}\n\nVerifica que la ruta esté correctamente escrita.`);
      } else {
        // Otro error
        setError(
          errorMessage ||
          'Error al cargar archivos. Verifica que el backend esté en ejecución.'
        );
      }

      // Limpiar datos para que no muestre contenido anterior
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (path: string) => {
    console.log('📁 Folder click:', path);
    // Limpiar datos inmediatamente para feedback visual
    setData(null);
    setSearchTerm('');
    setCurrentPage(1);
    // Actualizar URL (esto disparará el useEffect que sincroniza currentPath)
    navigate(`/explorar?path=${encodeURIComponent(path)}`);
  };

  const handleBreadcrumbClick = (path: string) => {
    console.log('🏠 Breadcrumb click:', path);

    // BUG FIX: Si el path es el mismo que el actual, no hacer nada
    // Esto previene que la página quede en blanco al hacer clic en el último breadcrumb
    if (path === currentPath) {
      console.log('  → Path es el mismo que el actual, ignorando click');
      return;
    }

    // Limpiar datos inmediatamente para feedback visual
    setData(null);
    setSearchTerm('');
    setCurrentPage(1);
    // Actualizar URL (esto disparará el useEffect que sincroniza currentPath)
    navigate(`/explorar?path=${encodeURIComponent(path)}`);
  };

  const handleHomeClick = () => {
    console.log('🏠 Home button click - Smart navigation');

    if (isSuperAdmin) {
      // SuperAdmin: ir a la raíz del proyecto
      console.log('  → SuperAdmin: navegando a raíz');
      handleBreadcrumbClick('');
    } else {
      // Usuario NO superadmin: SIEMPRE mostrar "Mis Accesos"
      console.log('  → Usuario regular: mostrando Mis Accesos');
      setShowingAccesses(true);
      setCurrentPath('');
      setSearchTerm('');
      navigate('/explorar');
    }
  };

  const handleSearchOrNavigate = () => {
    // Si el searchTerm comienza con \\, es una ruta completa
    if (searchTerm.trim().startsWith('\\\\')) {
      const inputPath = searchTerm.trim();

      // Normalizar la ruta: reemplazar / por \
      const normalizedPath = inputPath.replace(/\//g, '\\');

      // Verificar que contenga "Sub_Proy"
      if (!normalizedPath.includes('\\Sub_Proy\\') && !normalizedPath.endsWith('\\Sub_Proy')) {
        showError('La ruta debe contener "Sub_Proy". Formato esperado: \\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\[ruta_relativa]');
        return;
      }

      // Extraer la parte después de Sub_Proy
      let relativePath = '';
      if (normalizedPath.includes('\\Sub_Proy\\')) {
        relativePath = normalizedPath.split('\\Sub_Proy\\')[1];
      } else if (normalizedPath.endsWith('\\Sub_Proy')) {
        relativePath = ''; // Raíz de Sub_Proy
      }

      // Limpiar trailing backslash si existe
      relativePath = relativePath.replace(/\\+$/, '');

      // IMPORTANTE: Convertir backslashes a forward slashes
      // El backend usa / como separador para generar breadcrumbs correctamente
      relativePath = relativePath.replace(/\\/g, '/');

      console.log('🔍 Navegación por ruta completa:');
      console.log('  Input:', inputPath);
      console.log('  Normalizado:', normalizedPath);
      console.log('  Ruta relativa extraída:', relativePath);

      // Limpiar datos inmediatamente para feedback visual
      setData(null);
      setSearchTerm(''); // Limpiar búsqueda después de navegar
      setCurrentPage(1);
      // Actualizar URL (esto disparará el useEffect que sincroniza currentPath)
      navigate(`/explorar?path=${encodeURIComponent(relativePath)}`);
    }
    // Si no empieza con \\, no hacer nada (es búsqueda de texto normal)
  };

  const handleDownload = async (file: FileItem) => {
    // Descargar usando URL directa para que el navegador muestre la barra de progreso
    // Esto es mucho mejor UX que fetch+blob que descarga todo en memoria primero
    const filePath = file.path;
    const token = localStorage.getItem('token');

    // Construir URL de descarga directa
    const downloadUrl = `/api/file-ops/download?path=${encodeURIComponent(filePath)}&token=${token}`;

    // Abrir en nueva ventana/pestaña para que el navegador maneje la descarga
    // Esto muestra inmediatamente la barra de descarga del navegador
    window.open(downloadUrl, '_blank');
  };

  const handleFilterChange = (newFilters: {
    extension?: string;
    year?: number;
    month?: number;
  }) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Filtrar archivos del lado del cliente por búsqueda dinámica
  const getFilteredFiles = () => {
    if (!data?.files) return [];

    let files = data.files;

    // Filtrar por búsqueda si existe
    if (searchTerm.trim() && !searchTerm.trim().startsWith('\\\\')) {
      const searchLower = searchTerm.toLowerCase();
      files = files.filter(file =>
        file.name.toLowerCase().includes(searchLower)
      );
    }

    return files;
  };

  // Hook de ordenamiento con persistencia
  const { sortConfig, setSortConfig, sortedFiles } = useFileSort(getFilteredFiles());

  const handleUploadComplete = () => {
    loadFiles(); // Refresh file list after upload
  };

  const handleRename = (file: FileItem) => {
    setItemToRename({
      name: file.name,
      path: file.path,
      isDirectory: file.is_directory,
    });
    setIsRenameModalOpen(true);
  };

  const handleRenameComplete = () => {
    loadFiles(); // Refresh file list after rename
  };

  const handleCreateFolderComplete = () => {
    loadFiles(); // Refresh file list after folder creation
  };

  const handleDelete = (file: FileItem) => {
    // Para directorios, usar el modal con preview detallado
    if (file.is_directory) {
      setItemToDelete(file);
      setIsDeleteConfirmModalOpen(true);
    } else {
      // Para archivos simples, usar confirmación rápida
      handleDeleteFile(file);
    }
  };

  const handleDeleteFile = async (file: FileItem) => {
    const confirmed = await confirm({
      title: `Eliminar archivo`,
      message: `¿Está seguro que desea eliminar "${file.name}"?\n\nEsta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await fileOpsApi.delete(file.path, true);
      loadFiles();
      showSuccess(`"${file.name}" eliminado correctamente`);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleDeleteComplete = () => {
    setItemToDelete(null);
    setIsDeleteConfirmModalOpen(false);
    loadFiles();
    showSuccess('Eliminación completada');
  };

  // Estado para eliminación masiva
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);

  // Eliminar múltiples archivos/directorios
  const handleDeleteMultiple = async (files: FileItem[]) => {
    if (files.length === 0) return;

    const confirmed = await confirm({
      title: `Eliminar ${files.length} elemento(s)`,
      message: `¿Está seguro que desea eliminar ${files.length} elemento(s)?\n\nEsta acción moverá los elementos a la papelera (si está habilitada).`,
      type: 'danger',
      confirmText: `Eliminar ${files.length}`,
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    setIsDeletingMultiple(true);
    try {
      const paths = files.map(f => f.path);
      const result = await fileOpsApi.deleteBatch(paths);

      loadFiles();

      if (result.total_failed === 0) {
        showSuccess(`${result.total_deleted} elemento(s) eliminado(s) correctamente`);
      } else if (result.total_deleted > 0) {
        showSuccess(`${result.total_deleted} eliminado(s), ${result.total_failed} fallido(s)`);
      } else {
        showError('No se pudo eliminar ningún elemento');
      }
    } catch (error: any) {
      showError(error.response?.data?.error || 'Error al eliminar');
    } finally {
      setIsDeletingMultiple(false);
    }
  };

  const handleDownloadMultiple = async (files: FileItem[]) => {
    if (files.length === 0) return;

    const confirmed = await confirm({
      title: `Descargar ${files.length} elemento(s)`,
      message: `¿Descargar ${files.length} elemento(s) seleccionado(s) como ZIP?\n\nLa descarga comenzará inmediatamente en tu navegador.`,
      type: 'info',
      confirmText: `Descargar ZIP`,
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    const token = localStorage.getItem('token');
    const pathParams = files.map(f => `paths=${encodeURIComponent(f.path)}`).join('&');
    const downloadUrl = `/api/file-ops/download-batch?${pathParams}&zip_name=seleccion_archivos&token=${token}`;
    window.open(downloadUrl, '_blank');
  };

  const handleShowInfo = (file: FileItem) => {
    if (file.is_directory) {
      setSelectedFolder(file);
      setIsFolderInfoModalOpen(true);
    } else {
      setSelectedFile(file);
      setIsFileInfoModalOpen(true);
    }
  };

  const handleShowPermissions = (file: FileItem) => {
    setSelectedFolder(file);
    setIsFolderPermissionsModalOpen(true);
  };

  const handleShowDetails = (file: FileItem) => {
    setSelectedFile(file);
    setIsFileDetailsModalOpen(true);
  };

  const handleManageAccess = (file: FileItem) => {
    setSelectedFolder(file);
    setIsManageAccessModalOpen(true);
  };

  const handleShareLink = (file: FileItem) => {
    setItemToShare(file);
    setIsShareLinkModalOpen(true);
  };

  // Handler para subir archivos a una carpeta específica desde el menú de 3 puntos
  const handleUploadToFolder = (file: FileItem) => {
    if (!file.is_directory) return;

    // Establecer el path destino y abrir el modal de subida de carpetas
    setUploadTargetPath(file.path);
    setIsUploadFolderModalOpen(true);
  };

  const handleDownloadFolder = async (file: FileItem) => {
    const confirmed = await confirm({
      title: 'Descargar carpeta como ZIP',
      message: `¿Descargar la carpeta "${file.name}" como ZIP?\n\nLa descarga comenzará inmediatamente en tu navegador.`,
      type: 'info',
      confirmText: 'Descargar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    // Descargar usando URL directa para que el navegador muestre la barra de progreso
    const token = localStorage.getItem('token');
    const downloadUrl = `/api/file-ops/download_folder?path=${encodeURIComponent(file.path)}&token=${token}`;

    // Abrir en nueva ventana para que el navegador maneje la descarga
    // Esto muestra inmediatamente la barra de descarga del navegador
    window.open(downloadUrl, '_blank');
  };

  const handleToggleFavorite = async (file: FileItem) => {
    if (!file.is_directory) {
      showWarning('Solo se pueden agregar carpetas a favoritos.');
      return;
    }

    // Un solo prompt para el nombre (simplificado)
    const name = await prompt({
      title: 'Agregar a favoritos',
      message: `¿Deseas agregar "${file.name}" a tus favoritos?`,
      placeholder: 'Nombre del favorito',
      defaultValue: file.name,
      required: true,
      confirmText: 'Agregar a favoritos',
    });

    if (!name) {
      console.log('[DEBUG FAVORITES] Usuario canceló - name es null/vacío');
      return;
    }

    console.log('[DEBUG FAVORITES] Nombre ingresado:', name);

    try {
      setLoading(true);
      console.log('[DEBUG FAVORITES] Enviando petición create:', { path: file.path, name });
      const result = await favoritesApi.create({
        path: file.path,
        name,
      });
      console.log('[DEBUG FAVORITES] Resultado:', result);

      showSuccess(`Carpeta "${file.name}" agregada a favoritos como "${name}".`);
    } catch (error: any) {
      console.error('[DEBUG FAVORITES] Error en catch:', error);
      if (error.response?.status === 400 && error.response?.data?.path) {
        showWarning('Esta carpeta ya está en tus favoritos.');
      } else {
        showError(error.response?.data?.error || 'Error al agregar favorito');
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== DRAG & DROP HANDLERS =====

  // Leer archivos recursivamente desde directorios
  const readEntriesRecursively = async (entry: any, path = ''): Promise<File[]> => {
    const files: File[] = [];

    if (entry.isFile) {
      // Es un archivo, obtener el File object
      const file: File = await new Promise((resolve, reject) => {
        entry.file(resolve, reject);
      });

      // Agregar webkitRelativePath manualmente
      const relativePath = path ? `${path}/${file.name}` : file.name;
      Object.defineProperty(file, 'webkitRelativePath', {
        value: relativePath,
        writable: false
      });

      files.push(file);
    } else if (entry.isDirectory) {
      // Es un directorio, leer sus contenidos
      const dirReader = entry.createReader();
      const entries: any[] = await new Promise((resolve, reject) => {
        const allEntries: any[] = [];

        const readBatch = () => {
          dirReader.readEntries((batch: any[]) => {
            if (batch.length === 0) {
              resolve(allEntries);
            } else {
              allEntries.push(...batch);
              readBatch();
            }
          }, reject);
        };

        readBatch();
      });

      // Procesar cada entrada recursivamente
      for (const childEntry of entries) {
        const childPath = path ? `${path}/${entry.name}` : entry.name;
        const childFiles = await readEntriesRecursively(childEntry, childPath);
        files.push(...childFiles);
      }
    }

    return files;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Solo limpiar si salimos del contenedor principal
    if (e.currentTarget === e.target) {
      setIsDraggingOver(false);
      setDropTargetPath(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetPath?: string) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDraggingOver(false);
    setDropTargetPath(null);

    // Verificar permisos de escritura
    if (permissions.read_only_mode || !permissions.can_write) {
      showWarning('No tienes permisos para subir archivos en esta ubicación.');
      return;
    }

    // Determinar ruta de destino
    const uploadPath = targetPath || currentPath;

    // Usar DataTransfer Items API para detectar directorios correctamente
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    try {
      const allFiles: File[] = [];
      let hasDirectories = false;

      // Procesar cada item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();

          if (entry) {
            if (entry.isDirectory) {
              hasDirectories = true;
              // Leer contenido del directorio recursivamente
              const dirFiles = await readEntriesRecursively(entry);
              allFiles.push(...dirFiles);
            } else {
              // Es un archivo individual
              const file = item.getAsFile();
              if (file) allFiles.push(file);
            }
          }
        }
      }

      if (allFiles.length === 0) return;

      // Convertir a FileList-like object
      const fileList = {
        length: allFiles.length,
        item: (index: number) => allFiles[index],
        [Symbol.iterator]: function* () {
          for (let i = 0; i < allFiles.length; i++) {
            yield allFiles[i];
          }
        }
      };

      // Agregar indexación numérica
      allFiles.forEach((file, index) => {
        (fileList as any)[index] = file;
      });

      setDropTargetPath(uploadPath);
      setDraggedFiles(fileList as any);

      if (hasDirectories) {
        // Abrir modal de carpetas
        setIsUploadFolderModalOpen(true);
      } else {
        // Abrir modal de archivos individuales
        setIsUploadModalOpen(true);
      }
    } catch (error) {
      console.error('Error procesando archivos arrastrados:', error);
      showError('Error al procesar los archivos. Por favor, inténtalo de nuevo.');
    }
  };

  // Handler para drop sobre carpeta específica
  const handleDropOnFolder = (e: React.DragEvent, targetFolder: FileItem) => {
    e.preventDefault();
    e.stopPropagation();

    // Usar el path de la carpeta como destino
    handleDrop(e, targetFolder.path);
  };

  const handleAccessClick = (path: string) => {
    setCurrentPath(path);
    setCurrentPage(1);
    setSearchTerm('');
    setShowingAccesses(false);
    navigate(`/explorar?path=${encodeURIComponent(path)}`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Explorador de Archivos
            </h2>

            {/* Action Buttons */}
            {!showingAccesses && !permissions.read_only_mode && (
              <div className="flex gap-3">
                {permissions.can_create_directories && (
                  <button
                    onClick={() => setIsCreateFolderModalOpen(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
                  >
                    <FolderPlus className="w-5 h-5" />
                    Nueva Carpeta
                  </button>
                )}
                {permissions.can_write && (
                  <>
                    <button
                      onClick={() => setIsUploadModalOpen(true)}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
                    >
                      <Upload className="w-5 h-5" />
                      Subir Archivo
                    </button>
                    <button
                      onClick={() => setIsUploadFolderModalOpen(true)}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-semibold"
                    >
                      <FolderUp className="w-5 h-5" />
                      Subir Carpeta
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Read-Only Mode Indicator */}
            {!showingAccesses && permissions.read_only_mode && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  Modo Solo Lectura - No puede modificar archivos en esta ruta
                </span>
              </div>
            )}
          </div>

          {/* Breadcrumbs con sombra */}
          {data && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
              <Breadcrumbs
                breadcrumbs={data.breadcrumbs}
                onNavigate={handleBreadcrumbClick}
                onHome={handleHomeClick}
              />
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearchOrNavigate();
                }
              }}
              placeholder="Buscar archivos por nombre o pegar ruta completa (ej: \\repositorio\DirGesCat\...\Sub_Proy\02_finan)..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            {searchTerm && (
              <>
                {searchTerm.startsWith('\\\\') && (
                  <button
                    onClick={handleSearchOrNavigate}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Ir a Ruta
                  </button>
                )}
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
                >
                  Limpiar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters removido - no se usa */}

        {/* Progress Indicator para Paste */}
        {isPasting && currentOperation && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Procesando archivos... ({currentOperation.completed}/{currentOperation.total})
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Actual: {currentOperation.current}
                  </p>
                </div>
              </div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {Math.round((currentOperation.completed / currentOperation.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentOperation.completed / currentOperation.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* My Accesses or File list */}
        {showingAccesses ? (
          <MyAccesses
            accesses={accesses}
            onAccessClick={handleAccessClick}
          />
        ) : (
          <>
            {/* Indicador discreto de drag & drop en la parte superior */}
            {isDraggingOver && !permissions.read_only_mode && permissions.can_write && (
              <div className="bg-blue-500 text-white rounded-lg shadow-lg dark:shadow-gray-900/50 p-4 mb-4 flex items-center gap-3 animate-pulse">
                <Upload className="w-6 h-6" />
                <div className="flex-1">
                  <p className="font-bold text-sm">📂 Arrastrando archivos</p>
                  <p className="text-xs opacity-90">Suelta sobre una carpeta o en el área general para subir</p>
                </div>
              </div>
            )}

            <div
              className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e)}
            >

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
                <span className="text-gray-600 dark:text-gray-300 font-semibold">Cargando archivos...</span>
                {currentPath && (
                  <div className="mt-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                      {currentPath ? `Sub_Proy/${currentPath}` : 'Sub_Proy (raíz)'}
                    </p>
                  </div>
                )}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-lg p-6 max-w-2xl w-full">
                  <div className="flex items-start">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-semibold text-red-900 mb-2">Error de Acceso</h3>
                      <p className="text-red-700 dark:text-red-300 whitespace-pre-line">{error}</p>
                      {currentPath && (
                        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/50 rounded border border-red-300 dark:border-red-600">
                          <p className="text-xs font-semibold text-red-900 mb-1">Ruta solicitada:</p>
                          <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all overflow-wrap-anywhere">
                            {currentPath ? `Sub_Proy/${currentPath}` : 'Sub_Proy (raíz)'}
                          </p>
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={handleHomeClick}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                        >
                          Volver al Inicio
                        </button>
                        {!isSuperAdmin && accesses.length > 1 && (
                          <button
                            onClick={() => {
                              setShowingAccesses(true);
                              setCurrentPath('');
                              setSearchTerm('');
                              navigate('/explorar');
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors text-sm font-semibold"
                          >
                            Ver Mis Accesos
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : data ? (
            <>
              {/* Barra de información, ordenamiento y vista */}
              <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Mostrando {sortedFiles.length} de {data.total} archivos
                  {searchTerm && <span className="ml-2 text-blue-600 dark:text-blue-400">(filtrado por búsqueda)</span>}
                  {data.mode && <span className="ml-2">({data.mode.toUpperCase()})</span>}
                </div>
                <div className="flex items-center gap-3">
                  <SortDropdown
                    sortConfig={sortConfig}
                    onSortChange={setSortConfig}
                  />
                  <ViewModeToggle
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                  />
                </div>
              </div>

              {/* Vista condicional: Lista o Árbol */}
              {viewMode === 'list' ? (
                <FileListWithSelection
                  files={sortedFiles}
                  onFolderClick={handleFolderClick}
                  onDownload={handleDownload}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onDeleteMultiple={handleDeleteMultiple}
                  onDownloadMultiple={handleDownloadMultiple}
                  onShowInfo={handleShowInfo}
                  onDownloadFolder={handleDownloadFolder}
                  onToggleFavorite={handleToggleFavorite}
                  onShowPermissions={handleShowPermissions}
                  onManageAccess={handleManageAccess}
                  onShowDetails={handleShowDetails}
                  onShareLink={handleShareLink}
                  onUploadToFolder={handleUploadToFolder}
                  onCopy={copyFiles}
                  onCut={cutFiles}
                  onPaste={pasteFiles}
                  hasClipboard={hasClipboard}
                  isPasting={isPasting}
                  isDeleting={isDeletingMultiple}
                  permissions={permissions}
                  onDropOnFolder={handleDropOnFolder}
                  isDraggingGlobal={isDraggingOver}
                  isSuperAdmin={user?.role === 'superadmin'}
                  currentPath={currentPath}
                  onGoBack={() => {
                    const pathParts = currentPath.split('/').filter(Boolean);
                    pathParts.pop();
                    const newPath = pathParts.join('/');
                    navigate(`/explorar?path=${encodeURIComponent(newPath)}`);
                  }}
                  canEdit={true}
                  canDelete={true}
                  directoryColors={directoryColors}
                  onSetDirectoryColor={handleSetDirectoryColor}
                  onRemoveDirectoryColor={handleRemoveDirectoryColor}
                />
              ) : (
                <FileTreeView
                  files={sortedFiles}
                  currentPath={currentPath}
                  onFolderClick={handleFolderClick}
                  onDownload={handleDownload}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onShowInfo={handleShowInfo}
                  onDownloadFolder={handleDownloadFolder}
                  onToggleFavorite={handleToggleFavorite}
                  onShowPermissions={handleShowPermissions}
                  onManageAccess={handleManageAccess}
                  onShowDetails={handleShowDetails}
                  onShareLink={handleShareLink}
                  onUploadToFolder={handleUploadToFolder}
                  onCopy={copyFiles}
                  onCut={cutFiles}
                  onPaste={pasteFiles}
                  hasClipboard={hasClipboard}
                  isPasting={isPasting}
                  permissions={permissions}
                  isSuperAdmin={user?.role === 'superadmin'}
                  onGoBack={() => {
                    const pathParts = currentPath.split('/').filter(Boolean);
                    pathParts.pop();
                    const newPath = pathParts.join('/');
                    navigate(`/explorar?path=${encodeURIComponent(newPath)}`);
                  }}
                  directoryColors={directoryColors}
                  onSetDirectoryColor={handleSetDirectoryColor}
                  onRemoveDirectoryColor={handleRemoveDirectoryColor}
                />
              )}

              {/* Paginación solo en vista de lista */}
              {viewMode === 'list' && data.pages > 1 && (
                <Pagination
                  currentPage={data.page}
                  totalPages={data.pages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
            ) : null}
          </div>
          </>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setDropTargetPath(null);
          setDraggedFiles(null);
        }}
        currentPath={dropTargetPath || currentPath}
        onUploadComplete={handleUploadComplete}
        preloadedFiles={draggedFiles}
      />

      {/* Upload Folder Modal */}
      <UploadFolderModal
        isOpen={isUploadFolderModalOpen}
        onClose={() => {
          setIsUploadFolderModalOpen(false);
          setDropTargetPath(null);
          setUploadTargetPath(null);
          setDraggedFiles(null);
        }}
        currentPath={uploadTargetPath || dropTargetPath || currentPath}
        onUploadComplete={handleUploadComplete}
        preloadedFiles={draggedFiles}
      />

      {/* Rename Modal */}
      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
          setItemToRename(null);
        }}
        currentPath={currentPath}
        itemToRename={itemToRename}
        onRenameComplete={handleRenameComplete}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        currentPath={currentPath}
        onCreateComplete={handleCreateFolderComplete}
      />

      {/* Folder Info Modal */}
      <FolderInfoModal
        isOpen={isFolderInfoModalOpen}
        onClose={() => {
          setIsFolderInfoModalOpen(false);
          setSelectedFolder(null);
        }}
        folder={selectedFolder}
        basePath={NETAPP_BASE_PATH}
      />

      {/* File Info Modal */}
      <FileInfoModal
        isOpen={isFileInfoModalOpen}
        onClose={() => {
          setIsFileInfoModalOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        basePath={NETAPP_BASE_PATH}
      />

      {/* File Details Modal - Detalles completos con auditoría */}
      <FileDetailsModal
        isOpen={isFileDetailsModalOpen}
        onClose={() => {
          setIsFileDetailsModalOpen(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
      />

      <FolderPermissionsModal
        isOpen={isFolderPermissionsModalOpen}
        onClose={() => {
          setIsFolderPermissionsModalOpen(false);
          setSelectedFolder(null);
        }}
        folder={selectedFolder}
      />

      {itemToShare && (
        <ShareLinkModal
          path={itemToShare.path}
          isDirectory={itemToShare.is_directory}
          onClose={() => {
            setIsShareLinkModalOpen(false);
            setItemToShare(null);
          }}
        />
      )}

      {/* Modal de Gestión de Accesos - Solo Superadmin */}
      {isManageAccessModalOpen && selectedFolder && (
        <ManageAccessModal
          path={selectedFolder.path}
          onClose={() => {
            setIsManageAccessModalOpen(false);
            setSelectedFolder(null);
          }}
          onSuccess={() => {
            showSuccess('Permiso asignado correctamente');
            loadFiles(); // Recargar archivos por si afecta la vista
          }}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      <DeleteConfirmModal
        isOpen={isDeleteConfirmModalOpen}
        onClose={() => {
          setIsDeleteConfirmModalOpen(false);
          setItemToDelete(null);
        }}
        itemToDelete={itemToDelete}
        onDeleteComplete={handleDeleteComplete}
      />

      {/* Modal de Conflictos */}
      {conflictInfo && (
        <ConflictModal
          isOpen={true}
          onClose={() => resolveCurrentConflict('cancel', false)}
          operation={(clipboardData?.operation === 'cut' ? 'move' : clipboardData?.operation) || 'copy'}
          itemName={conflictInfo.itemName}
          isDirectory={conflictInfo.isDirectory}
          sourcePath={conflictInfo.sourcePath}
          destPath={conflictInfo.destPath}
          currentItem={conflictInfo.currentIndex}
          totalItems={conflictInfo.totalItems}
          onOverwrite={(applyToAll) => resolveCurrentConflict('overwrite', applyToAll)}
          onRename={(applyToAll) => resolveCurrentConflict('rename', applyToAll)}
          onCancel={() => resolveCurrentConflict('cancel', false)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
};
