/**
 * Componente selector de color para directorios.
 * Muestra una paleta de colores predefinidos y permite seleccionar uno.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Palette, X, Check, RotateCcw } from 'lucide-react';
import { DIRECTORY_COLORS, DEFAULT_FOLDER_COLOR } from '../hooks/useDirectoryColors';

interface DirectoryColorPickerProps {
  currentColor?: string | null;
  onColorSelect: (color: string) => void;
  onColorRemove?: () => void;
  isLoading?: boolean;
}

export const DirectoryColorPicker: React.FC<DirectoryColorPickerProps> = ({
  currentColor,
  onColorSelect,
  onColorRemove,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    setIsOpen(false);
  };

  const handleRemoveColor = () => {
    if (onColorRemove) {
      onColorRemove();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Botón para abrir el picker */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
      >
        <div className="relative">
          <Palette className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          {currentColor && (
            <div
              className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800"
              style={{ backgroundColor: currentColor }}
            />
          )}
        </div>
        <span>Cambiar color</span>
        {isLoading && (
          <div className="ml-auto">
            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </button>

      {/* Dropdown con colores */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-[60] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 min-w-[200px]">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Seleccionar color</div>

          {/* Grid de colores */}
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {DIRECTORY_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorSelect(color.value)}
                className={`w-7 h-7 rounded-md transition-all hover:scale-110 flex items-center justify-center ${
                  currentColor === color.value ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gray-800' : ''
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {currentColor === color.value && (
                  <Check className="w-4 h-4 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>

          {/* Botón para quitar color */}
          {currentColor && onColorRemove && (
            <button
              onClick={handleRemoveColor}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Quitar color personalizado
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Botón para el menú que abre un mini modal de selección de color.
 */
interface InlineColorPickerProps {
  currentColor?: string | null;
  onColorSelect: (color: string) => void;
  onColorRemove?: () => void;
}

export const InlineColorPicker: React.FC<InlineColorPickerProps> = ({
  currentColor,
  onColorSelect,
  onColorRemove,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    setIsModalOpen(false);
  };

  const handleRemove = () => {
    if (onColorRemove) {
      onColorRemove();
    }
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Botón en el menú */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300"
      >
        <div className="relative">
          <Palette className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          {currentColor && (
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-800"
              style={{ backgroundColor: currentColor }}
            />
          )}
        </div>
        <span>Cambiar color</span>
      </button>

      {/* Mini Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 dark:bg-black/50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 min-w-[240px] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                <span className="font-medium text-gray-800 dark:text-gray-100">Color de carpeta</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Grid de colores */}
            <div className="grid grid-cols-6 gap-2 mb-3">
              {DIRECTORY_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorSelect(color.value)}
                  className={`w-8 h-8 rounded-lg transition-all hover:scale-110 flex items-center justify-center shadow-sm ${
                    currentColor === color.value ? 'ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-gray-800 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {currentColor === color.value && (
                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>

            {/* Botón para quitar color */}
            {currentColor && onColorRemove && (
              <button
                onClick={handleRemove}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar color original
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DirectoryColorPicker;
