import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Lock, Mail, FileText, Folder, AlertCircle } from 'lucide-react';

export const SharedAccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccess = async () => {
    if (!token) {
      setError('Token inválido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ token });
      if (password) params.append('password', password);
      if (email) params.append('email', email);

      // Acceder directamente a la URL pública del backend
      const url = `/shared/${token}?${params.toString()}`;
      window.open(url, '_blank');

      // Resetear form después de un delay
      setTimeout(() => {
        setPassword('');
        setEmail('');
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al acceder al archivo');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 p-8 max-w-md w-full">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Link inválido
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-center">
            El link que intentas acceder no es válido o ha expirado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Archivo Compartido
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Ingresa las credenciales necesarias para acceder al archivo
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Password field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Lock className="w-4 h-4" />
              Contraseña (si se requiere)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAccess()}
              placeholder="Ingresa la contraseña"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Email field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Mail className="w-4 h-4" />
              Email (si se requiere)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAccess()}
              placeholder="tu@email.com"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Access button */}
          <button
            onClick={handleAccess}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Accediendo...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Acceder al Archivo
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> Si el archivo requiere contraseña o email específico,
            asegúrate de ingresarlos correctamente.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
            Sistema de Gestión de Archivos - IGAC
          </p>
        </div>
      </div>
    </div>
  );
};
