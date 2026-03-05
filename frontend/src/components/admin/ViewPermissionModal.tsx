import { X, FolderOpen, Eye, Edit, Trash, Book, Shield, Lock, Layers, GitBranch, FolderPlus, Calendar, User as UserIcon } from 'lucide-react';
import type { UserRole, EditPermissionLevel, InheritanceMode } from '../../types/user';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
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
  inheritance_mode?: 'total' | 'blocked' | 'limited_depth' | 'partial_write';
  blocked_paths?: string[];
  read_only_paths?: string[];
  max_depth?: number | null;
  notes?: string;
  granted_at: string;
  granted_by: string;
  expires_at?: string | null;
  authorized_by_email?: string | null;
  authorized_by_name?: string | null;
}

interface ViewPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: Permission;
  onEdit?: () => void;
}

export const ViewPermissionModal = ({ isOpen, onClose, permission, onEdit }: ViewPermissionModalProps) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8" />
              <div>
                <h3 className="text-2xl font-bold">Detalles del Permiso</h3>
                <p className="text-blue-100 text-sm">
                  Información completa de configuración granular
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Usuario */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              <h4 className="font-bold text-gray-900 dark:text-white">Usuario</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Nombre de usuario</p>
                <p className="font-semibold text-gray-900 dark:text-white">{permission.user.username}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Nombre completo</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {permission.user.first_name} {permission.user.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Email</p>
                <p className="font-semibold text-gray-900 dark:text-white">{permission.user.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Rol</p>
                <p className="font-semibold text-gray-900 dark:text-white capitalize">{permission.user.role}</p>
              </div>
            </div>
          </div>

          {/* Ruta Asignada */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-5 h-5 text-blue-700 dark:text-blue-300" />
              <h4 className="font-bold text-blue-900">Ruta Asignada</h4>
            </div>
            <p className="font-mono font-semibold text-lg text-blue-900 break-all">
              {permission.base_path ? `Sub_Proy/${permission.base_path}` : 'Sub_Proy (raíz completa)'}
            </p>
          </div>

          {/* Permisos Básicos */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              <h4 className="font-bold text-gray-900 dark:text-white">Permisos Básicos</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg border ${permission.can_read ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>
                <div className="flex items-center gap-2">
                  <Eye className={`w-5 h-5 ${permission.can_read ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Lectura</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{permission.can_read ? 'Permitido' : 'Denegado'}</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${permission.can_write ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>
                <div className="flex items-center gap-2">
                  <Edit className={`w-5 h-5 ${permission.can_write ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Escritura</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{permission.can_write ? 'Permitido' : 'Denegado'}</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${permission.can_delete ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>
                <div className="flex items-center gap-2">
                  <Trash className={`w-5 h-5 ${permission.can_delete ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Eliminación</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{permission.can_delete ? 'Permitido' : 'Denegado'}</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${permission.can_create_directories !== false ? 'bg-orange-50 border-orange-300' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>
                <div className="flex items-center gap-2">
                  <FolderPlus className={`w-5 h-5 ${permission.can_create_directories !== false ? 'text-orange-600' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Crear Directorios</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{permission.can_create_directories !== false ? 'Permitido' : 'Denegado'}</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${permission.exempt_from_dictionary ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>
                <div className="flex items-center gap-2">
                  <Book className={`w-5 h-5 ${permission.exempt_from_dictionary ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Sin Diccionario</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{permission.exempt_from_dictionary ? 'Exento' : 'Debe validar'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de Herencia */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              <h4 className="font-bold text-gray-900 dark:text-white">Configuración de Herencia</h4>
            </div>

            {/* Modo de Herencia */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Modo de Herencia:</p>
              {permission.inheritance_mode === 'total' && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-200">Herencia Total</p>
                      <p className="text-xs text-green-700 dark:text-green-300">El usuario tiene acceso completo a todos los subdirectorios sin restricciones.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Restricciones de Herencia */}
              {((permission.blocked_paths && permission.blocked_paths.length > 0) ||
                (permission.read_only_paths && permission.read_only_paths.length > 0) ||
                permission.max_depth) && (
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Restricciones de Herencia</p>
                      <p className="text-xs text-gray-700 dark:text-gray-200">Rutas con restricciones de acceso especiales.</p>
                    </div>
                  </div>

                  {/* Rutas Bloqueadas */}
                  {permission.blocked_paths && permission.blocked_paths.length > 0 && (
                    <div className="mt-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <p className="font-semibold text-red-900">
                          Rutas Bloqueadas ({permission.blocked_paths.length}):
                        </p>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300 mb-2">Acceso completamente denegado a estas rutas.</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {permission.blocked_paths.map((path, idx) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded px-3 py-2 flex items-start gap-2">
                            <Lock className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm font-mono text-red-900 break-all">{path}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rutas de Solo Lectura */}
                  {permission.read_only_paths && permission.read_only_paths.length > 0 && (
                    <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <p className="font-semibold text-yellow-900">
                          Rutas de Solo Lectura ({permission.read_only_paths.length}):
                        </p>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">Solo lectura y descarga permitida en estas rutas.</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {permission.read_only_paths.map((path, idx) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 border border-yellow-300 rounded px-3 py-2 flex items-start gap-2">
                            <Eye className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm font-mono text-yellow-900 break-all">{path}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {permission.inheritance_mode === 'limited_depth' && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-semibold text-blue-900">Profundidad Limitada</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">El usuario solo puede acceder hasta cierta profundidad de subdirectorios.</p>
                    </div>
                  </div>

                  <div className="mt-3 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded px-3 py-2">
                    <p className="text-sm">
                      <strong className="text-blue-900">Niveles permitidos:</strong>{' '}
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{permission.max_depth ?? 'No especificado'}</span>
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      El usuario puede navegar hasta {permission.max_depth} niveles de profundidad desde la ruta base.
                    </p>
                  </div>
                </div>
              )}

              {!permission.inheritance_mode && (
                <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-200">No especificado (se asume herencia total)</p>
                </div>
              )}
            </div>
          </div>

          {/* Nivel de Edición (para consultation_edit) */}
          {permission.edit_permission_level && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-indigo-700" />
                <h4 className="font-bold text-indigo-900">Nivel de Edición</h4>
              </div>
              <p className="text-sm text-indigo-900">
                {permission.edit_permission_level === 'upload_only' && '📤 Solo puede subir archivos (sin modificar ni eliminar)'}
                {permission.edit_permission_level === 'upload_own' && '📤✏️ Puede subir, editar y eliminar SOLO sus propios archivos'}
                {permission.edit_permission_level === 'upload_all' && '📤✏️🗑️ Puede subir, editar y eliminar TODOS los archivos'}
              </p>
            </div>
          )}

          {/* Notas */}
          {permission.notes && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
                <h4 className="font-bold text-yellow-900">Notas</h4>
              </div>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{permission.notes}</p>
            </div>
          )}

          {/* Información de Auditoría */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Otorgado por:</p>
                <p>{permission.granted_by}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Fecha de otorgamiento:</p>
                <p>{formatDate(permission.granted_at)}</p>
              </div>
              {permission.expires_at && (
                <div className="col-span-2">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="font-semibold text-orange-900 flex items-center gap-2">
                      ⏰ Fecha de vencimiento:
                    </p>
                    <p className="text-orange-800 font-bold text-lg">{formatDate(permission.expires_at)}</p>
                    <p className="text-xs text-orange-700 mt-1">
                      El usuario recibirá notificaciones 7 y 3 días antes del vencimiento
                    </p>
                  </div>
                </div>
              )}
              {(permission.authorized_by_email || permission.authorized_by_name) && (
                <div className="col-span-2">
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                    <p className="font-semibold text-blue-900 mb-2">📋 Autorizado por:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {permission.authorized_by_name && (
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Nombre:</p>
                          <p className="font-semibold text-blue-900">{permission.authorized_by_name}</p>
                        </div>
                      )}
                      {permission.authorized_by_email && (
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Email:</p>
                          <p className="font-semibold text-blue-900">{permission.authorized_by_email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex gap-3 p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors font-semibold"
          >
            Cerrar
          </button>
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <Edit className="w-5 h-5" />
              Editar Permiso
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
