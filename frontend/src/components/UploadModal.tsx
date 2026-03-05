/**
 * Modal para subir múltiples archivos con validación individual y soporte de IA
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, X, Sparkles, AlertCircle, CheckCircle, Loader2, File, XCircle, Clock, ShieldAlert, Archive } from 'lucide-react';
import { fileOpsApi } from '../api/fileOps';
import type { SuggestNameResponse } from '../api/fileOps';
import { CharacterCounter } from './CharacterCounter';
import { ValidationAlert } from './ValidationAlert';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';
import { filterDangerousFiles, compressToZip } from '../utils/security';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onUploadComplete: () => void;
  preloadedFiles?: FileList | null; // Archivos precargados desde drag & drop
}

interface FileToUpload {
  id: string;
  file: File;
  customFilename: string;
  aiSuggestion: SuggestNameResponse | null;
  validationErrors: string[];
  validationWarnings: string[];
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'uploading' | 'uploaded' | 'failed';
  isLoadingSuggestion: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  currentPath,
  onUploadComplete,
  preloadedFiles,
}) => {
  const { user } = useAuthStore();
  const toast = useToast();
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [blockedFiles, setBlockedFiles] = useState<Array<{ name: string; reason: string }>>([]);
  const [compressibleFiles, setCompressibleFiles] = useState<Array<{ file: File; reason: string }>>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [useDictionaryRules, setUseDictionaryRules] = useState(true); // Default: use dictionary
  const [isAIBatchProcessing, setIsAIBatchProcessing] = useState(false);
  const [pathInfo, setPathInfo] = useState<{ available_chars: number; path_length: number; full_path_preview?: string } | null>(null);

  // Determinar si el usuario puede saltarse validación de diccionario
  // Usa las exenciones calculadas del backend (incluye rol + permisos individuales)
  const canBypassDictionary = user?.naming_exemptions?.exempt_from_naming_rules ??
                              (user?.role === 'admin' || user?.role === 'superadmin');

  // Extensiones compuestas que deben preservarse completas
  const COMPOUND_EXTENSIONS = [
    '.tar.gz', '.tar.bz2', '.tar.xz', '.tar.lzma', '.tar.zst',
    '.gdb.zip', '.gdb.7z', '.gdb.gz', '.gdb.rar',
    '.gpkg.zip', '.gpkg.7z',
    '.shp.zip', '.shp.7z',
  ];

  // Función para extraer extensión preservando extensiones compuestas
  const extractExtension = (filename: string): { name: string; extension: string } => {
    const filenameLower = filename.toLowerCase();

    // Primero verificar extensiones compuestas
    for (const compoundExt of COMPOUND_EXTENSIONS) {
      if (filenameLower.endsWith(compoundExt)) {
        return {
          name: filename.slice(0, -compoundExt.length),
          extension: compoundExt
        };
      }
    }

    // Si no es compuesta, usar lógica normal (último punto)
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex > 0) {
      return {
        name: filename.substring(0, lastDotIndex),
        extension: filename.substring(lastDotIndex)
      };
    }

    return { name: filename, extension: '' };
  };

  // Cargar info de ruta al abrir el modal
  useEffect(() => {
    if (isOpen && currentPath) {
      fileOpsApi.getPathInfo(currentPath, '').then(setPathInfo).catch(console.error);
    }
  }, [isOpen, currentPath]);

  // Procesar archivos precargados desde drag & drop
  useEffect(() => {
    if (isOpen && preloadedFiles && preloadedFiles.length > 0) {
      handleFileSelect(preloadedFiles);
    }
  }, [isOpen, preloadedFiles]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setFiles([]);
    setBlockedFiles([]);
    setCompressibleFiles([]);
    setIsUploading(false);
    setUseDictionaryRules(true); // Reset to default
    onClose();
  }, [onClose]);

  // Validar archivos en lote usando el endpoint validate-batch
  // Retorna los archivos actualizados con los resultados de validación
  const validateFilesInBatch = async (filesToValidate: FileToUpload[]): Promise<FileToUpload[]> => {
    if (filesToValidate.length === 0) return filesToValidate;

    try {
      // Preparar datos para validar
      const filesData = filesToValidate.map(f => {
        const { extension } = extractExtension(f.file.name);
        const finalName = f.customFilename + extension;
        return {
          name: finalName,
          path: finalName
        };
      });

      const response = await fileOpsApi.validateBatch(currentPath, filesData);

      // Actualizar cada archivo con los resultados de validación
      return filesToValidate.map((f, index) => {
        const { extension } = extractExtension(f.file.name);
        const finalName = f.customFilename + extension;
        const result = response.results.find((r: any) => r.name === finalName);

        if (result) {
          const hasErrors = result.errors && result.errors.length > 0;
          return {
            ...f,
            validationErrors: result.errors || [],
            validationWarnings: result.warnings || [],
            status: hasErrors ? 'invalid' as const : 'valid' as const
          };
        }
        return { ...f, status: 'pending' as const };
      });
    } catch (error) {
      console.error('Error validando archivos:', error);
      toast.error('Error al validar archivos');
      return filesToValidate.map(f => ({ ...f, status: 'pending' as const }));
    }
  };

  // Handle file selection - ONLY files, NO directories
  const handleFileSelect = async (fileList: FileList) => {
    const newFiles: FileToUpload[] = [];
    const newBlockedFiles: Array<{ name: string; reason: string }> = [];
    const fileArray = Array.from(fileList);

    // SEGURIDAD: Filtrar archivos peligrosos primero
    const { safe: safeFiles, canCompress, blocked } = filterDangerousFiles(fileArray);

    // Archivos que se pueden comprimir
    if (canCompress.length > 0) {
      setCompressibleFiles(prev => [...prev, ...canCompress]);
      toast.info(`${canCompress.length} archivo(s) requieren compresión`);
    }

    // Agregar archivos bloqueados (muy grandes para comprimir)
    for (const blockedFile of blocked) {
      newBlockedFiles.push({
        name: blockedFile.file.name,
        reason: blockedFile.reason
      });
    }

    // Notificar si hubo archivos bloqueados
    if (blocked.length > 0) {
      toast.error(`${blocked.length} archivo(s) bloqueado(s) (muy grandes)`);
    }

    for (let i = 0; i < safeFiles.length; i++) {
      const file = safeFiles[i];

      // BLOQUEAR DIRECTORIOS: verificar que sea un archivo real
      if (file.size === 0 && file.type === '') {
        toast.warning(`"${file.name}" parece ser un directorio. Solo se permiten archivos individuales.`);
        continue;
      }

      // Verificar que no sea un archivo duplicado
      const isDuplicate = files.some(f => f.file.name === file.name);
      if (isDuplicate) continue;

      // Extraer nombre sin extensión (preservando extensiones compuestas)
      const { name: fileNameWithoutExt } = extractExtension(file.name);

      newFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        customFilename: fileNameWithoutExt,
        aiSuggestion: null,
        validationErrors: [],
        validationWarnings: [],
        status: 'validating', // Iniciar como validando
        isLoadingSuggestion: false,
      });
    }

    if (newBlockedFiles.length > 0) {
      setBlockedFiles(prev => [...prev, ...newBlockedFiles]);
    }

    if (newFiles.length === 0) return;

    // Primero agregar archivos en estado 'validating'
    setFiles(prev => [...prev, ...newFiles]);

    // VALIDAR INMEDIATAMENTE - llamada síncrona con await
    const validatedFiles = await validateFilesInBatch(newFiles);

    // Actualizar con los resultados de validación
    setFiles(prev => {
      // Reemplazar los archivos nuevos con sus versiones validadas
      const existingFiles = prev.filter(f => !newFiles.some(nf => nf.id === f.id));
      return [...existingFiles, ...validatedFiles];
    });

    // Mostrar resumen
    const invalidCount = validatedFiles.filter(f => f.status === 'invalid').length;
    if (invalidCount > 0) {
      toast.warning(`${invalidCount} archivo(s) tienen errores de nomenclatura IGAC`);
    }
  };

  // Comprimir archivos peligrosos y agregarlos a la cola
  const handleCompressFiles = useCallback(async () => {
    if (compressibleFiles.length === 0) return;

    setIsCompressing(true);
    const newFiles: FileToUpload[] = [];

    try {
      for (let i = 0; i < compressibleFiles.length; i++) {
        const { file } = compressibleFiles[i];
        toast.info(`Comprimiendo ${file.name}...`);

        const zippedFile = await compressToZip(file);

        // Nombre sin extensión (preservando extensiones compuestas)
        const { name: fileNameWithoutExt } = extractExtension(zippedFile.name);

        newFiles.push({
          id: `${Date.now()}-zip-${i}`,
          file: zippedFile,
          customFilename: fileNameWithoutExt,
          aiSuggestion: null,
          validationErrors: [],
          validationWarnings: [],
          status: 'valid',
          isLoadingSuggestion: false,
        });
      }

      setFiles(prev => [...prev, ...newFiles]);
      setCompressibleFiles([]);
      toast.success(`${newFiles.length} archivo(s) comprimido(s) y agregado(s)`);
    } catch (error) {
      console.error('Error comprimiendo archivos:', error);
      toast.error('Error al comprimir archivos');
    } finally {
      setIsCompressing(false);
    }
  }, [compressibleFiles, toast]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const fileList = e.dataTransfer.files;
    if (fileList.length > 0) {
      handleFileSelect(fileList);
    }
  }, [handleFileSelect]);

  // Remove file from queue
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Get AI suggestion for a specific file
  const handleGetAiSuggestion = async (fileId: string) => {
    const fileData = files.find(f => f.id === fileId);
    if (!fileData) return;

    setFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, isLoadingSuggestion: true, status: 'validating' }
        : f
    ));

    try {
      const { name: fileNameWithoutExt, extension } = extractExtension(fileData.file.name);

      const suggestion = await fileOpsApi.suggestName({
        original_name: fileNameWithoutExt,
        current_path: currentPath,
        extension: extension,
        use_dictionary: useDictionaryRules, // Pass user preference
      });

      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? {
              ...f,
              aiSuggestion: suggestion,
              customFilename: suggestion.suggested_base,
              validationErrors: suggestion.errors || [],
              validationWarnings: suggestion.warnings || [],
              status: (suggestion.errors && suggestion.errors.length > 0) ? 'invalid' : 'valid',
              isLoadingSuggestion: false,
            }
          : f
      ));
    } catch (error: any) {
      console.error('Error obteniendo sugerencia de IA:', error);
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? {
              ...f,
              validationErrors: [error.response?.data?.error || 'Error al obtener sugerencia de IA'],
              status: 'invalid',
              isLoadingSuggestion: false,
            }
          : f
      ));
    }
  };

  // Renombrar TODOS los archivos con IA en una sola llamada batch
  const handleBatchAISuggestion = async () => {
    if (files.length === 0) return;

    setIsAIBatchProcessing(true);

    try {
      // Preparar archivos para el batch (preservando extensiones compuestas)
      const filesToProcess = files.map(f => {
        const { name: nameWithoutExt, extension } = extractExtension(f.file.name);
        return {
          original_name: nameWithoutExt,
          extension: extension
        };
      });

      // Procesar en chunks de 20 para no sobrecargar la API
      const CHUNK_SIZE = 20;
      const chunks: typeof filesToProcess[] = [];
      for (let i = 0; i < filesToProcess.length; i += CHUNK_SIZE) {
        chunks.push(filesToProcess.slice(i, i + CHUNK_SIZE));
      }

      let allResults: any[] = [];

      for (const chunk of chunks) {
        const response = await fileOpsApi.suggestBatch({
          files: chunk,
          current_path: currentPath,
          use_dictionary: useDictionaryRules
        });
        allResults = [...allResults, ...response.results];
      }

      // Aplicar sugerencias a cada archivo
      setFiles(prev => prev.map((f, index) => {
        const result = allResults[index];
        if (result && result.suggested_name) {
          // Quitar extensión de la sugerencia si la tiene
          let suggestedBase = result.suggested_base || result.suggested_name;
          const { extension: ext } = extractExtension(f.file.name);
          if (suggestedBase.toLowerCase().endsWith(ext.toLowerCase())) {
            suggestedBase = suggestedBase.slice(0, -ext.length);
          }
          return {
            ...f,
            customFilename: suggestedBase,
            validationErrors: result.errors || [],
            validationWarnings: result.warnings || [],
            status: (result.errors && result.errors.length > 0) ? 'invalid' as const : 'valid' as const,
          };
        }
        return f;
      }));

      toast.success(`IA aplicada a ${allResults.length} archivos`);
    } catch (error: any) {
      console.error('Error en renombrado batch:', error);
      toast.error('Error al renombrar con IA: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsAIBatchProcessing(false);
    }
  };

  // Validate custom filename for a specific file
  const handleFilenameChange = async (fileId: string, value: string) => {
    const fileData = files.find(f => f.id === fileId);
    if (!fileData) return;

    setFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, customFilename: value, status: 'validating' }
        : f
    ));

    // Si el campo está vacío, usar nombre original - PERO TAMBIÉN VALIDARLO
    const { name: originalNameWithoutExt, extension } = extractExtension(fileData.file.name);
    const nameToValidate = value.trim() || originalNameWithoutExt;

    try {
      const validation = await fileOpsApi.validateName({
        name: nameToValidate,
        current_path: currentPath,
        extension: extension,
      });

      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? {
              ...f,
              validationErrors: validation.errors || [],
              validationWarnings: validation.warnings || [],
              status: (validation.errors && validation.errors.length > 0) ? 'invalid' : 'valid',
            }
          : f
      ));
    } catch (error: any) {
      console.error('Error validando nombre:', error);
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? {
              ...f,
              validationErrors: [error.response?.data?.error || 'Error al validar nombre'],
              status: 'invalid',
            }
          : f
      ));
    }
  };

  // Upload all valid files
  const handleUploadAll = async () => {
    const validFiles = files.filter(f => f.status === 'valid');
    if (validFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let failedCount = 0;

    for (const fileData of validFiles) {
      // Marcar como "subiendo"
      setFiles(prev => prev.map(f =>
        f.id === fileData.id
          ? { ...f, status: 'uploading' }
          : f
      ));

      try {
        const { extension } = extractExtension(fileData.file.name);
        const finalFilename = fileData.customFilename
          ? `${fileData.customFilename}${extension}`
          : fileData.file.name;

        await fileOpsApi.uploadFile(currentPath, fileData.file, finalFilename);

        // Marcar como exitoso
        setFiles(prev => prev.map(f =>
          f.id === fileData.id
            ? { ...f, status: 'uploaded' }
            : f
        ));
        successCount++;
      } catch (error: any) {
        console.error('Error subiendo archivo:', error);
        setFiles(prev => prev.map(f =>
          f.id === fileData.id
            ? {
                ...f,
                status: 'failed',
                validationErrors: [error.response?.data?.error || 'Error al subir archivo'],
              }
            : f
        ));
        failedCount++;
      }
    }

    setIsUploading(false);
    onUploadComplete();

    // Cerrar modal y mostrar toast de resumen
    handleClose();

    if (failedCount === 0) {
      toast.success(`${successCount} archivo(s) subido(s) correctamente`);
    } else if (successCount > 0) {
      toast.success(`${successCount} subido(s), ${failedCount} fallido(s)`);
    } else {
      toast.error(`Error al subir ${failedCount} archivo(s)`);
    }
  };

  // Get file extension (preservando extensiones compuestas)
  const getFileExtension = (file: File) => {
    const { extension } = extractExtension(file.name);
    return extension;
  };

  // Get status badge
  const getStatusBadge = (file: FileToUpload) => {
    switch (file.status) {
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case 'validating':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-200 text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Validando
          </span>
        );
      case 'valid':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded bg-green-200 text-green-700 dark:text-green-300 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Válido
          </span>
        );
      case 'invalid':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded bg-red-200 text-red-700 dark:text-red-300 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Inválido
          </span>
        );
      case 'uploading':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-500 text-white flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Subiendo
          </span>
        );
      case 'uploaded':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded bg-green-500 text-white flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Subido
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded bg-red-500 text-white flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Falló
          </span>
        );
      default:
        return null;
    }
  };

  const validFilesCount = files.filter(f => f.status === 'valid').length;
  const uploadedFilesCount = files.filter(f => f.status === 'uploaded').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Subir Archivos
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {files.length} archivo(s) en cola | {validFilesCount} válido(s) | {uploadedFilesCount} subido(s)
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 transition-colors"
            disabled={isUploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* File Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
            <p className="text-lg text-gray-700 dark:text-gray-200 mb-2">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-3 font-semibold">
              ⚠️ Solo archivos individuales - NO directorios
            </p>
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files);
                }
              }}
              className="hidden"
              id="file-input"
              multiple
            />
            <label
              htmlFor="file-input"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
            >
              Seleccionar Archivos
            </label>
          </div>

          {/* Dictionary Enforcement Checkbox - Only for exempt users */}
          {canBypassDictionary && (
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDictionaryRules}
                  onChange={(e) => setUseDictionaryRules(e.target.checked)}
                  className="mt-1 w-4 h-4 text-purple-600 dark:text-purple-400 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                  disabled={isUploading}
                />
                <div className="flex-1">
                  <span className="font-semibold text-purple-900 dark:text-purple-100">
                    Usar reglas del diccionario con IA
                  </span>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Cuando está activado, la IA solo sugerirá nombres usando términos del diccionario oficial.
                    Cuando está desactivado, la IA puede usar cualquier palabra apropiada.
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 italic">
                    Como usuario {user?.role === 'superadmin' ? 'superadmin' : 'admin'}, puedes elegir si aplicar las reglas del diccionario.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Batch AI Rename Button - Solo si hay más de 1 archivo */}
          {files.length > 1 && (
            <button
              onClick={handleBatchAISuggestion}
              disabled={isAIBatchProcessing || isUploading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isAIBatchProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Renombrando {files.length} archivos con IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Renombrar TODOS con IA ({files.length} archivos)
                </>
              )}
            </button>
          )}

          {/* Compressible Files Alert - Archivos peligrosos que se pueden comprimir */}
          {compressibleFiles.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-600 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ Archivos restringidos ({compressibleFiles.length})
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    Estos archivos tienen extensiones potencialmente peligrosas y deben comprimirse en ZIP antes de subirse.
                  </p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1.5 mb-3">
                    {compressibleFiles.slice(0, 5).map((cf, idx) => (
                      <li key={idx} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <File className="w-3 h-3 flex-shrink-0" />
                          <span className="font-medium">{cf.file.name}</span>
                          <span className="text-amber-600 dark:text-amber-400 text-xs">({(cf.file.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                        <span className="text-xs text-amber-600 dark:text-amber-400 ml-5 italic">{cf.reason}</span>
                      </li>
                    ))}
                    {compressibleFiles.length > 5 && (
                      <li className="text-amber-600 dark:text-amber-400 italic">...y {compressibleFiles.length - 5} más</li>
                    )}
                  </ul>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCompressFiles}
                      disabled={isCompressing}
                      className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isCompressing ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Comprimiendo...
                        </>
                      ) : (
                        <>
                          <Archive className="w-3 h-3" />
                          Comprimir en ZIP y agregar
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setCompressibleFiles([])}
                      className="px-3 py-1.5 text-amber-700 dark:text-amber-300 text-sm hover:underline"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Blocked Files Alert */}
          {blockedFiles.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 dark:text-red-200 mb-2">
                    Archivos bloqueados ({blockedFiles.length}) - Muy grandes para comprimir
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    {blockedFiles.slice(0, 5).map((bf, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <XCircle className="w-3 h-3" />
                        <span className="font-medium">{bf.name}</span>
                      </li>
                    ))}
                    {blockedFiles.length > 5 && (
                      <li className="text-red-600 dark:text-red-400 italic">...y {blockedFiles.length - 5} más</li>
                    )}
                  </ul>
                  <button
                    onClick={() => setBlockedFiles([])}
                    className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-200 underline"
                  >
                    Descartar aviso
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Files List */}
          {files.length > 0 && (
            <div className="space-y-3">
              {files.map((fileData) => (
                <div key={fileData.id} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  {/* File Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <File className="w-5 h-5 text-gray-600 dark:text-gray-300 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {fileData.file.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          {(fileData.file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(fileData)}
                      {fileData.status !== 'uploading' && fileData.status !== 'uploaded' && (
                        <button
                          onClick={() => removeFile(fileData.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-300"
                          disabled={isUploading}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Custom Filename Input - SIEMPRE VISIBLE */}
                  {fileData.status !== 'uploaded' && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Nombre del archivo (sin extensión):
                      </label>
                      <input
                        type="text"
                        value={fileData.customFilename}
                        onChange={(e) => handleFilenameChange(fileData.id, e.target.value)}
                        placeholder={extractExtension(fileData.file.name).name}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        disabled={isUploading || fileData.status === 'uploading'}
                        autoFocus
                      />
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          Extensión: <span className="font-semibold">{getFileExtension(fileData.file)}</span>
                        </p>
                        {(() => {
                          // Calcular caracteres disponibles con ruta completa
                          const basePath = '\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy';
                          const extension = getFileExtension(fileData.file);
                          const { name: nameWithoutExt } = extractExtension(fileData.file.name);
                          const filename = fileData.customFilename || nameWithoutExt;

                          let fullPath = basePath;
                          if (currentPath) {
                            fullPath += '\\' + currentPath.replace(/\//g, '\\');
                          }
                          fullPath += '\\' + filename + extension;

                          const currentLength = fullPath.length;
                          const maxLength = 260;
                          const available = maxLength - (basePath.length + (currentPath ? currentPath.length + 1 : 0) + 1 + extension.length);
                          const percentage = (currentLength / maxLength) * 100;

                          return (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <p className={`text-xs font-semibold ${
                                  available < 20 ? 'text-red-700 dark:text-red-300' :
                                  available < 50 ? 'text-yellow-700 dark:text-yellow-300' :
                                  'text-green-700 dark:text-green-300'
                                }`}>
                                  Ruta: {currentLength} / {maxLength} caracteres
                                </p>
                                <p className={`text-xs font-bold ${
                                  available < 20 ? 'text-red-800 dark:text-red-200' :
                                  available < 50 ? 'text-yellow-800 dark:text-yellow-200' :
                                  'text-green-800 dark:text-green-200'
                                }`}>
                                  ({available} disponibles)
                                </p>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    available < 20 ? 'bg-red-600' :
                                    available < 50 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1 font-mono break-all bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {fullPath}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* AI Suggestion Button - OPCIONAL */}
                  {fileData.status !== 'uploaded' && fileData.status !== 'uploading' && (
                    <button
                      onClick={() => handleGetAiSuggestion(fileData.id)}
                      disabled={fileData.isLoadingSuggestion || isUploading}
                      className="w-full py-2 px-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                    >
                      {fileData.isLoadingSuggestion ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Sugerir con IA (Opcional)
                        </>
                      )}
                    </button>
                  )}

                  {/* AI Suggestion Display - Enhanced */}
                  {fileData.aiSuggestion && (
                    <div className={`rounded-lg p-3 border mb-3 ${
                      fileData.aiSuggestion.valid
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 dark:border-green-600'
                        : fileData.aiSuggestion.errors.length > 0
                          ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300 dark:border-red-600'
                          : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
                    }`}>
                      <div className="flex items-start gap-2">
                        {fileData.aiSuggestion.valid ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        ) : fileData.aiSuggestion.errors.length > 0 ? (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="font-semibold text-gray-800 dark:text-gray-100">Sugerencia IA</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              fileData.aiSuggestion.valid
                                ? 'bg-green-200 text-green-800 dark:text-green-200'
                                : fileData.aiSuggestion.errors.length > 0
                                  ? 'bg-red-200 text-red-800 dark:text-red-200'
                                  : 'bg-yellow-200 text-yellow-800 dark:text-yellow-200'
                            }`}>
                              {fileData.aiSuggestion.valid ? 'VÁLIDO' : fileData.aiSuggestion.errors.length > 0 ? 'ERRORES' : 'ADVERTENCIAS'}
                            </span>
                          </div>
                          <p className={`font-mono px-2 py-1.5 rounded border text-sm ${
                            fileData.aiSuggestion.valid
                              ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-700'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}>
                            {fileData.aiSuggestion.suggested_name}
                          </p>

                          {/* Transformaciones realizadas */}
                          {fileData.aiSuggestion.warnings.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                              <span className="font-medium">Transformaciones:</span>
                              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                                {fileData.aiSuggestion.warnings.slice(0, 5).map((w, i) => (
                                  <li key={i} className="text-gray-500 dark:text-gray-400 dark:text-gray-500">{w}</li>
                                ))}
                                {fileData.aiSuggestion.warnings.length > 5 && (
                                  <li className="text-gray-400 dark:text-gray-500 italic">...y {fileData.aiSuggestion.warnings.length - 5} más</li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Metadata */}
                          {fileData.aiSuggestion.metadata && (
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                                {fileData.aiSuggestion.metadata.original_length} → {fileData.aiSuggestion.metadata.suggested_length} chars
                              </span>
                              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                                {fileData.aiSuggestion.metadata.available_chars} chars disponibles
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Validation Alerts - Componente profesional */}
                  <ValidationAlert
                    errors={fileData.validationErrors}
                    warnings={fileData.validationWarnings}
                    canBypassDictionary={canBypassDictionary}
                    userRole={user?.role || 'consultation'}
                    showDictionaryInfo={true}
                  />
                </div>
              ))}
            </div>
          )}

          {files.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500">
              <p>No hay archivos seleccionados</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {validFilesCount > 0 && (
              <p className="font-semibold text-green-700 dark:text-green-300">
                ✓ {validFilesCount} archivo(s) listo(s) para subir
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleUploadAll}
              disabled={validFilesCount === 0 || isUploading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Subir {validFilesCount} Archivo(s)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};
