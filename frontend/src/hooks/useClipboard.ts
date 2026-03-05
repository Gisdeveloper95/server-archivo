/**
 * Hook personalizado para manejar operaciones de clipboard
 */
import { useState, useEffect, useCallback } from 'react';
import { clipboardStore, ClipboardItem } from '../store/clipboardStore';
import { fileOpsApi } from '../api/fileOps';

export const useClipboard = (currentPath: string, onSuccess: () => void) => {
  const [clipboardItem, setClipboardItem] = useState<ClipboardItem | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [conflict, setConflict] = useState<{
    show: boolean;
    itemName: string;
    isDirectory: boolean;
    sourcePath: string;
    destPath: string;
  } | null>(null);

  // Cargar item del clipboard al montar y suscribirse a cambios
  useEffect(() => {
    const updateClipboard = () => {
      setClipboardItem(clipboardStore.getItem());
    };

    updateClipboard();

    const unsubscribe = clipboardStore.subscribe(updateClipboard);

    return () => {
      unsubscribe();
    };
  }, []);

  // Copiar item
  const copyItem = useCallback((path: string, name: string, isDirectory: boolean) => {
    clipboardStore.setItem('copy', path, name, isDirectory);
  }, []);

  // Cortar item
  const cutItem = useCallback((path: string, name: string, isDirectory: boolean) => {
    clipboardStore.setItem('cut', path, name, isDirectory);
  }, []);

  // Cancelar operación
  const cancelClipboard = useCallback(() => {
    clipboardStore.clear();
    setConflict(null);
  }, []);

  // Pegar item
  const pasteItem = useCallback(
    async (overwrite: boolean = false, renameIfExists: boolean = false) => {
      if (!clipboardItem) return;

      setIsPasting(true);

      try {
        // Construir ruta destino
        const destPath = currentPath
          ? `${currentPath}/${clipboardItem.name}`
          : clipboardItem.name;

        const data = {
          source_path: clipboardItem.path,
          dest_path: destPath,
          overwrite,
          rename_if_exists: renameIfExists,
        };

        let result;

        if (clipboardItem.operation === 'copy') {
          result = await fileOpsApi.copyItem(data);
        } else {
          result = await fileOpsApi.moveItem(data);
        }

        // Limpiar clipboard si fue cortar (move)
        if (clipboardItem.operation === 'cut') {
          clipboardStore.clear();
        }

        // Cerrar modal de conflicto si estaba abierto
        setConflict(null);

        // Notificar éxito
        onSuccess();

        return result;
      } catch (error: any) {
        // Si hay conflicto de nombres (409)
        if (error.response?.status === 409) {
          setConflict({
            show: true,
            itemName: clipboardItem.name,
            isDirectory: clipboardItem.isDirectory,
            sourcePath: clipboardItem.path,
            destPath: currentPath
              ? `${currentPath}/${clipboardItem.name}`
              : clipboardItem.name,
          });
        } else {
          // Otro error
          throw error;
        }
      } finally {
        setIsPasting(false);
      }
    },
    [clipboardItem, currentPath, onSuccess]
  );

  // Handlers para el modal de conflicto
  const handleOverwrite = useCallback(async () => {
    await pasteItem(true, false);
  }, [pasteItem]);

  const handleRename = useCallback(async () => {
    await pasteItem(false, true);
  }, [pasteItem]);

  const handleCancelConflict = useCallback(() => {
    setConflict(null);
  }, []);

  return {
    clipboardItem,
    copyItem,
    cutItem,
    pasteItem,
    cancelClipboard,
    isPasting,
    conflict,
    handleOverwrite,
    handleRename,
    handleCancelConflict,
  };
};
