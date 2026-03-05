import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, Check } from 'lucide-react';
import { authApi } from '../api';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.requestPasswordReset({ email_or_username: emailOrUsername });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error al enviar el correo de recuperación'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Correo Enviado
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Si existe una cuenta asociada a <strong>{emailOrUsername}</strong>, recibirás un correo electrónico con instrucciones para restablecer tu contraseña.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-6">
                Por favor revisa tu bandeja de entrada y la carpeta de spam.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver al inicio de sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            NetApp Bridge IGAC
          </h1>
          <p className="text-gray-600 dark:text-gray-300">Recuperación de Contraseña</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 p-8">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Volver al inicio</span>
          </button>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
            Ingresa tu usuario o correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Usuario o Correo Electrónico
              </label>
              <input
                id="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="usuario o correo@igac.gov.co"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                Ingresa tu nombre de usuario (ej: andres.osorio) o tu correo completo
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>Enviar Instrucciones</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          <p>Instituto Geográfico Agustín Codazzi</p>
        </div>
      </div>
    </div>
  );
};
