/**
 * FileList con selección múltiple y botones de copiar/cortar/pegar
 */
import React, { useState } from 'react';
import {
  Download, Folder, FolderOpen, Trash2, Edit3, Info, Star, Archive, Shield,
  Copy, Scissors, Clipboard, CheckSquare, Square, CheckCheck, XCircle, Upload, Eye, ArrowLeft
} from 'lucide-react';
import { FileIcon } from './FileIcon';
import { formatDate } from '../utils/formatDate';
import { filesApi } from '../api/files';
import { ActionsMenu } from './ActionsMenu';
import type { FileItem } from '../types';
import type { PathPermissions } from '../hooks/usePathPermissions';

interface FileListWithSelectionProps {
  files: FileItem[];
  onFolderClick: (path: string) => void;
  onDownload: (file: FileItem) => void;
  onRename?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onDeleteMultiple?: (files: FileItem[]) => void; // Eliminación masiva
  onDownloadMultiple?: (files: FileItem[]) => void; // Descarga masiva
  onShowInfo?: (file: FileItem) => void;
  onDownloadFolder?: (file: FileItem) => void;
  onToggleFavorite?: (file: FileItem) => void;
  onShowPermissions?: (file: FileItem) => void;
  onManageAccess?: (file: FileItem) => void;
  onShowDetails?: (file: FileItem) => void;
  onGoToFolder?: (file: FileItem) => void;
  onShareLink?: (file: FileItem) => void;
  onUploadToFolder?: (file: FileItem) => void;

  // Nuevas props para copy/paste
  onCopy: (files: FileItem[]) => void;
  onCut: (files: FileItem[]) => void;
  onPaste: () => void;
  hasClipboard: boolean;
  isPasting: boolean;
  isDeleting?: boolean; // Estado de eliminación en progreso

  // Permisos granulares de la ruta actual
  permissions?: PathPermissions;

  // Drag & drop sobre carpetas específicas
  onDropOnFolder?: (e: React.DragEvent, targetFolder: FileItem) => void;
  isDraggingGlobal?: boolean;

  // User role
  isSuperAdmin?: boolean;

  // Navegación
  currentPath?: string;
  onGoBack?: () => void;

  // Legacy props (deprecadas, usar permissions en su lugar)
  canEdit?: boolean;
  canDelete?: boolean;

  // Colores de directorios personalizados
  directoryColors?: Record<string, string>;
  onSetDirectoryColor?: (file: FileItem, color: string) => void;
  onRemoveDirectoryColor?: (file: FileItem) => void;
}

export const FileListWithSelection: React.FC<FileListWithSelectionProps> = ({
  files,
  onFolderClick,
  onDownload,
  onRename,
  onDelete,
  onDeleteMultiple,
  onShowInfo,
  onDownloadFolder,
  onToggleFavorite,
  onShowPermissions,
  onManageAccess,
  onShowDetails,
  onGoToFolder,
  onShareLink,
  onUploadToFolder,
  onCopy,
  onCut,
  onPaste,
  onDownloadMultiple,
  hasClipboard,
  isPasting,
  isDeleting = false,
  permissions,
  onDropOnFolder,
  isDraggingGlobal = false,
  isSuperAdmin = false,
  currentPath = '',
  onGoBack,
  canEdit = false,
  canDelete = false,
  directoryColors = {},
  onSetDirectoryColor,
  onRemoveDirectoryColor,
}) => {
  // Usar permissions si está disponible, sino usar canEdit/canDelete legacy
  const canRename = permissions?.can_rename ?? canEdit;
  const canDeleteFiles = permissions?.can_delete ?? canDelete;
  const canCopyFiles = permissions?.can_copy ?? true; // Por defecto true para compatibilidad
  const canCutFiles = permissions?.can_cut ?? canDelete;
  const canDownloadFiles = permissions?.can_download ?? true; // Por defecto true
  const canPasteFiles = permissions?.can_write ?? canEdit;
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [dragOverFolderIndex, setDragOverFolderIndex] = useState<number | null>(null);

  // Seleccionar/deseleccionar un archivo
  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedFiles(newSelected);
  };

  // Seleccionar todos
  const selectAll = () => {
    const allIndexes = new Set(files.map((_, index) => index));
    setSelectedFiles(allIndexes);
  };

  // Limpiar selección
  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  // Obtener archivos seleccionados
  const getSelectedFiles = (): FileItem[] => {
    return Array.from(selectedFiles).map(index => files[index]);
  };

  // Handlers para acciones masivas
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

  const handleDeleteSelected = () => {
    const selected = getSelectedFiles();
    if (selected.length > 0 && onDeleteMultiple) {
      onDeleteMultiple(selected);
      clearSelection();
    }
  };

  const handleDownloadSelected = () => {
    const selected = getSelectedFiles();
    if (selected.length > 0 && onDownloadMultiple) {
      onDownloadMultiple(selected);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Acciones Masivas - SIEMPRE visible para poder pegar */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 flex items-center justify-between transition-colors">
        {/* Lado izquierdo: Botón Volver + Contador de selección */}
        <div className="flex items-center space-x-3">
          {/* Botón Volver atrás - solo si hay path y callback */}
          {currentPath && onGoBack && (
            <>
              <button
                onClick={onGoBack}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors shrink-0 text-gray-700 dark:text-gray-200"
                title="Volver atrás"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Volver</span>
              </button>
              {/* Separador visual */}
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
            </>
          )}

          {selectedFiles.size > 0 ? (
            <>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {selectedFiles.size} {selectedFiles.size === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
              </span>
              <button
                onClick={clearSelection}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-red-600 dark:text-red-400"
                title="Limpiar Selección"
              >
                <XCircle className="w-4 h-4" />
                <span>Limpiar</span>
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">Ningún elemento seleccionado</span>
          )}
        </div>

        {/* Lado derecho: Botón Seleccionar Todo + Botones de Acción */}
        <div className="flex items-center space-x-2">
          {/* Botón Seleccionar Todo */}
          <button
            onClick={selectAll}
            className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
            title="Seleccionar Todo"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Seleccionar Todo</span>
          </button>

          {/* Separador visual - solo si hay archivos seleccionados y permisos */}
          {(selectedFiles.size > 0 && (canCopyFiles || canCutFiles)) && (
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
          )}

          {/* Botones de acción masiva */}
          {canCopyFiles && (
            <button
              onClick={handleCopySelected}
              disabled={selectedFiles.size === 0}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Copiar elementos seleccionados"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar</span>
            </button>
          )}

          {canCutFiles && (
            <button
              onClick={handleCutSelected}
              disabled={selectedFiles.size === 0}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Cortar elementos seleccionados"
            >
              <Scissors className="w-4 h-4" />
              <span>Cortar</span>
            </button>
          )}

          {canDeleteFiles && onDeleteMultiple && (
            <button
              onClick={handleDeleteSelected}
              disabled={selectedFiles.size === 0 || isDeleting}
              className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Eliminar elementos seleccionados"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Eliminando...' : 'Eliminar'}</span>
            </button>
          )}

          {canDownloadFiles && onDownloadMultiple && (
            <button
              onClick={handleDownloadSelected}
              disabled={selectedFiles.size === 0}
              className="flex items-center space-x-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Descargar elementos seleccionados como ZIP"
            >
              <Download className="w-4 h-4" />
              <span>Descargar</span>
            </button>
          )}

          {canPasteFiles && (
            <button
              onClick={onPaste}
              disabled={!hasClipboard || isPasting}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Pegar elementos del portapapeles"
            >
              <Clipboard className="w-4 h-4" />
              <span>Pegar Aquí</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Archivos */}
      <div className="overflow-x-auto" style={{ minHeight: '500px' }}>
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {/* Columna de Checkbox */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === files.length && files.length > 0}
                  onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Propietario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Modificado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tamaño
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {files.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                    <p>No hay archivos en esta carpeta</p>
                    {hasClipboard && (
                      <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                        Puedes usar el botón "Pegar Aquí" arriba para pegar archivos
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              files.map((file, index) => (
              <tr
                key={index}
                style={{ minHeight: '120px' }}
                className={`transition-all duration-200 ${
                  selectedFiles.has(index) ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                } ${
                  file.is_directory && dragOverFolderIndex === index && isDraggingGlobal
                    ? 'bg-gradient-to-r from-green-200 to-green-100 dark:from-green-900 dark:to-green-800 ring-4 ring-green-500 shadow-xl scale-105 border-l-8 border-green-600'
                    : ''
                }`}
                onDragOver={(e) => {
                  if (file.is_directory && isDraggingGlobal && onDropOnFolder && permissions?.can_write) {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverFolderIndex(index);
                  }
                }}
                onDragEnter={(e) => {
                  if (file.is_directory && isDraggingGlobal && onDropOnFolder && permissions?.can_write) {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverFolderIndex(index);
                  }
                }}
                onDragLeave={(e) => {
                  if (file.is_directory && isDraggingGlobal) {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverFolderIndex(null);
                  }
                }}
                onDrop={(e) => {
                  if (file.is_directory && isDraggingGlobal && onDropOnFolder && permissions?.can_write) {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverFolderIndex(null);
                    onDropOnFolder(e, file);
                  }
                }}
              >
                {/* Checkbox */}
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(index)}
                    onChange={() => toggleSelect(index)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>

                {/* Nombre */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    {file.is_directory ? (
                      <Folder
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: directoryColors[file.path] || '#EAB308' }}
                      />
                    ) : (
                      <FileIcon
                        extension={file.extension}
                        isDirectory={file.is_directory}
                      />
                    )}
                    {file.is_directory ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onFolderClick(file.path)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-left"
                        >
                          {file.name}
                        </button>
                        {dragOverFolderIndex === index && isDraggingGlobal && (
                          <div className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce">
                            <Upload className="w-4 h-4" />
                            SOLTAR AQUÍ
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-900 dark:text-gray-100">{file.name}</span>
                    )}
                  </div>
                </td>

                {/* Propietario */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {file.owner_username ? (
                    <span className="text-gray-700 dark:text-gray-300 font-medium" title={file.owner_name || file.owner_username}>
                      {file.owner_username}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 italic">Sin registro</span>
                  )}
                </td>

                {/* Fecha Modificación */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {file.modified_date ? (
                    formatDate(file.modified_date)
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                  )}
                </td>

                {/* Tamaño / Elementos */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <span className={file.is_directory ? "text-gray-500 dark:text-gray-400 italic" : "text-gray-700 dark:text-gray-300"}>
                    {file.size_formatted || '-'}
                  </span>
                </td>

                {/* Acciones - Menú compacto con dropdown */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <ActionsMenu
                    file={file}
                    onCopy={(f) => onCopy([f])}
                    onCut={(f) => onCut([f])}
                    onRename={onRename}
                    onDelete={onDelete}
                    onDownload={onDownload}
                    onShowInfo={onShowInfo}
                    onDownloadFolder={onDownloadFolder}
                    onToggleFavorite={onToggleFavorite}
                    onShowPermissions={onShowPermissions}
                    onManageAccess={onManageAccess}
                    onShowDetails={onShowDetails}
                    onGoToFolder={onGoToFolder}
                    onViewFile={(path) => void filesApi.viewFile(path)}
                    onShareLink={onShareLink}
                    onUploadToFolder={onUploadToFolder}
                    canCopy={canCopyFiles}
                    canCut={canCutFiles}
                    isSuperAdmin={isSuperAdmin}
                    canRename={canRename}
                    canDelete={canDeleteFiles}
                    canDownload={canDownloadFiles}
                    canUpload={permissions?.can_write ?? true}
                    directoryColor={file.is_directory ? directoryColors[file.path] : null}
                    onSetDirectoryColor={file.is_directory ? onSetDirectoryColor : undefined}
                    onRemoveDirectoryColor={file.is_directory ? onRemoveDirectoryColor : undefined}
                  />
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileListWithSelection;
