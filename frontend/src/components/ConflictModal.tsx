/**
 * Modal para manejar conflictos de nombres al copiar/mover
 */
import React, { useState } from 'react';
import { X, AlertTriangle, FileText, Folder, CheckSquare } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: 'copy' | 'move';
  itemName: string;
  isDirectory: boolean;
  sourcePath: string;
  destPath: string;
  currentItem?: number;  // Índice del archivo actual
  totalItems?: number;   // Total de archivos
  onOverwrite: (applyToAll: boolean) => void;
  onRename: (applyToAll: boolean) => void;
  onCancel: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  operation,
  itemName,
  isDirectory,
  sourcePath,
  destPath,
  currentItem,
  totalItems,
  onOverwrite,
  onRename,
  onCancel,
}) => {
  const [applyToAll, setApplyToAll] = useState(false);

  if (!isOpen) return null;

  const operationText = operation === 'copy' ? 'copiar' : 'mover';
  const operationTextPast = operation === 'copy' ? 'copiado' : 'movido';
  const showProgress = currentItem !== undefined && totalItems !== undefined && totalItems > 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/30">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Conflicto de Nombres
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3">
            {isDirectory ? (
              <Folder className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
            ) : (
              <FileText className="w-8 h-8 text-gray-500 dark:text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <p className="text-gray-800 dark:text-gray-100 font-medium mb-2">
                Ya existe {isDirectory ? 'una carpeta' : 'un archivo'} con el nombre:
              </p>
              <code className="block bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-sm text-gray-800 dark:text-gray-100 font-mono break-all">
                {itemName}
              </code>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 space-y-2">
            <div>
              <span className="text-sm font-medium text-blue-900">Origen:</span>
              <code className="block text-xs text-blue-700 dark:text-blue-300 font-mono mt-1 break-all">
                {sourcePath}
              </code>
            </div>
            <div>
              <span className="text-sm font-medium text-blue-900">Destino:</span>
              <code className="block text-xs text-blue-700 dark:text-blue-300 font-mono mt-1 break-all">
                {destPath}
              </code>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            ¿Qué deseas hacer?
          </p>

          {/* Progreso si hay múltiples archivos */}
          {showProgress && (
            <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Procesando archivo {currentItem} de {totalItems}
              </p>
            </div>
          )}

          {/* Checkbox "Aplicar a todos" - solo si hay más archivos */}
          {showProgress && (
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="w-5 h-5 text-blue-600 dark:text-blue-400 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Aplicar esta decisión a todos los conflictos restantes
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">
                  No se te preguntará nuevamente para los {totalItems! - currentItem!} archivos restantes
                </p>
              </div>
              <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </label>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors font-medium"
          >
            Cancelar Todo
          </button>
          <button
            onClick={() => onRename(applyToAll)}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Mantener Ambos (_1, _2...)
          </button>
          <button
            onClick={() => onOverwrite(applyToAll)}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Reemplazar
          </button>
        </div>

        {/* Warning */}
        <div className="px-6 pb-4">
          <div className="flex items-start space-x-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Advertencia:</strong> Sobrescribir eliminará permanentemente {isDirectory ? 'la carpeta' : 'el archivo'} existente
              y todo su contenido. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictModal;
