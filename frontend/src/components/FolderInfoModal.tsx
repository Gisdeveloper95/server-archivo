/**
 * Modal para mostrar información detallada de un directorio
 * Incluye: propietario, fechas, tamaño, historial de actividad
 */
import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Folder, Calendar, User, Loader2, FileText, FolderTree, HardDrive, Clock, Upload, Download, Trash2, AlertCircle } from 'lucide-react';
import { fileOpsApi } from '../api/fileOps';
import type { FileItem } from '../types';

interface FolderInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FileItem | null;
  basePath: string; // Ruta base del NetApp
}

interface FolderDetails {
  success: boolean;
  folder: {
    name: string;
    path: string;
    windows_path: string;
    total_files: number;
    total_subdirs: number;
    total_size: number;
    total_size_formatted: string;
    created_at: number;
    modified_at: number;
    accessed_at: number;
  };
  creator_info: {
    created_by: string;
    created_by_full_name?: string;
    created_at: string;
    ip_address?: string;
  } | null;
  activity_history: Array<{
    action: string;
    user: string;
    date: string;
    target: string;
    ip: string;
  }>;
  stats: {
    total_uploads: number;
    total_downloads: number;
    total_deletions: number;
  };
  // Datos simplificados para compatibilidad
  owner: string;
  created_date: number;
  modified_date: number;
}

export const FolderInfoModal: React.FC<FolderInfoModalProps> = ({
  isOpen,
  onClose,
  folder,
  basePath,
}) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<FolderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar detalles cuando se abre el modal
  useEffect(() => {
    if (isOpen && folder) {
      setLoading(true);
      setError(null);
      setDetails(null);

      fileOpsApi.getFolderDetails(folder.path)
        .then((data) => {
          setDetails(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error loading folder details:', err);
          setError('No se pudo cargar la información detallada');
          setLoading(false);
        });
    }
  }, [isOpen, folder]);

  if (!isOpen || !folder) return null;

  // Construir ruta completa
  const fullPath = `${basePath}\\${folder.path.replace(/\//g, '\\')}`;

  const handleCopyPath = () => {
    navigator.clipboard.writeText(fullPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatISODate = (isoString: string) => {
    return new Date(isoString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3 text-white">
            <Folder className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Información del Directorio</h2>
              <p className="text-sm text-blue-100 mt-1 truncate max-w-md">{folder.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white dark:bg-gray-800 hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">Cargando detalles...</p>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">{error}</span>
                </div>
              </div>

              {/* Información básica de fallback */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Información básica</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Nombre:</strong> {folder.name}</p>
                  <p><strong>Ruta:</strong> {folder.path}</p>
                </div>
              </div>

              {/* Ruta Windows */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <label className="text-xs text-blue-600 dark:text-blue-400">Ruta Windows (para copiar)</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-100 break-all">
                    {fullPath}
                  </code>
                  <button
                    onClick={handleCopyPath}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:bg-blue-900/50 rounded transition-colors flex-shrink-0"
                    title="Copiar ruta"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          ) : details && (
            <div className="space-y-6">
              {/* Información del creador */}
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Creado por
                </h3>
                {details.creator_info ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-green-600 dark:text-green-400">Usuario</label>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {details.creator_info.created_by_full_name || details.creator_info.created_by}
                      </p>
                      {details.creator_info.created_by_full_name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">@{details.creator_info.created_by}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-green-600 dark:text-green-400">Fecha de creación</label>
                      <p className="text-sm text-gray-900 dark:text-white">{formatISODate(details.creator_info.created_at)}</p>
                    </div>
                    {details.creator_info.ip_address && (
                      <div>
                        <label className="text-xs text-green-600 dark:text-green-400">IP</label>
                        <p className="text-sm text-gray-900 dark:text-white">{details.creator_info.ip_address}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm italic">
                    <p>Sin información de creación registrada</p>
                    <p className="text-xs mt-1">Esta carpeta fue creada antes de implementar el registro de auditoría o fue creada directamente en el servidor.</p>
                  </div>
                )}
              </div>

              {/* Rutas */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">Rutas</h3>

                {/* Ruta Windows */}
                <div className="mb-3">
                  <label className="text-xs text-blue-600 dark:text-blue-400">Ruta Windows (para copiar)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-100 break-all">
                      {details.folder.windows_path}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(details.folder.windows_path);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:bg-blue-900/50 rounded transition-colors flex-shrink-0"
                      title="Copiar ruta"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Ruta relativa */}
                <div>
                  <label className="text-xs text-blue-600 dark:text-blue-400">Ruta en sistema</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-100 break-all">
                      {details.folder.path}
                    </code>
                  </div>
                </div>
              </div>

              {/* Contenido y tamaño */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{details.folder.total_files}</span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Archivos</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <FolderTree className="w-5 h-5 text-orange-600" />
                    <span className="text-2xl font-bold text-orange-700">{details.folder.total_subdirs}</span>
                  </div>
                  <p className="text-sm text-orange-600">Subdirectorios</p>
                </div>
                <div className="col-span-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{details.folder.total_size_formatted}</span>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Tamaño total (nivel actual)</p>
                </div>
              </div>

              {/* Fechas */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Fechas del sistema
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Creado</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatTimestamp(details.folder.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Modificado</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatTimestamp(details.folder.modified_at)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Último acceso</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatTimestamp(details.folder.accessed_at)}</p>
                  </div>
                </div>
              </div>

              {/* Estadísticas de actividad */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">{details.stats.total_uploads}</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400">Subidas</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Download className="w-5 h-5 text-indigo-600" />
                    <span className="text-2xl font-bold text-indigo-700">{details.stats.total_downloads}</span>
                  </div>
                  <p className="text-sm text-indigo-600">Descargas</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-2xl font-bold text-red-700 dark:text-red-300">{details.stats.total_deletions}</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400">Eliminaciones</p>
                </div>
              </div>

              {/* Historial de actividad reciente */}
              {details.activity_history.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Actividad reciente</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {details.activity_history.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2 text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            activity.action === 'Archivo subido' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                            activity.action === 'Carpeta creada' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                            activity.action === 'Eliminado' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                            activity.action === 'Descargado' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                          }`}>
                            {activity.action}
                          </span>
                          <span className="text-gray-900 dark:text-white">{activity.user}</span>
                          <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs truncate max-w-[150px]" title={activity.target}>
                            → {activity.target}
                          </span>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">
                          {formatISODate(activity.date)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
