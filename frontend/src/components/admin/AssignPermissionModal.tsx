import { useState, useEffect } from 'react';
import { X, FolderOpen, Eye, Edit, Trash, Book, AlertCircle, Shield, Lock, Layers, FolderPlus, Calendar, UserCheck, Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { UserRole, EditPermissionLevel, InheritanceMode } from '../../types/user';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../Toast';
import type { RouteConfig } from './RouteMultiInput';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

interface AssignPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: () => void;
}

export const AssignPermissionModal = ({ isOpen, onClose, user, onSuccess }: AssignPermissionModalProps) => {
  const toast = useToast();

  // Helper: Obtener fecha mínima (mañana)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Helper: Obtener fecha por defecto (31 de diciembre del año actual)
  const getDefaultExpirationDate = () => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-12-31`;
  };

  // Estado para manejar múltiples rutas con validación
  const [routes, setRoutes] = useState<Array<{
    path: string;
    exists?: boolean;
    validating?: boolean;
    error?: string;
    has_permission?: boolean;
    warning?: string;
  }>>([]);
  const [routeInput, setRouteInput] = useState('');

  const [formData, setFormData] = useState({
    can_read: true,
    can_write: false,
    can_delete: false,
    can_create_directories: false,
    exempt_from_dictionary: false,
    // Nuevos campos granulares
    edit_permission_level: 'upload_only' as EditPermissionLevel,
    inheritance_mode: 'total' as InheritanceMode,
    blocked_paths: [] as string[],
    read_only_paths: [] as string[],
    max_depth: undefined as number | undefined,
    // Fecha de vencimiento
    expires_at: getDefaultExpirationDate(), // Por defecto 31 de diciembre del año actual
    notes: '',
    // Autorización
    authorized_by_email: '',
    authorized_by_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blockedPathInput, setBlockedPathInput] = useState('');
  const [readOnlyPathInput, setReadOnlyPathInput] = useState('');
  const [authorizers, setAuthorizers] = useState<Array<{ email: string; name: string }>>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Cargar lista de autorizadores cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      const fetchAuthorizers = async () => {
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
          console.error('Error cargando autorizadores:', error);
        }
      };
      fetchAuthorizers();
    }
  }, [isOpen]);

  // Estados para controlar si las secciones están activas
  const [showBlockedPaths, setShowBlockedPaths] = useState(false);
  const [showReadOnlyPaths, setShowReadOnlyPaths] = useState(false);
  const [showMaxDepth, setShowMaxDepth] = useState(false);

  if (!isOpen) return null;

  // Constante con la ruta base esperada de NetApp
  const NETAPP_BASE_PATH = '\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy';

  /**
   * Procesa y valida la ruta completa de NetApp pegada por el usuario
   * Retorna la ruta relativa procesada o null si es inválida
   */
  const processNetAppPath = (fullPath: string): { success: boolean; relativePath?: string; error?: string } => {
    if (!fullPath || !fullPath.trim()) {
      return { success: false, error: 'La ruta no puede estar vacía' };
    }

    let cleanPath = fullPath.trim();

    // Normalizar barras para comparación (convertir todas a barras invertidas)
    const normalizedPath = cleanPath.replace(/\//g, '\\');

    // Verificar que empiece con la ruta base esperada
    if (!normalizedPath.startsWith(NETAPP_BASE_PATH)) {
      return {
        success: false,
        error: `La ruta debe comenzar con: ${NETAPP_BASE_PATH}\\\n\nEjemplo válido:\n${NETAPP_BASE_PATH}\\05_grup_trab\\11_gest_info\\2025`
      };
    }

    // Extraer la parte relativa (después de Sub_Proy)
    const baseWithSep = NETAPP_BASE_PATH + '\\';
    let relativePath: string;

    if (normalizedPath.startsWith(baseWithSep)) {
      relativePath = normalizedPath.substring(baseWithSep.length);
    } else {
      // Si la ruta es exactamente la base, no hay parte relativa
      relativePath = normalizedPath.substring(NETAPP_BASE_PATH.length);
    }

    // Limpiar barras al inicio y final
    relativePath = relativePath.replace(/^\\+/, '').replace(/\\+$/, '');

    // Si quedó vacío, significa que es la raíz de Sub_Proy (permitido)
    if (!relativePath) {
      // Retornar "." para indicar raíz (o vacío para toda la carpeta)
      return { success: true, relativePath: '' };
    }

    // Convertir barras invertidas a barras normales para almacenamiento
    relativePath = relativePath.replace(/\\/g, '/');

    return { success: true, relativePath };
  };

  /**
   * Valida múltiples rutas en el backend
   */
  const validatePaths = async (pathsToValidate: string[]) => {
    try {
      const response = await fetch('/api/admin/users/validate-paths', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          paths: pathsToValidate,
          user_id: user.id  // Enviar user_id para verificar permisos existentes
        }),
      });

      if (!response.ok) {
        throw new Error('Error al validar rutas');
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Error validando rutas:', error);
      return pathsToValidate.map(path => ({ path, exists: false, error: 'Error de validación' }));
    }
  };

  /**
   * Agrega una o más rutas y las valida
   */
  const handleAddRoutes = async () => {
    if (!routeInput.trim()) return;

    // Separar por líneas, comas o tabs
    const separators = /[,\t\n\r]+/;
    const newPaths = routeInput
      .split(separators)
      .map(p => p.trim())
      .filter(p => p !== '');

    if (newPaths.length === 0) return;

    // Procesar cada ruta para obtener la ruta relativa
    const processedPaths: Array<{ path: string; validating: boolean }> = [];
    for (const fullPath of newPaths) {
      const result = processNetAppPath(fullPath);
      if (result.success && result.relativePath !== undefined) {
        // Verificar que no esté duplicada
        if (!routes.some(r => r.path === result.relativePath) && !processedPaths.some(p => p.path === result.relativePath)) {
          processedPaths.push({ path: result.relativePath!, validating: true });
        }
      } else {
        toast.error(`Ruta inválida: ${fullPath.substring(0, 50)}...`);
      }
    }

    if (processedPaths.length === 0) {
      toast.warning('No hay rutas válidas para agregar');
      return;
    }

    // Agregar rutas en estado "validando"
    setRoutes([...routes, ...processedPaths]);
    setRouteInput('');

    // Validar rutas en el backend
    const pathsToValidate = processedPaths.map(p => p.path);
    const validationResults = await validatePaths(pathsToValidate);

    // Actualizar rutas con resultados de validación
    setRoutes(prevRoutes =>
      prevRoutes.map(route => {
        const validation = validationResults.find((v: any) => v.path === route.path);
        if (validation) {
          return {
            ...route,
            validating: false,
            exists: validation.exists,
            error: validation.error,
            has_permission: validation.has_permission,
            warning: validation.warning
          };
        }
        return route;
      })
    );
  };

  /**
   * Elimina una ruta de la lista
   */
  const handleRemoveRoute = (index: number) => {
    setRoutes(routes.filter((_, i) => i !== index));
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type, value } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    let newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    };

    // VALIDACIÓN DE INTEGRIDAD: Ajustar permisos automáticamente para mantener coherencia

    // Si se desactiva can_write, también desactivar can_delete y can_create_directories
    if (name === 'can_write' && !checked) {
      newFormData.can_delete = false;
      newFormData.can_create_directories = false;
      // Si es consultation_edit y se desactiva can_write, resetear edit_permission_level
      if (user?.role === 'consultation_edit') {
        newFormData.edit_permission_level = 'upload_only';
      }
    }

    // Si se activa can_delete, automáticamente activar can_write (eliminar requiere escribir)
    if (name === 'can_delete' && checked) {
      newFormData.can_write = true;
    }

    // NUEVA LÓGICA: Si se activa can_write, can_delete o can_create_directories, activar can_read obligatoriamente
    if ((name === 'can_write' || name === 'can_delete' || name === 'can_create_directories') && checked) {
      newFormData.can_read = true;
    }

    // NUEVA LÓGICA: Si se intenta desactivar can_read pero hay otros permisos activos, mantener can_read activo
    if (name === 'can_read' && !checked) {
      if (newFormData.can_write || newFormData.can_delete || newFormData.can_create_directories) {
        // No permitir desactivar can_read si hay permisos que lo requieren
        newFormData.can_read = true;
      }
    }

    // Si es consultation_edit y cambia edit_permission_level, validar coherencia
    if (name === 'edit_permission_level' && user?.role === 'consultation_edit') {
      // Si se selecciona un nivel que no sea 'upload_only', asegurar que can_write esté activo
      if (value !== 'upload_only') {
        newFormData.can_write = true;
      }
    }

    // Si can_delete está activo y edit_permission_level es "upload_only", cambiar a "upload_own" mínimo
    if (newFormData.can_delete && newFormData.edit_permission_level === 'upload_only' && user?.role === 'consultation_edit') {
      newFormData.edit_permission_level = 'upload_own';
    }

    // Autocomplete: Si se selecciona un email, auto-llenar el nombre
    if (name === 'authorized_by_email' && value) {
      const authorizer = authorizers.find(a => a.email === value);
      if (authorizer) {
        newFormData.authorized_by_name = authorizer.name;
      }
    }

    setFormData(newFormData);
  };

  const addBlockedPath = () => {
    const trimmedPath = blockedPathInput.trim();

    if (!trimmedPath) return;

    // Verificar que no esté ya en blocked_paths
    if (formData.blocked_paths.includes(trimmedPath)) {
      setError('Esta ruta ya está bloqueada');
      return;
    }

    // Verificar que no esté en read_only_paths
    if (formData.read_only_paths.includes(trimmedPath)) {
      setError('Esta ruta ya está configurada como solo lectura. Una ruta no puede estar en ambas restricciones.');
      return;
    }

    setFormData({
      ...formData,
      blocked_paths: [...formData.blocked_paths, trimmedPath],
    });
    setBlockedPathInput('');
    setError('');
  };

  const removeBlockedPath = (path: string) => {
    setFormData({
      ...formData,
      blocked_paths: formData.blocked_paths.filter(p => p !== path),
    });
  };

  const addReadOnlyPath = () => {
    const trimmedPath = readOnlyPathInput.trim();

    if (!trimmedPath) return;

    // Verificar que no esté ya en read_only_paths
    if (formData.read_only_paths.includes(trimmedPath)) {
      setError('Esta ruta ya está configurada como solo lectura');
      return;
    }

    // Verificar que no esté en blocked_paths
    if (formData.blocked_paths.includes(trimmedPath)) {
      setError('Esta ruta ya está bloqueada. Una ruta no puede estar en ambas restricciones.');
      return;
    }

    setFormData({
      ...formData,
      read_only_paths: [...formData.read_only_paths, trimmedPath],
    });
    setReadOnlyPathInput('');
    setError('');
  };

  const removeReadOnlyPath = (path: string) => {
    setFormData({
      ...formData,
      read_only_paths: formData.read_only_paths.filter(p => p !== path),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que al menos un permiso esté activado
    if (!formData.can_read && !formData.can_write && !formData.can_delete) {
      setError('Debe seleccionar al menos un permiso (Lectura, Escritura o Eliminación)');
      return;
    }

    // Validar que haya al menos una ruta
    if (routes.length === 0) {
      setError('Debe agregar al menos una ruta');
      return;
    }

    // Validar que todas las rutas existan
    const invalidRoutes = routes.filter(r => r.validating || !r.exists);
    if (invalidRoutes.length > 0) {
      setError('Hay rutas que no existen o están siendo validadas. Por favor corrija o elimine las rutas inválidas.');
      return;
    }

    // Validar fecha de vencimiento (debe ser al menos 1 día después de hoy)
    if (formData.expires_at) {
      const selectedDate = new Date(formData.expires_at);
      const minDate = new Date(getMinDate());
      if (selectedDate < minDate) {
        setError('La fecha de vencimiento debe ser al menos 1 día después de hoy');
        return;
      }
    }

    try {
      setLoading(true);
      setError('');
      setProgress({ current: 1, total: 1 });

      // Preparar payload con TODAS las rutas (envía en un solo request)
      const payload = {
        routes: routes.map(r => r.path),
        ...formData,
        max_depth: formData.max_depth || null,
        expires_at: formData.expires_at ? `${formData.expires_at}T23:59:59` : null,
      };

      // Llamar al nuevo endpoint que maneja múltiples rutas y envía UN SOLO correo
      const response = await fetch(`/api/admin/users/${user.id}/assign-multiple-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al asignar permisos');
      }

      const data = await response.json();

      // Mostrar resultados
      if (data.created_count === routes.length) {
        toast.success(`✓ ${data.created_count} permiso(s) asignado(s) exitosamente a ${user.username}. Se envió un correo con todas las rutas.`);
        onSuccess();
        handleClose();
      } else if (data.created_count > 0) {
        toast.warning(`⚠ ${data.created_count}/${routes.length} permisos asignados. Algunos fallaron.`);
        setError(`Errores:\n${data.errors.join('\n')}`);
      } else {
        toast.error(`✗ Error al asignar permisos`);
        setError(`Todos los permisos fallaron:\n${data.errors.join('\n')}`);
      }
    } catch (err: any) {
      toast.error('Error al procesar permisos');
      setError(err.message || 'Error al asignar permisos');
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleClose = () => {
    setFormData({
      can_read: true,
      can_write: false,
      can_delete: false,
      can_create_directories: false,
      exempt_from_dictionary: false,
      edit_permission_level: 'upload_only',
      inheritance_mode: 'total',
      blocked_paths: [],
      read_only_paths: [],
      max_depth: undefined,
      expires_at: getDefaultExpirationDate(),
      notes: '',
      authorized_by_email: '',
      authorized_by_name: '',
    });
    setRoutes([]);
    setRouteInput('');
    setBlockedPathInput('');
    setReadOnlyPathInput('');
    setError('');
    onClose();
  };

  const isConsultationEdit = user.role === 'consultation_edit';
  const showGranularControls = user.role !== 'admin' && user.role !== 'superadmin';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8" />
              <div>
                <h3 className="text-2xl font-bold">Asignar Permisos Granulares</h3>
                <p className="text-purple-100 text-sm">
                  Usuario: {user.username} ({user.first_name} {user.last_name}) - Rol: {user.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-purple-800 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Path Input - Múltiples rutas con validación */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              <FolderOpen className="w-4 h-4 inline mr-1" />
              Rutas de NetApp <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <textarea
                value={routeInput}
                onChange={(e) => setRouteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddRoutes();
                  }
                }}
                rows={3}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="\\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\05_grup_trab\11_gest_info\2025&#10;&#10;O múltiples rutas separadas por líneas, comas o tabs..."
              />
              <button
                type="button"
                onClick={handleAddRoutes}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 self-start"
              >
                + Agregar
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              📋 Pegue una o más rutas completas. Separe múltiples rutas con saltos de línea, comas o tabulaciones. Presiona Enter o "Agregar"
            </p>

            {/* Lista de rutas agregadas con validación visual */}
            {routes.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Rutas Agregadas ({routes.length})
                </h4>
                {routes.map((route, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      route.validating
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                        : route.has_permission
                        ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'
                        : route.exists
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                    }`}
                  >
                    {route.validating ? (
                      <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                    ) : route.has_permission ? (
                      <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    ) : route.exists ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-900 dark:text-white truncate">
                        Sub_Proy/{route.path || '(raíz)'}
                      </p>
                      {route.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{route.error}</p>
                      )}
                      {route.warning && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-semibold">⚠️ {route.warning}</p>
                      )}
                      {route.validating && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Validando ruta...</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRoute(index)}
                      className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Basic Permissions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              <Shield className="w-4 h-4 inline mr-1" />
              Permisos Básicos <span className="text-red-600 dark:text-red-400">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Read */}
              <label className={`flex items-start gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg ${(formData.can_write || formData.can_delete || formData.can_create_directories) ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900'} transition-colors`}>
                <input
                  type="checkbox"
                  name="can_read"
                  checked={formData.can_read}
                  onChange={handleChange}
                  disabled={formData.can_write || formData.can_delete || formData.can_create_directories}
                  className="mt-1 w-5 h-5 text-green-600 dark:text-green-400 border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">Lectura</span>
                  </div>
                  {(formData.can_write || formData.can_delete || formData.can_create_directories) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Obligatorio cuando se activa escritura, eliminación o creación de directorios
                    </p>
                  )}
                </div>
              </label>

              {/* Write */}
              <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors">
                <input
                  type="checkbox"
                  name="can_write"
                  checked={formData.can_write}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">Escritura</span>
                  </div>
                </div>
              </label>

              {/* Delete */}
              <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors">
                <input
                  type="checkbox"
                  name="can_delete"
                  checked={formData.can_delete}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 text-red-600 dark:text-red-400 border-gray-300 dark:border-gray-600 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Trash className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">Eliminación</span>
                  </div>
                </div>
              </label>

              {/* Create Directories - Solo visible si can_write está activo */}
              {formData.can_write && (
                <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors">
                  <input
                    type="checkbox"
                    name="can_create_directories"
                    checked={formData.can_create_directories}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 text-orange-600 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FolderPlus className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Crear Directorios</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Si se desmarca, solo puede subir archivos
                    </p>
                  </div>
                </label>
              )}

              {/* Dictionary Exemption */}
              <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors">
                <input
                  type="checkbox"
                  name="exempt_from_dictionary"
                  checked={formData.exempt_from_dictionary}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 text-purple-600 dark:text-purple-400 border-gray-300 dark:border-gray-600 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Book className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">Sin Diccionario</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Fecha de Vencimiento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha de Vencimiento del Permiso <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              type="date"
              name="expires_at"
              value={formData.expires_at}
              onChange={handleChange}
              min={getMinDate()}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>📅 Información importante:</strong>
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1 list-disc list-inside">
                <li>La fecha mínima es <strong>mañana</strong> ({new Date(getMinDate()).toLocaleDateString('es-CO')})</li>
                <li>Por defecto se asigna hasta el <strong>31 de diciembre del año actual</strong></li>
                <li>Cuando el permiso venza, se desactivará automáticamente</li>
                <li>El usuario recibirá notificaciones <strong>7 días y 3 días antes</strong> del vencimiento</li>
              </ul>
            </div>
          </div>

          {/* Campos granulares - Solo para usuarios no-admin */}
          {showGranularControls && (
            <>
              {/* Edit Permission Level (solo para consultation_edit) */}
              {isConsultationEdit && formData.can_write && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Nivel de Edición (Consultation + Edit)
                  </label>
                  <select
                    name="edit_permission_level"
                    value={formData.edit_permission_level}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  >
                    <option value="upload_only">Solo Subir (sin modificar)</option>
                    {/* Solo mostrar opciones de eliminación si can_delete está activo */}
                    {formData.can_delete && (
                      <>
                        <option value="upload_own">Subir + Editar/Eliminar Propios</option>
                        <option value="upload_all">Subir + Editar/Eliminar Todos</option>
                      </>
                    )}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Define qué puede hacer el usuario con archivos en esta ruta
                  </p>
                </div>
              )}

              {/* Restricciones de Herencia - Título */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
                <h4 className="text-md font-bold text-indigo-900 dark:text-indigo-200 mb-1 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Restricciones de Herencia (Opcionales)
                </h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  Estas restricciones se pueden combinar. Por defecto, el usuario hereda todos los permisos en todos los subdirectorios.
                </p>
              </div>

              {/* Modo de Herencia */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <Layers className="w-4 h-4 inline mr-1" />
                  Modo de Herencia
                </label>
                <select
                  name="inheritance_mode"
                  value={formData.inheritance_mode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="total">Herencia Total (acceso a todos los subdirectorios)</option>
                  {formData.blocked_paths.length > 0 && (
                    <option value="blocked">Herencia con Bloqueos (excluye rutas bloqueadas)</option>
                  )}
                  <option value="limited_depth">Rango Limitado de Profundidad (restringe niveles)</option>
                  {formData.read_only_paths.length > 0 && (
                    <option value="partial_write">Herencia Parcial con Restricciones de Escritura</option>
                  )}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {formData.blocked_paths.length === 0 && formData.read_only_paths.length === 0 && (
                    '💡 Agrega rutas bloqueadas o de solo lectura para más opciones de herencia'
                  )}
                  {formData.blocked_paths.length > 0 && formData.read_only_paths.length === 0 && (
                    '✓ "Herencia con Bloqueos" disponible por tener rutas bloqueadas'
                  )}
                  {formData.blocked_paths.length === 0 && formData.read_only_paths.length > 0 && (
                    '✓ "Herencia Parcial" disponible por tener rutas de solo lectura'
                  )}
                  {formData.blocked_paths.length > 0 && formData.read_only_paths.length > 0 && (
                    '✓ Todas las opciones de herencia disponibles'
                  )}
                </p>
              </div>

              {/* Blocked Paths - Sección expandible */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={showBlockedPaths}
                    onChange={(e) => {
                      setShowBlockedPaths(e.target.checked);
                      if (!e.target.checked) {
                        setFormData({ ...formData, blocked_paths: [] });
                      }
                    }}
                    className="w-5 h-5 text-red-600 dark:text-red-400 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="font-bold text-gray-900 dark:text-white">Bloquear Rutas Específicas</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      El usuario NO podrá acceder a las rutas bloqueadas ni a sus subdirectorios
                    </p>
                  </div>
                </label>

                {showBlockedPaths && (
                  <>
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>📌 Formato de rutas bloqueadas:</strong>
                    </p>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                      <li><strong>Ruta relativa:</strong> <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">03_gest_info_catas</code> (se añade automáticamente al base_path)</li>
                      <li><strong>Ruta completa:</strong> <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">\\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\03_gest_info_catas</code></li>
                    </ul>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      ⚠️ Se bloquea la carpeta especificada y TODOS sus subdirectorios.
                    </p>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={blockedPathInput}
                      onChange={(e) => setBlockedPathInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBlockedPath())}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Ejemplo: 03_gest_info_catas\Carpeta_Secreta"
                    />
                    <button
                      type="button"
                      onClick={addBlockedPath}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="space-y-1">
                    {formData.blocked_paths.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                        No hay rutas bloqueadas. Este usuario tendrá acceso total a todos los subdirectorios.
                      </div>
                    )}
                    {formData.blocked_paths.map((path) => (
                      <div key={path} className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-3 py-2 rounded">
                        <Lock className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <span className="flex-1 text-sm font-mono text-red-900 break-all overflow-x-auto">{path}</span>
                        <button
                          type="button"
                          onClick={() => removeBlockedPath(path)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </div>

              {/* Read-Only Paths - Sección independiente */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={showReadOnlyPaths}
                    onChange={(e) => {
                      setShowReadOnlyPaths(e.target.checked);
                      if (!e.target.checked) {
                        setFormData({ ...formData, read_only_paths: [] });
                      }
                    }}
                    className="w-5 h-5 text-yellow-600 dark:text-yellow-400 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-bold text-gray-900 dark:text-white">Rutas de Solo Lectura</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      El usuario PUEDE ver y descargar, pero NO puede crear, editar ni eliminar
                    </p>
                  </div>
                </label>

                {showReadOnlyPaths && (
                  <>
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>📖 Formato de rutas de solo lectura:</strong>
                    </p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 space-y-1 list-disc list-inside">
                      <li><strong>Ruta relativa:</strong> <code className="bg-yellow-100 px-1 rounded">03_gest_info_catas</code> (se añade automáticamente al base_path)</li>
                      <li><strong>Ruta completa:</strong> <code className="bg-yellow-100 px-1 rounded">\\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\03_gest_info_catas</code></li>
                    </ul>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                      ℹ️ En estas rutas el usuario PUEDE ver y descargar, pero NO puede crear, editar ni eliminar archivos/carpetas.
                    </p>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={readOnlyPathInput}
                      onChange={(e) => setReadOnlyPathInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addReadOnlyPath())}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Ejemplo: 03_gest_info_catas\Carpeta_Consulta"
                    />
                    <button
                      type="button"
                      onClick={addReadOnlyPath}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="space-y-1">
                    {formData.read_only_paths.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                        No hay rutas de solo lectura. El usuario tendrá permisos completos en todos los subdirectorios.
                      </div>
                    )}
                    {formData.read_only_paths.map((path) => (
                      <div key={path} className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 px-3 py-2 rounded">
                        <Eye className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <span className="flex-1 text-sm font-mono text-yellow-900 break-all overflow-x-auto">{path}</span>
                        <button
                          type="button"
                          onClick={() => removeReadOnlyPath(path)}
                          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </div>

              {/* Max Depth - Sección independiente */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={showMaxDepth}
                    onChange={(e) => {
                      setShowMaxDepth(e.target.checked);
                      if (!e.target.checked) {
                        setFormData({ ...formData, max_depth: undefined });
                      } else {
                        setFormData({ ...formData, max_depth: 1 });
                      }
                    }}
                    className="w-5 h-5 text-orange-600 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-orange-600" />
                      <span className="font-bold text-gray-900 dark:text-white">Limitar Profundidad de Navegación</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      El usuario NO podrá navegar más allá del nivel especificado
                    </p>
                  </div>
                </label>

                {showMaxDepth && (
                  <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-orange-800 dark:text-orange-200 mb-2">
                      Niveles de profundidad permitidos:
                    </label>
                    <input
                      type="number"
                      name="max_depth"
                      value={formData.max_depth || ''}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-2 border border-orange-300 dark:border-orange-600 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ejemplo: 3 (acceso hasta 3 niveles de profundidad)"
                    />
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                      ℹ️ Ejemplo: Con profundidad=2, el usuario puede navegar 2 niveles desde su ruta base
                    </p>
                  </div>
                )}
              </div>

            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Notas (opcional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Observaciones sobre este permiso..."
            />
          </div>

          {/* Autorización */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h4 className="text-md font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Información de Autorización (Opcional)
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">
              Registra quién autorizó este permiso (generalmente el líder del grupo). Esta persona recibirá copia del correo de notificación.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email de quien autoriza
                </label>
                <input
                  type="email"
                  name="authorized_by_email"
                  value={formData.authorized_by_email}
                  onChange={handleChange}
                  list="authorizers-email-list"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="lider.grupo@igac.gov.co"
                />
                <datalist id="authorizers-email-list">
                  {authorizers.map((auth, idx) => (
                    <option key={idx} value={auth.email}>
                      {auth.name}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <UserCheck className="w-4 h-4 inline mr-1" />
                  Nombre completo
                </label>
                <input
                  type="text"
                  name="authorized_by_name"
                  value={formData.authorized_by_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="Nombre Completo del Líder"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 -mx-6 -mb-6 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors font-semibold disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Asignando {progress.current}/{progress.total}...</span>
                </>
              ) : (
                'Asignar Permisos'
              )}
            </button>
          </div>
        </form>
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};
