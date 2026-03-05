/**
 * FileTreeView - Vista de árbol completa con todas las funcionalidades
 * Muestra archivos y carpetas en estructura jerárquica expandible
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderTree, ChevronDown, ChevronRight, Loader2,
  Copy, Scissors, Clipboard, CheckCheck, XCircle, ArrowLeft,
  ChevronsUpDown, ChevronsDownUp, RefreshCw
} from 'lucide-react';
import { TreeNode } from './TreeNode';
import { useTreeData, TreeNode as TreeNodeType } from '../hooks/useTreeData';
import { filesApi } from '../api/files';
import type { FileItem } from '../types';
import type { PathPermissions } from '../hooks/usePathPermissions';

interface FileTreeViewProps {
  files: FileItem[];
  currentPath: string;
  onFolderClick: (path: string) => void;
  onDownload: (file: FileItem) => void;
  onRename?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onShowInfo?: (file: FileItem) => void;
  onDownloadFolder?: (file: FileItem) => void;
  onToggleFavorite?: (file: FileItem) => void;
  onShowPermissions?: (file: FileItem) => void;
  onManageAccess?: (file: FileItem) => void;
  onShowDetails?: (file: FileItem) => void;
  onShareLink?: (file: FileItem) => void;
  onUploadToFolder?: (file: FileItem) => void;
  // Copy/paste
  onCopy: (files: FileItem[]) => void;
  onCut: (files: FileItem[]) => void;
  onPaste: () => void;
  hasClipboard: boolean;
  isPasting: boolean;
  // Permisos
  permissions?: PathPermissions;
  isSuperAdmin?: boolean;
  // Navegación
  onGoBack?: () => void;
  // Colores de directorios
  directoryColors?: Record<string, string>;
  onSetDirectoryColor?: (file: FileItem, color: string) => void;
  onRemoveDirectoryColor?: (file: FileItem) => void;
}

export const FileTreeView: React.FC<FileTreeViewProps> = ({
  files,
  currentPath,
  onFolderClick,
  onDownload,
  onRename,
  onDelete,
  onShowInfo,
  onDownloadFolder,
  onToggleFavorite,
  onShowPermissions,
  onManageAccess,
  onShowDetails,
  onShareLink,
  onUploadToFolder,
  onCopy,
  onCut,
  onPaste,
  hasClipboard,
  isPasting,
  permissions,
  isSuperAdmin = false,
  onGoBack,
  directoryColors = {},
  onSetDirectoryColor,
  onRemoveDirectoryColor,
}) => {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  // Hook para manejar el árbol
  const {
    treeData,
    toggleNode,
    collapseAll,
    updateInitialData,
    getVisibleNodes,
  } = useTreeData({ initialPath: currentPath, initialFiles: files });

  // Actualizar cuando cambian los archivos
  useEffect(() => {
    updateInitialData(files);
    setSelectedNodes(new Set());
  }, [files, updateInitialData]);

  // Permisos
  const canRename = permissions?.can_rename ?? true;
  const canDelete = permissions?.can_delete ?? true;
  const canCopy = permissions?.can_copy ?? true;
  const canCut = permissions?.can_cut ?? true;
  const canDownload = permissions?.can_download ?? true;
  const canPaste = permissions?.can_write ?? true;

  // Handlers de selección
  const handleSelect = (node: TreeNodeType, isSelected: boolean) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(node.path);
      } else {
        newSet.delete(node.path);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const allPaths = new Set(getVisibleNodes().map(n => n.path));
    setSelectedNodes(allPaths);
  };

  const clearSelection = () => {
    setSelectedNodes(new Set());
  };

  // Obtener archivos seleccionados
  const getSelectedFiles = (): FileItem[] => {
    const visibleNodes = getVisibleNodes();
    return visibleNodes.filter(n => selectedNodes.has(n.path)) as FileItem[];
  };

  // Handlers de acciones masivas
  const handleCopySelected = () => {
    const selected = getSelectedFiles();
    if (selected.length > 0) {
      onCopy(selected);
      clearSelection();
    }
  };

  const handleCutSelected = () => {
    const selected = getSelectedFiles();
    if (selected.length > 0) {
      onCut(selected);
      clearSelection();
    }
  };

  // Obtener nodos visibles para renderizar
  const visibleNodes = getVisibleNodes();

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Lado izquierdo: Botón Volver + Info del árbol + Selección */}
          <div className="flex items-center space-x-3">
            {/* Botón Volver */}
            {currentPath && onGoBack && (
              <>
                <button
                  onClick={onGoBack}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-200"
                  title="Volver atrás"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Volver</span>
                </button>
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
              </>
            )}

            {/* Icono y título */}
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <FolderTree className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Vista de Árbol</span>
            </div>

            {/* Separador */}
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />

            {/* Controles del árbol */}
            <div className="flex items-center gap-2">
              <button
                onClick={collapseAll}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Colapsar todo"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
                Colapsar
              </button>
            </div>

            {/* Separador */}
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />

            {/* Contador de selección */}
            {selectedNodes.size > 0 ? (
              <>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {selectedNodes.size} seleccionado{selectedNodes.size > 1 ? 's' : ''}
                </span>
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
                  title="Limpiar Selección"
                >
                  <XCircle className="w-4 h-4" />
                  Limpiar
                </button>
              </>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">Sin selección</span>
            )}
          </div>

          {/* Lado derecho: Acciones */}
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
              title="Seleccionar Todo"
            >
              <CheckCheck className="w-4 h-4" />
              Seleccionar Todo
            </button>

            {(selectedNodes.size > 0 && (canCopy || canCut)) && (
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
            )}

            {canCopy && (
              <button
                onClick={handleCopySelected}
                disabled={selectedNodes.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Copiar Seleccionados"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </button>
            )}

            {canCut && (
              <button
                onClick={handleCutSelected}
                disabled={selectedNodes.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Cortar Seleccionados"
              >
                <Scissors className="w-4 h-4" />
                Cortar
              </button>
            )}

            {canPaste && (
              <button
                onClick={onPaste}
                disabled={!hasClipboard || isPasting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Pegar Aquí"
              >
                <Clipboard className="w-4 h-4" />
                Pegar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Árbol de archivos */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">
        {/* Cabecera */}
        <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-4 py-3 flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <div className="w-6" /> {/* Checkbox space */}
          <div className="w-6" /> {/* Expand icon space */}
          <div className="flex-1 pl-2">Nombre</div>
          <div className="w-28 hidden md:block">Propietario</div>
          <div className="w-32 hidden lg:block">Modificado</div>
          <div className="w-24 hidden lg:block">Tamaño</div>
          <div className="w-10" /> {/* Actions */}
        </div>

        {/* Contenido del árbol */}
        <div className="min-h-[400px] max-h-[600px] overflow-y-auto">
          {visibleNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <FolderTree className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
              <p>No hay archivos en esta carpeta</p>
              {hasClipboard && (
                <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                  Puedes usar el botón "Pegar" para pegar archivos
                </p>
              )}
            </div>
          ) : (
            visibleNodes.map((node) => (
              <TreeNode
                key={node.path}
                node={node}
                onToggle={toggleNode}
                onSelect={handleSelect}
                isSelected={selectedNodes.has(node.path)}
                onFolderClick={onFolderClick}
                onDownload={onDownload}
                onRename={onRename}
                onDelete={onDelete}
                onCopy={(file) => onCopy([file])}
                onCut={(file) => onCut([file])}
                onShowInfo={onShowInfo}
                onShowDetails={onShowDetails}
                onToggleFavorite={onToggleFavorite}
                onShareLink={onShareLink}
                onUploadToFolder={onUploadToFolder}
                onShowPermissions={onShowPermissions}
                onManageAccess={onManageAccess}
                onViewFile={(path) => filesApi.viewFile(path)}
                onDownloadFolder={onDownloadFolder}
                canRename={canRename}
                canDelete={canDelete}
                canCopy={canCopy}
                canCut={canCut}
                canDownload={canDownload}
                canUpload={permissions?.can_write ?? true}
                isSuperAdmin={isSuperAdmin}
                directoryColor={node.is_directory ? directoryColors[node.path] : null}
                onSetDirectoryColor={node.is_directory ? onSetDirectoryColor : undefined}
                onRemoveDirectoryColor={node.is_directory ? onRemoveDirectoryColor : undefined}
              />
            ))
          )}
        </div>

        {/* Pie con estadísticas */}
        <div className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{visibleNodes.length} elementos visibles</span>
          {selectedNodes.size > 0 && (
            <span className="ml-4 text-blue-600 dark:text-blue-400">{selectedNodes.size} seleccionados</span>
          )}
        </div>
      </div>
    </div>
  );
};
