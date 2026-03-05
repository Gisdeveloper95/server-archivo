import { useState } from 'react';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { FileList } from '../components/FileList';
import { Pagination } from '../components/Pagination';
import { FileDetailsModal } from '../components/FileDetailsModal';
import { filesApi } from '../api';
import type { BrowseResponse, FileItem } from '../types';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

export const Search = () => {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleSearch = async (page: number = 1) => {
    if (query.trim().length < 3) {
      setError('El término de búsqueda debe tener al menos 3 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentPage(page);

    try {
      const response = await filesApi.search({
        q: query,
        page,
        per_page: 100, // Máximo 100 resultados por página
      });

      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Error al buscar archivos'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    // Descargar usando URL directa para que el navegador muestre la barra de progreso
    const token = localStorage.getItem('token');
    const downloadUrl = `/api/file-ops/download?path=${encodeURIComponent(file.path)}&token=${token}`;
    window.open(downloadUrl, '_blank');
  };

  const handleShowDetails = (file: FileItem) => {
    setSelectedFile(file);
    setShowDetailsModal(true);
  };

  const handleGoToFolder = (file: FileItem) => {
    // Extraer la carpeta contenedora del path
    const folderPath = file.path.substring(0, file.path.lastIndexOf('\\'));
    // Navegar a la vista de explorar archivos con recarga completa (igual que favoritos)
    window.location.href = `/explorar?path=${encodeURIComponent(folderPath)}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Búsqueda Global de Archivos
          </h2>

          <div className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar archivos... (mínimo 3 caracteres)"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">
                  Puedes incluir la extensión en tu búsqueda (ej: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">reporte.pdf</span> o <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">datos.gdb.zip</span>)
                </p>
              </div>
              <button
                onClick={() => handleSearch(1)}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <SearchIcon className="w-5 h-5" />
                )}
                <span>Buscar</span>
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {data && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              {data.total} resultados encontrados
            </div>

            <FileList
              files={data.files}
              onFolderClick={() => {}}
              onDownload={handleDownload}
              onShowDetails={handleShowDetails}
              onGoToFolder={handleGoToFolder}
            />

            {data.pages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={data.pages}
                onPageChange={(page) => handleSearch(page)}
              />
            )}
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      <FileDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        file={selectedFile}
      />
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </Layout>
  );
};
