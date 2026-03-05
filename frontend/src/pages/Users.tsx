import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon,
  Loader2,
  UserPlus,
  Edit,
  Trash2,
  Power,
  History,
  Download,
  Filter,
  X,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  FileText,
  Globe,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { usersApi } from '../api';
import { useAuthStore } from '../store/authStore';
import type { User, AuditLog } from '../types';

export const Users = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);

  // Filtros de tabla de usuarios
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Filtros de auditoría
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterSuccess, setFilterSuccess] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Form para editar usuario
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: '',
    is_active: true,
  });

  // Toast notification
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
    title: string;
  }>({
    show: false,
    type: 'success',
    message: '',
    title: '',
  });

  const showToast = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => {
      setToast({ show: false, type: 'success', title: '', message: '' });
    }, 4000);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Aplicar filtros dinámicamente cuando cambien
  useEffect(() => {
    if (selectedUser && showAuditModal) {
      loadAuditLogs(selectedUser.id);
    }
  }, [filterAction, filterSuccess, filterStartDate, filterEndDate]);

  const loadUsers = async () => {
    try {
      const response = await usersApi.getAll();
      // La respuesta de Django REST Framework viene con paginación: {count, next, previous, results}
      if (response && Array.isArray(response.results)) {
        setUsers(response.results);
      } else if (Array.isArray(response)) {
        setUsers(response);
      } else {
        console.error('Unexpected response format:', response);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (userId: number) => {
    setLoadingAudit(true);
    try {
      const params: any = {};
      if (filterAction) params.action = filterAction;
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;

      let logs = await usersApi.getAuditLogs(userId, params);

      // Filtrar por success/error en frontend si es necesario
      if (filterSuccess === 'success') {
        logs = logs.filter((log: AuditLog) => log.success);
      } else if (filterSuccess === 'error') {
        logs = logs.filter((log: AuditLog) => !log.success);
      }

      setAuditLogs(logs);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Filtrar usuarios según búsqueda y filtros
  const getFilteredUsers = () => {
    return users.filter((user) => {
      // Filtro de búsqueda (username, nombre completo, email)
      const matchesSearch = searchTerm === '' ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de rol
      const matchesRole = filterRole === '' || user.role === filterRole;

      // Filtro de estado
      const matchesStatus = filterStatus === '' ||
        (filterStatus === 'active' && user.is_active) ||
        (filterStatus === 'inactive' && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  };

  // Limpiar todos los filtros de usuarios
  const handleClearUserFilters = () => {
    setSearchTerm('');
    setFilterRole('');
    setFilterStatus('');
  };

  const handleViewAudit = async (user: User) => {
    setSelectedUser(user);
    setShowAuditModal(true);
    await loadAuditLogs(user.id);
  };

  const handleCloseModal = () => {
    setShowAuditModal(false);
    setSelectedUser(null);
    setAuditLogs([]);
    setFilterAction('');
    setFilterSuccess('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleClearFilters = () => {
    setFilterAction('');
    setFilterSuccess('');
    setFilterStartDate('');
    setFilterEndDate('');
    if (selectedUser) {
      loadAuditLogs(selectedUser.id);
    }
  };

  const handleExportCSV = () => {
    if (auditLogs.length === 0) return;

    const headers = ['Fecha/Hora', 'Acción', 'Archivo/Ruta', 'Estado', 'Tamaño', 'IP', 'Detalles'];
    const rows = auditLogs.map((log) => [
      formatDateTime(log.timestamp),
      getActionLabel(log.action),
      log.target_name || log.target_path || '-',
      log.success ? 'Éxito' : 'Error',
      log.file_size ? formatFileSize(log.file_size) : '-',
      log.ip_address || '-',
      log.error_message || JSON.stringify(log.details) || '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Agregar BOM UTF-8 para que Excel maneje correctamente caracteres latinos
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `auditoria_${selectedUser?.username}_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.click();
  };

  const handleToggleStatus = (user: User) => {
    setUserToToggle(user);
    setShowToggleModal(true);
  };

  const confirmToggleStatus = async () => {
    if (!userToToggle) return;

    try {
      const response = await usersApi.toggleStatus(userToToggle.id);

      if (response.success) {
        // Actualizar el estado localmente de inmediato
        const newStatus = !userToToggle.is_active;
        setUsers(users.map(u =>
          u.id === userToToggle.id ? { ...u, is_active: newStatus } : u
        ));

        const statusText = newStatus ? 'activado' : 'desactivado';
        setShowToggleModal(false);
        showToast(
          'success',
          'Estado actualizado',
          `Usuario ${userToToggle.username} ${statusText} exitosamente`
        );
      } else {
        setShowToggleModal(false);
        showToast(
          'error',
          'Error al cambiar estado',
          'La operación no se completó exitosamente'
        );
      }
    } catch (err: any) {
      setShowToggleModal(false);
      showToast(
        'error',
        'Error al cambiar estado',
        err.response?.data?.message || err.message || 'No se pudo cambiar el estado del usuario'
      );
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      const response = await usersApi.update(selectedUser.id, editForm as any);
      // Backend returns { message, user } directly
      // Actualizar localmente con datos del servidor
      setUsers(users.map(u =>
        u.id === selectedUser.id ? (response.user || { ...u, ...editForm }) : u
      ) as any);
      setShowEditModal(false);
      showToast('success', 'Usuario actualizado', `Los datos de ${editForm.username} se actualizaron correctamente`);
    } catch (err: any) {
      showToast('error', 'Error al actualizar', err.response?.data?.message || 'No se pudo actualizar el usuario');
    }
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    try {
      const response = await usersApi.delete(selectedUser.id);
      if (response.success) {
        // Eliminar localmente
        setUsers(users.filter(u => u.id !== selectedUser.id));
        setShowDeleteModal(false);
        showToast('success', 'Usuario eliminado', `El usuario ${selectedUser.username} fue eliminado exitosamente`);
      }
    } catch (err: any) {
      showToast('error', 'Error al eliminar', err.response?.data?.message || 'No se pudo eliminar el usuario');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600';
      case 'admin':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600';
      case 'consultation_edit':
        return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600';
      case 'consultation':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600';
    }
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      upload: 'Subir Archivo',
      download: 'Descargar',
      delete: 'Eliminar',
      rename: 'Renombrar',
      create_folder: 'Crear Carpeta',
      move: 'Mover',
      copy: 'Copiar',
      login: 'Inicio de Sesión',
      logout: 'Cierre de Sesión',
    };
    return labels[action] || action;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
      case 'logout':
        return <Activity className="w-4 h-4" />;
      case 'upload':
        return <TrendingUp className="w-4 h-4 rotate-90" />;
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      case 'rename':
        return <Edit className="w-4 h-4" />;
      case 'move':
        return <Activity className="w-4 h-4 text-orange-600" />;
      case 'copy':
        return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'create_folder':
        return <UsersIcon className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Nunca';
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Estadísticas del usuario
  const getUserStats = () => {
    if (auditLogs.length === 0) return null;

    const totalActions = auditLogs.length;
    const successActions = auditLogs.filter((log) => log.success).length;
    const errorActions = auditLogs.filter((log) => !log.success).length;
    const lastIP = auditLogs[0]?.ip_address || 'N/A';
    const totalUploads = auditLogs.filter((log) => log.action === 'upload').length;
    const totalDownloads = auditLogs.filter((log) => log.action === 'download').length;

    return {
      totalActions,
      successActions,
      errorActions,
      successRate: ((successActions / totalActions) * 100).toFixed(1),
      lastIP,
      totalUploads,
      totalDownloads,
    };
  };

  const stats = getUserStats();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <UsersIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Administra usuarios y consulta historial completo de auditoría
                </p>
              </div>
            </div>
            {currentUser?.role === 'superadmin' && (
              <button
                onClick={() => navigate('/administracion')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span>Nuevo Usuario</span>
              </button>
            )}
          </div>

          {/* Barra de Búsqueda y Filtros */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
            {/* Búsqueda */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Buscar Usuario
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre de usuario, nombre completo o email..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Filtro de Rol */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Filtrar por Rol
                </label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
                  <option value="">Todos los roles</option>
                  <option value="superadmin">Superadmin</option>
                  <option value="admin">Admin</option>
                  <option value="consultation">Consulta</option>
                  <option value="consultation_edit">Consulta + Edición</option>
                </select>
              </div>

              {/* Filtro de Estado */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Filtrar por Estado
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>

              {/* Botón Limpiar Filtros */}
              <div className="flex items-end">
                <button
                  onClick={handleClearUserFilters}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors flex items-center gap-2"
                  disabled={searchTerm === '' && filterRole === '' && filterStatus === ''}
                >
                  <X className="w-5 h-5" />
                  <span>Limpiar Filtros</span>
                </button>
              </div>
            </div>

            {/* Contador de resultados */}
            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>
                Mostrando <strong>{getFilteredUsers().length}</strong> de <strong>{users.length}</strong> usuarios
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Último Acceso
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {getFilteredUsers().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          <UsersIcon className="w-16 h-16 text-gray-300 mb-4" />
                          <p className="text-lg font-semibold">No se encontraron usuarios</p>
                          <p className="text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    getFilteredUsers().map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{user.username}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">{user.full_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.is_active
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-600'
                              : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-600'
                          }`}
                        >
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          {formatDate(user.last_login)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewAudit(user)}
                            className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Ver Historial Completo"
                          >
                            <History className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.is_active
                                ? 'text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-200 hover:bg-red-50 dark:bg-red-900/30'
                                : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:text-green-200 hover:bg-green-50 dark:bg-green-900/30'
                            }`}
                            title={user.is_active ? 'Desactivar Usuario' : 'Activar Usuario'}
                          >
                            <Power className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:text-green-200 p-2 hover:bg-green-50 dark:bg-green-900/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-200 p-2 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Auditoría */}
      {showAuditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white dark:bg-gray-800 bg-opacity-20 p-3 rounded-xl">
                    <History className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Historial de Auditoría</h3>
                    <p className="text-indigo-100 mt-1">
                      Usuario: <strong>{selectedUser.username}</strong> ({selectedUser.full_name})
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:bg-white dark:bg-gray-800 hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Estadísticas */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 px-8 py-6 bg-gray-50 dark:bg-gray-900 border-b">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-xs mb-1">
                    <Activity className="w-4 h-4" />
                    Total Acciones
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalActions}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs mb-1">
                    <CheckCircle className="w-4 h-4" />
                    Exitosas
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.successActions}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs mb-1">
                    <XCircle className="w-4 h-4" />
                    Errores
                  </div>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.errorActions}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs mb-1">
                    <TrendingUp className="w-4 h-4" />
                    Tasa Éxito
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.successRate}%</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs mb-1">
                    <Download className="w-4 h-4" />
                    Subidas
                  </div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.totalUploads}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-600 text-xs mb-1">
                    <Download className="w-4 h-4 rotate-180" />
                    Descargas
                  </div>
                  <div className="text-2xl font-bold text-orange-700">{stats.totalDownloads}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-xs mb-1">
                    <Globe className="w-4 h-4" />
                    Última IP
                  </div>
                  <div className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate">
                    {stats.lastIP}
                  </div>
                </div>
              </div>
            )}

            {/* Filtros */}
            <div className="px-8 py-4 bg-white dark:bg-gray-800 border-b">
              <div className="flex items-center gap-3 mb-3">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Filtros de Auditoría</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Acción</label>
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Todas</option>
                    <option value="login">Inicio de Sesión</option>
                    <option value="logout">Cierre de Sesión</option>
                    <option value="upload">Subir Archivo</option>
                    <option value="download">Descargar</option>
                    <option value="delete">Eliminar</option>
                    <option value="rename">Renombrar</option>
                    <option value="create_folder">Crear Carpeta</option>
                    <option value="move">Mover</option>
                    <option value="copy">Copiar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Estado</label>
                  <select
                    value={filterSuccess}
                    onChange={(e) => setFilterSuccess(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Todos</option>
                    <option value="success">Exitosas</option>
                    <option value="error">Con Errores</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    Limpiar Filtros
                  </button>
                  <button
                    onClick={handleExportCSV}
                    disabled={auditLogs.length === 0}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    title="Exportar a CSV"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Contenido del Modal - Tabla de Logs */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {loadingAudit ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 font-medium">No se encontraron registros</p>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-2">
                    Intenta ajustar los filtros para ver más resultados
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`border rounded-lg p-4 ${
                        log.success
                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                          : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 hover:border-red-400'
                      } transition-colors`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div
                            className={`p-2 rounded-lg ${
                              log.success ? 'bg-indigo-100 text-indigo-700' : 'bg-red-200 text-red-800 dark:text-red-200'
                            }`}
                          >
                            {getActionIcon(log.action)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {getActionLabel(log.action)}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  log.success
                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                                    : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                                }`}
                              >
                                {log.success ? 'Éxito' : 'Error'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              {log.target_name && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-300">Archivo: </span>
                                  <span className="font-mono text-gray-900 dark:text-white">{log.target_name}</span>
                                </div>
                              )}
                              {log.target_path && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-300">Ruta: </span>
                                  <span className="font-mono text-gray-900 dark:text-white text-xs">
                                    {log.target_path}
                                  </span>
                                </div>
                              )}
                              {log.file_size && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-300">Tamaño: </span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {formatFileSize(log.file_size)}
                                  </span>
                                </div>
                              )}
                              {log.ip_address && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-300">IP: </span>
                                  <span className="font-mono text-gray-900 dark:text-white">{log.ip_address}</span>
                                </div>
                              )}
                              {log.error_message && (
                                <div className="col-span-2">
                                  <span className="text-red-600 dark:text-red-400 font-semibold">Error: </span>
                                  <span className="text-red-800 dark:text-red-200">{log.error_message}</span>
                                </div>
                              )}
                              {log.action === 'rename' && log.details && (
                                <div className="col-span-2 mt-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded p-2">
                                  <p className="text-xs text-gray-700 dark:text-gray-200">
                                    <span className="font-semibold text-red-700 dark:text-red-300">De:</span>{' '}
                                    <span className="font-mono">{log.details.old_name || 'N/A'}</span>
                                  </p>
                                  <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">
                                    <span className="font-semibold text-green-700 dark:text-green-300">A:</span>{' '}
                                    <span className="font-mono">{log.details.new_name || log.target_name || 'N/A'}</span>
                                  </p>
                                </div>
                              )}
                              {(log.action === 'copy' || log.action === 'move') && log.details && (
                                <div className="col-span-2 mt-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-3">
                                  <div className="space-y-2">
                                    <div>
                                      <span className="font-semibold text-blue-900 text-xs">Origen:</span>
                                      <p className="font-mono text-xs text-blue-800 dark:text-blue-200 mt-0.5 break-all">
                                        {log.details.source_path || log.target_path || 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-green-900 text-xs">Destino:</span>
                                      <p className="font-mono text-xs text-green-800 dark:text-green-200 mt-0.5 break-all">
                                        {log.details.dest_path || 'N/A'}
                                      </p>
                                    </div>
                                    {log.details.is_directory && (
                                      <div className="flex items-center space-x-2 text-xs text-indigo-700 mt-1">
                                        <UsersIcon className="w-3 h-3" />
                                        <span>
                                          Directorio ({log.details.file_count || 0} archivos)
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {log.action === 'delete' && log.details && log.details.deleted_path && (
                                <div className="col-span-2 mt-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-2">
                                  <p className="text-xs text-gray-700 dark:text-gray-200">
                                    <span className="font-semibold text-red-700 dark:text-red-300">Ruta eliminada:</span>{' '}
                                    <span className="font-mono text-red-800 dark:text-red-200">{log.details.deleted_path}</span>
                                  </p>
                                  {log.details.is_directory && (
                                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                      <span className="font-semibold">Tipo:</span> Directorio
                                      {log.details.file_count && ` (${log.details.file_count} archivos)`}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-600 dark:text-gray-300 ml-4">
                          <div className="flex items-center gap-2 justify-end">
                            <Calendar className="w-4 h-4" />
                            {formatDateTime(log.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900 border-t rounded-b-2xl flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Mostrando <strong>{auditLogs.length}</strong> registro(s)
              </p>
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Editar Usuario</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="usuario123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="usuario@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Admin / Líder</option>
                  <option value="consultation_edit">Consulta y Edición</option>
                  <option value="consultation">Solo Consulta</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Usuario Activo</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Guardar Cambios
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Activar/Desactivar Usuario */}
      {showToggleModal && userToToggle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    userToToggle.is_active
                      ? 'bg-red-100 dark:bg-red-900/50'
                      : 'bg-green-100 dark:bg-green-900/50'
                  }`}
                >
                  <Power
                    className={`w-6 h-6 ${
                      userToToggle.is_active ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}
                  />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {userToToggle.is_active ? 'Desactivar Usuario' : 'Activar Usuario'}
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-200 text-lg">
                ¿Estás seguro de que deseas{' '}
                <strong className={userToToggle.is_active ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                  {userToToggle.is_active ? 'desactivar' : 'activar'}
                </strong>{' '}
                al usuario <strong>{userToToggle.username}</strong>?
              </p>

              <div
                className={`p-4 rounded-lg border ${
                  userToToggle.is_active
                    ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                    : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    userToToggle.is_active ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'
                  }`}
                >
                  {userToToggle.is_active
                    ? '⚠️ Se DESACTIVARÁ su acceso al sistema inmediatamente'
                    : '✓ Se ACTIVARÁ su acceso al sistema inmediatamente'}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={confirmToggleStatus}
                  className={`flex-1 px-6 py-3 text-white rounded-lg transition-colors font-medium ${
                    userToToggle.is_active
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {userToToggle.is_active ? 'Sí, Desactivar' : 'Sí, Activar'}
                </button>
                <button
                  onClick={() => setShowToggleModal(false)}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar Usuario */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="w-8 h-8" />
                <h2 className="text-2xl font-bold">Confirmar Eliminación</h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-200">
                ¿Estás seguro de que deseas eliminar al usuario{' '}
                <strong>{selectedUser?.username}</strong>?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-200 dark:border-red-700">
                <strong>Advertencia:</strong> Esta acción no se puede deshacer. Se eliminarán todos
                los datos asociados al usuario.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Eliminar Usuario
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
          <div
            className={`
              min-w-[320px] max-w-md rounded-xl shadow-2xl border-l-4 p-4 bg-white dark:bg-gray-800
              ${toast.type === 'success' ? 'border-green-500' : ''}
              ${toast.type === 'error' ? 'border-red-500' : ''}
              ${toast.type === 'warning' ? 'border-yellow-500' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={`
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  ${toast.type === 'success' ? 'bg-green-100 dark:bg-green-900/50' : ''}
                  ${toast.type === 'error' ? 'bg-red-100 dark:bg-red-900/50' : ''}
                  ${toast.type === 'warning' ? 'bg-yellow-100' : ''}
                `}
              >
                {toast.type === 'success' && (
                  <CheckCircle
                    className={`w-6 h-6 ${
                      toast.type === 'success' ? 'text-green-600 dark:text-green-400' : ''
                    }`}
                  />
                )}
                {toast.type === 'error' && (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
                {toast.type === 'warning' && (
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-0.5">
                <h4
                  className={`
                    font-semibold text-base mb-1
                    ${toast.type === 'success' ? 'text-green-900' : ''}
                    ${toast.type === 'error' ? 'text-red-900' : ''}
                    ${toast.type === 'warning' ? 'text-yellow-900' : ''}
                  `}
                >
                  {toast.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{toast.message}</p>
              </div>

              {/* Close button */}
              <button
                onClick={() => setToast({ ...toast, show: false })}
                className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`
                  h-full rounded-full animate-progress
                  ${toast.type === 'success' ? 'bg-green-500' : ''}
                  ${toast.type === 'error' ? 'bg-red-500' : ''}
                  ${toast.type === 'warning' ? 'bg-yellow-500' : ''}
                `}
                style={{
                  animation: 'progress 4s linear forwards',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </Layout>
  );
};
