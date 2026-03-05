import { useEffect, useState } from 'react';
import {
  Shield,
  Loader2,
  Check,
  X,
  FolderOpen,
  Lock,
  Unlock,
  FileEdit,
  Trash2,
  FolderPlus,
  BookOpen,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Info,
  Eye
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import { usersApi } from '../api';
import type { UserWithPermissions, UserPermission } from '../types';
import { formatDate } from '../utils/formatDate';

export const MyPermissions = () => {
  const { user } = useAuthStore();
  const [userData, setUserData] = useState<UserWithPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPermissions, setExpandedPermissions] = useState<Set<number>>(new Set());
  const [dismissingPermission, setDismissingPermission] = useState<number | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    if (!user?.id) return;

    try {
      const response = await usersApi.getById(user.id);
      // La respuesta viene directamente con los datos del usuario y sus permisos
      setUserData(response);
    } catch (err) {
      console.error('Error loading permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (permissionId: number) => {
    setExpandedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const handleDismissExpired = async (permissionId: number) => {
    if (!permissionId) return;

    try {
      setDismissingPermission(permissionId);
      await usersApi.dismissExpiredPermission(permissionId);
      // Recargar permisos después de eliminar
      await loadPermissions();
    } catch (err) {
      console.error('Error dismissing expired permission:', err);
      alert('Error al eliminar el permiso expirado');
    } finally {
      setDismissingPermission(null);
    }
  };

  const getFolderDisplayName = (basePath: string): string => {
    if (!basePath) {
      return 'Sub_Proy (raíz completa)';
    }

    // Extraer último segmento
    const segments = basePath.split('/');
    return segments[segments.length - 1] || 'Carpeta Sin nombre';
  };

  // Convertir ruta Linux a formato Windows UNC completo
  const getWindowsFullPath = (basePath: string): string => {
    const baseWindowsPath = '\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy';
    if (!basePath) {
      return baseWindowsPath;
    }
    // Convertir separadores / a \
    const windowsRelativePath = basePath.replace(/\//g, '\\');
    return `${baseWindowsPath}\\${windowsRelativePath}`;
  };

  // Calcular días restantes hasta expiración
  const getDaysUntilExpiration = (expiresAt: string | null | undefined): number | null => {
    if (!expiresAt) return null;
    const expDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Obtener color según días restantes
  const getExpirationColor = (daysLeft: number | null): string => {
    if (daysLeft === null) return 'text-gray-500 dark:text-gray-400 dark:text-gray-500';
    if (daysLeft <= 0) return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50';
    if (daysLeft <= 7) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
    if (daysLeft <= 30) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30';
    return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
  };

  const getInheritanceModeLabel = (mode: string): { label: string; color: string; description: string } => {
    switch (mode) {
      case 'total':
        return {
          label: 'Herencia Total',
          color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
          description: 'Los permisos se heredan a todos los subdirectorios sin restricciones'
        };
      case 'blocked':
        return {
          label: 'Herencia Bloqueada',
          color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
          description: 'Algunos subdirectorios están bloqueados'
        };
      case 'limited_depth':
        return {
          label: 'Profundidad Limitada',
          color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
          description: 'Los permisos solo se heredan hasta cierta profundidad'
        };
      default:
        return {
          label: mode,
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100',
          description: 'Modo de herencia desconocido'
        };
    }
  };

  const getEditPermissionLabel = (level?: string): { label: string; description: string } => {
    switch (level) {
      case 'upload_only':
        return {
          label: 'Solo Subir',
          description: 'Solo puede subir archivos nuevos'
        };
      case 'upload_own':
        return {
          label: 'Editar Propios',
          description: 'Solo puede editar archivos que haya subido'
        };
      case 'upload_all':
        return {
          label: 'Editar Todos',
          description: 'Puede editar cualquier archivo'
        };
      default:
        return {
          label: 'No definido',
          description: 'Sin nivel de edición específico'
        };
    }
  };

  const renderPermissionCard = (permission: UserPermission, index: number) => {
    const isExpanded = expandedPermissions.has(permission.id || index);
    const inheritanceInfo = getInheritanceModeLabel(permission.inheritance_mode);
    const editPermInfo = getEditPermissionLabel(permission.edit_permission_level);
    const daysUntilExpiration = getDaysUntilExpiration(permission.expires_at);
    const expirationColor = getExpirationColor(daysUntilExpiration);
    const isExpired = daysUntilExpiration !== null && daysUntilExpiration <= 0;

    return (
      <div
        key={permission.id || index}
        className={`border rounded-xl overflow-hidden transition-all ${
          isExpired
            ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/30/30 opacity-75'
            : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
        }`}
      >
        {/* Banner de expirado */}
        {isExpired && (
          <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">PERMISO EXPIRADO - Acceso bloqueado</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (permission.id) {
                  handleDismissExpired(permission.id);
                }
              }}
              disabled={!permission.id || dismissingPermission === permission.id}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Eliminar este permiso expirado de tu lista"
            >
              {dismissingPermission === permission.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Quitar de mi lista</span>
            </button>
          </div>
        )}

        {/* Header - Always Visible */}
        <div className={`p-5 ${
          isExpired
            ? 'bg-gradient-to-r from-red-50 dark:from-red-900/30 to-gray-100 dark:to-gray-800'
            : 'bg-gradient-to-r from-blue-50 dark:from-blue-900/30 to-indigo-50 dark:to-indigo-900/30'
        }`}>
          {/* Fila superior: Nombre de carpeta + Fecha de vencimiento + Botón expandir */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FolderOpen className={`w-6 h-6 flex-shrink-0 ${isExpired ? 'text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
              <h3 className={`font-bold text-lg truncate ${isExpired ? 'text-gray-500 dark:text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                {getFolderDisplayName(permission.base_path)}
              </h3>
              {/* Fecha de expiración - Junto al nombre */}
              {permission.expires_at && (
                <div className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${expirationColor}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {isExpired ? 'Expiró' : 'Vence'}: {formatDate(permission.expires_at)}
                    {daysUntilExpiration !== null && !isExpired && (
                      <span className="ml-1">
                        ({daysUntilExpiration === 1
                          ? '¡Mañana!'
                          : `${daysUntilExpiration} días`})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => toggleExpanded(permission.id || index)}
              className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>

          {/* Ruta completa en formato Windows - En su propia línea con scroll horizontal */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Ruta completa:</p>
            <div className="overflow-x-auto">
              <p className="text-sm text-gray-700 dark:text-gray-200 font-mono whitespace-nowrap select-all cursor-text">
                {getWindowsFullPath(permission.base_path)}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Summary - Always Visible */}
        <div className="p-5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Lectura */}
            <div className={`flex items-center gap-2 p-2 rounded-lg ${permission.can_read ? 'bg-green-50 dark:bg-green-900/30' : 'bg-gray-50 dark:bg-gray-900'}`}>
              {permission.can_read ? (
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
              <span className={`text-sm font-medium ${permission.can_read ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
                Lectura
              </span>
            </div>

            {/* Escritura - Con detalle según edit_permission_level */}
            <div className={`flex items-center gap-2 p-2 rounded-lg ${permission.can_write ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-gray-900'}`}>
              {permission.can_write ? (
                <FileEdit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
              <span className={`text-sm font-medium ${permission.can_write ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
                {permission.can_write
                  ? permission.edit_permission_level === 'upload_all'
                    ? 'Editar (todos)'
                    : permission.edit_permission_level === 'upload_own'
                      ? 'Editar (propios)'
                      : permission.edit_permission_level === 'upload_only'
                        ? 'Solo subir'
                        : 'Escritura'
                  : 'Escritura'}
              </span>
            </div>

            {/* Eliminación - Con detalle según edit_permission_level */}
            <div className={`flex items-center gap-2 p-2 rounded-lg ${permission.can_delete ? 'bg-red-50 dark:bg-red-900/30' : 'bg-gray-50 dark:bg-gray-900'}`}>
              {permission.can_delete ? (
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              ) : (
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
              <span className={`text-sm font-medium ${permission.can_delete ? 'text-red-700 dark:text-red-300' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
                {permission.can_delete
                  ? permission.edit_permission_level === 'upload_all'
                    ? 'Eliminar (todos)'
                    : permission.edit_permission_level === 'upload_own'
                      ? 'Eliminar (propios)'
                      : 'Eliminar'
                  : 'Eliminar'}
              </span>
            </div>

            {/* Crear Directorios */}
            <div className={`flex items-center gap-2 p-2 rounded-lg ${permission.can_create_directories ? 'bg-purple-50 dark:bg-purple-900/30' : 'bg-gray-50 dark:bg-gray-900'}`}>
              {permission.can_create_directories ? (
                <FolderPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
              <span className={`text-sm font-medium ${permission.can_create_directories ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
                Crear Dirs
              </span>
            </div>

            {/* Diccionario */}
            <div className={`flex items-center gap-2 p-2 rounded-lg ${permission.exempt_from_dictionary ? 'bg-yellow-50 dark:bg-yellow-900/30' : 'bg-gray-50 dark:bg-gray-900'}`}>
              {permission.exempt_from_dictionary ? (
                <Unlock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
              <span className={`text-sm font-medium ${permission.exempt_from_dictionary ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
                {permission.exempt_from_dictionary ? 'Sin Dicc.' : 'Con Dicc.'}
              </span>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="p-5 bg-gray-50 dark:bg-gray-900 space-y-4">
            {/* Permisos Detallados */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Permisos Detallados
              </h4>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-3">
                <PermissionDetail
                  icon={<Check className="w-5 h-5" />}
                  label="Lectura de archivos"
                  enabled={permission.can_read}
                  description="Puede visualizar y descargar archivos"
                />
                <PermissionDetail
                  icon={<FileEdit className="w-5 h-5" />}
                  label={permission.can_write
                    ? permission.edit_permission_level === 'upload_all'
                      ? 'Escritura de archivos (TODOS)'
                      : permission.edit_permission_level === 'upload_own'
                        ? 'Escritura de archivos (solo propios)'
                        : permission.edit_permission_level === 'upload_only'
                          ? 'Solo subir archivos nuevos'
                          : 'Escritura de archivos'
                    : 'Escritura de archivos'}
                  enabled={permission.can_write}
                  description={permission.can_write
                    ? permission.edit_permission_level === 'upload_all'
                      ? 'Puede subir archivos nuevos y modificar/renombrar cualquier archivo existente'
                      : permission.edit_permission_level === 'upload_own'
                        ? 'Puede subir archivos nuevos y solo modificar/renombrar archivos que usted haya subido'
                        : permission.edit_permission_level === 'upload_only'
                          ? 'Solo puede subir archivos nuevos, no puede modificar archivos existentes'
                          : 'Puede subir y modificar archivos'
                    : 'No tiene permiso para subir ni modificar archivos'}
                />
                <PermissionDetail
                  icon={<Trash2 className="w-5 h-5" />}
                  label={permission.can_delete
                    ? permission.edit_permission_level === 'upload_all'
                      ? 'Eliminación de archivos (TODOS)'
                      : permission.edit_permission_level === 'upload_own'
                        ? 'Eliminación de archivos (solo propios)'
                        : 'Eliminación de archivos'
                    : 'Eliminación de archivos'}
                  enabled={permission.can_delete}
                  description={permission.can_delete
                    ? permission.edit_permission_level === 'upload_all'
                      ? 'Puede eliminar cualquier archivo o carpeta, incluso los de otros usuarios'
                      : permission.edit_permission_level === 'upload_own'
                        ? 'Solo puede eliminar archivos y carpetas que usted haya creado/subido'
                        : 'Puede eliminar archivos y carpetas'
                    : 'No tiene permiso para eliminar archivos'}
                />
                <PermissionDetail
                  icon={<FolderPlus className="w-5 h-5" />}
                  label="Creación de directorios"
                  enabled={permission.can_create_directories}
                  description="Puede crear nuevas carpetas"
                />
                <PermissionDetail
                  icon={<BookOpen className="w-5 h-5" />}
                  label="Exento de diccionario"
                  enabled={permission.exempt_from_dictionary}
                  description={permission.exempt_from_dictionary
                    ? "Puede usar cualquier nombre (sin restricción de diccionario)"
                    : "Debe usar solo palabras del diccionario oficial IGAC"
                  }
                />
              </div>
            </div>

            {/* Nivel de Edición */}
            {permission.edit_permission_level && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Nivel de Edición
                </h4>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <FileEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{editPermInfo.label}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{editPermInfo.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modo de Herencia */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Modo de Herencia
              </h4>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${inheritanceInfo.color}`}>
                    {inheritanceInfo.label}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{inheritanceInfo.description}</p>
                </div>

                {/* Max Depth */}
                {permission.inheritance_mode === 'limited_depth' && permission.max_depth !== undefined && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Profundidad máxima:</strong> {permission.max_depth} nivel(es)
                    </p>
                  </div>
                )}

                {/* Blocked Paths */}
                {permission.blocked_paths && permission.blocked_paths.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <p className="text-sm font-semibold text-red-800 dark:text-red-200">Rutas bloqueadas:</p>
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                      {permission.blocked_paths.map((path, idx) => (
                        <li key={idx} className="font-mono">{path}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Read Only Paths - DISABLED: propiedad no existe en backend */}
                {false && (permission as any).read_only_subdirs && (permission as any).read_only_subdirs.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Rutas de solo lectura:</p>
                    </div>
                    <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      {((permission as any).read_only_subdirs || []).map((path: any, idx: number) => (
                        <li key={idx} className="font-mono">{path}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Información Adicional
              </h4>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                {permission.granted_at && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Calendar className="w-4 h-4" />
                    <span>Otorgado el: <strong>{formatDate(permission.granted_at)}</strong></span>
                  </div>
                )}
                {permission.expires_at && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${getExpirationColor(getDaysUntilExpiration(permission.expires_at))}`}>
                    <Calendar className="w-4 h-4" />
                    <span>
                      ⏰ Vence el: <strong>{formatDate(permission.expires_at)}</strong>
                      {getDaysUntilExpiration(permission.expires_at) !== null && (
                        <span className="ml-1">
                          ({getDaysUntilExpiration(permission.expires_at)! <= 0
                            ? '¡Expirado!'
                            : `${getDaysUntilExpiration(permission.expires_at)} días restantes`})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {permission.granted_by_detail && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <User className="w-4 h-4" />
                    <span>Otorgado por: <strong>{permission.granted_by_detail.username}</strong></span>
                  </div>
                )}
                {permission.notes && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      <strong>Notas:</strong> {permission.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg dark:shadow-gray-900/50 p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Mis Permisos</h2>
              <p className="text-blue-100 mt-1">
                Información detallada sobre tus permisos de acceso
              </p>
            </div>
          </div>

          {/* User Info Summary */}
          {user && (
            <div className="bg-white/20 dark:bg-gray-800/20 rounded-lg p-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-200">Usuario</p>
                  <p className="font-semibold">{user.full_name}</p>
                </div>
                <div>
                  <p className="text-blue-200">Rol</p>
                  <p className="font-semibold uppercase">{user.role.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-blue-200">Permisos Asignados</p>
                  <p className="font-semibold">{userData?.permissions?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Permissions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : userData?.permissions && userData.permissions.length > 0 ? (
            <>
              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-600 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900 dark:text-blue-200">
                    <p className="font-semibold mb-1">¿Cómo leer esta información?</p>
                    <p>
                      Haz clic en cada permiso para ver los detalles completos.
                      Aquí encontrarás información sobre qué puedes hacer en cada directorio,
                      restricciones de herencia, niveles de edición y más.
                    </p>
                  </div>
                </div>
              </div>

              {/* Permissions Cards */}
              {userData.permissions.map((permission, index) =>
                renderPermissionCard(permission, index)
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-700 dark:text-gray-200 font-semibold">No tienes permisos específicos asignados</p>
              <p className="text-sm mt-2 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                {user?.role === 'superadmin'
                  ? 'Como SuperAdmin tienes acceso a todo el sistema'
                  : user?.role === 'admin'
                  ? 'Como Admin tienes acceso amplio al sistema'
                  : 'Contacta a tu administrador para solicitar permisos'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

// Component helper for permission details
interface PermissionDetailProps {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  description: string;
}

const PermissionDetail = ({ icon, label, enabled, description }: PermissionDetailProps) => (
  <div className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
    <div className={`p-2 rounded-lg ${enabled ? 'bg-green-100 dark:bg-green-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
      <div className={enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
        {icon}
      </div>
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <p className={`font-medium ${enabled ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'}`}>
          {label}
        </p>
        {enabled ? (
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : (
          <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{description}</p>
    </div>
  </div>
);
