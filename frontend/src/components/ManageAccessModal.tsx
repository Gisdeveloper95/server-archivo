import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Trash2, AlertCircle, Loader2, Info, Edit, Shield, Eye, Plus } from 'lucide-react';
import { getAllUsers, assignPermission, updatePermission, deletePermission, getPathAccess, type User, type UserWithAccess } from '../api/admin';

interface ManageAccessModalProps {
  path: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface PermissionFormData {
  permissionId?: number;
  userId: number;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_create_directories: boolean;
  inheritance_mode: 'total' | 'blocked' | 'partial_write' | 'limited_depth';
  edit_permission_level: 'upload_only' | 'upload_own' | 'upload_all';
  max_depth: number | null;
  expires_at: string | null;
}

export const ManageAccessModal: React.FC<ManageAccessModalProps> = ({ path, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [users, setUsers] = useState<User[]>([]);
  const [usersWithAccess, setUsersWithAccess] = useState<UserWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<PermissionFormData>({
    userId: 0,
    can_read: true,
    can_write: false,
    can_delete: false,
    can_create_directories: false,
    inheritance_mode: 'total',
    edit_permission_level: 'upload_only',
    max_depth: null,
    expires_at: null,
  });

  useEffect(() => {
    loadData();
  }, [path]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [allUsers, pathAccess] = await Promise.all([
        getAllUsers(),
        getPathAccess(path)
      ]);
      setUsers(allUsers);
      setUsersWithAccess(pathAccess.users_with_access);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.userId === 0 && mode === 'add') {
      setError('Selecciona un usuario');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const permissionPayload = {
        base_path: path,
        can_read: formData.can_read,
        can_write: formData.can_write,
        can_delete: formData.can_delete,
        can_create_directories: formData.can_create_directories,
        inheritance_mode: formData.inheritance_mode,
        edit_permission_level: formData.edit_permission_level,
        max_depth: formData.inheritance_mode === 'limited_depth' ? formData.max_depth : null,
        expires_at: formData.expires_at,
      };

      if (mode === 'edit' && formData.permissionId) {
        await updatePermission(formData.permissionId, permissionPayload);
      } else {
        await assignPermission(formData.userId, permissionPayload);
      }

      onSuccess();
      await loadData();
      setMode('list');
    } catch (err: any) {
      setError(err.response?.data?.error || (mode === 'edit' ? 'Error al actualizar permiso' : 'Error al asignar permiso'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: UserWithAccess) => {
    setFormData({
      permissionId: item.permission.id,
      userId: item.user.id,
      can_read: item.permission.can_read,
      can_write: item.permission.can_write,
      can_delete: item.permission.can_delete,
      can_create_directories: item.permission.can_create_directories,
      inheritance_mode: item.permission.inheritance_mode || 'total',
      edit_permission_level: item.permission.edit_permission_level || 'upload_only',
      max_depth: item.permission.max_depth,
      expires_at: item.permission.expires_at || null,
    });
    setMode('edit');
  };

  const handleDelete = async (permissionId: number) => {
    try {
      setSaving(true);
      setError(null);
      await deletePermission(permissionId);
      onSuccess();
      await loadData();
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar permiso');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: 0,
      can_read: true,
      can_write: false,
      can_delete: false,
      can_create_directories: false,
      inheritance_mode: 'total',
      edit_permission_level: 'upload_only',
      max_depth: null,
      expires_at: null,
    });
    setError(null);
  };

  if (mode === 'add' || mode === 'edit') {
    const isEdit = mode === 'edit';
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="flex items-center gap-3 text-white">
              {isEdit ? <Edit className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
              <div>
                <h2 className="text-xl font-semibold">{isEdit ? 'Editar Permiso' : 'Agregar Usuario'}</h2>
                <p className="text-sm text-blue-100 mt-1">{path || 'Raíz del proyecto'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setMode('list');
              }}
              className="text-white hover:bg-white dark:bg-gray-800 hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mt-2">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selección de Usuario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Usuario *
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100 dark:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  required
                  disabled={isEdit}
                >
                  <option value={0}>Seleccionar usuario...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} (@{user.username}) - {user.role}
                    </option>
                  ))}
                </select>
                {isEdit && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">No puedes cambiar el usuario al editar un permiso</p>
                )}
              </div>

              {/* Permisos Básicos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                  Permisos Básicos
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.can_read}
                      onChange={(e) => setFormData({ ...formData, can_read: e.target.checked })}
                      className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Lectura (ver archivos y carpetas)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.can_write}
                      onChange={(e) => setFormData({ ...formData, can_write: e.target.checked })}
                      className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Escritura (subir y modificar archivos)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.can_delete}
                      onChange={(e) => setFormData({ ...formData, can_delete: e.target.checked })}
                      className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Eliminación (eliminar archivos y carpetas)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.can_create_directories}
                      onChange={(e) => setFormData({ ...formData, can_create_directories: e.target.checked })}
                      className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Crear carpetas</span>
                  </label>
                </div>
              </div>

              {/* Modo de Herencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Modo de Herencia
                </label>
                <select
                  value={formData.inheritance_mode}
                  onChange={(e) => setFormData({ ...formData, inheritance_mode: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
                  <option value="total">Total - Acceso a todos los subdirectorios</option>
                  <option value="limited_depth">Profundidad Limitada - Limitar niveles de acceso</option>
                  <option value="partial_write">Parcial - Algunas rutas solo lectura</option>
                  <option value="blocked">Bloqueado - Bloquear ciertas rutas</option>
                </select>

                {/* Profundidad Máxima */}
                {formData.inheritance_mode === 'limited_depth' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Profundidad Máxima (niveles)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.max_depth || 0}
                      onChange={(e) => setFormData({ ...formData, max_depth: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="0 = solo esta carpeta, 1 = esta + 1 nivel, etc."
                    />
                  </div>
                )}
              </div>

              {/* Nivel de Edición */}
              {formData.can_write && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Nivel de Edición
                  </label>
                  <select
                    value={formData.edit_permission_level}
                    onChange={(e) => setFormData({ ...formData, edit_permission_level: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  >
                    <option value="upload_only">Solo Subir - No puede modificar ni eliminar</option>
                    <option value="upload_own">Subir Propios - Solo puede modificar/eliminar sus propios archivos</option>
                    <option value="upload_all">Subir Todos - Puede modificar/eliminar todos los archivos</option>
                  </select>
                </div>
              )}

              {/* Fecha de Expiración */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Fecha de Expiración (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at || ''}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Nota Informativa */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-start gap-2 text-blue-800 dark:text-blue-200">
                  <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Configuración Avanzada</p>
                    <p className="mt-1">Para configurar rutas bloqueadas, rutas de solo lectura y otras opciones avanzadas, usa el panel de administración completo.</p>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900">
            <button
              onClick={() => {
                resetForm();
                setMode('list');
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 font-medium transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || (!isEdit && formData.userId === 0)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEdit ? 'Actualizando...' : 'Guardando...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEdit ? 'Actualizar Permiso' : 'Asignar Permiso'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de lista
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3 text-white">
            <Shield className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Gestionar Accesos</h2>
              <p className="text-sm text-blue-100 mt-1">{path || 'Raíz del proyecto'}</p>
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
          ) : (
            <div className="space-y-4">
              {/* Add User Button */}
              <button
                onClick={() => {
                  resetForm();
                  setMode('add');
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Agregar Usuario
              </button>

              {/* Users List */}
              {usersWithAccess.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay usuarios con acceso directo a esta ruta</p>
                  <p className="text-sm mt-1">Haz clic en "Agregar Usuario" para asignar permisos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {usersWithAccess.length} {usersWithAccess.length === 1 ? 'usuario tiene' : 'usuarios tienen'} acceso a esta ruta
                  </h3>
                  {usersWithAccess.map((item, index) => (
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
                            </div>
                          </div>

                          {/* Permission Details */}
                          <div className="ml-13 space-y-2">
                            {/* Access Type Badge */}
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                item.access_type === 'direct' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                              }`}>
                                {item.access_type === 'direct' ? '✓ Directo' : '↓ Heredado'}
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
                                {item.permission.max_depth !== null && item.permission.max_depth !== undefined && (
                                  <span className="ml-2 text-yellow-700 dark:text-yellow-300">
                                    (profundidad: {item.permission.max_depth})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {item.access_type === 'direct' && (
                            <>
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg transition-colors"
                                title="Editar permisos"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {deleteConfirm === item.permission.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(item.permission.id)}
                                    disabled={saving}
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-2 py-1 text-xs bg-gray-300 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(item.permission.id)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors"
                                  title="Quitar acceso"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                          {item.access_type === 'inherited' && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 italic">Heredado - no editable aquí</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
