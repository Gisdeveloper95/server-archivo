/**
 * Menú de acciones contextual con dropdown
 * Muestra solo las acciones principales visibles y el resto en un menú desplegable
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Download, Trash2, Edit3, Info, Star, Archive, Shield,
  Copy, Scissors, Eye, MoreVertical, FileText, FolderOpen, Link2, Upload, Palette
} from 'lucide-react';
import { InlineColorPicker } from './DirectoryColorPicker';
import type { FileItem } from '../types';

interface ActionsMenuProps {
  file: FileItem;
  // Handlers principales
  onCopy?: (file: FileItem) => void;
  onCut?: (file: FileItem) => void;
  onRename?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onDownload?: (file: FileItem) => void;

  // Handlers secundarios (van en el menú)
  onShowInfo?: (file: FileItem) => void;
  onDownloadFolder?: (file: FileItem) => void;
  onToggleFavorite?: (file: FileItem) => void;
  onShowPermissions?: (file: FileItem) => void;
  onManageAccess?: (file: FileItem) => void;  // Nuevo: Gestionar accesos
  onShowDetails?: (file: FileItem) => void;
  onGoToFolder?: (file: FileItem) => void;
  onViewFile?: (path: string) => void;
  onShareLink?: (file: FileItem) => void;
  onUploadToFolder?: (file: FileItem) => void;  // Nuevo: Subir archivos a este directorio

  // Color de directorio
  directoryColor?: string | null;
  onSetDirectoryColor?: (file: FileItem, color: string) => void;
  onRemoveDirectoryColor?: (file: FileItem) => void;

  // Permisos
  canCopy?: boolean;
  canCut?: boolean;
  canRename?: boolean;
  canDelete?: boolean;
  canDownload?: boolean;
  canUpload?: boolean;
  isSuperAdmin?: boolean;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
  file,
  onCopy,
  onCut,
  onRename,
  onDelete,
  onDownload,
  onShowInfo,
  onDownloadFolder,
  onToggleFavorite,
  onShowPermissions,
  onManageAccess,
  onShowDetails,
  onGoToFolder,
  onViewFile,
  onShareLink,
  onUploadToFolder,
  directoryColor,
  onSetDirectoryColor,
  onRemoveDirectoryColor,
  canCopy = true,
  canCut = true,
  canRename = true,
  canDelete = true,
  canDownload = true,
  canUpload = true,
  isSuperAdmin = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Usar permisos del item si existen, sino usar los globales
  const itemCanRename = file.can_rename ?? canRename;
  const itemCanDelete = file.can_delete ?? canDelete;
  const itemCanCut = file.can_delete ?? canCut;

  // Calcular posición del menú usando fixed positioning
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const menuHeight = 400; // Altura estimada del menú

      // Calcular posición desde la derecha
      const rightPosition = window.innerWidth - buttonRect.right;

      // Determinar si abrir hacia arriba o abajo
      if (spaceBelow < 350 && spaceAbove > spaceBelow) {
        // Abrir hacia arriba
        setMenuPosition({
          bottom: viewportHeight - buttonRect.top + 8, // 8px de separación
          right: rightPosition
        });
      } else {
        // Abrir hacia abajo
        setMenuPosition({
          top: buttonRect.bottom + 8, // 8px de separación
          right: rightPosition
        });
      }
    }
  }, [isOpen]);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  // Determinar si el archivo es visualizable en el navegador
  // Normalizar extensión quitando el punto si existe
  const normalizedExtension = (file.extension || '').toLowerCase().replace(/^\./, '');
  const viewableExtensions = [
    'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    'txt', 'html', 'css', 'js', 'json', 'xml',
    'mp4', 'webm', 'mp3', 'wav', 'ogg'
  ];
  const isViewable = !file.is_directory && viewableExtensions.includes(normalizedExtension);

  return (
    <div className="flex items-center justify-end space-x-1">
      {/* BOTONES PRINCIPALES PARA DIRECTORIOS */}
      {file.is_directory && (
        <>
          {/* Descargar como ZIP */}
          {onDownloadFolder && (
            <button
              onClick={() => onDownloadFolder(file)}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors p-2 rounded hover:bg-purple-50 dark:hover:bg-purple-900/30"
              title="Descargar como ZIP"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}

          {/* Ver información */}
          {onShowInfo && (
            <button
              onClick={() => onShowInfo(file)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
              title="Ver información"
            >
              <Info className="w-4 h-4" />
            </button>
          )}

          {/* Agregar a favoritos */}
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(file)}
              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300 transition-colors p-2 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
              title="Agregar a favoritos"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* BOTONES PRINCIPALES PARA ARCHIVOS */}
      {!file.is_directory && (
        <>
          {/* Ver archivo (si es compatible) */}
          {isViewable && onViewFile && canDownload && (
            <button
              onClick={() => onViewFile(file.path)}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors p-2 rounded hover:bg-purple-50 dark:hover:bg-purple-900/30"
              title="Ver archivo"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {/* Descargar */}
          {onDownload && canDownload && (
            <button
              onClick={() => onDownload(file)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors p-2 rounded hover:bg-green-50 dark:hover:bg-green-900/30"
              title="Descargar"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Ver detalles */}
          {onShowDetails && (
            <button
              onClick={() => onShowDetails(file)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
              title="Ver detalles"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* MENÚ DESPLEGABLE - Acciones secundarias */}
      <div className="relative" ref={menuRef}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Más acciones"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown Menu - FIXED positioning para que NUNCA se tape */}
        {isOpen && (
          <div
            className="fixed w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-[9999] max-h-[85vh] overflow-y-auto"
            style={{
              top: menuPosition.top ? `${menuPosition.top}px` : undefined,
              bottom: menuPosition.bottom ? `${menuPosition.bottom}px` : undefined,
              right: `${menuPosition.right}px`,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Acciones secundarias para ARCHIVOS */}
            {!file.is_directory && (
              <>
                {/* Copiar */}
                {canCopy && onCopy && (
                  <button
                    onClick={() => handleAction(() => onCopy(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-3"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                )}

                {/* Cortar */}
                {itemCanCut && onCut && (
                  <button
                    onClick={() => handleAction(() => onCut(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-3"
                  >
                    <Scissors className="w-4 h-4" />
                    Cortar
                  </button>
                )}

                {/* Renombrar */}
                {itemCanRename && onRename && (
                  <button
                    onClick={() => handleAction(() => onRename(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 hover:text-yellow-700 dark:hover:text-yellow-300 flex items-center gap-3"
                  >
                    <Edit3 className="w-4 h-4" />
                    Renombrar
                  </button>
                )}

                {/* Eliminar */}
                {itemCanDelete && onDelete && (
                  <button
                    onClick={() => handleAction(() => onDelete(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-3"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                )}

                {onGoToFolder && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    <button
                      onClick={() => handleAction(() => onGoToFolder(file))}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-3"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Ir a carpeta contenedora
                    </button>
                  </>
                )}

                {/* Agregar a favoritos */}
                {onToggleFavorite && (
                  <button
                    onClick={() => handleAction(() => onToggleFavorite(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 hover:text-yellow-700 dark:hover:text-yellow-300 flex items-center gap-3"
                  >
                    <Star className="w-4 h-4" />
                    Agregar a favoritos
                  </button>
                )}
              </>
            )}

            {/* Acciones secundarias para DIRECTORIOS */}
            {file.is_directory && (
              <>
                {/* Subir archivos a este directorio */}
                {canUpload && onUploadToFolder && (
                  <button
                    onClick={() => handleAction(() => onUploadToFolder(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-3 font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    Subir archivos aquí
                  </button>
                )}

                {onUploadToFolder && canUpload && (
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                )}

                {/* Copiar */}
                {canCopy && onCopy && (
                  <button
                    onClick={() => handleAction(() => onCopy(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-3"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                )}

                {/* Cortar */}
                {itemCanCut && onCut && (
                  <button
                    onClick={() => handleAction(() => onCut(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-3"
                  >
                    <Scissors className="w-4 h-4" />
                    Cortar
                  </button>
                )}

                {/* Renombrar */}
                {itemCanRename && onRename && (
                  <button
                    onClick={() => handleAction(() => onRename(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 hover:text-yellow-700 dark:hover:text-yellow-300 flex items-center gap-3"
                  >
                    <Edit3 className="w-4 h-4" />
                    Renombrar
                  </button>
                )}

                {/* Eliminar */}
                {itemCanDelete && onDelete && (
                  <button
                    onClick={() => handleAction(() => onDelete(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-3"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                )}

                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                {/* Ver permisos */}
                {onShowPermissions && (
                  <button
                    onClick={() => handleAction(() => onShowPermissions(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-3"
                  >
                    <Shield className="w-4 h-4" />
                    Ver permisos
                  </button>
                )}

                {/* Gestionar Accesos - Solo superadmin */}
                {onManageAccess && isSuperAdmin && (
                  <button
                    onClick={() => handleAction(() => onManageAccess(file))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-3"
                  >
                    <Shield className="w-4 h-4" />
                    Gestionar Accesos
                  </button>
                )}
              </>
            )}

            {/* Compartir link - Solo superadmin (ambos tipos) */}
            {isSuperAdmin && onShareLink && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  onClick={() => handleAction(() => onShareLink(file))}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-3"
                >
                  <Link2 className="w-4 h-4" />
                  Compartir con link
                </button>
              </>
            )}

            {/* Cambiar color de carpeta - AL FINAL */}
            {file.is_directory && onSetDirectoryColor && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <InlineColorPicker
                  currentColor={directoryColor}
                  onColorSelect={(color) => {
                    onSetDirectoryColor(file, color);
                    setIsOpen(false);
                  }}
                  onColorRemove={onRemoveDirectoryColor ? () => {
                    onRemoveDirectoryColor(file);
                    setIsOpen(false);
                  } : undefined}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionsMenu;
