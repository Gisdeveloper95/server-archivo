/**
 * EJEMPLO DE USO - EditInOfficeButton
 *
 * Este archivo muestra cómo integrar el componente EditInOfficeButton
 * en tu aplicación para permitir edición colaborativa de archivos Office
 */

import { EditInOfficeButton } from './EditInOfficeButton';
import { useState } from 'react';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';

// ==============================================================================
// EJEMPLO 1: Uso básico en una lista de archivos
// ==============================================================================

interface File {
  path: string;
  name: string;
  size: number;
  extension: string;
}

export const FileListExample = () => {
  const [files, setFiles] = useState<File[]>([
    { path: 'Documentos/reporte.docx', name: 'reporte.docx', size: 1024, extension: '.docx' },
    { path: 'Hojas/presupuesto.xlsx', name: 'presupuesto.xlsx', size: 2048, extension: '.xlsx' },
    { path: 'Presentaciones/demo.pptx', name: 'demo.pptx', size: 4096, extension: '.pptx' },
  ]);

  const refreshFiles = () => {
    // Aquí iría tu lógica para refrescar la lista de archivos
    console.log('Refrescando lista de archivos...');
    // Ejemplo: fetchFiles()
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Mis Archivos</h2>

      <div className="space-y-4">
        {files.map((file) => (
          <div
            key={file.path}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
          >
            <div className="flex-1">
              <h3 className="font-medium">{file.name}</h3>
              <p className="text-sm text-gray-500">{file.path}</p>
            </div>

            {/* Botón de edición en Office Online */}
            <EditInOfficeButton
              filePath={file.path}
              fileName={file.name}
              onSaved={refreshFiles}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================================
// EJEMPLO 2: Vista detallada de archivo con acciones múltiples
// ==============================================================================

export const FileDetailExample = () => {
  const toast = useToast();
  const file = {
    path: 'Contratos/contrato_2024.docx',
    name: 'contrato_2024.docx',
    size: 15360,
    createdBy: 'Juan Pérez',
    createdAt: '2024-01-15',
    modifiedAt: '2024-01-20',
  };

  const handleDownload = () => {
    console.log('Descargando archivo...');
  };

  const handleDelete = () => {
    console.log('Eliminando archivo...');
  };

  const handleFileSaved = () => {
    console.log('Archivo guardado en NetApp');
    // Aquí puedes actualizar la info del archivo, mostrar notificación, etc.
    toast.success('El archivo se guardó exitosamente en NetApp');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">{file.name}</h1>
          <p className="text-gray-600">{file.path}</p>
        </div>

        {/* Información del archivo */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Tamaño</p>
            <p className="font-medium">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Creado por</p>
            <p className="font-medium">{file.createdBy}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fecha creación</p>
            <p className="font-medium">{file.createdAt}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Última modificación</p>
            <p className="font-medium">{file.modifiedAt}</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          {/* Botón principal: Editar en Office Online */}
          <EditInOfficeButton
            filePath={file.path}
            fileName={file.name}
            onSaved={handleFileSaved}
            className="w-full"
          />

          {/* Otras acciones */}
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Descargar
          </button>

          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};

// ==============================================================================
// EJEMPLO 3: Grid de archivos con filtro
// ==============================================================================

export const FileGridExample = () => {
  const [files] = useState<File[]>([
    { path: 'Doc1.docx', name: 'Doc1.docx', size: 1024, extension: '.docx' },
    { path: 'Sheet1.xlsx', name: 'Sheet1.xlsx', size: 2048, extension: '.xlsx' },
    { path: 'Presentation.pptx', name: 'Presentation.pptx', size: 4096, extension: '.pptx' },
    { path: 'Image.png', name: 'Image.png', size: 512, extension: '.png' },
    { path: 'Video.mp4', name: 'Video.mp4', size: 8192, extension: '.mp4' },
  ]);

  const [filter, setFilter] = useState<'all' | 'office'>('all');

  const filteredFiles = filter === 'office'
    ? files.filter((f) =>
        ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt'].includes(f.extension)
      )
    : files;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Archivos</h2>

        {/* Filtro */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('office')}
            className={`px-4 py-2 rounded ${
              filter === 'office' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Solo Office
          </button>
        </div>
      </div>

      {/* Grid de archivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map((file) => (
          <div
            key={file.path}
            className="bg-white rounded-lg shadow p-4 flex flex-col"
          >
            <h3 className="font-medium mb-2 truncate">{file.name}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {(file.size / 1024).toFixed(2)} KB
            </p>

            {/* El botón solo aparece para archivos Office */}
            <EditInOfficeButton
              filePath={file.path}
              fileName={file.name}
              onSaved={() => console.log(`Guardado: ${file.name}`)}
              className="mt-auto"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ==============================================================================
// EJEMPLO 4: Integración con estado global (Zustand)
// ==============================================================================

import { create } from 'zustand';

// Store de ejemplo
interface FileStore {
  currentFile: File | null;
  setCurrentFile: (file: File | null) => void;
  refreshFile: () => void;
}

const useFileStore = create<FileStore>((set) => ({
  currentFile: null,
  setCurrentFile: (file) => set({ currentFile: file }),
  refreshFile: () => {
    // Lógica para refrescar el archivo actual
    console.log('Refrescando archivo...');
  },
}));

export const FileWithStoreExample = () => {
  const { currentFile, setCurrentFile, refreshFile } = useFileStore();

  const handleFileClick = (file: File) => {
    setCurrentFile(file);
  };

  if (!currentFile) {
    return <div>Selecciona un archivo</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">{currentFile.name}</h2>

      <EditInOfficeButton
        filePath={currentFile.path}
        fileName={currentFile.name}
        onSaved={() => {
          // Actualizar estado global
          refreshFile();
          // Mostrar notificación
          console.log('Archivo actualizado en el store');
        }}
      />
    </div>
  );
};

// ==============================================================================
// NOTAS DE IMPLEMENTACIÓN
// ==============================================================================

/*
 * IMPORTANTE:
 *
 * 1. El componente automáticamente detecta si el archivo es de Office
 *    (.docx, .xlsx, .pptx, .doc, .xls, .ppt) y solo muestra el botón
 *    para esos tipos de archivo.
 *
 * 2. El callback `onSaved` es opcional pero recomendado para:
 *    - Refrescar la lista de archivos
 *    - Mostrar notificaciones de éxito
 *    - Actualizar estado global
 *    - Disparar analytics
 *
 * 3. El componente maneja automáticamente:
 *    - Estados de carga (abriendo, guardando)
 *    - Errores y mensajes
 *    - Monitoreo de la ventana del editor
 *    - Confirmación antes de guardar
 *
 * 4. Estilos:
 *    - Usa Tailwind CSS por defecto
 *    - Puedes personalizar con la prop `className`
 *    - Los iconos vienen de lucide-react
 *
 * 5. Seguridad:
 *    - Verifica permisos en el backend
 *    - Requiere correo corporativo @igac.gov.co
 *    - Audita todas las acciones
 *    - Las sesiones expiran después de 1 hora
 */
