import { CheckCircle2, Copy, X, Mail } from 'lucide-react';
import { useState } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  password: string;
  email: string;
  emailSent: boolean;
}

export const SuccessModal = ({
  isOpen,
  onClose,
  username,
  password,
  email,
  emailSent,
}: SuccessModalProps) => {
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async (text: string, type: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'username') {
        setCopiedUsername(true);
        setTimeout(() => setCopiedUsername(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Header con animación */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white dark:bg-gray-800 opacity-10 animate-pulse"></div>
          <div className="relative">
            <div className="mx-auto w-20 h-20 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-lg dark:shadow-gray-900/50">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">¡Usuario Creado!</h2>
            <p className="text-green-100 text-lg">El usuario ha sido registrado exitosamente</p>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-8">
          {emailSent && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-r-lg">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">Email Enviado</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Se han enviado las credenciales a: <span className="font-mono font-semibold">{email}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {!emailSent && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 rounded-r-lg">
              <p className="font-semibold text-amber-900 mb-2">⚠️ Importante</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                No se envió email. Guarda estas credenciales ahora, no podrás verlas después.
              </p>
            </div>
          )}

          {/* Credenciales */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Nombre de Usuario
              </label>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg font-mono text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {username}
                </div>
                <button
                  onClick={() => handleCopy(username, 'username')}
                  className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2 font-semibold"
                >
                  <Copy className="w-4 h-4" />
                  {copiedUsername ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Contraseña Temporal
              </label>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg font-mono text-lg font-semibold text-gray-800 dark:text-gray-100 break-all">
                  {password}
                </div>
                <button
                  onClick={() => handleCopy(password, 'password')}
                  className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2 font-semibold"
                >
                  <Copy className="w-4 h-4" />
                  {copiedPassword ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 px-8 py-6 flex justify-end border-t">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg dark:shadow-gray-900/50 hover:shadow-xl dark:shadow-gray-900/50"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
