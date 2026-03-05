import { useState, useRef, useEffect } from 'react';
import { X, Upload, AlertCircle, CheckCircle, XCircle, Loader2, FileText, Folder, ChevronRight, ChevronDown, Sparkles, StopCircle, Archive, Database } from 'lucide-react';
import { fileOpsApi } from '../api/fileOps';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import { HighlightedError } from './HighlightedError';
import JSZip from 'jszip';

type ItemStatus = 'pending' | 'validating' | 'invalid' | 'correcting' | 'approved' | 'uploading' | 'uploaded' | 'failed' | 'skipped';
type ConflictStrategy = 'skip' | 'replace' | 'keep_both';

interface TreeNode {
  id: string;
  name: string;
  originalName: string;
  path: string;
  isDirectory: boolean;
  level: number;
  status: ItemStatus;
  file?: File;
  errors?: string[];
  correctedName?: string;
  aiSuggestion?: string;
  loadingAI?: boolean;
  children?: TreeNode[];
  uploadedPath?: string;
  size?: number;
  bypassValidation?: boolean; // Si admin/superadmin puede bypassear errores de validación
}

interface UploadFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onUploadComplete: () => void;
  preloadedFiles?: FileList | null; // Archivos precargados desde drag & drop
}

export const UploadFolderModal = ({ isOpen, onClose, currentPath, onUploadComplete, preloadedFiles }: UploadFolderModalProps) => {
  const { user } = useAuthStore();
  const toast = useToast();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [maxLevel, setMaxLevel] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Ref para almacenar timeouts de debounce por nodo
  const debounceTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Ref para trackear tree actualizado (evita stale closure en contadores)
  const treeRef = useRef<TreeNode[]>([]);

  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    approved: 0,
    pending: 0,
    failed: 0,
    uploaded: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isAIBatchProcessing, setIsAIBatchProcessing] = useState(false);
  const [isInitialValidationComplete, setIsInitialValidationComplete] = useState(false);
  const [aiRenameComplete, setAiRenameComplete] = useState(false);
  const [aiRenameStats, setAiRenameStats] = useState<{ successful: number; failed: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadingItem, setCurrentUploadingItem] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{
    total: number;
    uploaded: number;
    skipped: number;
    failed: number;
    duration: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para detección y compresión de GDBs
  const [detectedGdbs, setDetectedGdbs] = useState<Array<{
    path: string;
    name: string;
    size: number;
    sizeFormatted: string;
    canCompress: boolean;
    sizeCategory: { category: 'small' | 'medium' | 'large' | 'xlarge'; label: string; timeEstimate: string; color: string };
    files: File[];
  }>>([]);
  const [showGdbModal, setShowGdbModal] = useState(false);
  const [isCompressingGdbs, setIsCompressingGdbs] = useState(false);
  const [gdbCompressionProgress, setGdbCompressionProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [pendingFilesForProcessing, setPendingFilesForProcessing] = useState<File[]>([]);

  // Sincronizar treeRef con tree state para evitar stale closures
  useEffect(() => {
    treeRef.current = tree;
  }, [tree]);

  // Procesar archivos precargados desde drag & drop
  useEffect(() => {
    if (isOpen && preloadedFiles && preloadedFiles.length > 0) {
      const filesArray = Array.from(preloadedFiles);
      processFiles(filesArray);
    }
  }, [isOpen, preloadedFiles]);

  // Construir árbol desde archivos seleccionados
  const buildTree = (files: File[]): TreeNode[] => {
    const tree: TreeNode[] = [];
    const nodeMap = new Map<string, TreeNode>();
    let idCounter = 0;

    files.forEach(file => {
      // @ts-ignore
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split('/');

      let currentPath = '';
      parts.forEach((part, index) => {
        const previousPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!nodeMap.has(currentPath)) {
          const isDirectory = index < parts.length - 1;
          const node: TreeNode = {
            id: `node-${idCounter++}`,
            name: part,
            originalName: part,
            path: currentPath,
            isDirectory,
            level: index,
            status: 'pending',
            file: isDirectory ? undefined : file,
            children: isDirectory ? [] : undefined
          };

          nodeMap.set(currentPath, node);

          if (index === 0) {
            tree.push(node);
          } else {
            const parent = nodeMap.get(previousPath);
            if (parent?.children) {
              parent.children.push(node);
            }
          }
        }
      });
    });

    return tree;
  };

  // Función para formatear tamaño
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Categorías de tamaño para GDBs con tiempo estimado
  const getGdbSizeCategory = (bytes: number): { category: 'small' | 'medium' | 'large' | 'xlarge'; label: string; timeEstimate: string; color: string } => {
    const MB = 1024 * 1024;
    const GB = 1024 * MB;

    if (bytes < 100 * MB) {
      return { category: 'small', label: 'Pequeña', timeEstimate: '< 30 segundos', color: 'green' };
    } else if (bytes < 500 * MB) {
      return { category: 'medium', label: 'Mediana', timeEstimate: '1-3 minutos', color: 'yellow' };
    } else if (bytes < 1 * GB) {
      return { category: 'large', label: 'Grande', timeEstimate: '3-8 minutos', color: 'orange' };
    } else {
      return { category: 'xlarge', label: 'Muy Grande', timeEstimate: '10+ minutos', color: 'red' };
    }
  };

  // Detectar GDBs en los archivos cargados
  const detectGdbs = (files: File[]): Array<{
    path: string;
    name: string;
    size: number;
    sizeFormatted: string;
    canCompress: boolean;
    sizeCategory: { category: 'small' | 'medium' | 'large' | 'xlarge'; label: string; timeEstimate: string; color: string };
    files: File[];
  }> => {
    const gdbMap = new Map<string, File[]>();

    files.forEach(file => {
      // @ts-ignore
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split('/');

      // Buscar si alguna parte del path termina en .gdb
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].toLowerCase().endsWith('.gdb')) {
          const gdbPath = parts.slice(0, i + 1).join('/');
          if (!gdbMap.has(gdbPath)) {
            gdbMap.set(gdbPath, []);
          }
          gdbMap.get(gdbPath)!.push(file);
          break;
        }
      }
    });

    // Convertir a array con información
    const gdbs: Array<{
      path: string;
      name: string;
      size: number;
      sizeFormatted: string;
      canCompress: boolean;
      sizeCategory: { category: 'small' | 'medium' | 'large' | 'xlarge'; label: string; timeEstimate: string; color: string };
      files: File[];
    }> = [];

    gdbMap.forEach((gdbFiles, gdbPath) => {
      const totalSize = gdbFiles.reduce((sum, f) => sum + f.size, 0);
      const name = gdbPath.split('/').pop() || gdbPath;
      gdbs.push({
        path: gdbPath,
        name,
        size: totalSize,
        sizeFormatted: formatSize(totalSize),
        canCompress: true, // Siempre se puede comprimir, sin límite
        sizeCategory: getGdbSizeCategory(totalSize),
        files: gdbFiles
      });
    });

    return gdbs;
  };

  // Comprimir una GDB a ZIP
  const compressGdbToZip = async (gdb: { path: string; name: string; files: File[] }): Promise<File> => {
    const zip = new JSZip();
    const gdbFolder = zip.folder(gdb.name);

    if (!gdbFolder) throw new Error('No se pudo crear carpeta en ZIP');

    for (const file of gdb.files) {
      // @ts-ignore
      const relativePath = file.webkitRelativePath || file.name;
      // Obtener path relativo dentro de la GDB
      const gdbIndex = relativePath.toLowerCase().indexOf(gdb.name.toLowerCase());
      if (gdbIndex >= 0) {
        const pathInsideGdb = relativePath.substring(gdbIndex + gdb.name.length + 1);
        if (pathInsideGdb) {
          const arrayBuffer = await file.arrayBuffer();
          gdbFolder.file(pathInsideGdb, arrayBuffer);
        }
      }
    }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return new File([blob], `${gdb.name}.zip`, { type: 'application/zip' });
  };

  // Comprimir todas las GDBs detectadas
  const compressSelectedGdbs = async () => {
    // Comprimir TODAS las GDBs detectadas (ya no hay límite de tamaño)
    if (detectedGdbs.length === 0) {
      continueWithoutCompression();
      return;
    }

    setIsCompressingGdbs(true);
    const compressedFiles: File[] = [];
    const gdbPaths = new Set(detectedGdbs.flatMap(g => g.files.map(f => {
      // @ts-ignore
      return f.webkitRelativePath || f.name;
    })));

    try {
      for (let i = 0; i < detectedGdbs.length; i++) {
        const gdb = detectedGdbs[i];
        setGdbCompressionProgress({ current: i + 1, total: detectedGdbs.length, name: gdb.name });

        const zipFile = await compressGdbToZip(gdb);

        // Crear el archivo con la ruta correcta (en el directorio padre de la GDB)
        const parentPath = gdb.path.split('/').slice(0, -1).join('/');
        const newRelativePath = parentPath ? `${parentPath}/${gdb.name}.zip` : `${gdb.name}.zip`;

        // Crear File con webkitRelativePath
        const fileWithPath = new File([zipFile], `${gdb.name}.zip`, { type: 'application/zip' });
        Object.defineProperty(fileWithPath, 'webkitRelativePath', {
          value: newRelativePath,
          writable: false
        });
        compressedFiles.push(fileWithPath);
      }

      // Filtrar archivos originales: remover los que pertenecen a GDBs comprimidas
      const filteredFiles = pendingFilesForProcessing.filter(f => {
        // @ts-ignore
        const path = f.webkitRelativePath || f.name;
        return !gdbPaths.has(path);
      });

      // Agregar los ZIPs comprimidos
      const finalFiles = [...filteredFiles, ...compressedFiles];

      toast.success(`${detectedGdbs.length} GDB(s) comprimidas exitosamente`);

      // Cerrar modal y continuar con el procesamiento
      setShowGdbModal(false);
      setDetectedGdbs([]);
      setPendingFilesForProcessing([]);
      setGdbCompressionProgress(null);
      setIsCompressingGdbs(false);

      // Procesar archivos finales
      await processFilesInternal(finalFiles);

    } catch (error: any) {
      console.error('Error comprimiendo GDBs:', error);
      toast.error(`Error al comprimir: ${error.message}`);
      setIsCompressingGdbs(false);
      setGdbCompressionProgress(null);
    }
  };

  // Continuar sin comprimir (usuario decidió no comprimir)
  const continueWithoutCompression = () => {
    setShowGdbModal(false);
    // Procesar con los archivos originales
    processFilesInternal(pendingFilesForProcessing);
    setPendingFilesForProcessing([]);
    setDetectedGdbs([]);
  };

  const processFiles = async (files: File[]) => {
    // PRIMERO: Detectar GDBs
    const gdbs = detectGdbs(files);

    if (gdbs.length > 0) {
      // Hay GDBs detectadas - mostrar modal de alerta
      setDetectedGdbs(gdbs);
      setPendingFilesForProcessing(files);
      setShowGdbModal(true);
      return; // Esperar decisión del usuario
    }

    // No hay GDBs, procesar normalmente
    await processFilesInternal(files);
  };

  // Procesar archivos internamente (después de resolver GDBs)
  const processFilesInternal = async (files: File[]) => {
    const builtTree = buildTree(files);
    setTree(builtTree);

    // Calcular nivel máximo
    const calculateMaxLevel = (nodes: TreeNode[]): number => {
      let max = 0;
      nodes.forEach(node => {
        max = Math.max(max, node.level);
        if (node.children) {
          max = Math.max(max, calculateMaxLevel(node.children));
        }
      });
      return max;
    };

    const maxLvl = calculateMaxLevel(builtTree);
    setMaxLevel(maxLvl);

    // Calcular stats iniciales
    const countNodes = (nodes: TreeNode[]): number => {
      let count = nodes.length;
      nodes.forEach(node => {
        if (node.children) {
          count += countNodes(node.children);
        }
      });
      return count;
    };

    const total = countNodes(builtTree);
    setStats({
      total,
      processed: 0,
      approved: 0,
      pending: total,
      failed: 0,
      uploaded: 0
    });

    // Auto-expandir primer nivel
    const firstLevelIds = builtTree.map(n => n.id);
    setExpandedNodes(new Set(firstLevelIds));

    // VALIDAR TODOS LOS NIVELES inmediatamente al cargar
    // La validación debe mostrar errores a TODOS los usuarios desde el inicio
    // El bypass de admin/superadmin solo aplica al momento de SUBIR, no al validar
    setIsInitialValidationComplete(false); // Bloquear IA hasta que termine
    let currentTree = builtTree;
    for (let lvl = 0; lvl <= maxLvl; lvl++) {
      currentTree = await validateLevel(lvl, currentTree);
      // Pequeña pausa para que la UI se actualice
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    setIsInitialValidationComplete(true); // Permitir IA ahora
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    await processFiles(selectedFiles);
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Solo cambiar si realmente salimos del contenedor
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];

    // Procesar items arrastrados
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await traverseFileTree(entry, '', files);
        }
      }
    }

    if (files.length > 0) {
      await processFiles(files);
    }
  };

  // Función recursiva para recorrer el árbol de archivos
  const traverseFileTree = async (item: any, path: string, files: File[]): Promise<void> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          // Agregar webkitRelativePath manualmente
          const relativePath = path ? `${path}/${file.name}` : file.name;
          Object.defineProperty(file, 'webkitRelativePath', {
            value: relativePath,
            writable: false
          });
          files.push(file);
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries: any[]) => {
          for (const entry of entries) {
            await traverseFileTree(entry, path ? `${path}/${item.name}` : item.name, files);
          }
          resolve();
        });
      }
    });
  };

  // Obtener nodos de un nivel específico
  const getNodesAtLevel = (level: number, nodes: TreeNode[] = tree): TreeNode[] => {
    const result: TreeNode[] = [];
    nodes.forEach(node => {
      if (node.level === level) {
        result.push(node);
      }
      if (node.children) {
        result.push(...getNodesAtLevel(level, node.children));
      }
    });
    return result;
  };

  // Validar nodos de un nivel
  const validateLevel = async (level: number, treeToValidate: TreeNode[] = tree): Promise<TreeNode[]> => {
    const nodesAtLevel = getNodesAtLevel(level, treeToValidate);

    if (nodesAtLevel.length === 0) {
      return treeToValidate;
    }

    // Marcar como validando
    let currentTree = updateNodeStatuses(treeToValidate, nodesAtLevel.map(n => n.id), 'validating');
    setTree(currentTree);

    try {
      const filesToValidate = nodesAtLevel.map(node => ({
        name: node.correctedName || node.name,
        path: node.path
      }));

      const response = await fileOpsApi.validateBatch(currentPath, filesToValidate);

      // Actualizar resultados
      const updatedTree = updateTreeWithValidation(currentTree, response.results);
      setTree(updatedTree);

      // Actualizar stats
      updateStats(updatedTree);

      return updatedTree;
    } catch (error: any) {
      console.error('Error validando nivel:', error);
      toast.error('Error validando archivos: ' + (error.response?.data?.error || error.message));
      return currentTree;
    }
  };

  // Actualizar árbol con resultados de validación
  const updateTreeWithValidation = (nodes: TreeNode[], results: any[]): TreeNode[] => {
    return nodes.map(node => {
      const result = results.find(r => r.path === node.path);
      if (result) {
        // Determinar el estado:
        // - Si es válido → 'approved'
        // - Si es inválido PERO tiene bypass (admin/superadmin) → 'approved' (con advertencias visibles)
        // - Si es inválido sin bypass → 'invalid'
        const canProceed = result.valid || result.bypass;

        return {
          ...node,
          status: canProceed ? 'approved' : 'invalid',
          errors: result.errors || [],
          // Guardar si tiene bypass para mostrarlo en UI
          bypassValidation: result.bypass || false
        };
      }

      if (node.children) {
        return {
          ...node,
          children: updateTreeWithValidation(node.children, results)
        };
      }

      return node;
    });
  };

  // Actualizar status de nodos
  const updateNodesStatus = (nodeIds: string[], status: ItemStatus) => {
    setTree(prev => updateNodeStatuses(prev, nodeIds, status));
  };

  const updateNodeStatuses = (nodes: TreeNode[], nodeIds: string[], status: ItemStatus): TreeNode[] => {
    return nodes.map(node => {
      if (nodeIds.includes(node.id)) {
        return { ...node, status };
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeStatuses(node.children, nodeIds, status)
        };
      }
      return node;
    });
  };

  // Validación de formato en cliente (instantánea)
  const validateFormatClientSide = (name: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Remover extensión si existe
    const nameWithoutExt = name.includes('.') ? name.split('.')[0] : name;

    // 1. NO MAYÚSCULAS
    if (nameWithoutExt !== nameWithoutExt.toLowerCase()) {
      errors.push('No se permiten mayúsculas. Use solo minúsculas.');
    }

    // 2. NO ESPACIOS
    if (nameWithoutExt.includes(' ')) {
      errors.push('No se permiten espacios. Use guiones bajos (_).');
    }

    // 3. NO GUIONES MEDIOS
    if (nameWithoutExt.includes('-')) {
      errors.push('No se permiten guiones medios (-). Use guiones bajos (_).');
    }

    // 4. CARACTERES INVÁLIDOS (solo letras, números, guiones bajos y puntos)
    const validPattern = /^[a-z0-9_.]+$/;
    if (!validPattern.test(nameWithoutExt)) {
      errors.push('Solo se permiten letras minúsculas, números, guiones bajos (_) y puntos (.)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  // Corregir nombre de nodo
  const correctNodeName = async (nodeId: string, newName: string) => {
    // Actualizar nombre inmediatamente para UX responsive
    setTree(prev => updateNodeNameImmediate(prev, nodeId, newName));

    // VALIDACIÓN INSTANTÁNEA EN CLIENTE (formato básico)
    const formatValidation = validateFormatClientSide(newName);

    if (!formatValidation.valid) {
      // Si hay errores de formato, mostrar inmediatamente sin esperar backend
      setTree(prev => updateNodeValidationResult(prev, nodeId, {
        status: 'invalid',
        errors: formatValidation.errors,
        bypassValidation: user?.role === 'admin' || user?.role === 'superadmin',
        pathInfo: undefined
      }));

      // Limpiar cualquier timeout pendiente
      const existingTimeout = debounceTimeouts.current.get(nodeId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        debounceTimeouts.current.delete(nodeId);
      }

      // Actualizar stats
      setTree(currentTree => {
        updateStats(currentTree);
        return currentTree;
      });

      return; // No continuar con validación backend
    }

    // Limpiar timeout anterior para este nodo específico
    const existingTimeout = debounceTimeouts.current.get(nodeId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Debounce: esperar 150ms antes de validar en backend (optimizado para velocidad)
    // (para evitar múltiples requests mientras el usuario escribe)
    const timeoutId = setTimeout(async () => {
      // Marcar como validating
      setTree(prev => updateNodeStatus(prev, nodeId, 'validating'));

      try {
        // Validar contra backend (diccionario + path length)
        const response = await fileOpsApi.validateBatch(currentPath, [
          { name: newName, path: '' }
        ]);

        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          const canProceed = result.valid || result.bypass;

          setTree(prev => updateNodeValidationResult(prev, nodeId, {
            status: canProceed ? 'approved' : 'invalid',
            errors: result.errors || [],
            bypassValidation: result.bypass || false,
            pathInfo: result.path_info // Guardar info de path del backend
          }));
        }
      } catch (error: any) {
        console.error('Error validando nombre:', error);
        setTree(prev => updateNodeValidationResult(prev, nodeId, {
          status: 'invalid',
          errors: ['Error al validar con el servidor'],
          bypassValidation: false,
          pathInfo: undefined
        }));
      }

      // Actualizar stats después de validación
      setTree(currentTree => {
        updateStats(currentTree);
        return currentTree;
      });

      // Limpiar el timeout del map después de ejecutar
      debounceTimeouts.current.delete(nodeId);
    }, 150); // Reducido a 150ms para respuesta más rápida

    // Guardar el nuevo timeout en el map
    debounceTimeouts.current.set(nodeId, timeoutId);
  };

  const updateNodeNameImmediate = (nodes: TreeNode[], nodeId: string, newName: string): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          correctedName: newName,
          name: newName,
          // Mantener status actual hasta que se revalide
        };
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeNameImmediate(node.children, nodeId, newName)
        };
      }
      return node;
    });
  };

  const updateNodeStatus = (nodes: TreeNode[], nodeId: string, status: ItemStatus): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, status };
      }
      if (node.children) {
        return { ...node, children: updateNodeStatus(node.children, nodeId, status) };
      }
      return node;
    });
  };

  const updateNodeValidationResult = (
    nodes: TreeNode[],
    nodeId: string,
    result: { status: ItemStatus; errors: string[]; bypassValidation: boolean; pathInfo?: any }
  ): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        // IMPORTANTE: Preservar TODOS los campos existentes del nodo, especialmente correctedName y name
        return {
          ...node, // Preservar TODO (correctedName, name, etc.)
          status: result.status,
          errors: result.errors,
          bypassValidation: result.bypassValidation,
          ...(result.pathInfo && { pathInfo: result.pathInfo }) // Solo agregar pathInfo si existe
        };
      }
      if (node.children) {
        return {
          ...node,
          children: updateNodeValidationResult(node.children, nodeId, result)
        };
      }
      return node;
    });
  };

  // Solicitar sugerencia de IA
  const requestAISuggestion = async (nodeId: string, nodeName: string, _nodePath: string) => {
    setTree(prev => setNodeAILoading(prev, nodeId, true));

    try {
      const response = await fileOpsApi.suggestName({
        original_name: nodeName,
        current_path: currentPath
      });

      setTree(prev => updateNodeWithAI(prev, nodeId, response.suggested_name));
    } catch (error: any) {
      console.error('Error obteniendo sugerencia IA:', error);
      toast.error('Error obteniendo sugerencia: ' + (error.response?.data?.error || error.message));
    } finally {
      setTree(prev => setNodeAILoading(prev, nodeId, false));
    }
  };

  const setNodeAILoading = (nodes: TreeNode[], nodeId: string, loading: boolean): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, loadingAI: loading };
      }
      if (node.children) {
        return { ...node, children: setNodeAILoading(node.children, nodeId, loading) };
      }
      return node;
    });
  };

  const updateNodeWithAI = (nodes: TreeNode[], nodeId: string, suggestion: string): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, aiSuggestion: suggestion, correctedName: suggestion, name: suggestion, status: 'approved', errors: [] };
      }
      if (node.children) {
        return { ...node, children: updateNodeWithAI(node.children, nodeId, suggestion) };
      }
      return node;
    });
  };

  // Solicitar sugerencias de IA en lote para TODOS los archivos/carpetas
  const requestAIBatchSuggestions = async () => {
    setIsAIBatchProcessing(true);
    setAiRenameComplete(false);
    setAiRenameStats(null);

    try {
      // Recopilar todos los nodos del árbol
      const allNodes: TreeNode[] = [];
      const collectAllNodes = (nodes: TreeNode[]) => {
        nodes.forEach(n => {
          allNodes.push(n);
          if (n.children) collectAllNodes(n.children);
        });
      };
      collectAllNodes(tree);

      // Preparar lista de archivos para el batch
      const files = allNodes.map(node => {
        const extension = node.name.includes('.') ? `.${node.name.split('.').pop()}` : '';
        return {
          original_name: node.originalName,
          extension: extension
        };
      });

      // FIX 4: Determinar si usuario debe usar solo diccionario
      // Solo admin y superadmin pueden bypassear diccionario
      const useDictionaryOnly = user?.role !== 'admin' && user?.role !== 'superadmin';

      // FIX 2: Implementar chunking - máximo 25 archivos por llamada a GROQ
      const CHUNK_SIZE = 25;
      const chunks: typeof files[] = [];
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        chunks.push(files.slice(i, i + CHUNK_SIZE));
      }

      console.log(`[BATCH AI] Procesando ${files.length} archivos en ${chunks.length} chunks de ${CHUNK_SIZE}`);

      // Procesar chunks secuencialmente
      let updatedTree = tree;
      let totalSuccessful = 0;
      let totalFailed = 0;
      let processedCount = 0;

      for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
        const chunk = chunks[chunkIdx];
        console.log(`[BATCH AI] Procesando chunk ${chunkIdx + 1}/${chunks.length} (${chunk.length} archivos)`);

        try {
          // Llamar al endpoint batch para este chunk
          const response = await fileOpsApi.suggestBatch({
            files: chunk,
            current_path: currentPath,
            use_dictionary: useDictionaryOnly
          });

          // Aplicar las sugerencias de este chunk
          response.results.forEach((result: any, index: number) => {
            const globalIndex = processedCount + index;
            const node = allNodes[globalIndex];
            if (result.suggested_name && !result.error) {
              updatedTree = updateNodeWithAI(updatedTree, node.id, result.suggested_name);
            }
          });

          totalSuccessful += response.successful || 0;
          totalFailed += response.failed || 0;
          processedCount += chunk.length;

          // Pequeña pausa entre chunks
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          console.error(`Error en chunk ${chunkIdx + 1}:`, error);
          totalFailed += chunk.length;
          processedCount += chunk.length;
        }
      }

      setTree(updatedTree);

      // IMPORTANTE: Actualizar estadísticas después del renombramiento con IA
      // Esto es necesario para que los contadores reflejen los nodos "approved"
      updateStats(updatedTree);

      // Marcar como completado y guardar estadísticas
      setAiRenameComplete(true);
      setAiRenameStats({ successful: totalSuccessful, failed: totalFailed });

      const message = useDictionaryOnly
        ? `IA Masiva (modo diccionario estricto): ${totalSuccessful} sugerencias exitosas, ${totalFailed} fallidas`
        : `IA Masiva: ${totalSuccessful} sugerencias exitosas, ${totalFailed} fallidas`;

      toast.success(message);
    } catch (error: any) {
      console.error('Error en IA masiva:', error);
      toast.error('Error obteniendo sugerencias masivas: ' + (error.response?.data?.error || error.message));
      setAiRenameComplete(false);
      setAiRenameStats(null);
    } finally {
      setIsAIBatchProcessing(false);
    }
  };

  // Actualizar estadísticas
  const updateStats = (nodes: TreeNode[]) => {
    const count = (nodes: TreeNode[], status: ItemStatus): number => {
      let c = 0;
      nodes.forEach(n => {
        if (n.status === status) c++;
        if (n.children) c += count(n.children, status);
      });
      return c;
    };

    const countTotal = (nodes: TreeNode[]): number => {
      let c = nodes.length;
      nodes.forEach(n => {
        if (n.children) c += countTotal(n.children);
      });
      return c;
    };

    const processed = count(nodes, 'uploaded') + count(nodes, 'failed') + count(nodes, 'skipped');
    const total = countTotal(nodes);

    setStats({
      total,
      processed,
      approved: count(nodes, 'approved'),
      pending: count(nodes, 'pending') + count(nodes, 'invalid') + count(nodes, 'correcting'),
      failed: count(nodes, 'failed'),
      uploaded: count(nodes, 'uploaded')
    });
  };

  // Comenzar proceso de subida progresiva
  const startUploadProcess = () => {
    setShowConflictModal(true);
  };

  // Variable para trackear tiempo de inicio
  const uploadStartTime = useRef<number>(0);

  // NUEVA ESTRATEGIA: Subir todo en una sola llamada al backend
  // Esto genera UN SOLO registro de auditoría consolidado con toda la información
  const uploadAllAtOnce = async () => {
    // Recopilar TODOS los nodos del árbol
    const allNodes: TreeNode[] = [];
    const collectAllNodes = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        allNodes.push(n);
        if (n.children) collectAllNodes(n.children);
      });
    };
    collectAllNodes(tree);

    // Filtrar solo nodos aprobados (pueden subirse)
    const approvedNodes = allNodes.filter(n => n.status === 'approved');

    if (approvedNodes.length === 0) {
      toast.warning('No hay archivos aprobados para subir');
      setIsProcessing(false);
      return;
    }

    // Marcar todos como uploading
    updateNodesStatus(approvedNodes.map(n => n.id), 'uploading');
    setCurrentUploadingItem(`Subiendo ${approvedNodes.length} items...`);

    // Preparar items ordenados por nivel (directorios padre primero)
    const sortedNodes = [...approvedNodes].sort((a, b) => a.level - b.level);

    // Construir paths corregidos considerando ancestros
    const buildCorrectedPath = (node: TreeNode): string => {
      const pathParts = node.path.split('/');
      pathParts.pop(); // Remover el nombre del nodo actual

      const correctedParts: string[] = [];
      let accumulatedPath = '';

      for (const part of pathParts) {
        accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
        const ancestorNode = allNodes.find(n => n.path === accumulatedPath);
        if (ancestorNode) {
          correctedParts.push(ancestorNode.correctedName || ancestorNode.name);
        } else {
          correctedParts.push(part);
        }
      }

      return correctedParts.join('/');
    };

    // Preparar items y archivos para el batch
    const items: Array<{
      originalName: string;
      targetName: string;
      relativePath: string;
      isDirectory: boolean;
      size: number;
    }> = [];
    const files: File[] = [];
    const nodeIndexMap = new Map<number, TreeNode>();

    sortedNodes.forEach((node, idx) => {
      const relativePath = buildCorrectedPath(node);

      items.push({
        originalName: node.originalName,
        targetName: node.correctedName || node.name,
        relativePath: relativePath,
        isDirectory: node.isDirectory,
        size: node.size || (node.file?.size ?? 0)
      });

      nodeIndexMap.set(idx, node);

      // Solo agregar archivo si no es directorio
      if (!node.isDirectory && node.file) {
        files.push(node.file);
      }
    });

    try {
      // UNA SOLA llamada al backend con TODO
      const response = await fileOpsApi.uploadBatch(
        {
          destinationPath: currentPath,
          conflictStrategy: conflictStrategy,
          items: items,
          files: files
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Actualizar estado de cada nodo según resultado
      response.results.forEach((result) => {
        const node = nodeIndexMap.get(result.index);
        if (!node) return;

        if (result.status === 'uploaded') {
          updateNodesStatus([node.id], 'uploaded');
          if (result.action_taken === 'renamed' && result.target_name !== node.correctedName) {
            setTree(prev => updateNodeNameImmediate(prev, node.id, result.target_name));
          }
        } else if (result.status === 'skipped') {
          updateNodesStatus([node.id], 'skipped');
        } else {
          updateNodesStatus([node.id], 'failed');
        }
      });

      // Calcular duración
      const duration = (Date.now() - uploadStartTime.current) / 1000;

      // Mostrar resumen final
      const { summary } = response;
      setUploadComplete(true);
      setUploadSummary({
        total: summary.total,
        uploaded: summary.uploaded + summary.created_dirs,
        skipped: summary.skipped,
        failed: summary.failed,
        duration: Math.round(duration)
      });

      updateStats(treeRef.current);

    } catch (error: any) {
      console.error('Error en subida masiva:', error);
      const errorMsg = error.response?.data?.error || error.message;
      toast.error(`Error en subida masiva: ${errorMsg}`);

      // Marcar todos como fallidos
      updateNodesStatus(approvedNodes.map(n => n.id), 'failed');
      updateStats(treeRef.current);
    } finally {
      setIsProcessing(false);
      setCurrentUploadingItem(null);
    }
  };

  const executeUploadProcess = async () => {
    setShowConflictModal(false);

    // Verificar si hay archivos que NO se van a subir (status !== 'approved')
    const allNodes: TreeNode[] = [];
    const collectAll = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        allNodes.push(n);
        if (n.children) collectAll(n.children);
      });
    };
    collectAll(tree);

    const invalidNodes = allNodes.filter(n => n.status === 'invalid');
    const pendingNodes = allNodes.filter(n => n.status === 'pending' || n.status === 'validating');
    const approvedNodes = allNodes.filter(n => n.status === 'approved');

    // Si hay archivos inválidos o pendientes, mostrar alerta antes de continuar
    if (invalidNodes.length > 0 || pendingNodes.length > 0) {
      const invalidNames = invalidNodes.slice(0, 5).map(n => n.name).join(', ');
      const pendingNames = pendingNodes.slice(0, 3).map(n => n.name).join(', ');

      let alertMessage = `⚠️ ATENCIÓN: Solo se subirán ${approvedNodes.length} de ${allNodes.length} archivos.\n\n`;

      if (invalidNodes.length > 0) {
        alertMessage += `❌ ${invalidNodes.length} archivo(s) con errores de validación:\n${invalidNames}${invalidNodes.length > 5 ? '...' : ''}\n\n`;
      }

      if (pendingNodes.length > 0) {
        alertMessage += `⏳ ${pendingNodes.length} archivo(s) pendientes de validación:\n${pendingNames}${pendingNodes.length > 3 ? '...' : ''}\n\n`;
      }

      alertMessage += '¿Desea continuar con la subida de los archivos aprobados?';

      if (!window.confirm(alertMessage)) {
        return; // Usuario canceló
      }
    }

    // Si no hay archivos aprobados, mostrar error
    if (approvedNodes.length === 0) {
      toast.error('No hay archivos aprobados para subir. Corrija los errores de validación primero.');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setUploadComplete(false);
    setUploadSummary(null);
    uploadStartTime.current = Date.now();

    // NUEVA ESTRATEGIA: Subir TODO en una sola llamada al backend
    // Esto genera UN SOLO registro de auditoría consolidado
    await uploadAllAtOnce();
  };


  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleClose = () => {
    setTree([]);
    setCurrentLevel(0);
    setMaxLevel(0);
    setIsProcessing(false);
    setExpandedNodes(new Set());
    setIsInitialValidationComplete(false);
    setAiRenameComplete(false);
    setAiRenameStats(null);
    setUploadProgress(0);
    setCurrentUploadingItem(null);
    setUploadComplete(false);
    setUploadSummary(null);
    setStats({ total: 0, processed: 0, approved: 0, pending: 0, failed: 0, uploaded: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  // Cerrar y refrescar después de subida exitosa
  const handleCloseAfterUpload = () => {
    handleClose();
    onUploadComplete();
  };

  // Calcular longitud de ruta completa para un nodo
  const calculatePathLength = (node: TreeNode): { current: number; max: number; available: number; fullPath: string } => {
    // Construir la ruta completa considerando nombres corregidos
    const pathParts = node.path.split('/');
    const correctedParts: string[] = [];

    // Buscar todos los nodos para obtener nombres corregidos de ancestros
    const allNodes: TreeNode[] = [];
    const collectAllNodes = (nodes: TreeNode[]) => {
      nodes.forEach(n => {
        allNodes.push(n);
        if (n.children) collectAllNodes(n.children);
      });
    };
    collectAllNodes(tree);

    let accumulatedPath = '';
    for (const part of pathParts) {
      if (!part) continue;
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      const ancestorNode = allNodes.find(n => n.path === accumulatedPath);
      if (ancestorNode) {
        correctedParts.push(ancestorNode.correctedName || ancestorNode.name);
      } else {
        correctedParts.push(part);
      }
    }

    // RUTA BASE del repositorio (debe coincidir con NETAPP_BASE_PATH del backend)
    const basePath = '\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy';

    // Construir ruta completa: basePath + currentPath + path relativo corregido
    const relativePath = correctedParts.join('\\');
    let fullPath = basePath;

    if (currentPath) {
      fullPath += '\\' + currentPath.replace(/\//g, '\\');
    }

    if (relativePath) {
      fullPath += '\\' + relativePath;
    }

    const maxLength = 260; // Límite de Windows
    const currentLength = fullPath.length;
    const available = maxLength - currentLength;

    return { current: currentLength, max: maxLength, available, fullPath };
  };

  // Renderizar nodo recursivamente
  const renderNode = (node: TreeNode, depth: number = 0): React.ReactElement => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    const getStatusIcon = () => {
      switch (node.status) {
        case 'uploaded': return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
        case 'uploading': return <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />;
        case 'approved':
          // Si tiene bypass, mostrar advertencia (tiene errores pero admin puede subir)
          if (node.bypassValidation && node.errors && node.errors.length > 0) {
            return <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" aria-label="Admin bypass: tiene errores pero puede subirse" />;
          }
          return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'invalid': return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
        case 'validating': return <Loader2 className="w-4 h-4 text-gray-400 dark:text-gray-500 animate-spin" />;
        case 'failed': return <XCircle className="w-4 h-4 text-red-700 dark:text-red-300" />;
        default: return <AlertCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />;
      }
    };

    const getStatusColor = () => {
      switch (node.status) {
        case 'uploaded': return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700';
        case 'uploading': return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700';
        case 'approved':
          // Si tiene bypass (errores pero admin puede subir), usar color amarillo de advertencia
          if (node.bypassValidation && node.errors && node.errors.length > 0) {
            return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300';
          }
          return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700';
        case 'invalid': return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700';
        case 'failed': return 'bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-600';
        default: return 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700';
      }
    };

    // Determinar si se puede editar (no durante upload o si ya subió)
    const canEdit = node.status !== 'uploading' && node.status !== 'uploaded' && !isProcessing;

    // Obtener longitud de ruta (del backend si está disponible, sino calcular)
    const pathInfo = (node as any).pathInfo || calculatePathLength(node);

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div className={`p-3 mb-2 rounded border ${getStatusColor()}`}>
          {/* Primera fila: icono de estado, tipo y botones */}
          <div className="flex items-center gap-2 mb-2">
            {hasChildren && (
              <button onClick={() => toggleNodeExpansion(node.id)} className="p-1 hover:bg-gray-200 dark:bg-gray-600 rounded">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {!hasChildren && <div className="w-6" />}

            {getStatusIcon()}
            {node.isDirectory ? <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <FileText className="w-4 h-4 text-gray-600 dark:text-gray-300" />}

            <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
              {node.isDirectory ? 'DIR' : 'FILE'} - Nivel {node.level}
            </span>

            <div className="flex-1" />

            {canEdit && (
              <button
                onClick={() => requestAISuggestion(node.id, node.originalName, node.path)}
                disabled={node.loadingAI}
                className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-1"
                title="Sugerir nombre con IA"
              >
                {node.loadingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                IA
              </button>
            )}
          </div>

          {/* Segunda fila: Input de edición (SIEMPRE visible si se puede editar) */}
          {canEdit ? (
            <div className="ml-8 mb-1">
              <input
                type="text"
                value={node.correctedName || node.name}
                onChange={(e) => correctNodeName(node.id, e.target.value)}
                className={`w-full px-3 py-2 border rounded text-sm font-mono ${
                  node.status === 'invalid' ? 'border-red-400 bg-red-50 dark:bg-red-900/30' :
                  node.status === 'approved' ? 'border-green-400 bg-green-50 dark:bg-green-900/30' :
                  'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }`}
                placeholder="Editar nombre..."
              />

              {/* Contador de caracteres de ruta */}
              <div className="mt-2 flex items-center gap-2">
                <div className={`flex-1 text-xs ${
                  pathInfo.available < 20 ? 'text-red-700 dark:text-red-300 font-bold' :
                  pathInfo.available < 50 ? 'text-yellow-700 dark:text-yellow-300 font-semibold' :
                  'text-gray-600 dark:text-gray-300'
                }`}>
                  <span className="font-semibold">Ruta:</span> {pathInfo.current} / {pathInfo.max} caracteres
                  <span className={`ml-2 ${
                    pathInfo.available < 20 ? 'text-red-800 dark:text-red-200' :
                    pathInfo.available < 50 ? 'text-yellow-800 dark:text-yellow-200' :
                    'text-green-700 dark:text-green-300'
                  }`}>
                    ({pathInfo.available} disponibles)
                  </span>
                </div>
              </div>

              {/* Barra de progreso visual */}
              <div className="mt-1 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    pathInfo.available < 20 ? 'bg-red-600' :
                    pathInfo.available < 50 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${(pathInfo.current / pathInfo.max) * 100}%` }}
                />
              </div>

              {node.originalName !== (node.correctedName || node.name) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                  Original: <span className="font-mono">{node.originalName}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="ml-8">
              <div className="text-sm font-mono font-semibold mb-1">
                {node.correctedName || node.name}
              </div>
              {/* Mostrar contador también cuando no se puede editar */}
              <div className="text-xs text-gray-600 dark:text-gray-300">
                Ruta: {pathInfo.current} / {pathInfo.max} ({pathInfo.available} disponibles)
              </div>
            </div>
          )}

          {/* Errores de validación */}
          {node.errors && node.errors.length > 0 && (
            <div className="ml-8 mt-2 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-600 rounded p-2">
              <p className="text-xs font-semibold text-red-900 mb-1">Errores:</p>
              {node.errors.map((err, i) => (
                <div key={i} className="text-xs text-red-800 dark:text-red-200 flex items-start gap-1">
                  <span>•</span>
                  <span><HighlightedError text={err} /></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isExpanded && hasChildren && node.children!.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (!isOpen) return null;

  const progressPercent = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Subir Carpeta - Validación Progresiva</h3>
          <button onClick={handleClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300" disabled={isProcessing}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Modal de Resumen de Subida Completada */}
          {uploadComplete && uploadSummary && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 transform animate-fadeIn">
                {/* Icono de éxito */}
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
                    uploadSummary.failed === 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-yellow-100'
                  }`}>
                    {uploadSummary.failed === 0 ? (
                      <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                </div>

                {/* Título */}
                <h3 className={`text-2xl font-bold text-center mb-2 ${
                  uploadSummary.failed === 0 ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {uploadSummary.failed === 0 ? '¡Subida Completada!' : 'Subida Completada con Advertencias'}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                  La operación ha finalizado en {uploadSummary.duration} segundos
                </p>

                {/* Resumen en cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{uploadSummary.total}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Total Items</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{uploadSummary.uploaded}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">Subidos</div>
                  </div>
                  {uploadSummary.skipped > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{uploadSummary.skipped}</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">Omitidos</div>
                    </div>
                  )}
                  {uploadSummary.failed > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">{uploadSummary.failed}</div>
                      <div className="text-sm text-red-700 dark:text-red-300">Fallidos</div>
                    </div>
                  )}
                </div>

                {/* Barra de éxito */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-300">Tasa de éxito</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {Math.round((uploadSummary.uploaded / uploadSummary.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        uploadSummary.failed === 0 ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${(uploadSummary.uploaded / uploadSummary.total) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Botón de cerrar */}
                <button
                  onClick={handleCloseAfterUpload}
                  className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                    uploadSummary.failed === 0
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  Cerrar y Actualizar
                </button>
              </div>
            </div>
          )}

          {/* GDB Detection Modal */}
          {showGdbModal && detectedGdbs.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Database className="w-8 h-8 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                      ¡Geodatabases Detectadas!
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Se encontraron {detectedGdbs.length} GDB(s) sin comprimir
                    </p>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-orange-800">
                      <strong>Las Geodatabases (.gdb) deben subirse comprimidas</strong> en formato ZIP, 7z o RAR
                      para evitar corrupción de datos y problemas de compatibilidad.
                    </div>
                  </div>
                </div>

                {/* GDB List */}
                <div className="flex-1 overflow-y-auto mb-4">
                  <div className="space-y-2">
                    {detectedGdbs.map((gdb, index) => {
                      const colorClasses = {
                        green: { bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-700', text: 'text-green-700 dark:text-green-300', icon: 'text-green-600 dark:text-green-400' },
                        yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-300', icon: 'text-yellow-600 dark:text-yellow-400' },
                        orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-600' },
                        red: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-700', text: 'text-red-700 dark:text-red-300', icon: 'text-red-600 dark:text-red-400' },
                      }[gdb.sizeCategory.color];

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${colorClasses.bg} ${colorClasses.border}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Database className={`w-5 h-5 ${colorClasses.icon}`} />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{gdb.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{gdb.path}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${colorClasses.text}`}>
                                {gdb.sizeFormatted}
                              </p>
                              <p className={`text-xs ${colorClasses.text}`}>
                                {gdb.sizeCategory.label} - {gdb.sizeCategory.timeEstimate}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary con categorías */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-green-100 dark:bg-green-900/50 rounded p-2">
                      <div className="text-lg font-bold text-green-700 dark:text-green-300">
                        {detectedGdbs.filter(g => g.sizeCategory.category === 'small').length}
                      </div>
                      <div className="text-green-600 dark:text-green-400">Pequeñas</div>
                      <div className="text-green-500 text-[10px]">&lt;30s</div>
                    </div>
                    <div className="bg-yellow-100 rounded p-2">
                      <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                        {detectedGdbs.filter(g => g.sizeCategory.category === 'medium').length}
                      </div>
                      <div className="text-yellow-600 dark:text-yellow-400">Medianas</div>
                      <div className="text-yellow-500 text-[10px]">1-3 min</div>
                    </div>
                    <div className="bg-orange-100 rounded p-2">
                      <div className="text-lg font-bold text-orange-700">
                        {detectedGdbs.filter(g => g.sizeCategory.category === 'large').length}
                      </div>
                      <div className="text-orange-600">Grandes</div>
                      <div className="text-orange-500 text-[10px]">3-8 min</div>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/50 rounded p-2">
                      <div className="text-lg font-bold text-red-700 dark:text-red-300">
                        {detectedGdbs.filter(g => g.sizeCategory.category === 'xlarge').length}
                      </div>
                      <div className="text-red-600 dark:text-red-400">Muy Grandes</div>
                      <div className="text-red-500 text-[10px]">10+ min</div>
                    </div>
                  </div>

                  {/* Advertencia si hay GDBs grandes */}
                  {detectedGdbs.some(g => g.sizeCategory.category === 'large' || g.sizeCategory.category === 'xlarge') && (
                    <div className="mt-3 p-2 bg-amber-100 border border-amber-300 dark:border-amber-600 rounded text-xs text-amber-800 dark:text-amber-200">
                      <strong>Nota:</strong> La compresión de GDBs grandes puede tardar varios minutos.
                      Por favor, no cierre la ventana durante el proceso.
                    </div>
                  )}
                </div>

                {/* Compression Progress */}
                {isCompressingGdbs && gdbCompressionProgress && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Comprimiendo: {gdbCompressionProgress.name}
                      </span>
                      <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
                        {gdbCompressionProgress.current}/{gdbCompressionProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(gdbCompressionProgress.current / gdbCompressionProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
                      Por favor espere, esto puede tardar varios minutos para GDBs grandes...
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowGdbModal(false);
                      setDetectedGdbs([]);
                      setPendingFilesForProcessing([]);
                    }}
                    disabled={isCompressingGdbs}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 text-gray-700 dark:text-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={continueWithoutCompression}
                    disabled={isCompressingGdbs}
                    className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Sin Comprimir
                  </button>
                  <button
                    onClick={compressSelectedGdbs}
                    disabled={isCompressingGdbs}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCompressingGdbs ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Comprimiendo...
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        Comprimir como ZIP
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conflict Modal */}
          {showConflictModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 p-6 max-w-md w-full mx-4">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">¿Qué hacer con archivos duplicados?</h4>
                <div className="space-y-3 mb-6">
                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                    <input type="radio" name="conflict" value="skip" checked={conflictStrategy === 'skip'} onChange={(e) => setConflictStrategy(e.target.value as ConflictStrategy)} className="mt-1" />
                    <div className="ml-3">
                      <div className="font-semibold">Omitir</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">No subir archivos que ya existen</div>
                    </div>
                  </label>
                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                    <input type="radio" name="conflict" value="replace" checked={conflictStrategy === 'replace'} onChange={(e) => setConflictStrategy(e.target.value as ConflictStrategy)} className="mt-1" />
                    <div className="ml-3">
                      <div className="font-semibold">Reemplazar Todo</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Sobrescribir archivos existentes</div>
                    </div>
                  </label>
                  <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                    <input type="radio" name="conflict" value="keep_both" checked={conflictStrategy === 'keep_both'} onChange={(e) => setConflictStrategy(e.target.value as ConflictStrategy)} className="mt-1" />
                    <div className="ml-3">
                      <div className="font-semibold">Mantener Ambos</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Agregar sufijo _1, _2, etc.</div>
                    </div>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowConflictModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">Cancelar</button>
                  <button onClick={executeUploadProcess} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Continuar</button>
                </div>
              </div>
            </div>
          )}

          {tree.length === 0 && (
            <div
              className={`text-center p-12 border-3 border-dashed rounded-lg transition-all ${
                isDragging
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/30'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 hover:border-purple-400 hover:bg-purple-50 dark:bg-purple-900/30'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                {...({ webkitdirectory: '', directory: '' } as any)}
                multiple
                onChange={handleFolderSelect}
                className="hidden"
                id="folder-input"
              />

              {isDragging ? (
                <div className="space-y-3">
                  <Upload className="w-16 h-16 mx-auto text-purple-600 dark:text-purple-400 animate-bounce" />
                  <p className="text-xl font-semibold text-purple-700 dark:text-purple-300">Suelta la carpeta aquí</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Folder className="w-16 h-16 mx-auto text-purple-600 dark:text-purple-400" />
                  <div>
                    <label htmlFor="folder-input" className="inline-block px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer font-semibold transition-colors">
                      Seleccionar Carpeta
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    o arrastra una carpeta aquí
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    Validación progresiva nivel por nivel con soporte de IA
                  </p>
                </div>
              )}
            </div>
          )}

          {tree.length > 0 && (
            <>
              {/* Indicador de IA Completada */}
              {aiRenameComplete && aiRenameStats && (
                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 dark:border-green-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-green-800 dark:text-green-200">Renombrado con IA Completado</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {aiRenameStats.successful} archivos renombrados exitosamente
                        {aiRenameStats.failed > 0 && `, ${aiRenameStats.failed} fallidos`}
                      </p>
                    </div>
                    <Sparkles className="w-8 h-8 text-green-500" />
                  </div>
                </div>
              )}

              {/* Botón IA Masiva */}
              <div className="mb-4 flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {isInitialValidationComplete ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">Validación inicial completada</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400">Validando archivos...</span>
                  )}
                </div>
                <button
                  onClick={requestAIBatchSuggestions}
                  disabled={isAIBatchProcessing || isProcessing || !isInitialValidationComplete}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 flex items-center gap-2 shadow-lg dark:shadow-gray-900/50"
                  title={!isInitialValidationComplete ? "Esperando validación inicial..." : "Generar sugerencias de IA para todos los archivos y carpetas de una vez"}
                >
                  {!isInitialValidationComplete ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Validando...
                    </>
                  ) : isAIBatchProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando IA...
                    </>
                  ) : aiRenameComplete ? (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Volver a Renombrar con IA
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Renombrar Todo con IA
                    </>
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                {/* Barra de progreso de subida */}
                {isProcessing && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Subiendo: {currentUploadingItem || 'Preparando...'}
                      </span>
                      <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold">Progreso General</span>
                    <span className="text-gray-600 dark:text-gray-300">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div className="bg-purple-600 h-3 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 text-center text-sm">
                  <div><div className="text-xl font-bold">{stats.total}</div><div className="text-gray-600 dark:text-gray-300">Total</div></div>
                  <div><div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.uploaded}</div><div className="text-gray-600 dark:text-gray-300">Subidos</div></div>
                  <div><div className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.approved}</div><div className="text-gray-600 dark:text-gray-300">Aprobados</div></div>
                  <div><div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div><div className="text-gray-600 dark:text-gray-300">Pendientes</div></div>
                  <div><div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div><div className="text-gray-600 dark:text-gray-300">Fallidos</div></div>
                </div>

                {isProcessing && (
                  <div className="mt-3 text-center text-sm text-gray-700 dark:text-gray-200">
                    Subiendo archivos al servidor...
                  </div>
                )}
              </div>

              {/* Tree View */}
              <div className="space-y-1 max-h-96 overflow-y-auto border rounded-lg p-3">
                {tree.map(node => renderNode(node, 0))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {isProcessing && (
              <button onClick={handleClose} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                <StopCircle className="w-4 h-4" />
                Cancelar
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleClose} className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900" disabled={isProcessing}>Cerrar</button>

            {tree.length > 0 && !isProcessing && (
              <button
                onClick={startUploadProcess}
                disabled={stats.approved === 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Subir Todo ({stats.approved} items)
              </button>
            )}
          </div>
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};
