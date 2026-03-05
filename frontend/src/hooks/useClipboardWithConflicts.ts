import { useState, useCallback, useEffect } from 'react';
import { fileOpsApi } from '../api/fileOps';

const STORAGE_KEY = 'clipboard_multiple';

interface ClipboardFile {
  name: string;
  path: string;
  is_directory: boolean;
}

interface ClipboardData {
  operation: 'copy' | 'cut';
  files: ClipboardFile[];
  timestamp: number;
}

interface CurrentOperation {
  total: number;
  completed: number;
  current: string;
}

export interface ConflictInfo {
  itemName: string;
  sourcePath: string;
  destPath: string;
  isDirectory: boolean;
  currentIndex: number;
  totalItems: number;
}

type ConflictResolution = 'overwrite' | 'rename' | 'cancel';

/**
 * Hook avanzado para clipboard con manejo de conflictos interactivo
 */
export function useClipboardWithConflicts(
  currentPath: string,
  onSuccess: () => void,
  notify?: {
    error?: (message: string) => void;
    warning?: (message: string) => void;
    info?: (message: string) => void;
  }
) {
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<CurrentOperation | null>(null);

  // Estado de conflictos
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [conflictResolution, setConflictResolution] = useState<{
    decision: ConflictResolution | null;
    applyToAll: boolean;
  }>({ decision: null, applyToAll: false });

  // Control de promesa para esperar decisión del usuario
  const [resolveConflict, setResolveConflict] = useState<((resolution: ConflictResolution) => void) | null>(null);

  useEffect(() => {
    const loadClipboard = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          const age = Date.now() - data.timestamp;
          const MAX_AGE = 30 * 60 * 1000; // 30 minutos

          if (age < MAX_AGE) {
            setClipboardData(data);
            console.log('[Clipboard] Restaurado desde localStorage:', data);
          } else {
            localStorage.removeItem(STORAGE_KEY);
            console.log('[Clipboard] Expirado, limpiado');
          }
        }
      } catch (error) {
        console.error('[Clipboard] Error al cargar:', error);
      }
    };

    loadClipboard();
  }, [currentPath]);

  const copyFiles = useCallback((files: any[]) => {
    const data: ClipboardData = {
      operation: 'copy',
      files: files.map(f => ({
        name: f.name,
        path: f.path,
        is_directory: f.is_directory,
      })),
      timestamp: Date.now(),
    };

    setClipboardData(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log(`📋 Copiados ${files.length} archivo(s) al portapapeles`);
  }, []);

  const cutFiles = useCallback((files: any[]) => {
    const data: ClipboardData = {
      operation: 'cut',
      files: files.map(f => ({
        name: f.name,
        path: f.path,
        is_directory: f.is_directory,
      })),
      timestamp: Date.now(),
    };

    setClipboardData(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log(`✂️ Cortados ${files.length} archivo(s) al portapapeles`);
  }, []);

  const cancelClipboard = useCallback(() => {
    setClipboardData(null);
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Portapapeles limpiado');
  }, []);

  // Función para pedir confirmación al usuario (llamada desde el componente)
  const promptConflictResolution = useCallback((info: ConflictInfo): Promise<ConflictResolution> => {
    return new Promise((resolve) => {
      setConflictInfo(info);
      setResolveConflict(() => resolve);
    });
  }, []);

  // Función llamada desde el modal cuando el usuario hace una elección
  const resolveCurrentConflict = useCallback((decision: ConflictResolution, applyToAll: boolean) => {
    if (resolveConflict) {
      resolveConflict(decision);
      setConflictInfo(null);
      setResolveConflict(null);

      // Guardar decisión si es "aplicar a todos"
      if (applyToAll) {
        setConflictResolution({ decision, applyToAll });
      }
    }
  }, [resolveConflict]);

  const pasteFiles = useCallback(async () => {
    if (!clipboardData) {
      const message = 'No hay archivos en el portapapeles';
      if (notify?.warning) notify.warning(message);
      else console.warn(message);
      return;
    }

    setIsPasting(true);
    setCurrentOperation({
      total: clipboardData.files.length,
      completed: 0,
      current: clipboardData.files[0]?.name || '',
    });

    const results = {
      success: [] as string[],
      errors: [] as { file: string; error: string }[],
      canceled: false,
    };

    // Resetear decisión al inicio
    setConflictResolution({ decision: null, applyToAll: false });

    try {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];

        setCurrentOperation({
          total: clipboardData.files.length,
          completed: i,
          current: file.name,
        });

        const destPath = currentPath ? `${currentPath}/${file.name}` : file.name;

        let decision: ConflictResolution | null = null;

        // Si hay decisión aplicada a todos, usarla
        if (conflictResolution.applyToAll && conflictResolution.decision) {
          decision = conflictResolution.decision;
        }

        // Intentar la operación
        let success = false;
        let attempt = 0;
        const MAX_ATTEMPTS = 2;

        while (!success && attempt < MAX_ATTEMPTS) {
          try {
            const data = {
              source_path: file.path,
              dest_path: destPath,
              overwrite: decision === 'overwrite',
              rename_if_exists: decision === 'rename',
            };

            if (clipboardData.operation === 'copy') {
              await fileOpsApi.copyItem(data);
            } else {
              await fileOpsApi.moveItem(data);
            }

            results.success.push(file.name);
            success = true;

          } catch (error: any) {
            if (error.response?.status === 409) {
              // Conflicto detectado
              if (decision === 'cancel') {
                results.canceled = true;
                break;
              }

              // Si no hay decisión previa, preguntar al usuario
              if (!decision) {
                const userDecision = await promptConflictResolution({
                  itemName: file.name,
                  sourcePath: file.path,
                  destPath,
                  isDirectory: file.is_directory,
                  currentIndex: i + 1,
                  totalItems: clipboardData.files.length,
                });

                decision = userDecision;

                if (decision === 'cancel') {
                  results.canceled = true;
                  break;
                }

                // Reintentar con la decisión del usuario
                attempt++;
                continue;
              }
            } else {
              // Error diferente a conflicto
              results.errors.push({
                file: file.name,
                error: error.response?.data?.error || error.message,
              });
              break;
            }
          }

          attempt++;
        }

        // Si se canceló, detener el loop
        if (results.canceled) {
          break;
        }
      }

      // Mostrar resumen
      if (results.success.length > 0) {
        console.log(`✅ Pegado exitoso: ${results.success.length} archivo(s)`);
        cancelClipboard();
        onSuccess();
      }

      if (results.errors.length > 0) {
        const errorMsg = results.errors.map(e => `${e.file}: ${e.error}`).join('\n');
        const message = `Errores al pegar:\n${errorMsg}`;
        if (notify?.error) notify.error(message);
        else console.error(message);
      }

      if (results.canceled) {
        const message = 'Operación cancelada por el usuario';
        if (notify?.info) notify.info(message);
        else console.info(message);
      }

      return results;

    } catch (error: any) {
      console.error('Error crítico en paste:', error);
      const message = `Error al pegar: ${error.message || 'Error desconocido'}`;
      if (notify?.error) notify.error(message);
      else console.error(message);
      return {
        success: [],
        errors: [{ file: 'unknown', error: error.message || 'Error desconocido' }],
        canceled: false,
      };
    } finally {
      setIsPasting(false);
      setCurrentOperation(null);
      setConflictResolution({ decision: null, applyToAll: false });
    }
  }, [
    clipboardData,
    currentPath,
    onSuccess,
    cancelClipboard,
    conflictResolution,
    promptConflictResolution,
  ]);

  const hasClipboard = clipboardData !== null;

  return {
    clipboardData,
    copyFiles,
    cutFiles,
    pasteFiles,
    cancelClipboard,
    isPasting,
    currentOperation,
    hasClipboard,

    // Nuevo: info y resolución de conflictos
    conflictInfo,
    resolveCurrentConflict,
  };
}
