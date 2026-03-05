/**
 * Hook para gestionar los colores personalizados de directorios.
 *
 * Proporciona:
 * - Cache local de colores para rendimiento
 * - Funciones para obtener, establecer y eliminar colores
 * - Sincronización con el backend
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { directoryColorsApi } from '../api/directoryColors';

// Colores predefinidos para el selector
export const DIRECTORY_COLORS = [
  { name: 'Amarillo', value: '#EAB308' },
  { name: 'Naranja', value: '#F97316' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Morado', value: '#A855F7' },
  { name: 'Violeta', value: '#8B5CF6' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Celeste', value: '#06B6D4' },
  { name: 'Verde Agua', value: '#14B8A6' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Lima', value: '#84CC16' },
  { name: 'Gris', value: '#6B7280' },
];

// Color por defecto de carpetas (amarillo estándar)
export const DEFAULT_FOLDER_COLOR = '#EAB308';

interface UseDirectoryColorsReturn {
  colors: Record<string, string>;
  loading: boolean;
  error: string | null;
  getColor: (path: string) => string | null;
  setColor: (path: string, color: string) => Promise<void>;
  removeColor: (path: string) => Promise<void>;
  refreshColors: () => Promise<void>;
}

export const useDirectoryColors = (): UseDirectoryColorsReturn => {
  const [colors, setColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar colores al montar
  const loadColors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await directoryColorsApi.getAll();
      setColors(data);
    } catch (err) {
      console.error('Error loading directory colors:', err);
      setError('Error al cargar colores de directorios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadColors();
  }, [loadColors]);

  // Obtener color de un directorio
  const getColor = useCallback((path: string): string | null => {
    return colors[path] || null;
  }, [colors]);

  // Establecer color de un directorio
  const setColorForPath = useCallback(async (path: string, color: string) => {
    try {
      // Actualización optimista
      setColors(prev => ({ ...prev, [path]: color }));

      await directoryColorsApi.setColor(path, color);
    } catch (err) {
      console.error('Error setting directory color:', err);
      // Revertir en caso de error
      setColors(prev => {
        const newColors = { ...prev };
        delete newColors[path];
        return newColors;
      });
      throw err;
    }
  }, []);

  // Eliminar color de un directorio
  const removeColorForPath = useCallback(async (path: string) => {
    try {
      // Guardar color anterior por si hay que revertir
      const previousColor = colors[path];

      // Actualización optimista
      setColors(prev => {
        const newColors = { ...prev };
        delete newColors[path];
        return newColors;
      });

      await directoryColorsApi.removeColor(path);
    } catch (err) {
      console.error('Error removing directory color:', err);
      // Recargar colores en caso de error
      await loadColors();
      throw err;
    }
  }, [colors, loadColors]);

  return {
    colors,
    loading,
    error,
    getColor,
    setColor: setColorForPath,
    removeColor: removeColorForPath,
    refreshColors: loadColors,
  };
};

export default useDirectoryColors;
