import { useState, useCallback } from 'react';
import { Folder, Lock, MapPin } from 'lucide-react';
import { AccessFilters } from './AccessFilters';
import { parseAccessPath } from '../data/divipola';

interface Access {
  id: number;
  base_path: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  granted_at: string;
  notes?: string;
}

interface MyAccessesProps {
  accesses: Access[];
  onAccessClick: (path: string) => void;
}

export const MyAccesses = ({ accesses, onAccessClick }: MyAccessesProps) => {
  // Estado para accesos filtrados
  const [filteredAccesses, setFilteredAccesses] = useState<Access[]>(accesses);

  // Handler para cuando cambien los filtros
  const handleFilteredAccessesChange = useCallback((filtered: Access[]) => {
    setFilteredAccesses(filtered);
  }, []);
  // Función para extraer el nombre del último directorio de la ruta
  const getDirectoryName = (path: string): string => {
    // Si el path es vacío o solo espacios, es la raíz completa (Sub_Proy)
    if (!path || path.trim() === '') {
      return 'Sub_Proy (Raíz completa)';
    }

    // Remover barras finales y espacios
    const cleanPath = path.trim().replace(/[\\/]+$/, '');

    // Si después de limpiar queda vacío o solo barras
    if (!cleanPath || cleanPath === '\\' || cleanPath === '/') {
      return 'Sub_Proy (Raíz completa)';
    }

    // Dividir por separadores de ruta (\ o /)
    const parts = cleanPath.split(/[\\/]/);

    // Filtrar partes vacías y obtener el último segmento
    const nonEmptyParts = parts.filter(p => p && p.trim().length > 0);

    if (nonEmptyParts.length === 0) {
      return 'Carpeta sin nombre';
    }

    // Retornar el último segmento
    const lastPart = nonEmptyParts[nonEmptyParts.length - 1];
    return lastPart;
  };

  if (accesses.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <Lock className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
            No tienes accesos asignados
          </h3>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 max-w-md">
            Actualmente no tienes permisos asignados para acceder a ninguna carpeta.
            Contacta al administrador del sistema para solicitar acceso.
          </p>
        </div>
      </div>
    );
  }

  // Función para obtener la ubicación geográfica legible
  const getLocationInfo = (path: string): string | null => {
    const parsed = parseAccessPath(path);
    if (!parsed.isFilterable) return null;

    const parts: string[] = [];
    if (parsed.nombreMunicipio) parts.push(parsed.nombreMunicipio);
    if (parsed.nombreDepartamento) parts.push(parsed.nombreDepartamento);

    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Función para obtener info adicional (fuente y etapa)
  const getExtraInfo = (path: string): string | null => {
    const parsed = parseAccessPath(path);
    if (!parsed.isFilterable) return null;

    const parts: string[] = [];
    if (parsed.nombreFuente) parts.push(parsed.nombreFuente);
    if (parsed.nombreEtapa) parts.push(parsed.nombreEtapa);

    return parts.length > 0 ? parts.join(' / ') : null;
  };

  return (
    <>
      {/* Filtros - solo si hay más de 5 accesos */}
      {accesses.length > 5 && (
        <AccessFilters
          accesses={accesses}
          onFilteredAccessesChange={handleFilteredAccessesChange}
        />
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Mis Accesos ({filteredAccesses.length}{filteredAccesses.length !== accesses.length ? ` de ${accesses.length}` : ''})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccesses.map((access) => {
            const locationInfo = getLocationInfo(access.base_path);
            const extraInfo = getExtraInfo(access.base_path);

            return (
              <button
                key={access.id}
                onClick={() => onAccessClick(access.base_path)}
                className="flex flex-col items-start p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2 w-full">
                  <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 flex-shrink-0" />
                  <span className="font-semibold text-gray-900 dark:text-white truncate">
                    {getDirectoryName(access.base_path)}
                  </span>
                </div>

                {/* Información geográfica si está disponible */}
                {locationInfo && (
                  <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 mb-1 w-full">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{locationInfo}</span>
                  </div>
                )}

                {/* Info adicional (fuente/etapa) */}
                {extraInfo && (
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-2 w-full truncate">
                    {extraInfo}
                  </div>
                )}

                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 w-full truncate font-mono">
                  {access.base_path}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {access.can_read && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full">
                      Leer
                    </span>
                  )}
                  {access.can_write && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                      Escribir
                    </span>
                  )}
                  {access.can_delete && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-full">
                      Eliminar
                    </span>
                  )}
                </div>

                {access.notes && (
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic">
                    {access.notes}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
