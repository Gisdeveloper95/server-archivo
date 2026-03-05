import { useState } from 'react';
import { X, Mail, User, Key, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { SuccessModal } from '../SuccessModal';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES = [
  { value: 'consultation', label: 'Solo Consulta', description: 'Puede ver archivos' },
  { value: 'consultation_edit', label: 'Consulta y Edición', description: 'Puede ver y editar archivos' },
  { value: 'admin', label: 'Administrador', description: 'Puede gestionar usuarios y permisos' },
  { value: 'superadmin', label: 'Super Administrador', description: 'Acceso total al sistema' },
];

const generateSecurePassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?/~';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';

  // Asegurar al menos un carácter de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Completar hasta 12 caracteres
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mezclar los caracteres
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

export const CreateUserModal = ({ isOpen, onClose, onSuccess }: CreateUserModalProps) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'consultation',
    password: generateSecurePassword(),
    send_email: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUser, setCreatedUser] = useState({ username: '', password: '', email: '', emailSent: false });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;

    // Auto-generar username desde el email
    const username = email.split('@')[0];

    setFormData({ ...formData, email, username });

    // Validar email IGAC
    if (email && !email.endsWith('@igac.gov.co')) {
      setError('El email debe ser corporativo del IGAC (@igac.gov.co)');
    } else {
      setError('');
    }
  };

  const handleGeneratePassword = () => {
    setFormData({ ...formData, password: generateSecurePassword() });
    setCopied(false);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar la contraseña:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.email.endsWith('@igac.gov.co')) {
      setError('El email debe ser corporativo del IGAC (@igac.gov.co)');
      return;
    }

    if (formData.password.length < 12) {
      setError('La contraseña debe tener al menos 12 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear usuario');
      }

      const data = await response.json();

      // Guardar info del usuario creado y mostrar modal de éxito
      setCreatedUser({
        username: formData.username,
        password: formData.password,
        email: formData.email,
        emailSent: formData.send_email
      });

      // NO cerrar el modal aún, mostrar primero el modal de éxito
      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role: 'consultation',
      password: generateSecurePassword(),
      send_email: true,
    });
    setError('');
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-t-xl">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8" />
              <div>
                <h3 className="text-2xl font-bold">Registrar Nuevo Usuario</h3>
                <p className="text-green-100 text-sm">Complete la información del usuario</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-green-800 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Email - PRIMERO */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Corporativo IGAC <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleEmailChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="juan.perez@igac.gov.co"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Debe terminar en @igac.gov.co</p>
          </div>

          {/* Username - Auto-generated */}
          {formData.username && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Nombre de Usuario (Generado automáticamente)
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                readOnly
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                placeholder="Se generará desde el email"
              />
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Generado automáticamente desde el correo electrónico</p>
            </div>
          )}

          {/* Personal Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Nombre <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="Juan"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Apellido <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="Pérez"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Rol <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              Contraseña Generada <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                title="Generar nueva contraseña"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCopyPassword}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300'
                }`}
                title="Copiar contraseña"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              12 caracteres con mayúsculas, minúsculas, números y símbolos
            </p>
          </div>

          {/* Send Email */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="send_email"
                checked={formData.send_email}
                onChange={handleChange}
                className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">Enviar credenciales por email</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Se enviará un correo con un banner de bienvenida al usuario con su usuario y contraseña
                </div>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
              disabled={loading || !!error}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de éxito */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          handleClose();
          onSuccess();
        }}
        username={createdUser.username}
        password={createdUser.password}
        email={createdUser.email}
        emailSent={createdUser.emailSent}
      />
    </div>
  );
};
