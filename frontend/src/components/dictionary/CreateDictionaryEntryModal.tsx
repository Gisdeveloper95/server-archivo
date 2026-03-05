import { useState, useEffect, useRef } from 'react';
import { X, BookOpen, Save, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

interface CreateDictionaryEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateDictionaryEntryModal = ({ isOpen, onClose, onSuccess }: CreateDictionaryEntryModalProps) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyExists, setKeyExists] = useState<boolean | null>(null);
  const [checkingKey, setCheckingKey] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  // Verificar si la key existe en tiempo real
  const checkKeyExists = async (key: string) => {
    if (!key.trim()) {
      setKeyExists(null);
      return;
    }

    try {
      setCheckingKey(true);
      const response = await fetch(`/api/dictionary?search=${encodeURIComponent(key.toLowerCase().trim())}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Verificar si existe una key exacta (case-insensitive)
        const exactMatch = data.results?.some(
          (entry: any) => entry.key.toLowerCase() === key.toLowerCase().trim()
        );
        setKeyExists(exactMatch);
      }
    } catch (err) {
      console.error('Error checking key:', err);
    } finally {
      setCheckingKey(false);
    }
  };

  // Efecto para verificar la key con debounce
  useEffect(() => {
    if (formData.key) {
      // Limpiar el timer anterior
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Configurar nuevo timer
      debounceTimer.current = setTimeout(() => {
        checkKeyExists(formData.key);
      }, 500) as any; // Esperar 500ms después de que el usuario deje de escribir
    } else {
      setKeyExists(null);
      setCheckingKey(false);
    }

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [formData.key]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.key.trim()) {
      setError('El término es requerido');
      return;
    }

    if (!formData.value.trim()) {
      setError('La descripción es requerida');
      return;
    }

    // Validar que el término no contenga espacios ni caracteres especiales
    const keyPattern = /^[a-z0-9_-]+$/;
    if (!keyPattern.test(formData.key.toLowerCase())) {
      setError('El término solo puede contener letras minúsculas, números, guiones bajos (_) y guiones (-)');
      return;
    }

    // Verificar si la key ya existe
    if (keyExists) {
      setError(`El término "${formData.key}" ya existe en el diccionario. Por favor usa otro término.`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/dictionary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          key: formData.key.toLowerCase().trim(),
          value: formData.value.trim(),
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.key?.[0] || 'Error al crear el término');
      }

      const result = await response.json();
      toast.success(result.message || 'Término creado exitosamente');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al crear el término');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl sticky top-0">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8" />
              <div>
                <h3 className="text-2xl font-bold">Agregar Término al Diccionario</h3>
                <p className="text-blue-100 text-sm">Crea un nuevo término o abreviación</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
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

          {/* Info Note */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              <strong>Importante:</strong> El término debe ser único y se convertirá automáticamente a minúsculas.
              Solo se permiten letras, números, guiones bajos (_) y guiones (-).
            </p>
          </div>

          {/* Key (Término) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Término / Abreviación <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="key"
                value={formData.key}
                onChange={handleChange}
                required
                placeholder="Ej: fondo, dir, mag, subdiv"
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:border-transparent font-mono ${
                  keyExists === true
                    ? 'border-red-500 focus:ring-red-500'
                    : keyExists === false
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400'
                }`}
              />
              {/* Indicador de estado */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingKey && (
                  <Loader className="w-5 h-5 text-gray-400 dark:text-gray-500 animate-spin" />
                )}
                {!checkingKey && keyExists === true && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                {!checkingKey && keyExists === false && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </div>
            </div>

            {/* Mensajes de validación en tiempo real */}
            {formData.key && !checkingKey && keyExists === true && (
              <div className="mt-2 flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  El término <strong>"{formData.key}"</strong> ya existe en el diccionario.
                  Por favor elige otro término.
                </span>
              </div>
            )}
            {formData.key && !checkingKey && keyExists === false && (
              <div className="mt-2 flex items-start gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Término disponible! Puedes usar <strong>"{formData.key}"</strong>
                </span>
              </div>
            )}
            {!formData.key && (
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                Este será el término que se usará en los nombres de archivos
              </p>
            )}
          </div>

          {/* Value (Descripción) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Descripción / Significado <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              name="value"
              value={formData.value}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Ej: Fondo Documental, Dirección, Magdalena, Subdivisión"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              Descripción completa del término o abreviación
            </p>
          </div>

          {/* Active Status */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="mt-1 w-5 h-5 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <div className="flex-1">
                <span className="font-semibold text-gray-900 dark:text-white">Término activo</span>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Si está activado, el término estará disponible para validación de nombres de archivos
                </p>
              </div>
            </label>
          </div>

          {/* Example */}
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-900 mb-2">Ejemplo:</p>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <div>
                <strong>Término:</strong> <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded border">fondo</code>
              </div>
              <div>
                <strong>Descripción:</strong> Fondo Documental
              </div>
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                <strong>Se usará en nombres como:</strong>
                <code className="block bg-white dark:bg-gray-800 px-2 py-1 rounded border mt-1">
                  fondo_dir_2024.pdf
                </code>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors font-semibold disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || keyExists === true || checkingKey}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title={keyExists === true ? 'No puedes crear un término que ya existe' : ''}
            >
              <Save className="w-5 h-5" />
              {loading ? 'Guardando...' : checkingKey ? 'Verificando...' : 'Crear Término'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
