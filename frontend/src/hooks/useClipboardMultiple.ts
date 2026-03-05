/**
 * Hook para manejar clipboard con soporte para múltiples archivos
 */
import { useState, useEffect, useCallback } from 'react';
import { fileOpsApi } from '../api/fileOps';
import type { FileItem } from '../types';

interface ClipboardData {
  operation: 'copy' | 'cut';
  files: Array<{
    path: string;
    name: string;
    isDirectory: boolean;
  }>;
  timestamp: number;
}

const STORAGE_KEY = 'netapp_clipboard_multi';

export const useClipboardMultiple = (
  currentPath: string,
  onSuccess: () => void,
  notify?: {
    error?: (message: string) => void;
    warning?: (message: string) => void;
    info?: (message: string) => void;
  }
) => {
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<{
    total: number;
    completed: number;
    current: string;
  } | null>(null);

  // Cargar del LocalStorage al montar y cuando cambia la ruta
  useEffect(() => {
    const loadClipboard = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        console.log('[useClipboardMultiple] Loading clipboard from LocalStorage:', stored);
        console.log('[useClipboardMultiple] Current path:', currentPath);

        if (stored) {
          const data = JSON.parse(stored) as ClipboardData;

          // Verificar que no sea muy antiguo (1 hora)
          const ONE_HOUR = 60 * 60 * 1000;
          if (Date.now() - data.timestamp < ONE_HOUR) {
            console.log('[useClipboardMultiple] Setting clipboard data:', data);
            setClipboardData(data);
          } else {
            console.log('[useClipboardMultiple] Clipboard expired, clearing');
            localStorage.removeItem(STORAGE_KEY);
            setClipboardData(null);
          }
        } else {
          console.log('[useClipboardMultiple] No clipboard data in LocalStorage');
          setClipboardData(null);
        }
      } catch (error) {
        console.error('Error al cargar clipboard:', error);
        setClipboardData(null);
      }
    };

    loadClipboard();
  }, [currentPath]); // Recargar cuando cambia la ruta actual

  // Copiar archivos
  const copyFiles = useCallback((files: FileItem[]) => {
    const data: ClipboardData = {
      operation: 'copy',
      files: files.map(f => ({
        path: f.path,
        name: f.name,
        isDirectory: f.is_directory,
      })),
      timestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setClipboardData(data);
  }, []);

  // Cortar archivos
  const cutFiles = useCallback((files: FileItem[]) => {
    const data: ClipboardData = {
      operation: 'cut',
      files: files.map(f => ({
        path: f.path,
        name: f.name,
        isDirectory: f.is_directory,
      })),
      timestamp: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setClipboardData(data);
  }, []);

  // Cancelar
  const cancelClipboard = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setClipboardData(null);
  }, []);

  // Pegar archivos (batch)
  const pasteFiles = useCallback(async () => {
    if (!clipboardData) return;

    setIsPasting(true);
    setCurrentOperation({
      total: clipboardData.files.length,
      completed: 0,
      current: clipboardData.files[0].name,
    });

    const results = {
      success: [] as string[],
      errors: [] as { file: string; error: string }[],
      conflicts: [] as string[],
    };

    try {
      // Procesar cada archivo secuencialmente
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];

        setCurrentOperation({
          total: clipboardData.files.length,
          completed: i,
          current: file.name,
        });

        // Construir ruta destino
        const destPath = currentPath
          ? `${currentPath}/${file.name}`
          : file.name;

        const data = {
          source_path: file.path,
          dest_path: destPath,
          overwrite: false,
          rename_if_exists: true, // Renombrar automáticamente si existe
        };

        try {
          if (clipboardData.operation === 'copy') {
            await fileOpsApi.copyItem(data);
          } else {
            await fileOpsApi.moveItem(data);
          }

          results.success.push(file.name);
        } catch (error: any) {
          if (error.response?.status === 409) {
            results.conflicts.push(file.name);
          } else {
            results.errors.push({
              file: file.name,
              error: error.response?.data?.error || error.message,
            });
          }
        }
      }

      // Mostrar resumen y recargar
      if (results.success.length > 0) {
        console.log(`✅ Pegado exitoso: ${results.success.length} archivo(s)`);

        // Limpiar clipboard SIEMPRE después de pegar exitosamente
        cancelClipboard();

        // Recargar archivos
        onSuccess();
      }

      // Mostrar errores si los hay
      if (results.errors.length > 0) {
        const errorMsg = results.errors.map(e => `${e.file}: ${e.error}`).join('\n');
        const message = `Errores al pegar:\n${errorMsg}`;
        if (notify?.error) notify.error(message);
        else console.error(message);
      }

      // Mostrar conflictos si los hay
      if (results.conflicts.length > 0) {
        const message = `Conflictos (ya existen):\n${results.conflicts.join(', ')}`;
        if (notify?.warning) notify.warning(message);
        else console.warn(message);
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
        conflicts: [],
      };
    } finally {
      setIsPasting(false);
      setCurrentOperation(null);
    }
  }, [clipboardData, currentPath, onSuccess, cancelClipboard, notify]);

  const hasClipboard = clipboardData !== null;

  console.log('[useClipboardMultiple] Return values:', {
    hasClipboard,
    clipboardData,
    currentPath,
  });

  return {
    clipboardData,
    copyFiles,
    cutFiles,
    pasteFiles,
    cancelClipboard,
    isPasting,
    currentOperation,
    hasClipboard,
  };
};

// Tipos para exportar
export interface ConflictInfo {
  itemName: string;
  sourcePath: string;
  destPath: string;
  isDirectory: boolean;
  currentIndex: number;
  totalItems: number;
}
