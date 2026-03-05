import React, { useState } from 'react';
import type { User } from '../../types/user';
import { usersApi } from '../../api/users';
import { UserAutocompleteSelector } from './UserAutocompleteSelector';
import { RouteMultiInput } from './RouteMultiInput';
import type { RouteConfig } from './RouteMultiInput';

interface BulkPermissionAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkPermissionAssignment: React.FC<BulkPermissionAssignmentProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [routes, setRoutes] = useState<RouteConfig[]>([]);
  const [groupName, setGroupName] = useState('');
  const [existingGroups, setExistingGroups] = useState<string[]>([]);

  // Permisos generales
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canCreateDirectories, setCanCreateDirectories] = useState(false);
  const [exemptFromDictionary, setExemptFromDictionary] = useState(false);

  // Permisos granulares
  const [editPermissionLevel, setEditPermissionLevel] = useState<string | null>(null);
  const [inheritanceMode, setInheritanceMode] = useState('total');
  const [maxDepth, setMaxDepth] = useState<number | null>(null);

  // Otros
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');

  // Autorización
  const [authorizedByEmail, setAuthorizedByEmail] = useState('');
  const [authorizedByName, setAuthorizedByName] = useState('');
  const [authorizers, setAuthorizers] = useState<Array<{ email: string; name: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Cargar grupos existentes, autorizadores y establecer fecha por defecto cuando se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      loadExistingGroups();
      loadAuthorizers();
      // Establecer fecha de vencimiento por defecto: 31 de diciembre del año actual
      if (!expiresAt) {
        const currentYear = new Date().getFullYear();
        const defaultDate = `${currentYear}-12-31`;
        setExpiresAt(defaultDate);
      }
    }
  }, [isOpen]);

  const loadAuthorizers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users/authorization-autocomplete', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAuthorizers(data.authorizers || []);
      }
    } catch (error) {
      console.error('Error loading authorizers:', error);
    }
  };

  const loadExistingGroups = async () => {
    try {
      const response = await usersApi.listGroups();
      const groupNames = response.groups.map((g: any) => g.group_name);
      setExistingGroups(groupNames);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  // Verificar si hay rutas con bloqueos o solo lectura
  const hasBlockedPaths = routes.some(r => r.blocked_paths && r.blocked_paths.length > 0);
  const hasReadOnlyPaths = routes.some(r => r.read_only_paths && r.read_only_paths.length > 0);

  const handleReset = () => {
    setSelectedUsers([]);
    setRoutes([]);
    setGroupName('');
    setCanRead(true);
    setCanWrite(false);
    setCanDelete(false);
    setCanCreateDirectories(false);
    setExemptFromDictionary(false);
    setEditPermissionLevel(null);
    setInheritanceMode('total');
    setMaxDepth(null);
    setExpiresAt('');
    setNotes('');
    setAuthorizedByEmail('');
    setAuthorizedByName('');
    setError(null);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setSuccessData(null);
    handleReset();
    onSuccess();
    onClose();
  };

  const handleSubmit = async () => {
    // Validaciones
    if (selectedUsers.length === 0) {
      setError('Debe seleccionar al menos un usuario');
      return;
    }

    if (routes.length === 0) {
      setError('Debe agregar al menos una ruta');
      return;
    }

    // Validar que todas las rutas existan
    const invalidRoutes = routes.filter(r => r.validating || r.exists === false);
    if (invalidRoutes.length > 0) {
      setError('Hay rutas que no existen o están siendo validadas. Por favor corrija o elimine las rutas inválidas.');
      return;
    }

    if (groupName.trim() === '') {
      setError('Debe proporcionar un nombre de grupo');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await usersApi.bulkAssignPermissions({
        user_ids: selectedUsers.map((u) => u.id),
        routes: routes,
        can_read: canRead,
        can_write: canWrite,
        can_delete: canDelete,
        can_create_directories: canCreateDirectories,
        exempt_from_dictionary: exemptFromDictionary,
        edit_permission_level: editPermissionLevel,
        inheritance_mode: inheritanceMode,
        max_depth: maxDepth,
        expires_at: expiresAt || undefined,
        group_name: groupName,
        notes: notes,
        // authorized_by_email: authorizedByEmail || undefined,
        // authorized_by_name: authorizedByName || undefined,
      });

      // Mostrar modal de éxito personalizado
      setSuccessData(response);
      setShowSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al asignar permisos');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 overflow-y-auto py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-4xl mx-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Asignación Masiva de Permisos</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Nombre del Grupo <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              list="existing-groups"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="ej: Proyecto_Modernizacion_2025"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <datalist id="existing-groups">
              {existingGroups.map((group, index) => (
                <option key={index} value={group} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
              {existingGroups.length > 0
                ? `💡 Selecciona un grupo existente o escribe uno nuevo. ${existingGroups.length} grupo(s) disponible(s)`
                : 'Identifica esta asignación para gestión futura'}
            </p>
          </div>

          {/* Users */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Seleccionar Usuarios <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <UserAutocompleteSelector
              selectedUsers={selectedUsers}
              onUsersChange={setSelectedUsers}
            />
          </div>

          {/* Routes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Rutas a Asignar <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <RouteMultiInput
              routes={routes}
              onRoutesChange={setRoutes}
              userIds={selectedUsers.map(u => u.id)}
            />
          </div>

          {/* Divider */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Permisos (aplicados a todas las rutas)
            </h3>

            {/* Basic Permissions */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Permisos Generales</h4>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 ${(canWrite || canDelete || canCreateDirectories) ? 'opacity-70' : ''}`}>
                  <input
                    type="checkbox"
                    checked={canRead}
                    onChange={(e) => {
                      // No permitir desactivar si hay otros permisos activos
                      if (!e.target.checked && (canWrite || canDelete || canCreateDirectories)) {
                        return;
                      }
                      setCanRead(e.target.checked);
                    }}
                    disabled={canWrite || canDelete || canCreateDirectories}
                    className="rounded disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <span className="text-sm">Lectura</span>
                    {(canWrite || canDelete || canCreateDirectories) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Obligatorio</p>
                    )}
                  </div>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={canWrite}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCanRead(true);
                      } else {
                        setCanCreateDirectories(false);
                      }
                      setCanWrite(e.target.checked);
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">Escritura</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={canDelete}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCanRead(true);
                      }
                      setCanDelete(e.target.checked);
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">Eliminación</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={canCreateDirectories}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCanRead(true);
                      }
                      setCanCreateDirectories(e.target.checked);
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">Crear Directorios</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={exemptFromDictionary}
                    onChange={(e) => setExemptFromDictionary(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Exento de Diccionario</span>
                </label>
              </div>
            </div>

            {/* Granular Permissions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Permisos Granulares</h4>

              {/* Edit Permission Level */}
              {canWrite && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Nivel de Edición
                  </label>
                  <select
                    value={editPermissionLevel || ''}
                    onChange={(e) => setEditPermissionLevel(e.target.value || null)}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  >
                    <option value="">Sin restricción</option>
                    <option value="upload_only">Solo Subir Archivos</option>
                    {canDelete && (
                      <>
                        <option value="upload_own">Subir + Editar/Eliminar Propios</option>
                        <option value="upload_all">Subir + Editar/Eliminar Todos</option>
                      </>
                    )}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    {!canDelete && '⚠️ Habilita "Eliminación" para ver más opciones'}
                  </p>
                </div>
              )}
              {!canWrite && (
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300">
                  ℹ️ Habilita "Escritura" para configurar niveles de edición granulares
                </div>
              )}

              {/* Inheritance Mode */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Modo de Herencia
                </label>
                <select
                  value={inheritanceMode}
                  onChange={(e) => setInheritanceMode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                >
                  <option value="total">Herencia Total</option>
                  {hasBlockedPaths && (
                    <option value="blocked">Herencia con Bloqueos</option>
                  )}
                  <option value="limited_depth">Rango Limitado de Profundidad</option>
                  {hasReadOnlyPaths && (
                    <option value="partial_write">
                      Herencia Parcial con Restricciones de Escritura
                    </option>
                  )}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  {!hasBlockedPaths && !hasReadOnlyPaths && (
                    '💡 Agrega rutas bloqueadas o de solo lectura para más opciones'
                  )}
                  {hasBlockedPaths && !hasReadOnlyPaths && (
                    '✓ "Herencia con Bloqueos" disponible por tener rutas bloqueadas'
                  )}
                  {!hasBlockedPaths && hasReadOnlyPaths && (
                    '✓ "Herencia Parcial" disponible por tener rutas de solo lectura'
                  )}
                  {hasBlockedPaths && hasReadOnlyPaths && (
                    '✓ Todas las opciones disponibles'
                  )}
                </p>
              </div>

              {/* Max Depth */}
              {inheritanceMode === 'limited_depth' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Profundidad Máxima (niveles)
                  </label>
                  <input
                    type="number"
                    value={maxDepth || ''}
                    onChange={(e) => setMaxDepth(e.target.value ? parseInt(e.target.value) : null)}
                    min="1"
                    placeholder="ej: 3"
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Expiration Date */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Fecha de Vencimiento (opcional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                Por defecto: 31 de diciembre del año actual
              </p>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                Notas Adicionales (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Información adicional sobre estos permisos..."
                className="w-full px-3 py-2 text-sm border rounded-lg"
              />
            </div>

            {/* Autorización */}
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="text-sm font-bold text-blue-900 mb-2">
                Información de Autorización (Opcional)
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                Registra quién autorizó estos permisos (generalmente el líder del grupo). Esta persona recibirá copia de los correos de notificación.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Email de quien autoriza
                  </label>
                  <input
                    type="email"
                    value={authorizedByEmail}
                    onChange={(e) => {
                      const email = e.target.value;
                      setAuthorizedByEmail(email);
                      // Auto-fill name when email is selected
                      const authorizer = authorizers.find(a => a.email === email);
                      if (authorizer) {
                        setAuthorizedByName(authorizer.name);
                      }
                    }}
                    list="bulk-authorizers-email-list"
                    placeholder="lider.grupo@igac.gov.co"
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                  <datalist id="bulk-authorizers-email-list">
                    {authorizers.map((auth, idx) => (
                      <option key={idx} value={auth.email}>
                        {auth.name}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={authorizedByName}
                    onChange={(e) => setAuthorizedByName(e.target.value)}
                    placeholder="Nombre Completo del Líder"
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 dark:bg-gray-900">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600 rounded-lg"
            disabled={loading}
          >
            Limpiar Todo
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600 rounded-lg"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedUsers.length === 0 || routes.length === 0 || !groupName}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Asignando...' : `Asignar a ${selectedUsers.length} Usuario(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Success Modal */}
    {showSuccess && successData && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-scale-in">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white dark:bg-gray-800 bg-opacity-20 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">¡Asignación Exitosa!</h2>
                <p className="text-green-100 mt-1">Los permisos han sido asignados correctamente</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Estadísticas */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{successData.total_assignments}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Permisos Creados</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{successData.users_notified}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Usuarios Notificados</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{routes.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Rutas Asignadas</div>
              </div>
            </div>

            {/* Información del grupo */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏷️</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">Nombre del Grupo:</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white ml-8">{successData.group_name}</div>
            </div>

            {/* Email notification */}
            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📧</span>
                <div>
                  <div className="font-semibold text-blue-900 mb-1">Notificaciones Enviadas</div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    Cada usuario recibió <strong>UN email individual</strong> con <strong>TODAS</strong> sus rutas asignadas y configuración de permisos.
                  </div>
                </div>
              </div>
            </div>

            {/* Warning si existe */}
            {successData.warning && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-semibold text-yellow-900 mb-1">Advertencia</div>
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">{successData.warning}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-end">
            <button
              onClick={handleSuccessClose}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-lg dark:shadow-gray-900/50 hover:shadow-xl dark:shadow-gray-900/50 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
