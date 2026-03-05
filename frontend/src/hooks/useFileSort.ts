/**
 * Hook para ordenar archivos con persistencia en localStorage
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { FileItem } from '../types';
import type { SortConfig, SortField, SortDirection } from '../components/SortDropdown';

const STORAGE_KEY = 'file_explorer_sort';

const defaultSortConfig: SortConfig = {
  field: 'name',
  direction: 'asc',
};

// Cargar configuración guardada
const loadSavedConfig = (): SortConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validar que tenga los campos correctos
      if (parsed.field && parsed.direction) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading sort config:', error);
  }
  return defaultSortConfig;
};

export const useFileSort = (files: FileItem[] | undefined) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(loadSavedConfig);

  // Guardar en localStorage cuando cambia
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sortConfig));
    } catch (error) {
      console.error('Error saving sort config:', error);
    }
  }, [sortConfig]);

  const handleSortChange = useCallback((newConfig: SortConfig) => {
    setSortConfig(newConfig);
  }, []);

  // Función de comparación
  const compareFiles = useCallback((a: FileItem, b: FileItem, field: SortField, direction: SortDirection): number => {
    let comparison = 0;

    switch (field) {
      case 'type':
        // Directorios primero (o últimos según dirección), luego por extensión
        if (a.is_directory !== b.is_directory) {
          comparison = a.is_directory ? -1 : 1;
        } else if (!a.is_directory && !b.is_directory) {
          // Ambos son archivos, comparar por extensión
          const extA = (a.extension || '').toLowerCase();
          const extB = (b.extension || '').toLowerCase();
          comparison = extA.localeCompare(extB, 'es', { sensitivity: 'base' });
        }
        break;

      case 'name':
        comparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base', numeric: true });
        break;

      case 'modified':
        const dateA = new Date(a.modified_date || 0).getTime();
        const dateB = new Date(b.modified_date || 0).getTime();
        comparison = dateA - dateB;
        break;

      case 'modified_by':
        const ownerA = (a.owner_name || a.owner_username || '').toLowerCase();
        const ownerB = (b.owner_name || b.owner_username || '').toLowerCase();
        comparison = ownerA.localeCompare(ownerB, 'es', { sensitivity: 'base' });
        break;

      case 'size':
        // Directorios tienen tamaño 0, ponerlos aparte
        if (a.is_directory && !b.is_directory) {
          comparison = -1;
        } else if (!a.is_directory && b.is_directory) {
          comparison = 1;
        } else {
          comparison = (a.size || 0) - (b.size || 0);
        }
        break;

      default:
        comparison = 0;
    }

    return direction === 'asc' ? comparison : -comparison;
  }, []);

  // Archivos ordenados con memoización
  const sortedFiles = useMemo(() => {
    if (!files || files.length === 0) return [];

    // Separar directorios y archivos
    const directories = files.filter(f => f.is_directory);
    const regularFiles = files.filter(f => !f.is_directory);

    // Ordenar cada grupo por separado
    const sortGroup = (items: FileItem[]) => {
      return [...items].sort((a, b) => compareFiles(a, b, sortConfig.field, sortConfig.direction));
    };

    // Directorios ordenados + Archivos ordenados
    // SIEMPRE directorios primero, sin importar el criterio de ordenamiento
    return [...sortGroup(directories), ...sortGroup(regularFiles)];
  }, [files, sortConfig, compareFiles]);

  return {
    sortConfig,
    setSortConfig: handleSortChange,
    sortedFiles,
  };
};
