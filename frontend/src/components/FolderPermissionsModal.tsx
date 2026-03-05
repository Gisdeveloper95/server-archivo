/**
 * Modal para mostrar permisos de un directorio
 * Con filtros de búsqueda, rol y tipo de permiso
 */
import React, { useState, useEffect, useMemo } from 'react';
import { X, Shield, User, Check, Loader2, AlertCircle, Search, Filter } from 'lucide-react';
import { fileOpsApi } from '../api/fileOps';
import type { FileItem } from '../types';

interface FolderPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: FileItem | null;
}

interface UserPermission {
  user: {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
  };
  permissions: {
    can_read: boolean;
    can_write: boolean;
    can_delete: boolean;
    exempt_from_dictionary: boolean;
  };
  base_path: string;
  granted_at: string;
  granted_by: string;
}

interface PermissionsData {
  path: string;
  total_users: number;
  permissions: UserPermission[];
}

export const FolderPermissionsModal: React.FC<FolderPermissionsModalProps> = ({
  isOpen,
  onClose,
  folder,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PermissionsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');

  // Cargar permisos cuando se abre el modal
  useEffect(() => {
    if (isOpen && folder) {
      setLoading(true);
      setError(null);
      setData(null);
      // Resetear filtros al abrir
      setSearchQuery('');
      setRoleFilter('all');
      setPermissionFilter('all');

      fileOpsApi.getFolderPermissions(folder.path)
        .then((response) => {
          setData(response);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error loading folder permissions:', err);
          setError(err.response?.data?.error || 'No se pudo cargar la información de permisos');
          setLoading(false);
        });
    }
  }, [isOpen, folder]);

  // Filtrar permisos basado en búsqueda y filtros
  const filteredPermissions = useMemo(() => {
    if (!data?.permissions) return [];

    return data.permissions.filter((perm) => {
      // Filtro de búsqueda (nombre, username, email)
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        perm.user.full_name.toLowerCase().includes(searchLower) ||
        perm.user.username.toLowerCase().includes(searchLower) ||
        perm.user.email.toLowerCase().includes(searchLower);

      // Filtro de rol
      const matchesRole = roleFilter === 'all' || perm.user.role === roleFilter;

      // Filtro de tipo de permiso
      let matchesPermission = true;
      if (permissionFilter === 'read_only') {
        matchesPermission = perm.permissions.can_read && !perm.permissions.can_write && !perm.permissions.can_delete;
      } else if (permissionFilter === 'read_write') {
        matchesPermission = perm.permissions.can_read && perm.permissions.can_write && !perm.permissions.can_delete;
      } else if (permissionFilter === 'full') {
        matchesPermission = perm.permissions.can_read && perm.permissions.can_write && perm.permissions.can_delete;
      }

      return matchesSearch && matchesRole && matchesPermission;
    });
  }, [data?.permissions, searchQuery, roleFilter, permissionFilter]);

  // Obtener roles únicos para el dropdown
  const uniqueRoles = useMemo(() => {
    if (!data?.permissions) return [];
    const roles = new Set(data.permissions.map(p => p.user.role));
    return Array.from(roles);
  }, [data?.permissions]);

  if (!isOpen || !folder) return null;

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200';
      case 'admin':
        return 'bg-orange-100 text-orange-800';
      case 'consultation_edit':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200';
      case 'consultation':
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Administrador';
      case 'consultation_edit':
        return 'Consulta + Edición';
      case 'consultation':
        return 'Consulta';
      default:
        return role;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Permisos del Directorio
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Nombre del directorio */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Directorio:
            </label>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{folder.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 font-mono mt-1">{folder.path}</p>
            </div>
          </div>

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
          ) : data ? (
            <>
              {/* Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>{data.total_users}</strong> usuario(s) tienen acceso a este directorio
                  {filteredPermissions.length !== data.permissions.length && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      (mostrando {filteredPermissions.length} con filtros activos)
                    </span>
                  )}
                </p>
              </div>

              {/* Filtros */}
              {data.permissions.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Filtros</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Búsqueda */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>

                    {/* Filtro de rol */}
                    <div>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      >
                        <option value="all">Todos los roles</option>
                        {uniqueRoles.map((role) => (
                          <option key={role} value={role}>
                            {getRoleLabel(role)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro de tipo de permiso */}
                    <div>
                      <select
                        value={permissionFilter}
                        onChange={(e) => setPermissionFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      >
                        <option value="all">Todos los permisos</option>
                        <option value="read_only">Solo lectura</option>
                        <option value="read_write">Lectura + Escritura</option>
                        <option value="full">Acceso total</option>
                      </select>
                    </div>
                  </div>

                  {/* Botón limpiar filtros */}
                  {(searchQuery || roleFilter !== 'all' || permissionFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setRoleFilter('all');
                        setPermissionFilter('all');
                      }}
                      className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 dark:text-blue-200 underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              )}

              {/* Permissions Table */}
              {!data.permissions || data.permissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No hay permisos configurados para este directorio</p>
                </div>
              ) : filteredPermissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No se encontraron usuarios con los filtros seleccionados</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setRoleFilter('all');
                      setPermissionFilter('all');
                    }}
                    className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 dark:text-blue-200 underline"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                          Usuario
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                          Rol
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                          Lectura
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                          Escritura
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                          Eliminar
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                          Ruta Base
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredPermissions.map((perm, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{perm.user.full_name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">@{perm.user.username}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{perm.user.email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(perm.user.role)}`}>
                              {getRoleLabel(perm.user.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {perm.permissions.can_read && <Check className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {perm.permissions.can_write && <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto" />}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {perm.permissions.can_delete && <Check className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto" />}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-mono text-gray-600 dark:text-gray-300">{perm.base_path}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                              Otorgado por: {perm.granted_by}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Note */}
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mt-6">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Nota:</strong> Solo se muestran los usuarios que tienen permisos específicos sobre este directorio o directorios padre.
                  Los usuarios con rol <strong>superadmin</strong> tienen acceso total a todos los directorios.
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
