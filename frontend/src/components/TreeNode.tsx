/**
 * Componente TreeNode - Representa un nodo individual en el árbol
 * Con todas las funcionalidades: acciones, selección, expansión
 */
import React, { useState } from 'react';
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, Loader2,
  MoreVertical, Download, Edit3, Trash2, Copy, Scissors,
  Eye, Star, Info, Share2, Shield, Users, Palette
} from 'lucide-react';
import { FileIcon } from './FileIcon';
import { InlineColorPicker } from './DirectoryColorPicker';
import { formatDate } from '../utils/formatDate';
import type { TreeNode as TreeNodeType } from '../hooks/useTreeData';
import type { FileItem } from '../types';

interface TreeNodeProps {
  node: TreeNodeType;
  onToggle: (node: TreeNodeType) => void;
  onSelect: (node: TreeNodeType, isSelected: boolean) => void;
  isSelected: boolean;
  // Acciones
  onFolderClick?: (path: string) => void;
  onDownload?: (file: FileItem) => void;
  onRename?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onCopy?: (file: FileItem) => void;
  onCut?: (file: FileItem) => void;
  onShowInfo?: (file: FileItem) => void;
  onShowDetails?: (file: FileItem) => void;
  onToggleFavorite?: (file: FileItem) => void;
  onShareLink?: (file: FileItem) => void;
  onShowPermissions?: (file: FileItem) => void;
  onManageAccess?: (file: FileItem) => void;
  onViewFile?: (path: string) => void;
  onDownloadFolder?: (file: FileItem) => void;
  onUploadToFolder?: (file: FileItem) => void;
  // Color de directorio
  directoryColor?: string | null;
  onSetDirectoryColor?: (file: FileItem, color: string) => void;
  onRemoveDirectoryColor?: (file: FileItem) => void;
  // Permisos
  canRename?: boolean;
  canDelete?: boolean;
  canCopy?: boolean;
  canCut?: boolean;
  canDownload?: boolean;
  canUpload?: boolean;
  isSuperAdmin?: boolean;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  onToggle,
  onSelect,
  isSelected,
  onFolderClick,
  onDownload,
  onRename,
  onDelete,
  onCopy,
  onCut,
  onShowInfo,
  onShowDetails,
  onToggleFavorite,
  onShareLink,
  onShowPermissions,
  onManageAccess,
  onViewFile,
  onDownloadFolder,
  onUploadToFolder,
  directoryColor,
  onSetDirectoryColor,
  onRemoveDirectoryColor,
  canRename = true,
  canDelete = true,
  canCopy = true,
  canCut = true,
  canDownload = true,
  canUpload = true,
  isSuperAdmin = false,
}) => {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = React.useRef<HTMLDivElement>(null);

  // Calcular indentación basada en la profundidad (4px por nivel, ultra compacto)
  const indentPx = node.depth * 4;

  // Determinar si es visualizable en el navegador
  const normalizedExtension = (node.extension || '').toLowerCase().replace(/^\./, '');
  const viewableExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'txt', 'html', 'css', 'js', 'json', 'xml', 'mp4', 'webm', 'mp3', 'wav', 'ogg'];
  const isViewable = !node.is_directory && viewableExtensions.includes(normalizedExtension);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.is_directory) {
      onToggle(node);
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelect(node, e.target.checked);
  };

  const handleDoubleClick = () => {
    if (node.is_directory && onFolderClick) {
      onFolderClick(node.path);
    }
  };

  const handleActionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  const closeActions = () => setShowActions(false);

  const handleAction = (action: () => void) => {
    action();
    closeActions();
  };

  return (
    <>
      <div
        className={`flex items-center py-2 px-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
        }`}
        style={{ paddingLeft: `${indentPx + 8}px` }}
        onDoubleClick={handleDoubleClick}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelect}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mr-2 flex-shrink-0 dark:bg-gray-600 dark:border-gray-500"
        />

        {/* Expand/Collapse para directorios */}
        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
          {node.is_directory ? (
            node.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500" />
            ) : (
              <button
                onClick={handleToggle}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              >
                {node.isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
            )
          ) : (
            <span className="w-4" /> // Espaciador para archivos
          )}
        </div>

        {/* Icono */}
        <div className="flex-shrink-0 mr-2">
          {node.is_directory ? (
            node.isExpanded ? (
              <FolderOpen className="w-5 h-5" style={{ color: directoryColor || '#EAB308' }} />
            ) : (
              <Folder className="w-5 h-5" style={{ color: directoryColor || '#EAB308' }} />
            )
          ) : (
            <FileIcon extension={node.extension} isDirectory={false} />
          )}
        </div>

        {/* Nombre */}
        <div className="flex-1 min-w-0 mr-4">
          <span
            className={`text-sm truncate block ${
              node.is_directory
                ? 'text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300'
                : 'text-gray-900 dark:text-gray-100'
            }`}
            title={node.name}
          >
            {node.name}
          </span>
        </div>

        {/* Propietario */}
        <div className="w-28 flex-shrink-0 mr-4 hidden md:block">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate block" title={node.owner_name || node.owner_username || ''}>
            {node.owner_username || <span className="italic text-gray-400 dark:text-gray-500">-</span>}
          </span>
        </div>

        {/* Fecha */}
        <div className="w-32 flex-shrink-0 mr-4 hidden lg:block">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {node.modified_date ? formatDate(node.modified_date) : '-'}
          </span>
        </div>

        {/* Tamaño */}
        <div className="w-24 flex-shrink-0 mr-4 hidden lg:block">
          <span className={`text-xs ${node.is_directory ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-600 dark:text-gray-300'}`}>
            {node.size_formatted || '-'}
          </span>
        </div>

        {/* Botón de acciones */}
        <div className="flex-shrink-0 relative" ref={actionsRef}>
          <button
            onClick={handleActionsClick}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
            title="Más acciones"
          >
            <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Menú de acciones (dropdown) */}
          {showActions && (
            <>
              {/* Overlay para cerrar */}
              <div
                className="fixed inset-0 z-40"
                onClick={closeActions}
              />

              {/* Menú */}
              <div
                className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
              >
            {/* Ver archivo (si es visualizable) */}
            {isViewable && onViewFile && (
              <button
                onClick={() => handleAction(() => onViewFile(node.path))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Eye className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                Ver archivo
              </button>
            )}

            {/* Descargar */}
            {!node.is_directory && canDownload && onDownload && (
              <button
                onClick={() => handleAction(() => onDownload(node as FileItem))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Download className="w-4 h-4 text-green-500 dark:text-green-400" />
                Descargar
              </button>
            )}

            {/* Descargar carpeta como ZIP */}
            {node.is_directory && canDownload && onDownloadFolder && (
              <button
                onClick={() => handleAction(() => onDownloadFolder(node as FileItem))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Download className="w-4 h-4 text-green-500 dark:text-green-400" />
                Descargar ZIP
              </button>
            )}

            {/* Subir archivos a esta carpeta */}
            {node.is_directory && canUpload && onUploadToFolder && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => handleAction(() => onUploadToFolder(node as FileItem))}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Subir archivos aquí
                </button>
              </>
            )}

            {/* Abrir en nueva ubicación (carpetas) */}
            {node.is_directory && onFolderClick && (
              <button
                onClick={() => handleAction(() => onFolderClick(node.path))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FolderOpen className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                Abrir ubicación
              </button>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

            {/* Copiar */}
            {canCopy && onCopy && (
              <button
                onClick={() => handleAction(() => onCopy(node as FileItem))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Copy className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                Copiar
              </button>
            )}

            {/* Cortar */}
            {canCut && onCut && (
              <button
                onClick={() => handleAction(() => onCut(node as FileItem))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Scissors className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                Cortar
              </button>
            )}

            {/* Renombrar */}
            {canRename && onRename && (
              <button
                onClick={() => handleAction(() => onRename(node as FileItem))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit3 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                Renombrar
              </button>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

            {/* Detalles */}
            {onShowDetails && (
              <button
                onClick={() => handleAction(() => onShowDetails(node as FileItem))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                Ver detalles
              </button>
            )}

            {/* Info (carpetas) */}
            {node.is_directory && onShowInfo && (
              <button
                onClick={() => handleAction(() => onShowInfo(node as FileItem))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Info className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                Información
              </button>
            )}

            {/* Favoritos */}
            {onToggleFavorite && (
              <button
                onClick={() => handleAction(() => onToggleFavorite(node as FileItem))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                Favorito
              </button>
            )}

            {/* Compartir */}
            {onShareLink && (
              <button
                onClick={() => handleAction(() => onShareLink(node as FileItem))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Share2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Compartir link
              </button>
            )}

            {/* Permisos (solo carpetas y superadmin) */}
            {node.is_directory && isSuperAdmin && onShowPermissions && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => handleAction(() => onShowPermissions(node as FileItem))}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Shield className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  Permisos
                </button>
              </>
            )}

            {/* Gestionar acceso */}
            {node.is_directory && isSuperAdmin && onManageAccess && (
              <button
                onClick={() => handleAction(() => onManageAccess(node as FileItem))}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Users className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                Gestionar acceso
              </button>
            )}

            {/* Eliminar */}
            {canDelete && onDelete && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => handleAction(() => onDelete(node as FileItem))}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </>
            )}

            {/* Cambiar color de carpeta - AL FINAL */}
            {node.is_directory && onSetDirectoryColor && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <InlineColorPicker
                  currentColor={directoryColor}
                  onColorSelect={(color) => {
                    onSetDirectoryColor(node as FileItem, color);
                    closeActions();
                  }}
                  onColorRemove={onRemoveDirectoryColor ? () => {
                    onRemoveDirectoryColor(node as FileItem);
                    closeActions();
                  } : undefined}
                />
              </>
            )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
