import { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Mail, Shield, CheckCircle, XCircle, Loader2, AlertCircle, History, FileText, Download } from 'lucide-react';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { UserAuditModal } from './UserAuditModal';
import { getRoleLabel, getRoleColor } from '../../utils/roleUtils';
import type { UserRole } from '../../types/user';
import { useToast } from '../../hooks/useToast';
import { useModal } from '../../hooks/useModal';
import { ToastContainer } from '../Toast';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export const UserManagement = () => {
  const toast = useToast();
  const { confirm } = useModal();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // CSV Report Generation
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');

      // TODO: Reemplazar con endpoint real
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
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = await confirm({
      title: 'Eliminar usuario',
      message: `¿Está seguro de eliminar al usuario "${user.username}"?\n\nEsta acción no se puede deshacer y se eliminarán todos sus permisos.`,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al eliminar usuario');
      }

      toast.success(`Usuario "${user.username}" eliminado exitosamente.`);
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar usuario');
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleViewAudit = (user: User) => {
    setSelectedUser(user);
    setIsAuditModalOpen(true);
  };

  const handleResendCredentials = async (user: User) => {
    const confirmed = await confirm({
      title: 'Reenviar credenciales',
      message: `¿Enviar credenciales nuevamente a ${user.email}?\n\nSe generará una nueva contraseña temporal.`,
      type: 'info',
      confirmText: 'Enviar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/users/${user.id}/resend-credentials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al enviar credenciales');
      }

      toast.success(`Credenciales enviadas a ${user.email}`);
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar credenciales');
    }
  };

  const handleGenerateReport = async (userIds: number[]) => {
    if (userIds.length === 0) return;

    try {
      setGeneratingReport(true);

      const response = await fetch('/api/admin/users/generate-permissions-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_ids: userIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar reporte');
      }

      // Descargar el archivo CSV
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_permisos_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Limpiar selección si fue reporte masivo
      if (userIds.length > 1) {
        setSelectedUserIds([]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al generar reporte');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleToggleUserSelection = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleToggleAllUsers = () => {
    const filteredUsers = getFilteredUsers();
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Nunca';
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar usuarios por nombre, email o username..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
        >
          <UserPlus className="w-5 h-5" />
          Registrar Usuario
        </button>
      </div>

      {/* User List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">Cargando usuarios...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          <span className="ml-3 text-red-600 dark:text-red-400">{error}</span>
        </div>
      ) : getFilteredUsers().length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-semibold mb-2">
            {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
          </p>
          {!searchTerm && (
            <p>Haz clic en "Registrar Usuario" para crear el primero.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={getFilteredUsers().length > 0 && selectedUserIds.length === getFilteredUsers().length}
                    onChange={handleToggleAllUsers}
                    className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
                    title="Seleccionar todos"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Último Acceso
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {getFilteredUsers().map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors">
                  <td className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleToggleUserSelection(user.id)}
                      className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{user.username}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {user.first_name} {user.last_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-semibold">Activo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-semibold">Inactivo</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{formatDate(user.last_login)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleGenerateReport([user.id])}
                        className="text-emerald-600 hover:text-emerald-800 transition-colors p-2"
                        title="Generar reporte de permisos"
                        disabled={generatingReport}
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleViewAudit(user)}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors p-2"
                        title="Ver historial de auditoría"
                      >
                        <History className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-2"
                        title="Editar usuario"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleResendCredentials(user)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors p-2"
                        title="Reenviar credenciales"
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors p-2"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Action Button for Bulk Report */}
      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-8 right-8 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-emerald-500 overflow-hidden">
            <div className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-gray-800 bg-opacity-20 rounded-full p-2">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-lg">
                    {selectedUserIds.length} usuario{selectedUserIds.length !== 1 ? 's' : ''} seleccionado{selectedUserIds.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-emerald-100">
                    Generar reporte consolidado de permisos
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 flex gap-3">
              <button
                onClick={() => handleGenerateReport(selectedUserIds)}
                disabled={generatingReport}
                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg dark:shadow-gray-900/50"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Generar Reporte CSV
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedUserIds([])}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-semibold"
                title="Cancelar selección"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadUsers}
      />

      {selectedUser && (
        <>
          <EditUserModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
            onSuccess={loadUsers}
          />

          <UserAuditModal
            isOpen={isAuditModalOpen}
            onClose={() => {
              setIsAuditModalOpen(false);
              setSelectedUser(null);
            }}
            user={selectedUser}
          />
        </>
      )}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};
// Force recompile
