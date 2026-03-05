import React, { useState, useEffect } from 'react';
import { usersApi } from '../../api/users';
import { UserAutocompleteSelector } from './UserAutocompleteSelector';
import { RouteMultiInput, type RouteConfig } from './RouteMultiInput';
import type { User } from '../../types/user';
import { useToast } from '../../hooks/useToast';
import { useModal } from '../../hooks/useModal';
import { ToastContainer } from '../../components/Toast';

interface Group {
  group_name: string;
  user_count: number;
  route_count: number;
  total_permissions: number;
  created_at: string;
  granted_by: string;
  expires_at: string;
  user_emails?: string[]; // Lista de emails de usuarios en el grupo (para búsqueda)
}

export const GroupManagement: React.FC = () => {
  const toast = useToast();
  const { confirm } = useModal();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);
  const [showAddRoutesModal, setShowAddRoutesModal] = useState(false);
  const [showEditExpirationModal, setShowEditExpirationModal] = useState(false);
  const [showEditRouteModal, setShowEditRouteModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  // Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    title: string;
    message: string;
    stats?: { label: string; value: number; color: string }[];
    details?: string;
  } | null>(null);

  // Estados de formularios
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [newRoutes, setNewRoutes] = useState<RouteConfig[]>([]);
  const [newExpiration, setNewExpiration] = useState('');
  const [routePermissions, setRoutePermissions] = useState<any>({});

  // Modal de confirmación de notificaciones para agregar rutas
  const [showNotificationConfirmModal, setShowNotificationConfirmModal] = useState(false);
  // Modal de confirmación de notificaciones para actualizar permisos de ruta
  const [showUpdateRouteNotificationModal, setShowUpdateRouteNotificationModal] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const showSuccess = (
    title: string,
    message: string,
    stats?: { label: string; value: number; color: string }[],
    details?: string
  ) => {
    setSuccessModalData({ title, message, stats, details });
    setShowSuccessModal(true);
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessModalData(null);
  };

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
      green: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
      red: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
      yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
    };
    return colorMap[color] || colorMap.blue;
  };

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await usersApi.listGroups();
      setGroups(response.groups);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Error al cargar grupos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (groupName: string) => {
    setSelectedGroup(groupName);
    setLoadingDetails(true);
    try {
      const response = await usersApi.getGroupPermissions(groupName);
      setGroupDetails(response);
    } catch (error) {
      console.error('Error loading group details:', error);
      toast.error('Error al cargar detalles del grupo');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownloadGroupExcel = async (groupName: string) => {
    try {
      const response = await fetch(`/api/admin/groups/${encodeURIComponent(groupName)}/download-excel/`, {
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
      let filename = `permisos_repositorio_${groupName}.xlsx`;
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

  const handleDeleteGroup = async (groupName: string) => {
    const confirmed = await confirm({
      title: 'Eliminar grupo',
      message: `¿Está seguro de eliminar el grupo "${groupName}"?\n\nEsto desactivará todos los permisos asociados a este grupo.`,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await usersApi.deleteGroup(groupName);

      // Mostrar modal de éxito profesional
      showSuccess(
        '¡Grupo Eliminado Exitosamente!',
        `El grupo "${groupName}" ha sido eliminado`,
        [
          { label: 'Permisos Desactivados', value: response.deleted_count || 0, color: 'red' },
          // { label: 'Usuarios Afectados', value: response.users_affected || 0, color: 'orange' },
        ]
      );

      loadGroups();
      if (selectedGroup === groupName) {
        setSelectedGroup(null);
        setGroupDetails(null);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Error al eliminar grupo');
    }
  };

  const handleCloseDetails = () => {
    setSelectedGroup(null);
    setGroupDetails(null);
  };

  // ELIMINAR USUARIO DEL GRUPO
  const handleRemoveUserFromGroup = async (user: any) => {
    const confirmed = await confirm({
      title: 'Eliminar usuario del grupo',
      message: `¿Eliminar a ${user.name} del grupo "${selectedGroup}"?\n\nEl usuario perderá acceso a todas las rutas del grupo.`,
      type: 'warning',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await usersApi.removeUserFromGroup(selectedGroup!, user.id);

      // Mostrar modal de éxito profesional
      showSuccess(
        '¡Usuario Removido Exitosamente!',
        `${user.name} ha sido eliminado del grupo "${selectedGroup}"`,
        [
          { label: 'Usuario Removido', value: 1, color: 'red' },
          { label: 'Permisos Desactivados', value: groupDetails?.routes?.length || 0, color: 'orange' },
        ]
      );

      handleViewDetails(selectedGroup!);
      loadGroups();
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  // ELIMINAR GRUPO COMPLETO (desde el footer del modal)
  const handleDeleteGroupFromModal = async () => {
    if (!selectedGroup) return;
    await handleDeleteGroup(selectedGroup);
  };

  // AGREGAR USUARIOS
  const handleAddUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.warning('Debe seleccionar al menos un usuario');
      return;
    }

    // Prevenir envíos duplicados
    if (loading) return;

    try {
      setLoading(true);
      const response = await usersApi.addUsersToGroup(
        selectedGroup!,
        selectedUsers.map((u) => u.id)
      );
      setShowAddUsersModal(false);
      setSelectedUsers([]);

      // Mostrar modal de éxito profesional
      showSuccess(
        '¡Usuarios Agregados Exitosamente!',
        '¡Usuarios agregados al grupo exitosamente!',
        [
          { label: 'Usuarios Agregados', value: selectedUsers.length, color: 'blue' },
          // { label: 'Permisos Creados', value: response.permissions_created || 0, color: 'green' },
          // { label: 'Emails Enviados', value: response.users_notified || 0, color: 'purple' },
        ],
        `Grupo: ${selectedGroup}`
      );

      handleViewDetails(selectedGroup!);
      loadGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al agregar usuarios');
    } finally {
      setLoading(false);
    }
  };

  // AGREGAR RUTAS
  const handleAddRoutes = () => {
    if (newRoutes.length === 0) {
      toast.warning('Debe agregar al menos una ruta');
      return;
    }

    // Mostrar modal de confirmación de notificaciones
    setShowNotificationConfirmModal(true);
  };

  const handleActualAddRoutes = async (notifyUsers: boolean, notifyLeader: boolean) => {
    setShowNotificationConfirmModal(false);

    try {
      const response = await usersApi.addRoutesToGroup(selectedGroup!, newRoutes, notifyUsers, notifyLeader);
      setShowAddRoutesModal(false);
      setNewRoutes([]);

      // Preparar stats para el modal de éxito
      const stats = [
        { label: 'Rutas Agregadas', value: response.new_routes_count, color: 'green' },
        { label: 'Usuarios Afectados', value: response.users_affected, color: 'purple' },
      ];

      if (response.emails_sent && response.emails_sent.length > 0) {
        stats.push({ label: 'Emails Enviados', value: response.emails_sent.length, color: 'blue' });
      }

      // Mostrar modal de éxito profesional
      showSuccess(
        '¡Rutas Agregadas Exitosamente!',
        response.message,
        stats,
        `Grupo: ${selectedGroup}`
      );

      handleViewDetails(selectedGroup!);
      loadGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al agregar rutas');
    }
  };

  // EDITAR PERMISOS DE RUTA
  const handleEditRoutePermissions = (route: string) => {
    setSelectedRoute(route);
    // Obtener permisos actuales de la ruta (del primer usuario, son iguales para todos)
    const routePerms = groupDetails.permissions.find((p: any) => p.base_path === route);
    if (routePerms) {
      setRoutePermissions({
        can_read: routePerms.can_read,
        can_write: routePerms.can_write,
        can_delete: routePerms.can_delete,
        can_create_directories: routePerms.can_create_directories,
        exempt_from_dictionary: routePerms.exempt_from_dictionary,
        edit_permission_level: routePerms.edit_permission_level,
        inheritance_mode: routePerms.inheritance_mode,
        max_depth: routePerms.max_depth,
        blocked_paths: routePerms.blocked_paths || [],
        read_only_paths: routePerms.read_only_paths || [],
        authorized_by_email: routePerms.authorized_by_email || '',
        authorized_by_name: routePerms.authorized_by_name || '',
      });
    }
    setShowEditRouteModal(true);
  };

  // ELIMINAR RUTA DEL GRUPO
  const handleDeleteRoute = async (route: string) => {
    const confirmed = await confirm({
      title: 'Eliminar ruta del grupo',
      message: `¿Eliminar la ruta "${route}" de TODOS los usuarios del grupo "${selectedGroup}"?\n\nEsta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await usersApi.deleteRouteFromGroup(selectedGroup!, route);

      // Mostrar modal de éxito
      showSuccess(
        '¡Ruta Eliminada Exitosamente!',
        response.message,
        [
          { label: 'Permisos Eliminados', value: response.deleted_count, color: 'red' },
          { label: 'Usuarios Afectados', value: response.users_affected, color: 'orange' },
        ],
        `Grupo: ${selectedGroup}\nRuta: ${route}`
      );

      handleViewDetails(selectedGroup!);
      loadGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar ruta');
    }
  };

  const handleSaveRoutePermissions = () => {
    // Mostrar modal de confirmación de notificaciones
    setShowUpdateRouteNotificationModal(true);
  };

  const handleActualUpdateRoutePermissions = async (notifyUsers: boolean, notifyLeader: boolean) => {
    setShowUpdateRouteNotificationModal(false);

    try {
      const response = await usersApi.updateRoutePermissions(
        selectedGroup!,
        selectedRoute!,
        routePermissions,
        notifyUsers,
        notifyLeader
      );
      setShowEditRouteModal(false);
      setSelectedRoute(null);

      // Preparar stats
      const stats = [
        { label: 'Permisos Actualizados', value: response.updated_count || 0, color: 'blue' },
        { label: 'Usuarios Afectados', value: groupDetails.users.length, color: 'purple' },
      ];

      // Agregar stat de emails enviados si hay
      if (response.emails_sent && response.emails_sent.length > 0) {
        stats.push({ label: 'Emails Enviados', value: response.emails_sent.length, color: 'green' });
      }

      // Mostrar modal de éxito profesional
      showSuccess(
        '¡Permisos Actualizados Exitosamente!',
        response.message,
        stats,
        `Ruta: ${selectedRoute}`
      );

      handleViewDetails(selectedGroup!);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al actualizar permisos');
    }
  };

  // EDITAR FECHA DE VENCIMIENTO
  const handleUpdateExpiration = async () => {
    if (!newExpiration) {
      toast.warning('Debe seleccionar una fecha de vencimiento');
      return;
    }

    try {
      const response = await usersApi.updateGroupExpiration(selectedGroup!, newExpiration);
      setShowEditExpirationModal(false);
      setNewExpiration('');

      // Mostrar modal de éxito profesional
      showSuccess(
        '¡Fecha Actualizada Exitosamente!',
        response.message,
        [
          { label: 'Permisos Actualizados', value: response.updated_count || 0, color: 'orange' },
          { label: 'Usuarios Afectados', value: groupDetails.users.length, color: 'purple' },
        ],
        `Nueva fecha: ${new Date(newExpiration).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`
      );

      handleViewDetails(selectedGroup!);
      loadGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al actualizar fecha de vencimiento');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Filtrar grupos basándose en el término de búsqueda
  const filteredGroups = groups.filter((group) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase().trim();

    // Buscar por nombre del grupo
    if (group.group_name.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Buscar por quien lo creó
    if (group.granted_by.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Buscar en emails de usuarios del grupo
    if (group.user_emails && group.user_emails.length > 0) {
      const foundInEmails = group.user_emails.some((email) =>
        email.toLowerCase().includes(searchLower)
      );
      if (foundInEmails) {
        return true;
      }
    }

    return false;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Grupos de Permisos</h3>
        <button
          onClick={loadGroups}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 rounded-lg"
        >
          {loading ? 'Cargando...' : '🔄 Actualizar'}
        </button>
      </div>

      {/* Barra de Búsqueda */}
      {groups.length > 0 && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre de grupo, correo de usuario o creador..."
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg
                className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Contador de resultados */}
      {searchTerm && groups.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded">
          {filteredGroups.length === 0 ? (
            <>
              ❌ No se encontraron grupos que coincidan con "<strong>{searchTerm}</strong>"
            </>
          ) : filteredGroups.length === groups.length ? (
            <>
              ✓ Mostrando todos los grupos ({groups.length})
            </>
          ) : (
            <>
              ✓ Mostrando <strong>{filteredGroups.length}</strong> de {groups.length} grupos
            </>
          )}
        </div>
      )}

      {/* Groups Table */}
      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando grupos...</div>
      )}

      {!loading && groups.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="text-4xl mb-2">📦</div>
          <div>No hay grupos creados todavía</div>
          <div className="text-sm mt-2">
            Los grupos se crean al realizar una asignación masiva de permisos
          </div>
        </div>
      )}

      {!loading && groups.length > 0 && filteredGroups.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="text-4xl mb-2">🔍</div>
          <div>No se encontraron grupos con el criterio de búsqueda</div>
          <div className="text-sm mt-2">
            Intenta con otro término de búsqueda
          </div>
        </div>
      )}

      {!loading && filteredGroups.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Nombre del Grupo
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Usuarios
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Rutas
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Total Permisos
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Creado
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Vencimiento
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => (
                <tr
                  key={group.group_name}
                  className="border-t hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 cursor-pointer"
                  onClick={() => handleViewDetails(group.group_name)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 dark:text-blue-400">🏷️</span>
                      {group.group_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                      {group.user_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                      {group.route_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{group.total_permissions}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <div>{formatDate(group.created_at)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">por {group.granted_by}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {formatDate(group.expires_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadGroupExcel(group.group_name);
                        }}
                        className="px-3 py-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Descargar Excel del grupo"
                      >
                        📊 Excel
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(group.group_name);
                        }}
                        className="px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Group Details Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedGroup}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Administración completa del grupo
                </p>
              </div>
              <button
                onClick={handleCloseDetails}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {loadingDetails && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando detalles...</div>
              )}

              {!loadingDetails && groupDetails && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Usuarios</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {groupDetails.users.length}
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Rutas</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {groupDetails.routes.length}
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Total Permisos</div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {groupDetails.permissions.length}
                      </div>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Vencimiento</div>
                      <div className="text-sm font-bold text-orange-600 dark:text-orange-400 mt-1">
                        {formatDate(groupDetails.permissions[0]?.expires_at || '')}
                      </div>
                      <button
                        onClick={() => setShowEditExpirationModal(true)}
                        className="mt-1 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 underline"
                      >
                        Editar fecha
                      </button>
                    </div>
                  </div>

                  {/* Users Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Usuarios</h3>
                      <button
                        onClick={() => setShowAddUsersModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        + Agregar Usuarios
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {groupDetails.users.map((user: any) => (
                        <div
                          key={user.id}
                          className="p-3 border rounded-lg flex items-center justify-between bg-gray-50 dark:bg-gray-900"
                        >
                          <div>
                            <div className="font-medium text-sm">{user.name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">{user.email}</div>
                          </div>
                          <button
                            onClick={() => handleRemoveUserFromGroup(user)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded text-xs"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Routes Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rutas Asignadas</h3>
                      <button
                        onClick={() => setShowAddRoutesModal(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        + Agregar Rutas
                      </button>
                    </div>
                    <div className="space-y-2">
                      {groupDetails.routes.map((route: string, index: number) => {
                        const routePerm = groupDetails.permissions.find(
                          (p: any) => p.base_path === route
                        );
                        return (
                          <div
                            key={index}
                            className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <div className="font-mono text-sm text-gray-900 dark:text-white font-semibold">
                                {route}
                              </div>
                              {routePerm && (
                                <div className="flex gap-2 mt-2 text-xs flex-wrap">
                                  {routePerm.can_read && (
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">
                                      📖 Lectura
                                    </span>
                                  )}
                                  {routePerm.can_write && (
                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                                      ✏️ Escritura
                                    </span>
                                  )}
                                  {routePerm.can_delete && (
                                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded">
                                      🗑️ Eliminar
                                    </span>
                                  )}
                                  {routePerm.can_create_directories && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:text-purple-300 rounded">
                                      📁 Crear Carpetas
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="ml-4 flex gap-2">
                              <button
                                onClick={() => handleEditRoutePermissions(route)}
                                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              >
                                Editar Permisos
                              </button>
                              <button
                                onClick={() => handleDeleteRoute(route)}
                                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50 dark:bg-gray-900">
              <button
                onClick={handleDeleteGroupFromModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar Grupo Completo
              </button>
              <button
                onClick={handleCloseDetails}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Usuarios */}
      {showAddUsersModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Agregar Usuarios a "{selectedGroup}"
              </h3>
              <button
                onClick={() => {
                  setShowAddUsersModal(false);
                  setSelectedUsers([]);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Los nuevos usuarios recibirán TODAS las rutas del grupo por email.
              </p>
              <UserAutocompleteSelector
                selectedUsers={selectedUsers}
                onUsersChange={setSelectedUsers}
              />
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => {
                  setShowAddUsersModal(false);
                  setSelectedUsers([]);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddUsers}
                disabled={selectedUsers.length === 0 || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Agregando...' : `Agregar ${selectedUsers.length} Usuario(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Rutas */}
      {showAddRoutesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white dark:bg-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Agregar Rutas a "{selectedGroup}"
              </h3>
              <button
                onClick={() => {
                  setShowAddRoutesModal(false);
                  setNewRoutes([]);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Las nuevas rutas se asignarán a TODOS los usuarios del grupo con los mismos
                permisos.
              </p>
              <RouteMultiInput routes={newRoutes} onRoutesChange={setNewRoutes} />
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900 sticky bottom-0">
              <button
                onClick={() => {
                  setShowAddRoutesModal(false);
                  setNewRoutes([]);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddRoutes}
                disabled={newRoutes.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
              >
                Agregar {newRoutes.length} Ruta(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Fecha de Vencimiento */}
      {showEditExpirationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Editar Fecha de Vencimiento</h3>
              <button
                onClick={() => {
                  setShowEditExpirationModal(false);
                  setNewExpiration('');
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Actualizar la fecha de vencimiento de TODOS los permisos del grupo "
                {selectedGroup}".
              </p>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Nueva Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={newExpiration}
                onChange={(e) => setNewExpiration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => {
                  setShowEditExpirationModal(false);
                  setNewExpiration('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateExpiration}
                disabled={!newExpiration}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300"
              >
                Actualizar Fecha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Permisos de Ruta */}
      {showEditRouteModal && selectedRoute && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto my-8">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Editar Permisos de Ruta</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-mono break-all">{selectedRoute}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditRouteModal(false);
                  setSelectedRoute(null);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded">
                ⚠️ Los cambios se aplicarán a <strong>TODOS los usuarios</strong> del grupo para esta ruta.
              </p>

              {/* Permisos Básicos */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Permisos Generales</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={routePermissions.can_read}
                      onChange={(e) =>
                        setRoutePermissions({ ...routePermissions, can_read: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">📖 Lectura</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={routePermissions.can_write}
                      onChange={(e) =>
                        setRoutePermissions({ ...routePermissions, can_write: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">✏️ Escritura</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={routePermissions.can_delete}
                      onChange={(e) =>
                        setRoutePermissions({ ...routePermissions, can_delete: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">🗑️ Eliminación</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={routePermissions.can_create_directories}
                      onChange={(e) =>
                        setRoutePermissions({
                          ...routePermissions,
                          can_create_directories: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">📁 Crear Carpetas</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={routePermissions.exempt_from_dictionary}
                      onChange={(e) =>
                        setRoutePermissions({
                          ...routePermissions,
                          exempt_from_dictionary: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">🔓 Exento de Diccionario</span>
                  </label>
                </div>
              </div>

              {/* Nivel de Edición Granular */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Permisos Granulares</h4>

                {routePermissions.can_write ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Nivel de Edición
                    </label>
                    <select
                      value={routePermissions.edit_permission_level || ''}
                      onChange={(e) =>
                        setRoutePermissions({
                          ...routePermissions,
                          edit_permission_level: e.target.value || null,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Sin restricción</option>
                      <option value="upload_only">Solo Subir Archivos</option>
                      {routePermissions.can_delete && (
                        <>
                          <option value="upload_own">Subir + Editar/Eliminar Propios</option>
                          <option value="upload_all">Subir + Editar/Eliminar Todos</option>
                        </>
                      )}
                    </select>
                    {!routePermissions.can_delete && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        ⚠️ Habilita "Eliminación" para ver más opciones
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300">
                    ℹ️ Habilita "Escritura" para configurar niveles de edición granulares
                  </div>
                )}
              </div>

              {/* Rutas Bloqueadas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                    Rutas Bloqueadas (Sin Acceso)
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Opcional</span>
                </div>
                <PathInputComponent
                  paths={routePermissions.blocked_paths || []}
                  onAdd={(path) =>
                    setRoutePermissions({
                      ...routePermissions,
                      blocked_paths: [...(routePermissions.blocked_paths || []), path],
                    })
                  }
                  onRemove={(index) => {
                    const updated = [...(routePermissions.blocked_paths || [])];
                    updated.splice(index, 1);
                    setRoutePermissions({ ...routePermissions, blocked_paths: updated });
                  }}
                  placeholder="ej: Confidencial/Privado"
                  label="Subdirectorios sin acceso"
                />
              </div>

              {/* Rutas de Solo Lectura */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                    Rutas de Solo Lectura
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Opcional</span>
                </div>
                <PathInputComponent
                  paths={routePermissions.read_only_paths || []}
                  onAdd={(path) =>
                    setRoutePermissions({
                      ...routePermissions,
                      read_only_paths: [...(routePermissions.read_only_paths || []), path],
                    })
                  }
                  onRemove={(index) => {
                    const updated = [...(routePermissions.read_only_paths || [])];
                    updated.splice(index, 1);
                    setRoutePermissions({ ...routePermissions, read_only_paths: updated });
                  }}
                  placeholder="ej: Documentos_Finales"
                  label="Subdirectorios de solo lectura"
                />
              </div>

              {/* Modo de Herencia */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Modo de Herencia
                </label>
                <select
                  value={routePermissions.inheritance_mode}
                  onChange={(e) =>
                    setRoutePermissions({
                      ...routePermissions,
                      inheritance_mode: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="total">Herencia Total</option>
                  {(routePermissions.blocked_paths?.length || 0) > 0 && (
                    <option value="blocked">Herencia con Bloqueos</option>
                  )}
                  <option value="limited_depth">Rango Limitado de Profundidad</option>
                  {(routePermissions.read_only_paths?.length || 0) > 0 && (
                    <option value="partial_write">
                      Herencia Parcial con Restricciones de Escritura
                    </option>
                  )}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {(routePermissions.blocked_paths?.length || 0) === 0 &&
                    (routePermissions.read_only_paths?.length || 0) === 0 && (
                      '💡 Agrega rutas bloqueadas o de solo lectura para más opciones'
                    )}
                  {(routePermissions.blocked_paths?.length || 0) > 0 &&
                    (routePermissions.read_only_paths?.length || 0) === 0 && (
                      '✓ "Herencia con Bloqueos" disponible por tener rutas bloqueadas'
                    )}
                  {(routePermissions.blocked_paths?.length || 0) === 0 &&
                    (routePermissions.read_only_paths?.length || 0) > 0 && (
                      '✓ "Herencia Parcial" disponible por tener rutas de solo lectura'
                    )}
                  {(routePermissions.blocked_paths?.length || 0) > 0 &&
                    (routePermissions.read_only_paths?.length || 0) > 0 && (
                      '✓ Todas las opciones disponibles'
                    )}
                </p>
              </div>

              {/* Profundidad Máxima */}
              {routePermissions.inheritance_mode === 'limited_depth' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Profundidad Máxima (niveles)
                  </label>
                  <input
                    type="number"
                    value={routePermissions.max_depth || ''}
                    onChange={(e) =>
                      setRoutePermissions({
                        ...routePermissions,
                        max_depth: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    min="1"
                    placeholder="ej: 3"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900 sticky bottom-0">
              <button
                onClick={() => {
                  setShowEditRouteModal(false);
                  setSelectedRoute(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRoutePermissions}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successModalData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-scale-in">
            {/* Header con gradiente */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="bg-white dark:bg-gray-800 bg-opacity-20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{successModalData.title}</h2>
                  <p className="text-green-100 mt-1">{successModalData.message}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Estadísticas */}
              {successModalData.stats && successModalData.stats.length > 0 && (
                <div
                  className={`grid gap-4 ${
                    successModalData.stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                  }`}
                >
                  {successModalData.stats.map((stat, index) => {
                    const colors = getColorClasses(stat.color);
                    return (
                      <div key={index} className={`${colors.bg} rounded-xl p-4 text-center`}>
                        <div className={`text-3xl font-bold ${colors.text}`}>{stat.value}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{stat.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Detalles adicionales */}
              {successModalData.details && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">ℹ️</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">Detalles:</span>
                  </div>
                  <div className="text-gray-900 dark:text-white ml-7">{successModalData.details}</div>
                </div>
              )}

              {/* Notificación por email */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📧</span>
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">
                      Notificaciones por Email
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      Los usuarios afectados han recibido notificaciones con los detalles de
                      sus permisos actualizados.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-end">
              <button
                onClick={closeSuccessModal}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-lg dark:shadow-gray-900/50 hover:shadow-xl dark:shadow-gray-900/50 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de notificaciones para agregar rutas */}
      {showNotificationConfirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span>📧</span>
              <span>Confirmar Notificaciones</span>
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
              ¿Desea enviar notificaciones por email sobre las nuevas rutas agregadas al grupo?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleActualAddRoutes(true, true)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Notificar a Usuarios y Líder
              </button>

              <button
                onClick={() => handleActualAddRoutes(true, false)}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Solo Notificar a Usuarios
              </button>

              <button
                onClick={() => handleActualAddRoutes(false, false)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors font-semibold"
              >
                Guardar sin Notificar
              </button>

              <button
                onClick={() => setShowNotificationConfirmModal(false)}
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100 transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de notificaciones para actualizar permisos de ruta */}
      {showUpdateRouteNotificationModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span>📧</span>
              <span>Confirmar Notificaciones</span>
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
              ¿Desea enviar notificaciones por email sobre los permisos modificados en esta ruta?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleActualUpdateRoutePermissions(true, true)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Notificar a Usuarios y Líder
              </button>

              <button
                onClick={() => handleActualUpdateRoutePermissions(true, false)}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Solo Notificar a Usuarios
              </button>

              <button
                onClick={() => handleActualUpdateRoutePermissions(false, false)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors font-semibold"
              >
                Guardar sin Notificar
              </button>

              <button
                onClick={() => setShowUpdateRouteNotificationModal(false)}
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100 transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};

// Componente auxiliar para agregar rutas bloqueadas/solo lectura
const PathInputComponent: React.FC<{
  paths: string[];
  onAdd: (path: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  label: string;
}> = ({ paths, onAdd, onRemove, placeholder, label }) => {
  const [newPath, setNewPath] = useState('');

  const handleAdd = () => {
    if (newPath.trim() !== '') {
      onAdd(newPath.trim());
      setNewPath('');
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
        >
          + Agregar
        </button>
      </div>

      {paths.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {paths.map((path, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border rounded text-xs max-w-full"
            >
              <span className="break-all">{path}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-bold ml-1 flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
