import { Download, Folder, Trash2, Edit3, Info, Star, Archive, Shield, FileText, FolderOpen } from 'lucide-react';
import { FileIcon } from './FileIcon';
import { formatDate } from '../utils/formatDate';
import type { FileItem } from '../types';

interface FileListProps {
  files: FileItem[];
  onFolderClick: (path: string) => void;
  onDownload: (file: FileItem) => void;
  onRename?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onShowInfo?: (file: FileItem) => void;
  onDownloadFolder?: (file: FileItem) => void;
  onToggleFavorite?: (file: FileItem) => void;
  onShowPermissions?: (file: FileItem) => void;
  onShowDetails?: (file: FileItem) => void;
  onGoToFolder?: (file: FileItem) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onFolderClick,
  onDownload,
  onRename,
  onDelete,
  onShowInfo,
  onDownloadFolder,
  onToggleFavorite,
  onShowPermissions,
  onShowDetails,
  onGoToFolder,
  canEdit = false,
  canDelete = false,
}) => {
  console.log('📋 FileList rendering with files:', files.map(f => ({ name: f.name, is_directory: f.is_directory })));

  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>No hay archivos en esta carpeta</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nombre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tamaño
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha Modificación
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {files.map((file, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-3">
                  <FileIcon
                    extension={file.extension}
                    isDirectory={file.is_directory}
                  />
                  {file.is_directory ? (
                    <button
                      onClick={() => onFolderClick(file.path)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-left"
                    >
                      {file.name}
                    </button>
                  ) : (
                    <span className="text-gray-900">{file.name}</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {file.size_formatted}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(file.modified_date)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  {/* Botones para DIRECTORIOS (disponibles para todos los roles) */}
                  {file.is_directory && (
                    <>
                      {onShowInfo && (
                        <button
                          onClick={() => onShowInfo(file)}
                          className="text-blue-600 hover:text-blue-800 transition-colors p-2"
                          title="Información del directorio"
                        >
                          <Info className="w-5 h-5" />
                        </button>
                      )}
                      {onDownloadFolder && (
                        <button
                          onClick={() => onDownloadFolder(file)}
                          className="text-green-600 hover:text-green-800 transition-colors p-2"
                          title="Descargar carpeta (ZIP)"
                        >
                          <Archive className="w-5 h-5" />
                        </button>
                      )}
                      {onToggleFavorite && (
                        <button
                          onClick={() => onToggleFavorite(file)}
                          className="text-purple-600 hover:text-purple-800 transition-colors p-2"
                          title="Agregar a favoritos"
                        >
                          <Star className="w-5 h-5" />
                        </button>
                      )}
                      {onShowPermissions && (
                        <button
                          onClick={() => onShowPermissions(file)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors p-2"
                          title="Ver permisos del directorio"
                        >
                          <Shield className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}

                  {/* Botones para ARCHIVOS */}
                  {!file.is_directory && (
                    <>
                      <button
                        onClick={() => onDownload(file)}
                        className="text-green-600 hover:text-green-800 transition-colors p-2"
                        title="Descargar archivo"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      {onShowDetails && (
                        <button
                          onClick={() => onShowDetails(file)}
                          className="text-blue-600 hover:text-blue-800 transition-colors p-2"
                          title="Ver detalles (propietario, ruta completa, fechas)"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                      )}
                      {onGoToFolder && (
                        <button
                          onClick={() => onGoToFolder(file)}
                          className="text-purple-600 hover:text-purple-800 transition-colors p-2"
                          title="Ir a carpeta contenedora"
                        >
                          <FolderOpen className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}

                  {/* Botones de edición (según permisos) */}
                  {canEdit && onRename && (
                    <button
                      onClick={() => onRename(file)}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-2"
                      title="Renombrar"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                  )}
                  {canDelete && onDelete && (
                    <button
                      onClick={() => onDelete(file)}
                      className="text-red-600 hover:text-red-800 transition-colors p-2"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
