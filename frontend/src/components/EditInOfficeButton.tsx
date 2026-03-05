/**
 * Componente para editar archivos de Office en Office Online
 * Permite edición colaborativa en tiempo real usando Microsoft 365
 */
import { useState, useEffect, useRef } from 'react';
import { FileEdit, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../hooks/useToast';
import { useModal } from '../hooks/useModal';
import { ToastContainer } from './Toast';

interface EditInOfficeButtonProps {
  filePath: string;
  fileName: string;
  onSaved?: () => void;
  className?: string;
}

export const EditInOfficeButton = ({
  filePath,
  fileName,
  onSaved,
  className = ''
}: EditInOfficeButtonProps) => {
  const toast = useToast();
  const { confirm } = useModal();
  const [isOpening, setIsOpening] = useState(false);
  const [editorWindow, setEditorWindow] = useState<Window | null>(null);
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Verificar si es un archivo de Office
  const isOfficeFile = () => {
    const officeExtensions = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt'];
    return officeExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  // Monitorear si la ventana del editor se cierra
  useEffect(() => {
    if (!editorWindow) return;

    const interval = setInterval(() => {
      if (editorWindow.closed) {
        handleEditorClosed();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [editorWindow]);

  const handleEdit = async () => {
    try {
      setIsOpening(true);
      setError(null);

      // Llamar al endpoint para abrir en Office Online
      const response = await axios.post('/api/office/open', {
        path: filePath
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al abrir el archivo');
      }

      const { edit_url, cache_key } = response.data;

      // Guardar cache_key para después
      setCacheKey(cache_key);

      // Abrir Office Online en nueva ventana
      const newWindow = window.open(
        edit_url,
        'office_editor',
        'width=1400,height=900,menubar=no,toolbar=no,location=no,status=yes'
      );

      if (!newWindow) {
        throw new Error('No se pudo abrir la ventana. Verifica que no esté bloqueada por el navegador.');
      }

      setEditorWindow(newWindow);

    } catch (err: any) {
      console.error('Error opening file in Office Online:', err);
      setError(err.response?.data?.error || err.message || 'Error desconocido');
    } finally {
      setIsOpening(false);
    }
  };

  const handleEditorClosed = async () => {
    if (!cacheKey) {
      setEditorWindow(null);
      return;
    }

    // Preguntar si desea guardar
    const shouldSave = await confirm({
      title: 'Guardar cambios',
      message: `¿Deseas guardar los cambios de "${fileName}" en NetApp?`,
      type: 'info',
      confirmText: 'Guardar',
      cancelText: 'Descartar',
    });

    if (shouldSave) {
      handleSave();
    } else {
      setEditorWindow(null);
      setCacheKey(null);
    }
  };

  const handleSave = async () => {
    if (!cacheKey) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await axios.post('/api/office/save', {
        cache_key: cacheKey
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al guardar el archivo');
      }

      // Mostrar mensaje de éxito
      toast.success(`${fileName} guardado exitosamente en NetApp`);

      // Llamar callback si existe
      onSaved?.();

    } catch (err: any) {
      console.error('Error saving file from Office Online:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Error desconocido';
      setError(errorMsg);
      toast.error(`Error al guardar: ${errorMsg}`);
    } finally {
      setIsSaving(false);
      setEditorWindow(null);
      setCacheKey(null);
    }
  };

  // No mostrar el botón si no es un archivo de Office
  if (!isOfficeFile()) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleEdit}
        disabled={isOpening || !!editorWindow || isSaving}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${editorWindow
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
          ${className}
        `}
        title={
          editorWindow
            ? 'Editando en Office Online...'
            : 'Editar en Office Online (colaborativo)'
        }
      >
        {isOpening ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Abriendo...</span>
          </>
        ) : isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Guardando...</span>
          </>
        ) : editorWindow ? (
          <>
            <CheckCircle className="w-4 h-4" />
            <span>Editando...</span>
          </>
        ) : (
          <>
            <FileEdit className="w-4 h-4" />
            <span>Editar en Office Online</span>
          </>
        )}
      </button>

      {/* Mensaje de estado cuando está editando */}
      {editorWindow && (
        <div className="text-sm text-green-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>
            Editando "{fileName}" en Office Online.
            Al cerrar la ventana se te preguntará si deseas guardar los cambios.
          </span>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="text-sm text-red-600 flex items-center gap-2 p-2 bg-red-50 rounded">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Información adicional */}
      {!editorWindow && !error && (
        <div className="text-xs text-gray-500">
          Permite edición colaborativa en tiempo real con otros usuarios
        </div>
      )}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};
