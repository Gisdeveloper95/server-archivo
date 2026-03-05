import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ type, message, onClose, duration = 4000 }: ToastProps) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-gradient-to-r from-green-500 to-emerald-600',
      iconColor: 'text-white',
      borderColor: 'border-green-400'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-gradient-to-r from-red-500 to-rose-600',
      iconColor: 'text-white',
      borderColor: 'border-red-400'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-gradient-to-r from-yellow-500 to-orange-600',
      iconColor: 'text-white',
      borderColor: 'border-yellow-400'
    },
    info: {
      icon: Info,
      bgColor: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      iconColor: 'text-white',
      borderColor: 'border-blue-400'
    }
  };

  const { icon: Icon, bgColor, iconColor, borderColor } = config[type];

  return (
    <div className={`${bgColor} ${borderColor} border-2 rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md animate-slide-in-right`}>
      <div className="flex items-start gap-3">
        <div className={`${iconColor} flex-shrink-0 mt-0.5`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 text-white">
          <p className="text-sm font-medium leading-relaxed">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-white hover:bg-white dark:bg-gray-800/20 rounded-lg p-1 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Contenedor de toasts
interface ToastContainerProps {
  toasts: Array<{ id: string; type: ToastType; message: string }>;
  onRemove: (id: string) => void;
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};
