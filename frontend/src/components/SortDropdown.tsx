/**
 * Componente de ordenamiento estilo OneDrive
 * Permite ordenar por: tipo, nombre, modificado, modificado por, tamaño
 * Con opción de ascendente/descendente
 */
import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';

export type SortField = 'type' | 'name' | 'modified' | 'modified_by' | 'size';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface SortDropdownProps {
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
}

const sortOptions: { field: SortField; label: string }[] = [
  { field: 'type', label: 'Tipo' },
  { field: 'name', label: 'Nombre' },
  { field: 'modified', label: 'Modificado' },
  { field: 'modified_by', label: 'Modificado por' },
  { field: 'size', label: 'Tamaño del archivo' },
];

export const SortDropdown = ({ sortConfig, onSortChange }: SortDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFieldSelect = (field: SortField) => {
    if (field === sortConfig.field) {
      // Si es el mismo campo, solo cambia dirección
      onSortChange({
        field,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      // Nuevo campo, usar dirección por defecto según el tipo
      const defaultDirection: SortDirection =
        field === 'name' || field === 'type' || field === 'modified_by' ? 'asc' : 'desc';
      onSortChange({ field, direction: defaultDirection });
    }
    setIsOpen(false);
  };

  const handleDirectionSelect = (direction: SortDirection) => {
    onSortChange({ ...sortConfig, direction });
    setIsOpen(false);
  };

  const getCurrentLabel = () => {
    const option = sortOptions.find(o => o.field === sortConfig.field);
    return option?.label || 'Ordenar';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
      >
        <ArrowUpDown className="w-4 h-4" />
        <span>Ordenar</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 z-50 py-1">
          {/* Opciones de campo */}
          <div className="py-1">
            {sortOptions.map((option) => (
              <button
                key={option.field}
                onClick={() => handleFieldSelect(option.field)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
              >
                <span>{option.label}</span>
                {sortConfig.field === option.field && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

          {/* Opciones de dirección */}
          <div className="py-1">
            <button
              onClick={() => handleDirectionSelect('asc')}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
            >
              <span>Ascendente</span>
              {sortConfig.direction === 'asc' && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
            <button
              onClick={() => handleDirectionSelect('desc')}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
            >
              <span>Descendente</span>
              {sortConfig.direction === 'desc' && (
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
