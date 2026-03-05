import { useState, useEffect } from 'react';
import { X, FolderOpen, Eye, Edit, Trash, Book, AlertCircle, Shield, Lock, Layers, FolderPlus, Mail, UserCheck } from 'lucide-react';
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

interface EditPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: Permission;
  onSuccess: () => void;
}

export const EditPermissionModal = ({ isOpen, onClose, permission, onSuccess }: EditPermissionModalProps) => {
  // Helper para calcular fecha mínima (mañana)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Helper para fecha por defecto (31 dic del año actual)
  const getDefaultExpirationDate = () => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-12-31`;
  };

  const [formData, setFormData] = useState({
    can_read: true,
    can_write: false,
    can_delete: false,
    can_create_directories: false,
    exempt_from_dictionary: false,
    edit_permission_level: 'upload_only' as EditPermissionLevel,
    inheritance_mode: 'total' as InheritanceMode,
    blocked_paths: [] as string[],
    read_only_paths: [] as string[],
    max_depth: undefined as number | undefined,
    notes: '',
    expires_at: getDefaultExpirationDate(),
    authorized_by_email: '',
    authorized_by_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blockedPathInput, setBlockedPathInput] = useState('');
  const [readOnlyPathInput, setReadOnlyPathInput] = useState('');
  const [authorizers, setAuthorizers] = useState<Array<{ email: string; name: string }>>([]);

  // Estados para controlar si las secciones están activas
  const [showBlockedPaths, setShowBlockedPaths] = useState(false);
  const [showReadOnlyPaths, setShowReadOnlyPaths] = useState(false);
  const [showMaxDepth, setShowMaxDepth] = useState(false);

  // Estados para el modal de confirmación de notificaciones
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);

  // Estados para el modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    title: string;
    message: string;
    stats?: { label: string; value: number; color: string }[];
    details?: string;
    emailsSent?: string[];
  } | null>(null);

  // Cargar datos del permiso cuando se abre el modal
  useEffect(() => {
    if (permission) {
      console.log('🔍 [EditPermissionModal] Permiso recibido:', permission);
      console.log('🔍 [EditPermissionModal] blocked_paths:', permission.blocked_paths);
      console.log('🔍 [EditPermissionModal] inheritance_mode:', permission.inheritance_mode);
      console.log('🔍 [EditPermissionModal] max_depth:', permission.max_depth);
      console.log('🔍 [EditPermissionModal] expires_at:', permission.expires_at);

      // Convertir expires_at de timestamp a formato YYYY-MM-DD
      let expiresAtFormatted = getDefaultExpirationDate();
      if (permission.expires_at) {
        const expiresDate = new Date(permission.expires_at);
        expiresAtFormatted = expiresDate.toISOString().split('T')[0];
      }

      setFormData({
        can_read: permission.can_read,
        can_write: permission.can_write,
        can_delete: permission.can_delete,
        can_create_directories: permission.can_create_directories !== undefined ? permission.can_create_directories : false,
        exempt_from_dictionary: permission.exempt_from_dictionary,
        edit_permission_level: permission.edit_permission_level || 'upload_only',
        inheritance_mode: permission.inheritance_mode || 'total',
        blocked_paths: permission.blocked_paths || [],
        read_only_paths: permission.read_only_paths || [],
        max_depth: permission.max_depth || undefined,
        notes: permission.notes || '',
        expires_at: expiresAtFormatted,
        authorized_by_email: permission.authorized_by_email || '',
        authorized_by_name: permission.authorized_by_name || '',
      });

      // Inicializar estados de visibilidad
      setShowBlockedPaths((permission.blocked_paths || []).length > 0);
      setShowReadOnlyPaths((permission.read_only_paths || []).length > 0);
      setShowMaxDepth(permission.max_depth !== undefined && permission.max_depth !== null);

      console.log('✅ [EditPermissionModal] FormData configurado con expires_at:', expiresAtFormatted);
    }
  }, [permission]);

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

  if (!isOpen) return null;

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
      if (permission.user.role === 'consultation_edit') {
        newFormData.edit_permission_level = 'upload_only';
      }
    }

    // Si se activa can_delete, automáticamente activar can_write (eliminar requiere escribir)
    if (name === 'can_delete' && checked) {
      newFormData.can_write = true;
    }

    // Si es consultation_edit y cambia edit_permission_level, validar coherencia
    if (name === 'edit_permission_level' && permission.user.role === 'consultation_edit') {
      // Si se selecciona un nivel que no sea 'upload_only', asegurar que can_write esté activo
      if (value !== 'upload_only') {
        newFormData.can_write = true;
      }
    }

    // Si can_delete está activo y edit_permission_level es "upload_only", cambiar a "upload_own" mínimo
    if (newFormData.can_delete && newFormData.edit_permission_level === 'upload_only' && permission.user.role === 'consultation_edit') {
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

  const showSuccess = (
    title: string,
    message: string,
    stats?: { label: string; value: number; color: string }[],
    details?: string,
    emailsSent?: string[]
  ) => {
    setSuccessModalData({ title, message, stats, details, emailsSent });
    setShowSuccessModal(true);
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessModalData(null);
    onSuccess();
    handleClose();
  };

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
      green: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
      red: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
      yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
    };
    return colorMap[color] || colorMap.blue;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que al menos un permiso esté activado
    if (!formData.can_read && !formData.can_write && !formData.can_delete) {
      setError('Debe seleccionar al menos un permiso (Lectura, Escritura o Eliminación)');
      return;
    }

    // Validar fecha de vencimiento
    if (formData.expires_at) {
      const selectedDate = new Date(formData.expires_at);
      const minDate = new Date(getMinDate());
      if (selectedDate < minDate) {
        setError('La fecha de vencimiento debe ser al menos 1 día después de hoy');
        return;
      }
    }

    // Guardar los datos del formulario y mostrar modal de confirmación
    const payload = {
      ...formData,
      max_depth: formData.max_depth || null,
    };
    setPendingFormData(payload);
    setShowNotificationModal(true);
  };

  const handleActualSubmit = async (notifyUser: boolean, notifyLeader: boolean) => {
    try {
      setLoading(true);
      setError('');
      setShowNotificationModal(false);

      const payload = {
        ...pendingFormData,
        notify_user: notifyUser,
        notify_leader: notifyLeader,
      };

      const response = await fetch(`/api/admin/permissions/${permission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar permiso');
      }

      const result = await response.json();

      // Mostrar modal de éxito profesional
      if (result.emails_sent && result.emails_sent.length > 0) {
        showSuccess(
          '✅ Permiso Modificado Exitosamente',
          `Los permisos de "${permission.user.first_name} ${permission.user.last_name}" han sido actualizados`,
          [
            { label: 'Ruta Modificada', value: 1, color: 'orange' },
            { label: 'Notificaciones Enviadas', value: result.emails_sent.length, color: 'green' },
          ],
          `Ruta: ${permission.base_path}`,
          result.emails_sent
        );
      } else {
        showSuccess(
          '✅ Permiso Modificado Exitosamente',
          `Los permisos de "${permission.user.first_name} ${permission.user.last_name}" han sido actualizados (sin notificaciones)`,
          [
            { label: 'Ruta Modificada', value: 1, color: 'orange' },
          ],
          `Ruta: ${permission.base_path}`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar permiso');
    } finally {
      setLoading(false);
      setPendingFormData(null);
    }
  };

  const handleClose = () => {
    setBlockedPathInput('');
    setError('');
    setShowNotificationModal(false);
    setPendingFormData(null);
    onClose();
  };

  const isConsultationEdit = permission.user.role === 'consultation_edit';
  const showGranularControls = permission.user.role !== 'admin' && permission.user.role !== 'superadmin';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl sticky top-0 z-10">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8" />
              <div>
                <h3 className="text-2xl font-bold">Editar Permisos Granulares</h3>
                <p className="text-blue-100 text-sm">
                  Usuario: {permission.user.username} ({permission.user.first_name} {permission.user.last_name}) - Rol: {permission.user.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
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

          {/* Path Display (Read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              <FolderOpen className="w-4 h-4 inline mr-1" />
              Ruta Asignada
            </label>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {permission.base_path ? `Sub_Proy/${permission.base_path}` : 'Sub_Proy (raíz completa)'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                La ruta no se puede cambiar. Para cambiarla, elimine este permiso y cree uno nuevo.
              </p>
            </div>
          </div>

          {/* Basic Permissions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              <Shield className="w-4 h-4 inline mr-1" />
              Permisos Básicos <span className="text-red-600 dark:text-red-400">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Read */}
              <label className="flex items-start gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors">
                <input
                  type="checkbox"
                  name="can_read"
                  checked={formData.can_read}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 text-green-600 dark:text-green-400 border-gray-300 dark:border-gray-600 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">Lectura</span>
                  </div>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
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
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                    Define qué puede hacer el usuario con archivos en esta ruta
                  </p>
                </div>
              )}

              {/* Restricciones de Herencia - Título */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="text-md font-bold text-indigo-900 mb-1 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Restricciones de Herencia (Opcionales)
                </h4>
                <p className="text-xs text-indigo-700">
                  Estas restricciones se pueden combinar. Por defecto, el usuario hereda todos los permisos en todos los subdirectorios.
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
                        // Desactivar: limpiar array
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
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                      <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 italic py-2">
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
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-200 flex-shrink-0"
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
                      <strong>📖 Rutas de Solo Lectura:</strong>
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
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Ejemplo: 03_gest_info_catas\Carpeta_SoloLectura"
                    />
                    <button
                      type="button"
                      onClick={addReadOnlyPath}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Agregar
                    </button>
                  </div>
                  <div className="space-y-1">
                    {formData.read_only_paths.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 italic py-2">
                        No hay rutas de solo lectura. El usuario tendrá permisos de escritura en todos los subdirectorios.
                      </div>
                    )}
                    {formData.read_only_paths.map((path) => (
                      <div key={path} className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 px-3 py-2 rounded">
                        <Eye className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <span className="flex-1 text-sm font-mono text-yellow-900 break-all overflow-x-auto">{path}</span>
                        <button
                          type="button"
                          onClick={() => removeReadOnlyPath(path)}
                          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:text-yellow-200 flex-shrink-0"
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
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-orange-800 mb-2">
                      Niveles de profundidad permitidos:
                    </label>
                    <input
                      type="number"
                      name="max_depth"
                      value={formData.max_depth || ''}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                      placeholder="Ejemplo: 3 (acceso hasta 3 niveles de profundidad)"
                    />
                    <p className="text-xs text-orange-700 mt-2">
                      ℹ️ Ejemplo: Con profundidad=2, el usuario puede navegar 2 niveles desde su ruta base
                    </p>
                  </div>
                )}
              </div>

            </>
          )}

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              📅 Fecha de Vencimiento <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              type="date"
              name="expires_at"
              value={formData.expires_at}
              onChange={handleChange}
              min={getMinDate()}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mt-2">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>ℹ️ Información importante:</strong>
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1 list-disc list-inside">
                <li>La fecha debe ser al menos <strong>1 día después de hoy</strong></li>
                <li>El usuario recibirá notificaciones <strong>7 y 3 días antes</strong> del vencimiento</li>
                <li>Al vencer, el permiso se <strong>desactivará automáticamente</strong></li>
                <li>Puedes reactivar permisos vencidos cambiando la fecha a una futura</li>
              </ul>
            </div>
          </div>

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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Observaciones sobre este permiso..."
            />
          </div>

          {/* Autorización */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h4 className="text-md font-bold text-blue-900 mb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Información de Autorización (Opcional)
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
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
                  list="edit-authorizers-email-list"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="lider.grupo@igac.gov.co"
                />
                <datalist id="edit-authorizers-email-list">
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
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'Actualizando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Confirmación de Notificaciones */}
      {showNotificationModal && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Confirmar Notificaciones
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  ¿Desea enviar notificaciones por email sobre estos cambios?
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">Usuario: {permission.user.first_name} {permission.user.last_name}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 ml-8">{permission.user.email}</p>
              </div>

              {permission.authorized_by_email && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">Líder: {permission.authorized_by_name || 'Líder del grupo'}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 ml-8">{permission.authorized_by_email}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleActualSubmit(true, true)}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                {permission.authorized_by_email ? 'Notificar a Usuario y Líder' : 'Notificar al Usuario'}
              </button>

              <button
                onClick={() => handleActualSubmit(true, false)}
                disabled={loading}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold disabled:opacity-50"
              >
                Solo Notificar al Usuario
              </button>

              <button
                onClick={() => handleActualSubmit(false, false)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors font-semibold disabled:opacity-50"
              >
                Guardar sin Notificar
              </button>

              <button
                onClick={() => {
                  setShowNotificationModal(false);
                  setPendingFormData(null);
                }}
                disabled={loading}
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100 transition-colors text-sm"
              >
                Cancelar
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

              {/* Lista de emails enviados */}
              {successModalData.emailsSent && successModalData.emailsSent.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📧</span>
                    <div className="flex-1">
                      <div className="font-semibold text-blue-900 mb-2">
                        Notificaciones Enviadas
                      </div>
                      <ul className="space-y-1">
                        {successModalData.emailsSent.map((email, index) => (
                          <li key={index} className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                            <span className="text-green-600 dark:text-green-400">✓</span>
                            <span className="font-mono">{email}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
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
    </div>
  );
};
