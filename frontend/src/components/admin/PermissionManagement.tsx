import { useState, useEffect } from 'react';
import { User, FolderOpen, Plus, Trash2, Eye, Edit, Trash, Book, Loader2, AlertCircle, Search, Lock, Layers, GitBranch, FolderPlus, Mail, FileSpreadsheet } from 'lucide-react';
import { AssignPermissionModal } from './AssignPermissionModal';
import { EditPermissionModal } from './EditPermissionModal';
import { ViewPermissionModal } from './ViewPermissionModal';
import { BulkPermissionAssignment } from './BulkPermissionAssignment';
import { GroupManagement } from './GroupManagement';
import { useToast } from '../../hooks/useToast';
import { useModal } from '../../hooks/useModal';
import { ToastContainer } from '../Toast';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Permission {
  id: number;
  user: User;
  base_path: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_create_directories?: boolean;
  exempt_from_dictionary: boolean;
  edit_permission_level?: 'upload_only' | 'upload_own' | 'upload_all';
  inheritance_mode?: 'total' | 'blocked' | 'limited_depth';
  blocked_paths?: string[];
  read_only_subdirs?: string[];
  max_depth?: number | null;
  notes?: string;
  granted_at: string;
  granted_by: string;
  expires_at?: string | null;
}

export const PermissionManagement = () => {
  const toast = useToast();
  const { confirm } = useModal();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [permissionToEdit, setPermissionToEdit] = useState<Permission | null>(null);
  const [permissionToView, setPermissionToView] = useState<Permission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'groups'>('individual');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserPermissions(selectedUser.id);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      setUsers(data.users || []);

      // Auto-seleccionar el primer usuario si no hay uno seleccionado
      if (!selectedUser && data.users && data.users.length > 0) {
        setSelectedUser(data.users[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId: number) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        // Si es 404, el usuario simplemente no tiene permisos (no es un error)
        if (response.status === 404) {
          setPermissions([]);
          return;
        }
        throw new Error('Error al cargar permisos');
      }

      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar permisos');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermission = async (permission: Permission) => {
    const displayPath = permission.base_path ? `Sub_Proy/${permission.base_path}` : 'Sub_Proy (raíz completa)';
    const confirmed = await confirm({
      title: 'Eliminar permiso',
      message: `¿Eliminar acceso a "${displayPath}"?\n\nEl usuario ya no tendrá acceso a esta ruta.`,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/permissions/${permission.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al eliminar permiso');
      }

      toast.success('Permiso eliminado exitosamente');
      if (selectedUser) {
        loadUserPermissions(selectedUser.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar permiso');
    }
  };

  const getFilteredUsers = () => {
    if (!searchTerm.trim()) return users;

    const searchLower = searchTerm.toLowerCase();
    return users.filter(
      user =>
        user.username.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.first_name.toLowerCase().includes(searchLower) ||
        user.last_name.toLowerCase().includes(searchLower)
    );
  };

  const getFilteredPermissions = () => {
    if (!permissionSearchTerm.trim()) return permissions;

    const searchLower = permissionSearchTerm.toLowerCase();
    return permissions.filter(permission =>
      permission.base_path.toLowerCase().includes(searchLower)
    );
  };

  const handleEditPermission = (permission: Permission) => {
    setPermissionToEdit(permission);
    setIsEditModalOpen(true);
  };

  const handleViewPermission = (permission: Permission) => {
    setPermissionToView(permission);
    setIsViewModalOpen(true);
  };

  const handleResendEmail = async (permission: Permission) => {
    const displayPath = permission.base_path ? `Sub_Proy/${permission.base_path}` : 'Sub_Proy (raíz completa)';
    const confirmed = await confirm({
      title: 'Reenviar correo de permisos',
      message: `¿Reenviar correo de permisos a ${permission.user.email}?\n\nRuta: ${displayPath}`,
      type: 'info',
      confirmText: 'Enviar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/permissions/${permission.id}/resend-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al reenviar correo');
      }

      const data = await response.json();
      toast.success(data.message || 'Correo reenviado exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al reenviar correo');
    }
  };

  const handleDownloadExcel = async (permission: Permission) => {
    try {
      const response = await fetch(`/api/admin/permissions/${permission.id}/download-excel/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al descargar Excel');
      }

      // Crear blob y descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Obtener nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'permisos_repositorio.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      toast.error(err.message || 'Error al descargar Excel');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('individual')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'individual'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 hover:border-gray-300 dark:border-gray-600'
            }`}
          >
            👤 Asignación Individual
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'bulk'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 hover:border-gray-300 dark:border-gray-600'
            }`}
          >
            👥 Asignación Masiva
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'groups'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 hover:border-gray-300 dark:border-gray-600'
            }`}
          >
            🏷️ Gestión de Grupos
          </button>
        </nav>
      </div>

      {/* Tab Content: Individual Assignment */}
      {activeTab === 'individual' && (
        <div className="grid grid-cols-3 gap-6">
          {/* User List - Left Sidebar */}
          <div className="col-span-1 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                <h3 className="font-bold text-gray-900 dark:text-white">Seleccionar Usuario</h3>
              </div>

              {/* Search */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* User List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {getFilteredUsers().map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left p-3 rounded-lg transition-colors border ${
                      selectedUser?.id === user.id
                        ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-400 shadow-sm'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{user.username}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{user.email}</div>
                  </button>
                ))}

                {getFilteredUsers().length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No se encontraron usuarios</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Permissions Detail - Right Content */}
          <div className="col-span-2 space-y-4">
            {selectedUser ? (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 shadow-lg dark:shadow-gray-900/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{selectedUser.username}</h3>
                      <p className="text-blue-100 mt-1">
                        {selectedUser.first_name} {selectedUser.last_name} • {selectedUser.email}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAssignModalOpen(true)}
                      className="px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 transition-colors flex items-center gap-2 font-semibold"
                    >
                      <Plus className="w-5 h-5" />
                      Asignar Ruta
                    </button>
                  </div>
                </div>

                {/* Permissions List */}
                <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FolderOpen className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    <h4 className="font-bold text-gray-900 dark:text-white">Rutas de Acceso</h4>
                    <span className="ml-auto text-sm text-gray-600 dark:text-gray-300">
                      {permissions.length} {permissions.length === 1 ? 'ruta' : 'rutas'}
                    </span>
                  </div>

                  {/* Search Bar for Permissions */}
                  {permissions.length > 0 && (
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                        <input
                          type="text"
                          value={permissionSearchTerm}
                          onChange={(e) => setPermissionSearchTerm(e.target.value)}
                          placeholder="Buscar por ruta..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <span className="ml-3 text-gray-600 dark:text-gray-300">Cargando permisos...</span>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center py-12">
                      <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                      <span className="ml-3 text-red-600 dark:text-red-400">{error}</span>
                    </div>
                  ) : permissions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-semibold mb-2">Sin rutas asignadas</p>
                      <p className="mb-4">Este usuario no tiene acceso a ninguna ruta específica.</p>
                      <button
                        onClick={() => setIsAssignModalOpen(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 font-semibold"
                      >
                        <Plus className="w-5 h-5" />
                        Asignar Primera Ruta
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getFilteredPermissions().map((permission) => (
                        <div
                          key={permission.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span className="font-mono font-semibold text-gray-900 dark:text-white break-all">
                                  {permission.base_path ? `Sub_Proy/${permission.base_path}` : 'Sub_Proy (raíz completa)'}
                                </span>
                              </div>

                              {/* Permission Badges */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                {permission.can_read && (
                                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded text-xs font-semibold flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    Lectura
                                  </span>
                                )}
                                {permission.can_write && (
                                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded text-xs font-semibold flex items-center gap-1">
                                    <Edit className="w-3 h-3" />
                                    Escritura
                                  </span>
                                )}
                                {permission.can_delete && (
                                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded text-xs font-semibold flex items-center gap-1">
                                    <Trash className="w-3 h-3" />
                                    Eliminación
                                  </span>
                                )}
                                {permission.exempt_from_dictionary && (
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:text-purple-200 rounded text-xs font-semibold flex items-center gap-1">
                                    <Book className="w-3 h-3" />
                                    Sin Diccionario
                                  </span>
                                )}
                                {permission.can_create_directories !== undefined && !permission.can_create_directories && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:text-yellow-200 rounded text-xs font-semibold flex items-center gap-1">
                                    <FolderPlus className="w-3 h-3" />
                                    Sin Crear Directorios
                                  </span>
                                )}
                              </div>

                              {/* Granular Permissions Info */}
                              {(permission.blocked_paths && permission.blocked_paths.length > 0) ||
                               (permission.read_only_subdirs && permission.read_only_subdirs.length > 0) ||
                               (permission.max_depth !== null && permission.max_depth !== undefined) ? (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Layers className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Restricciones de Herencia:</span>
                                  </div>

                                  <div className="space-y-3">
                                    {/* Blocked Paths */}
                                    {permission.blocked_paths && permission.blocked_paths.length > 0 && (
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1">
                                          <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                                          Rutas Bloqueadas ({permission.blocked_paths.length}):
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                          {permission.blocked_paths.map((path, idx) => (
                                            <div key={idx} className="flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded px-2 py-1">
                                              <Lock className="w-3 h-3 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                              <span className="text-xs font-mono text-red-900 break-all">{path}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Read Only Paths */}
                                    {permission.read_only_subdirs && permission.read_only_subdirs.length > 0 && (
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1">
                                          <Eye className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                                          Rutas de Solo Lectura ({permission.read_only_subdirs.length}):
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                          {permission.read_only_subdirs.map((path, idx) => (
                                            <div key={idx} className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded px-2 py-1">
                                              <Eye className="w-3 h-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                                              <span className="text-xs font-mono text-yellow-900 break-all">{path}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Max Depth */}
                                    {permission.max_depth !== null && permission.max_depth !== undefined && (
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1">
                                          <GitBranch className="w-3 h-3 text-orange-600" />
                                          Profundidad Limitada:
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                                          <GitBranch className="w-3 h-3" />
                                          <strong>Niveles permitidos:</strong> {permission.max_depth}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                permission.inheritance_mode === 'total' && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                      <Layers className="w-4 h-4 text-green-600 dark:text-green-400" />
                                      <span className="text-xs text-green-700 dark:text-green-300 font-semibold">Herencia Total (Sin restricciones)</span>
                                    </div>
                                  </div>
                                )
                              )}

                              {/* Edit Permission Level for consultation_edit */}
                              {permission.edit_permission_level && (
                                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                                  <strong>Nivel de edición:</strong>{' '}
                                  {permission.edit_permission_level === 'upload_only' && 'Solo subir archivos'}
                                  {permission.edit_permission_level === 'upload_own' && 'Subir + Editar/Eliminar propios'}
                                  {permission.edit_permission_level === 'upload_all' && 'Subir + Editar/Eliminar todos'}
                                </div>
                              )}

                              {/* Notes */}
                              {permission.notes && (
                                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                                  <div className="text-xs text-gray-700 dark:text-gray-200">
                                    <strong>Notas:</strong> {permission.notes}
                                  </div>
                                </div>
                              )}

                              <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2 space-y-1">
                                <div>
                                  Otorgado por <strong>{permission.granted_by}</strong> el{' '}
                                  {formatDate(permission.granted_at)}
                                </div>
                                {permission.expires_at && (
                                  <div className="text-orange-700 font-semibold">
                                    ⏰ Vence: {formatDate(permission.expires_at)}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleResendEmail(permission)}
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:text-purple-200 transition-colors p-2"
                                title="Reenviar correo de permisos"
                              >
                                <Mail className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDownloadExcel(permission)}
                                className="text-emerald-600 hover:text-emerald-800 transition-colors p-2"
                                title="Descargar Excel de este permiso"
                              >
                                <FileSpreadsheet className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleViewPermission(permission)}
                                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:text-green-200 transition-colors p-2"
                                title="Ver detalles completos"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleEditPermission(permission)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 dark:text-blue-200 transition-colors p-2"
                                title="Editar permiso"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeletePermission(permission)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-200 transition-colors p-2"
                                title="Eliminar acceso"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-semibold">Selecciona un usuario</p>
                <p className="text-sm">Elige un usuario de la lista para gestionar sus permisos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Bulk Assignment */}
      {activeTab === 'bulk' && (
        <div className="py-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Asignación Masiva de Permisos</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Asigna permisos a múltiples usuarios y múltiples rutas de forma simultánea
              </p>
            </div>
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva Asignación Masiva
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Asignación Masiva de Permisos
            </h4>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Haz clic en "Nueva Asignación Masiva" para asignar permisos a múltiples usuarios y
              rutas de una sola vez
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-300 text-left max-w-md mx-auto space-y-2">
              <li>✓ Selecciona múltiples usuarios a la vez</li>
              <li>✓ Asigna múltiples rutas simultáneamente</li>
              <li>✓ Configura permisos granulares</li>
              <li>✓ Agrupa asignaciones para gestión futura</li>
              <li>✓ Un solo email por usuario con todas las rutas</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab Content: Groups Management */}
      {activeTab === 'groups' && (
        <div className="py-4">
          <GroupManagement />
        </div>
      )}

      {/* Bulk Assignment Modal */}
      <BulkPermissionAssignment
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          setIsBulkModalOpen(false);
          if (activeTab === 'individual' && selectedUser) {
            loadUserPermissions(selectedUser.id);
          }
        }}
      />

      {/* Assign Permission Modal */}
      {selectedUser && (
        <AssignPermissionModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          user={selectedUser as any}
          onSuccess={() => {
            if (selectedUser) {
              loadUserPermissions(selectedUser.id);
            }
          }}
        />
      )}

      {/* Edit Permission Modal */}
      {permissionToEdit && (
        <EditPermissionModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setPermissionToEdit(null);
          }}
          permission={permissionToEdit as any}
          onSuccess={() => {
            if (selectedUser) {
              loadUserPermissions(selectedUser.id);
            }
          }}
        />
      )}

      {/* View Permission Modal */}
      {permissionToView && (
        <ViewPermissionModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setPermissionToView(null);
          }}
          permission={permissionToView as any}
          onEdit={() => {
            setIsViewModalOpen(false);
            setPermissionToEdit(permissionToView);
            setPermissionToView(null);
            setIsEditModalOpen(true);
          }}
        />
      )}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};
