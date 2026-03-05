import React, { useState, useEffect } from 'react';
import { X, Shield, User, Eye, Edit, Trash2, Plus, AlertCircle, Loader2, CheckCircle, XCircle, Link as LinkIcon } from 'lucide-react';
import { getPathAccess, type UserWithAccess, type PathAccessResponse } from '../api/admin';

interface PathAccessModalProps {
  path: string;
  onClose: () => void;
  onAddUser?: () => void;
  onEditPermission?: (userId: number, permissionId: number) => void;
  onRemoveAccess?: (userId: number, permissionId: number) => void;
}

export const PathAccessModal: React.FC<PathAccessModalProps> = ({
  path,
  onClose,
  onAddUser,
  onEditPermission,
  onRemoveAccess
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PathAccessResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPathAccess();
  }, [path]);

  const loadPathAccess = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getPathAccess(path);
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar accesos');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUsers = () => {
    if (!data) return [];
    if (!searchTerm) return data.users_with_access;

    const term = searchTerm.toLowerCase();
    return data.users_with_access.filter(item =>
      item.user.username.toLowerCase().includes(term) ||
      item.user.email.toLowerCase().includes(term) ||
      item.user.first_name.toLowerCase().includes(term) ||
      item.user.last_name.toLowerCase().includes(term)
    );
  };

  const getAccessTypeLabel = (type: 'direct' | 'inherited') => {
    return type === 'direct' ? 'Directo' : 'Heredado';
  };

  const getAccessTypeBadge = (type: 'direct' | 'inherited') => {
    if (type === 'direct') {
      return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200';
    }
    return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200';
  };

  const getPermissionSummary = (perms: any) => {
    const permissions = [];
    if (perms.can_read) permissions.push('Lectura');
    if (perms.can_write) permissions.push('Escritura');
    if (perms.can_delete) permissions.push('Eliminación');
    if (perms.can_create_directories) permissions.push('Crear carpetas');

    return permissions.length > 0 ? permissions.join(', ') : 'Sin permisos';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3 text-white">
            <Shield className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Gestión de Accesos</h2>
              <p className="text-sm text-blue-100 mt-1">
                {path || 'Raíz del proyecto'}
              </p>
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
                <p className="text-gray-600 dark:text-gray-300">Cargando accesos...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <User className="w-5 h-5" />
                    <span className="font-medium">
                      {data.total_users} {data.total_users === 1 ? 'usuario tiene' : 'usuarios tienen'} acceso a esta ruta
                    </span>
                  </div>
                  {onAddUser && (
                    <button
                      onClick={onAddUser}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Usuario
                    </button>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, usuario o email..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>

              {/* Users List */}
              {getFilteredUsers().length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>
                    {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios con acceso a esta ruta'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getFilteredUsers().map((item, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        {/* User Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full text-white font-semibold">
                              {item.user.first_name[0]}{item.user.last_name[0]}
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {item.user.first_name} {item.user.last_name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                @{item.user.username} • {item.user.email}
                              </p>
                              {item.user.department && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                                  {item.user.department} {item.user.position && `• ${item.user.position}`}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Access Info */}
                          <div className="ml-13 space-y-2">
                            {/* Access Type Badge */}
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getAccessTypeBadge(item.access_type)}`}>
                                {item.access_type === 'direct' ? <CheckCircle className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                                {getAccessTypeLabel(item.access_type)}
                              </span>
                              {item.permission.base_path && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                                  desde: {item.permission.base_path || 'raíz'}
                                </span>
                              )}
                            </div>

                            {/* Effective Permissions */}
                            <div className="flex flex-wrap gap-2">
                              {item.effective_permissions.can_read && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-xs">
                                  <Eye className="w-3 h-3" />
                                  Lectura
                                </span>
                              )}
                              {item.effective_permissions.can_write && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded text-xs">
                                  <Edit className="w-3 h-3" />
                                  Escritura
                                </span>
                              )}
                              {item.effective_permissions.can_delete && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs">
                                  <Trash2 className="w-3 h-3" />
                                  Eliminación
                                </span>
                              )}
                              {item.effective_permissions.can_create_directories && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  <Plus className="w-3 h-3" />
                                  Crear carpetas
                                </span>
                              )}
                            </div>

                            {/* Inheritance Mode */}
                            {item.permission.inheritance_mode && item.permission.inheritance_mode !== 'total' && (
                              <div className="text-xs text-gray-600 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded px-2 py-1 inline-block">
                                Modo: {item.permission.inheritance_mode}
                                {item.permission.blocked_paths && item.permission.blocked_paths.length > 0 && (
                                  <span className="ml-2 text-yellow-700 dark:text-yellow-300">
                                    ({item.permission.blocked_paths.length} rutas bloqueadas)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {onEditPermission && (
                            <button
                              onClick={() => onEditPermission(item.user.id, item.permission.id)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg transition-colors"
                              title="Editar permisos"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {onRemoveAccess && (
                            <button
                              onClick={() => onRemoveAccess(item.user.id, item.permission.id)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors"
                              title="Quitar acceso"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Link to full admin panel */}
              <div className="mt-6 pt-6 border-t">
                <a
                  href="/administracion"
                  className="flex items-center justify-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg transition-colors text-sm font-medium"
                >
                  <Shield className="w-4 h-4" />
                  Ir al panel de administración completo
                </a>
              </div>
            </div>
          ) : null}
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
