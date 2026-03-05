import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, RefreshCw, Eye, EyeOff, Check, X, Copy, Shield, AlertCircle } from 'lucide-react';
import { authApi } from '../api';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  suggestions: string[];
}

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const toast = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Password generator options
  const [passwordLength, setPasswordLength] = useState(12);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Token de recuperación no válido');
    }
  }, [token]);

  const generateSecurePassword = (): string => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = '';
    let password = '';

    // Build charset based on options
    if (includeUppercase) charset += uppercase;
    if (includeLowercase) charset += lowercase;
    if (includeNumbers) charset += numbers;
    if (includeSymbols) charset += symbols;

    if (charset === '') {
      charset = lowercase; // Fallback
    }

    // Ensure at least one character from each selected type
    if (includeUppercase) password += uppercase[Math.floor(Math.random() * uppercase.length)];
    if (includeLowercase) password += lowercase[Math.floor(Math.random() * lowercase.length)];
    if (includeNumbers) password += numbers[Math.floor(Math.random() * numbers.length)];
    if (includeSymbols) password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < passwordLength; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGeneratePassword = () => {
    const generated = generateSecurePassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success('Contraseña copiada al portapapeles');
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const suggestions: string[] = [];

    if (password.length === 0) {
      return { score: 0, label: 'Ninguna', color: 'bg-gray-300', suggestions: ['Ingresa una contraseña'] };
    }

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 10) score++;
    if (password.length >= 12) score++;
    else suggestions.push('Usa al menos 12 caracteres');

    // Complexity checks
    if (/[a-z]/.test(password)) score++;
    else suggestions.push('Agrega letras minúsculas');

    if (/[A-Z]/.test(password)) score++;
    else suggestions.push('Agrega letras mayúsculas');

    if (/[0-9]/.test(password)) score++;
    else suggestions.push('Agrega números');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else suggestions.push('Agrega símbolos especiales');

    // Determine strength
    if (score <= 2) {
      return { score, label: 'Muy débil', color: 'bg-red-500', suggestions };
    } else if (score <= 4) {
      return { score, label: 'Débil', color: 'bg-orange-500', suggestions };
    } else if (score <= 5) {
      return { score, label: 'Aceptable', color: 'bg-yellow-500', suggestions };
    } else if (score <= 6) {
      return { score, label: 'Fuerte', color: 'bg-blue-500', suggestions };
    } else {
      return { score, label: 'Muy fuerte', color: 'bg-green-500', suggestions: [] };
    }
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token no válido');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (passwordStrength.score < 5) {
      setError('La contraseña es demasiado débil. Por favor usa una contraseña más segura.');
      return;
    }

    setLoading(true);

    try {
      await authApi.confirmPasswordReset({
        token,
        new_password: newPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Token No Válido</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            El enlace de recuperación no es válido o ha expirado.
          </p>
          <button
            onClick={() => navigate('/recuperar-contrasena')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Solicitar Nuevo Enlace
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-green-100 dark:bg-green-900/50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">¡Contraseña Actualizada!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Tu contraseña ha sido restablecida exitosamente. Serás redirigido al inicio de sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 dark:bg-blue-900/50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Restablecer Contraseña
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Crea una contraseña segura para tu cuenta
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Password Generator Section */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-bold text-gray-900 dark:text-white">Generador de Contraseñas Seguras</h3>
            </div>

            <div className="space-y-4">
              {/* Length Slider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Longitud: {passwordLength} caracteres
                </label>
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={passwordLength}
                  onChange={(e) => setPasswordLength(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeUppercase}
                    onChange={(e) => setIncludeUppercase(e.target.checked)}
                    className="w-4 h-4 text-purple-600 dark:text-purple-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Mayúsculas (A-Z)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLowercase}
                    onChange={(e) => setIncludeLowercase(e.target.checked)}
                    className="w-4 h-4 text-purple-600 dark:text-purple-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Minúsculas (a-z)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNumbers}
                    onChange={(e) => setIncludeNumbers(e.target.checked)}
                    className="w-4 h-4 text-purple-600 dark:text-purple-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Números (0-9)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSymbols}
                    onChange={(e) => setIncludeSymbols(e.target.checked)}
                    className="w-4 h-4 text-purple-600 dark:text-purple-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">Símbolos (!@#$)</span>
                </label>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg dark:shadow-gray-900/50"
              >
                <RefreshCw className="w-5 h-5" />
                Generar Contraseña Segura
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Nueva Contraseña <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent pr-24 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="Ingresa tu nueva contraseña"
                required
                autoComplete="new-password"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded transition-colors"
                  title="Copiar contraseña"
                >
                  <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Seguridad: {passwordStrength.label}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {passwordStrength.score}/7
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${passwordStrength.color} transition-all duration-300`}
                    style={{ width: `${(passwordStrength.score / 7) * 100}%` }}
                  />
                </div>
                {passwordStrength.suggestions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {passwordStrength.suggestions.map((suggestion, idx) => (
                      <p key={idx} className="text-xs text-orange-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {suggestion}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Confirmar Contraseña <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              placeholder="Confirma tu nueva contraseña"
              required
              autoComplete="new-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                <X className="w-4 h-4" />
                Las contraseñas no coinciden
              </p>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Las contraseñas coinciden
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || newPassword !== confirmPassword || passwordStrength.score < 5}
            className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg dark:shadow-gray-900/50"
          >
            <Lock className="w-5 h-5" />
            {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 dark:text-blue-200 hover:underline transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};
