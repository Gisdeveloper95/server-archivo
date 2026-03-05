/**
 * Modal para mostrar información detallada de un archivo
 * Incluye: propietario, tamaño, fechas, historial de accesos
 */
import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileText, Calendar, User, Loader2, HardDrive, Tag, Clock, Download, Eye, AlertCircle } from 'lucide-react';
import { fileOpsApi } from '../api/fileOps';
import type { FileItem } from '../types';

interface FileInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  basePath: string; // Ruta base del NetApp
}

interface FileDetails {
  success: boolean;
  file: {
    name: string;
    path: string;
    windows_path: string;
    extension: string;
    mime_type: string;
    size: number;
    size_formatted: string;
    created_at: number;
    modified_at: number;
    accessed_at: number;
  };
  upload_info: {
    uploaded_by: string;
    uploaded_by_full_name?: string;
    uploaded_at: string;
    ip_address?: string;
  } | null;
  access_history: Array<{
    action: string;
    user: string;
    date: string;
    ip: string;
  }>;
  stats: {
    total_downloads: number;
    total_views: number;
  };
}

export const FileInfoModal: React.FC<FileInfoModalProps> = ({
  isOpen,
  onClose,
  file,
  basePath,
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<FileDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar detalles cuando se abre el modal
  useEffect(() => {
    if (isOpen && file) {
      setLoading(true);
      setError(null);
      setDetails(null);

      fileOpsApi.getFileDetails(file.path)
        .then((data) => {
          setDetails(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error loading file details:', err);
          setError('No se pudo cargar la información detallada');
          setLoading(false);
        });
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  // Construir ruta completa
  const fullPath = `${basePath}\\${file.path.replace(/\//g, '\\')}`;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
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
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Información del Archivo</h2>
              <p className="text-sm text-blue-100 mt-1 truncate max-w-md">{file.name}</p>
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
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">{error}</span>
                </div>
              </div>

              {/* Información básica de fallback */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Información básica disponible</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Nombre:</strong> {file.name}</p>
                  <p><strong>Ruta:</strong> {file.path}</p>
                  <p><strong>Tamaño:</strong> {file.size_formatted}</p>
                  {file.extension && <p><strong>Extensión:</strong> {file.extension}</p>}
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
                    onClick={() => copyToClipboard(fullPath, 'windows')}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:bg-blue-900/50 rounded transition-colors flex-shrink-0"
                    title="Copiar ruta"
                  >
                    {copied === 'windows' ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          ) : details && (
            <div className="space-y-6">
              {/* Información del que subió el archivo */}
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Subido por
                </h3>
                {details.upload_info ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-green-600 dark:text-green-400">Usuario</label>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {details.upload_info.uploaded_by_full_name || details.upload_info.uploaded_by}
                      </p>
                      {details.upload_info.uploaded_by_full_name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">@{details.upload_info.uploaded_by}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-green-600 dark:text-green-400">Fecha de carga</label>
                      <p className="text-sm text-gray-900 dark:text-white">{formatISODate(details.upload_info.uploaded_at)}</p>
                    </div>
                    {details.upload_info.ip_address && (
                      <div>
                        <label className="text-xs text-green-600 dark:text-green-400">IP</label>
                        <p className="text-sm text-gray-900 dark:text-white">{details.upload_info.ip_address}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm italic">
                    <p>Sin información de carga registrada</p>
                    <p className="text-xs mt-1">Este archivo fue creado antes de implementar el registro de auditoría o fue copiado directamente al servidor.</p>
                  </div>
                )}
              </div>

              {/* Información básica del archivo */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Información del Archivo
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Tamaño</label>
                    <p className="font-medium text-gray-900 dark:text-white">{details.file.size_formatted}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Extensión</label>
                    <p className="font-medium text-gray-900 dark:text-white uppercase">{details.file.extension || 'Sin extensión'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Tipo MIME</label>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{details.file.mime_type}</p>
                  </div>
                </div>
              </div>

              {/* Rutas */}
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">Rutas</h3>

                {/* Ruta Windows */}
                <div className="mb-3">
                  <label className="text-xs text-blue-600 dark:text-blue-400">Ruta Windows (para copiar)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-100 break-all">
                      {details.file.windows_path}
                    </code>
                    <button
                      onClick={() => copyToClipboard(details.file.windows_path, 'windows')}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:bg-blue-900/50 rounded transition-colors flex-shrink-0"
                      title="Copiar ruta"
                    >
                      {copied === 'windows' ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Ruta relativa */}
                <div>
                  <label className="text-xs text-blue-600 dark:text-blue-400">Ruta en sistema</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-100 break-all">
                      {details.file.path}
                    </code>
                    <button
                      onClick={() => copyToClipboard(details.file.path, 'path')}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:bg-blue-900/50 rounded transition-colors flex-shrink-0"
                      title="Copiar ruta"
                    >
                      {copied === 'path' ? <Check className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
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
                    <p className="text-sm text-gray-900 dark:text-white">{formatTimestamp(details.file.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Modificado</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatTimestamp(details.file.modified_at)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Último acceso</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatTimestamp(details.file.accessed_at)}</p>
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{details.stats.total_downloads}</span>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Descargas totales</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-indigo-600" />
                    <span className="text-2xl font-bold text-indigo-700">{details.stats.total_views}</span>
                  </div>
                  <p className="text-sm text-indigo-600">Visualizaciones</p>
                </div>
              </div>

              {/* Historial de accesos */}
              {details.access_history.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Últimos accesos</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {details.access_history.map((access, index) => (
                      <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2 text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            access.action === 'Descarga' ? 'bg-purple-100 text-purple-700 dark:text-purple-300' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {access.action}
                          </span>
                          <span className="text-gray-900 dark:text-white">{access.user}</span>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">
                          {formatISODate(access.date)}
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
