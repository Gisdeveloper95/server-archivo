/**
 * TrashModal - Modal para ver y restaurar archivos eliminados de un directorio
 * Similar a "Versiones anteriores" de Windows
 */
import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Folder,
  FileText,
  RotateCcw,
  Link2,
  Clock,
  User,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import apiClient from '../api/client';

interface TrashItem {
  trash_id: string;
  original_name: string;
  original_path: string;
  is_directory: boolean;
  size_bytes: number;
  size_formatted: string;
  file_count: number;
  deleted_by_username: string;
  deleted_by_full_name: string;
  deleted_at: string;
  expires_at: string;
  days_until_expiry: number;
  status: string;
}

interface TrashModalProps {
  open: boolean;
  onClose: () => void;
  path: string;
  onRestore?: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  open,
  onClose,
  path,
  onRestore,
}) => {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open && path) {
      fetchTrashItems();
    }
  }, [open, path]);

  const fetchTrashItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/trash/by-path/', {
        params: { path }
      });
      setItems(response.data.results || []);
    } catch (err: any) {
      console.error('Error fetching trash items:', err);
      setError(err.response?.data?.error || 'Error al cargar elementos eliminados');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: TrashItem) => {
    setRestoring(item.trash_id);
    setError(null);
    try {
      const response = await apiClient.post(`/trash/${item.trash_id}/restore/`, {
        conflict_resolution: 'rename'
      });

      if (response.data.success) {
        setSuccessMessage(`"${item.original_name}" restaurado exitosamente`);
        setItems(items.filter(i => i.trash_id !== item.trash_id));
        if (onRestore) {
          onRestore();
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: any) {
      console.error('Error restoring item:', err);
      setError(err.response?.data?.error || 'Error al restaurar');
    } finally {
      setRestoring(null);
    }
  };

  const handleShare = async (item: TrashItem) => {
    try {
      const response = await apiClient.post(`/trash/${item.trash_id}/share/`, {
        permission: 'download',
        expires_hours: 24
      });

      if (response.data.success) {
        await navigator.clipboard.writeText(response.data.share_url);
        setCopiedId(item.trash_id);
        const expiresDate = new Date(response.data.expires_at).toLocaleString('es-CO');
        setSuccessMessage(`Link generado y copiado al portapapeles. Expira: ${expiresDate}`);
        setTimeout(() => {
          setSuccessMessage(null);
          setCopiedId(null);
        }, 5000);
      }
    } catch (err: any) {
      console.error('Error sharing item:', err);
      setError(err.response?.data?.error || 'Error al generar link');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExpiryColor = (days: number) => {
    if (days <= 3) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50';
    if (days <= 7) return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Trash2 className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Elementos eliminados</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 truncate max-w-md" title={path}>
                {path}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg mb-4">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-200 text-sm">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800 dark:text-green-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="text-gray-600 dark:text-gray-300 mt-4">Cargando...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Trash2 className="w-16 h-16 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-4">No hay elementos eliminados en este directorio</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.trash_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.is_directory ? (
                      <Folder className="w-10 h-10 text-yellow-500 flex-shrink-0" />
                    ) : (
                      <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {item.original_name}
                        </span>
                        {item.is_directory && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                            {item.file_count} archivos
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          <User className="w-3 h-3" />
                          <span>Eliminado por: {item.deleted_by_full_name || item.deleted_by_username}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(item.deleted_at)} • {item.size_formatted}</span>
                        </div>
                        <span className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-medium ${getExpiryColor(item.days_until_expiry)}`}>
                          Expira en {item.days_until_expiry} días
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleShare(item)}
                      className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg transition-colors"
                      title="Compartir link de descarga"
                    >
                      {copiedId === item.trash_id ? (
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Link2 className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={restoring === item.trash_id}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      title="Restaurar"
                    >
                      {restoring === item.trash_id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Restaurar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 dark:bg-gray-900">
          <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
            {items.length} elemento(s) en papelera
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrashModal;
