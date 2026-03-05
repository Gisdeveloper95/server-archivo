import { useState } from 'react';
import { X, BookOpen, Save } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

interface DictionaryEntry {
  id: number;
  key: string;
  value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EditDictionaryEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: DictionaryEntry;
  onSuccess: () => void;
}

export const EditDictionaryEntryModal = ({ isOpen, onClose, entry, onSuccess }: EditDictionaryEntryModalProps) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    value: entry.value,
    is_active: entry.is_active,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (!formData.value.trim()) {
      setError('La descripción es requerida');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/dictionary/${entry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          value: formData.value.trim(),
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar el término');
      }

      const result = await response.json();
      toast.success(result.message || 'Término actualizado exitosamente');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el término');
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
                <h3 className="text-2xl font-bold">Editar Término del Diccionario</h3>
                <p className="text-blue-100 text-sm">
                  Editando: <span className="font-mono font-bold">{entry.key}</span>
                </p>
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
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              <strong>Nota:</strong> El término (key) no se puede modificar para mantener la integridad del diccionario.
              Si necesitas cambiar el término, debes crear uno nuevo y eliminar este.
            </p>
          </div>

          {/* Key (Read-only) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Término / Abreviación
            </label>
            <input
              type="text"
              value={entry.key}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              El término no se puede modificar
            </p>
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

          {/* Metadata */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Información del término</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-300">Creado:</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {new Date(entry.created_at).toLocaleString('es-CO', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300">Última actualización:</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {new Date(entry.updated_at).toLocaleString('es-CO', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
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
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
