/**
 * Modal de alerta profesional para reemplazar window.alert()
 * Soporta diferentes tipos: info, success, warning, error
 */
import React from 'react';
import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string | React.ReactNode;
  type?: AlertType;
  buttonText?: string;
}

const typeConfig = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-700',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-900',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-200 dark:border-green-700',
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-900',
    buttonColor: 'bg-green-600 hover:bg-green-700',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
    borderColor: 'border-yellow-200 dark:border-yellow-700',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    titleColor: 'text-yellow-900',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    borderColor: 'border-red-200 dark:border-red-700',
    iconColor: 'text-red-600 dark:text-red-400',
    titleColor: 'text-red-900',
    buttonColor: 'bg-red-600 hover:bg-red-700',
  },
};

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'Aceptar',
}) => {
  if (!isOpen) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  // Cerrar con Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border-2 ${config.borderColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${config.bgColor} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
            <h3 className={`text-lg font-semibold ${config.titleColor}`}>
              {title || (type === 'info' ? 'Información' : type === 'success' ? 'Éxito' : type === 'warning' ? 'Advertencia' : 'Error')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 dark:text-gray-200 transition-colors p-1 rounded-full hover:bg-white dark:bg-gray-800/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
            {message}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 text-white font-medium rounded-lg transition-colors ${config.buttonColor}`}
            autoFocus
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
