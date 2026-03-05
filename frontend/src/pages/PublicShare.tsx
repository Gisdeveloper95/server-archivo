import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Folder,
  FileIcon,
  Download,
  Lock,
  AlertCircle,
  ChevronRight,
  Home,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Code,
  Eye
} from 'lucide-react';
import axios from 'axios';

interface ShareItem {
  name: string;
  is_directory: boolean;
  size: number | null;
  modified: string;
}

interface ShareData {
  success: boolean;
  is_trash_item?: boolean;
  share_link: {
    path: string;
    is_directory: boolean;
    permission: 'view' | 'download';
    description: string;
    created_at: string;
  };
  trash_info?: {
    original_name: string;
    deleted_at: string;
    expires_at: string;
    file_count?: number;
    dir_count?: number;
  };
  current_path: string;
  items?: ShareItem[];
  file?: {
    name: string;
    size: number;
    modified: string;
    mime_type?: string;
  };
}

export const PublicSharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ShareData | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const loadShareData = async (path: string = '') => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (password) params.append('password', password);
      if (email) params.append('email', email);
      if (path) params.append('path', path);

      const response = await axios.get(
        `/api/sharing/access/${token}?${params.toString()}`
      );

      setData(response.data);
      setCurrentPath(path);
      setNeedsPassword(false);
      setNeedsEmail(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Error al cargar el contenido';
      setError(errorMsg);

      if (errorMsg.includes('Contraseña')) {
        setNeedsPassword(true);
      }
      if (errorMsg.includes('Email')) {
        setNeedsEmail(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShareData('');
  }, [token]);

  const handleNavigate = (itemName: string, isDirectory: boolean) => {
    if (!isDirectory) return;

    // Para items de papelera, construir el path correctamente
    // El backend espera la ruta completa dentro del tar.gz
    let newPath: string;
    if (data?.is_trash_item && data?.trash_info?.original_name) {
      // Para papelera: root_name/subpath/itemName
      const rootName = data.trash_info.original_name;
      if (currentPath) {
        newPath = `${currentPath}/${itemName}`;
      } else {
        newPath = `${rootName}/${itemName}`;
      }
    } else {
      newPath = currentPath ? `${currentPath}/${itemName}` : itemName;
    }
    loadShareData(newPath);
  };

  const handleGoBack = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();

    // Para items de papelera, si solo queda el root_name, volver a ''
    if (data?.is_trash_item && data?.trash_info?.original_name) {
      const rootName = data.trash_info.original_name;
      if (pathParts.length === 1 && pathParts[0] === rootName) {
        loadShareData('');
        return;
      }
    }
    loadShareData(pathParts.join('/'));
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      loadShareData('');
      return;
    }

    // Para items de papelera, el índice del display está desplazado
    // porque excluimos el root_name del breadcrumb visible
    if (data?.is_trash_item && data?.trash_info?.original_name) {
      const rootName = data.trash_info.original_name;
      const fullPathParts = currentPath.split('/').filter(Boolean);
      // El índice visual + 1 porque el root_name está oculto pero sigue en el path real
      // Ej: si tenemos root/dir1/dir2 y el display muestra [dir1, dir2]
      // click en dir1 (index=0) debe ir a root/dir1 (slice 0 a 2)
      const newPath = fullPathParts.slice(0, index + 2).join('/');
      loadShareData(newPath);
    } else {
      const pathParts = currentPath.split('/').filter(Boolean);
      const newPath = pathParts.slice(0, index + 1).join('/');
      loadShareData(newPath);
    }
  };

  const handleDownload = (fileName?: string, downloadAll?: boolean) => {
    if (!token) return;

    const params = new URLSearchParams();
    if (password) params.append('password', password);
    if (email) params.append('email', email);

    // Si es descargar todo (sin fileName y sin currentPath o downloadAll explícito)
    if (downloadAll) {
      // No agregar file param - descarga todo desde la raíz
    } else if (fileName) {
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      params.append('file', filePath);
    } else if (currentPath) {
      params.append('file', currentPath);
    }

    const url = `/api/sharing/download/${token}?${params.toString()}`;
    window.open(url, '_blank');
  };

  const getFileIcon = (name: string, isDirectory: boolean) => {
    if (isDirectory) {
      return <Folder className="w-5 h-5 text-blue-500" />;
    }

    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <ImageIcon className="w-5 h-5 text-purple-500" />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <Film className="w-5 h-5 text-red-500" />;
      case 'mp3':
      case 'wav':
        return <Music className="w-5 h-5 text-green-500" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <Archive className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'js':
      case 'ts':
      case 'py':
      case 'java':
      case 'cpp':
        return <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <FileIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
    }
  };

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600 dark:text-gray-300 mt-4">Cargando contenido compartido...</p>
        </div>
      </div>
    );
  }

  if (needsPassword || needsEmail) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-md w-full p-6">
          <div className="text-center mb-6">
            <Lock className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contenido Protegido</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Este contenido requiere autorización</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {needsPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contraseña"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  onKeyPress={(e) => e.key === 'Enter' && loadShareData('')}
                />
              </div>
            )}

            {needsEmail && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  onKeyPress={(e) => e.key === 'Enter' && loadShareData('')}
                />
              </div>
            )}

            <button
              onClick={() => loadShareData('')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Acceder
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-md w-full p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-300">{error || 'No se pudo cargar el contenido'}</p>
        </div>
      </div>
    );
  }

  const canDownload = data.share_link.permission === 'download';

  // Para items de papelera, excluir el directorio raíz del breadcrumb visible
  const getDisplayPathParts = () => {
    const parts = currentPath.split('/').filter(Boolean);
    if (data.is_trash_item && data.trash_info?.original_name && parts.length > 0) {
      // Si el primer elemento es el nombre del directorio raíz, excluirlo del breadcrumb
      if (parts[0] === data.trash_info.original_name) {
        return parts.slice(1);
      }
    }
    return parts;
  };

  const pathParts = getDisplayPathParts();
  const canGoBack = data.is_trash_item
    ? currentPath.split('/').filter(Boolean).length > 1  // Para papelera: más de solo el root_name
    : currentPath.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                {data.share_link.is_directory ? 'Carpeta Compartida' : 'Archivo Compartido'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{data.share_link.path}</p>
              {data.share_link.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded">
                  {data.share_link.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {canDownload ? (
                <>
                  <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Descarga permitida</span>
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Solo visualización</span>
                </>
              )}
            </div>
          </div>

          {/* Breadcrumbs */}
          {data.share_link.is_directory && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => handleBreadcrumbClick(-1)}
                className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="font-medium">Raíz</span>
              </button>
              {pathParts.map((part, index) => (
                <React.Fragment key={index}>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded transition-colors font-medium text-gray-700 dark:text-gray-200"
                  >
                    {part}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {data.share_link.is_directory && data.items ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                {canGoBack && (
                  <button
                    onClick={handleGoBack}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:bg-gray-600 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Volver</span>
                  </button>
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {data.items.length} {data.items.length === 1 ? 'elemento' : 'elementos'}
                </h3>
              </div>
              {canDownload && (
                <div className="flex items-center gap-2">
                  {currentPath && (
                    <button
                      onClick={() => handleDownload()}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:bg-gray-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Descargar carpeta actual
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(undefined, true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {data.is_trash_item ? 'Descargar todo (.tar.gz)' : 'Descargar todo (.zip)'}
                  </button>
                </div>
              )}
            </div>

            {/* File Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Tamaño
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Modificado
                    </th>
                    {canDownload && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {data.items.map((item) => (
                    <tr
                      key={item.name}
                      className={item.is_directory ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 cursor-pointer' : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900'}
                      onClick={() => item.is_directory && handleNavigate(item.name, true)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getFileIcon(item.name, item.is_directory)}
                          <span className={`text-sm ${item.is_directory ? 'font-medium text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {formatSize(item.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(item.modified)}
                      </td>
                      {canDownload && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          {!item.is_directory && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(item.name);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Descargar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.items.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Esta carpeta está vacía</p>
              </div>
            )}
          </div>
        ) : data.file ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="flex items-center gap-6 mb-8">
              {getFileIcon(data.file.name, false)}
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">{data.file.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <span>Tamaño: {formatSize(data.file.size)}</span>
                  <span>•</span>
                  <span>Modificado: {formatDate(data.file.modified)}</span>
                </div>
              </div>
            </div>
            {canDownload && (
              <button
                onClick={() => handleDownload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Descargar archivo
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
