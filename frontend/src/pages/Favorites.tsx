import { useEffect, useState, useMemo } from 'react';
import {
  Loader2,
  AlertCircle,
  Star,
  Trash2,
  ExternalLink,
  Calendar,
  TrendingUp,
  Palette,
  Copy,
  Check,
  Edit3,
  X,
  Save,
  Search,
  ArrowUpDown,
  Grid,
  List,
  FolderOpen,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { favoritesApi, type Favorite } from '../api/favorites';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { useModal } from '../hooks/useModal';
import { ToastContainer } from '../components/Toast';

const NETAPP_BASE_PATH = '\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy';

const COLORS = [
  { name: 'Azul', value: 'blue', class: 'bg-blue-500', border: 'border-blue-500' },
  { name: 'Verde', value: 'green', class: 'bg-green-500', border: 'border-green-500' },
  { name: 'Rojo', value: 'red', class: 'bg-red-500', border: 'border-red-500' },
  { name: 'Amarillo', value: 'yellow', class: 'bg-yellow-500', border: 'border-yellow-500' },
  { name: 'Morado', value: 'purple', class: 'bg-purple-500', border: 'border-purple-500' },
  { name: 'Rosa', value: 'pink', class: 'bg-pink-500', border: 'border-pink-500' },
  { name: 'Naranja', value: 'orange', class: 'bg-orange-500', border: 'border-orange-500' },
  { name: 'Índigo', value: 'indigo', class: 'bg-indigo-500', border: 'border-indigo-500' },
  { name: 'Gris', value: 'gray', class: 'bg-gray-500', border: 'border-gray-500' },
];

type SortField = 'name' | 'access_count' | 'last_accessed' | 'created_at';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

export const Favorites = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useModal();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Search and sort
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Edit mode
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await favoritesApi.list();
      setFavorites(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar favoritos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  // Close color picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-color-picker]')) {
        setColorPickerOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get full Windows path
  const getWindowsPath = (path: string) => {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    // Replace forward slashes with backslashes
    const windowsSubPath = cleanPath.replace(/\//g, '\\');
    return `${NETAPP_BASE_PATH}\\${windowsSubPath}`;
  };

  // Copy path to clipboard
  const handleCopyPath = async (favorite: Favorite) => {
    const fullPath = getWindowsPath(favorite.path);
    try {
      await navigator.clipboard.writeText(fullPath);
      setCopiedId(favorite.id);
      toast.success('Ruta copiada al portapapeles');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error('Error al copiar la ruta');
    }
  };

  const handleNavigate = async (favorite: Favorite) => {
    try {
      await favoritesApi.access(favorite.id);
      window.location.href = `/explorar?path=${encodeURIComponent(favorite.path)}`;
    } catch (err: any) {
      toast.error('Error al acceder al favorito');
    }
  };

  const handleDelete = async (favorite: Favorite) => {
    const confirmed = await confirm({
      title: 'Eliminar favorito',
      message: (
        <div className="space-y-2">
          <p>¿Eliminar "<strong>{favorite.name}</strong>" de favoritos?</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Esta acción solo elimina el acceso directo, no la carpeta original.</p>
        </div>
      ),
      type: 'warning',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      await favoritesApi.delete(favorite.id);
      await loadFavorites();
      toast.success(`Favorito "${favorite.name}" eliminado.`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar favorito');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeColor = async (favoriteId: number, color: string) => {
    try {
      await favoritesApi.updateColor(favoriteId, color);
      setColorPickerOpen(null);
      await loadFavorites();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cambiar color');
    }
  };

  // Start editing
  const startEditing = (favorite: Favorite) => {
    setEditingId(favorite.id);
    setEditName(favorite.name);
    setEditDescription(favorite.description || '');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  // Save edit
  const saveEdit = async (favoriteId: number) => {
    if (!editName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    setSaving(true);
    try {
      await favoritesApi.update(favoriteId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      await loadFavorites();
      setEditingId(null);
      toast.success('Favorito actualizado');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const getColorClass = (color: string) => {
    const colorObj = COLORS.find(c => c.value === color);
    return colorObj?.class || 'bg-blue-500';
  };

  const getColorBorder = (color: string) => {
    const colorObj = COLORS.find(c => c.value === color);
    return colorObj?.border || 'border-blue-500';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Nunca';
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Filter and sort favorites
  const filteredFavorites = useMemo(() => {
    let result = [...favorites];

    // Filter by search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(search) ||
        f.path.toLowerCase().includes(search) ||
        (f.description && f.description.toLowerCase().includes(search))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'access_count':
          comparison = a.access_count - b.access_count;
          break;
        case 'last_accessed':
          const dateA = a.last_accessed ? new Date(a.last_accessed).getTime() : 0;
          const dateB = b.last_accessed ? new Date(b.last_accessed).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [favorites, searchTerm, sortField, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    if (favorites.length === 0) return null;
    const mostUsed = [...favorites].sort((a, b) => b.access_count - a.access_count)[0];
    const lastAccessed = [...favorites]
      .filter(f => f.last_accessed)
      .sort((a, b) => new Date(b.last_accessed!).getTime() - new Date(a.last_accessed!).getTime())[0];
    return { total: favorites.length, mostUsed, lastAccessed };
  }, [favorites]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Directorios Favoritos</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Accede rápidamente a tus carpetas favoritas
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total favoritos</p>
                </div>
              </div>
              {stats.mostUsed && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{stats.mostUsed.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{stats.mostUsed.access_count} accesos</p>
                  </div>
                </div>
              )}
              {stats.lastAccessed && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{stats.lastAccessed.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Último acceso</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar favoritos..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Ordenar:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="name">Nombre</option>
                <option value="access_count">Accesos</option>
                <option value="last_accessed">Último acceso</option>
                <option value="created_at">Fecha creación</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
              >
                <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* View toggle */}
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                title="Vista de tabla"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 ${viewMode === 'cards' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                title="Vista de tarjetas"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-600 dark:text-yellow-400" />
              <span className="ml-3 text-gray-600 dark:text-gray-300">Cargando favoritos...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              <span className="ml-3 text-red-600 dark:text-red-400">{error}</span>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Star className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-semibold mb-2">No tienes favoritos aún</p>
              <p>Agrega carpetas a favoritos desde el explorador de archivos usando el botón de estrella</p>
            </div>
          ) : filteredFavorites.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-semibold mb-2">No se encontraron resultados</p>
              <p>Intenta con otro término de búsqueda</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ruta Windows
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Accesos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Último Acceso
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredFavorites.map((favorite) => (
                    <tr key={favorite.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors">
                      <td className="px-4 py-4">
                        {editingId === favorite.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getColorClass(favorite.color)}`} />
                            <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            <span className="font-medium text-gray-900 dark:text-white">{favorite.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-mono break-all max-w-md">
                            {getWindowsPath(favorite.path)}
                          </span>
                          <button
                            onClick={() => handleCopyPath(favorite)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 flex-shrink-0"
                            title="Copiar ruta"
                          >
                            {copiedId === favorite.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {editingId === favorite.id ? (
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Sin descripción"
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          />
                        ) : (
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {favorite.description || <span className="text-gray-400 dark:text-gray-500 italic">Sin descripción</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                          <TrendingUp className="w-4 h-4" />
                          {favorite.access_count}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {formatDate(favorite.last_accessed)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {editingId === favorite.id ? (
                            <>
                              <button
                                onClick={() => saveEdit(favorite.id)}
                                disabled={saving}
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                title="Guardar"
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleNavigate(favorite)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Ir a esta carpeta"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => startEditing(favorite)}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Editar nombre y descripción"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <div className="relative" data-color-picker>
                                <button
                                  onClick={() => setColorPickerOpen(colorPickerOpen === favorite.id ? null : favorite.id)}
                                  className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                  title="Cambiar color"
                                >
                                  <Palette className="w-4 h-4" />
                                </button>
                                {colorPickerOpen === favorite.id && (
                                  <div className="absolute right-0 mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl dark:shadow-gray-900/50 z-20 min-w-[180px]">
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Seleccionar color</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      {COLORS.map((color) => (
                                        <button
                                          key={color.value}
                                          onClick={() => handleChangeColor(favorite.id, color.value)}
                                          className={`w-10 h-10 rounded-lg ${color.class} hover:scale-110 transition-transform ${favorite.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                          title={color.name}
                                        >
                                          {favorite.color === color.value && (
                                            <Check className="w-5 h-5 text-white mx-auto" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleDelete(favorite)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Eliminar de favoritos"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFavorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className={`relative bg-white dark:bg-gray-800 border-2 ${getColorBorder(favorite.color)} rounded-xl p-4 hover:shadow-lg dark:shadow-gray-900/50 transition-shadow`}
                >
                  {/* Color indicator */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${getColorClass(favorite.color)} rounded-t-xl`} />

                  {/* Header */}
                  <div className="flex items-start justify-between mb-3 pt-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FolderOpen className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                      {editingId === favorite.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-yellow-500"
                          autoFocus
                        />
                      ) : (
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{favorite.name}</h3>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {editingId === favorite.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(favorite.id)}
                            disabled={saving}
                            className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-900/30 rounded"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(favorite)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <div className="relative" data-color-picker>
                            <button
                              onClick={() => setColorPickerOpen(colorPickerOpen === favorite.id ? null : favorite.id)}
                              className="p-1 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded"
                              title="Color"
                            >
                              <Palette className="w-4 h-4" />
                            </button>
                            {colorPickerOpen === favorite.id && (
                              <div className="absolute right-0 mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl dark:shadow-gray-900/50 z-20 min-w-[180px]">
                                <div className="grid grid-cols-3 gap-2">
                                  {COLORS.map((color) => (
                                    <button
                                      key={color.value}
                                      onClick={() => handleChangeColor(favorite.id, color.value)}
                                      className={`w-10 h-10 rounded-lg ${color.class} hover:scale-110 transition-transform ${favorite.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                      title={color.name}
                                    >
                                      {favorite.color === color.value && <Check className="w-5 h-5 text-white mx-auto" />}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(favorite)}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {editingId === favorite.id ? (
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Descripción (opcional)"
                      className="w-full px-2 py-1 mb-3 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-yellow-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                      {favorite.description || <span className="italic">Sin descripción</span>}
                    </p>
                  )}

                  {/* Path */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 mb-3">
                    <div className="flex items-start gap-2">
                      <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all flex-1">
                        {getWindowsPath(favorite.path)}
                      </p>
                      <button
                        onClick={() => handleCopyPath(favorite)}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 flex-shrink-0"
                        title="Copiar ruta"
                      >
                        {copiedId === favorite.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {favorite.access_count} accesos
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {favorite.last_accessed
                        ? new Date(favorite.last_accessed).toLocaleDateString('es-CO')
                        : 'Nunca'}
                    </span>
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => handleNavigate(favorite)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir carpeta
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </Layout>
  );
};
