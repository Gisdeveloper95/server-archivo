/**
 * Modal de confirmación profesional para reemplazar window.confirm()
 * Soporta diferentes tipos: danger, warning, info
 */
import React from 'react';
import { X, AlertTriangle, Trash2, Info, HelpCircle, Loader2 } from 'lucide-react';

type ConfirmType = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | React.ReactNode;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

const typeConfig = {
  danger: {
    icon: Trash2,
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    borderColor: 'border-red-200 dark:border-red-700',
    iconColor: 'text-red-600 dark:text-red-400',
    iconBgColor: 'bg-red-100 dark:bg-red-900/50',
    titleColor: 'text-red-900',
    confirmButtonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
    borderColor: 'border-yellow-200 dark:border-yellow-700',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    iconBgColor: 'bg-yellow-100',
    titleColor: 'text-yellow-900',
    confirmButtonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
  },
  info: {
    icon: HelpCircle,
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-700',
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/50',
    titleColor: 'text-blue-900',
    confirmButtonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:focus:ring-blue-400',
  },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  icon,
  isLoading = false,
}) => {
  const [loading, setLoading] = React.useState(false);

  if (!isOpen) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error en confirmación:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cerrar con Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !isLoading) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, loading, isLoading]);

  const showLoading = loading || isLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Body */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${config.iconBgColor} flex items-center justify-center`}>
              {icon || <Icon className={`w-6 h-6 ${config.iconColor}`} />}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <h3 className={`text-lg font-semibold ${config.titleColor} mb-2`}>
                {title}
              </h3>
              <div className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">
                {message}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              disabled={showLoading}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={showLoading}
            className="px-5 py-2.5 text-gray-700 dark:text-gray-200 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={showLoading}
            className={`px-5 py-2.5 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2 ${config.confirmButtonColor}`}
          >
            {showLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
