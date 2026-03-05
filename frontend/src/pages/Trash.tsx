/**
 * Trash - Página de administración de Papelera de Reciclaje
 * Solo accesible para superadmin
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  Folder,
  FileText,
  Clock,
  User,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  X,
  Link2,
  Download,
  Copy,
  Check,
  Sparkles,
  Eye,
  FolderTree,
  Settings,
  Save,
} from 'lucide-react';
import { trashApi, TrashItem, TrashStats, TrashConfigWithUsage } from '../api/trash';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../hooks/useModal';
import { Layout } from '../components/Layout';

export const Trash: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { confirm, alert } = useModal();

  const [items, setItems] = useState<TrashItem[]>([]);
  const [stats, setStats] = useState<TrashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Contents modal
  const [contentsModal, setContentsModal] = useState<{
    open: boolean;
    item: TrashItem | null;
    loading: boolean;
    data: any | null;
  }>({ open: false, item: null, loading: false, data: null });

  // Config modal
  const [configModal, setConfigModal] = useState<{
    open: boolean;
    loading: boolean;
    saving: boolean;
    data: TrashConfigWithUsage | null;
    formData: {
      max_size_gb: number;
      max_item_size_gb: number;
      retention_days: number;
      auto_cleanup_enabled: boolean;
    };
  }>({
    open: false,
    loading: false,
    saving: false,
    data: null,
    formData: { max_size_gb: 2048, max_item_size_gb: 5, retention_days: 30, auto_cleanup_enabled: true }
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 20;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'files' | 'directories'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'expiring'>('all');
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Lista de usuarios únicos para filtro
  const [uniqueUsers, setUniqueUsers] = useState<{id: number; username: string; full_name: string}[]>([]);

  // Estado para búsqueda de usuario en filtro
  const [userSearchFilter, setUserSearchFilter] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Usuarios filtrados según búsqueda
  const filteredUsers = useMemo(() => {
    if (!userSearchFilter.trim()) return uniqueUsers;
    const search = userSearchFilter.toLowerCase();
    return uniqueUsers.filter(u =>
      u.full_name?.toLowerCase().includes(search) ||
      u.username.toLowerCase().includes(search)
    );
  }, [uniqueUsers, userSearchFilter]);

  // Obtener nombre del usuario seleccionado
  const selectedUserName = useMemo(() => {
    if (!filterUser) return '';
    const user = uniqueUsers.find(u => u.id.toString() === filterUser);
    return user?.full_name || user?.username || '';
  }, [filterUser, uniqueUsers]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-user-filter]')) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Verificar que sea superadmin
  useEffect(() => {
    if (user?.role !== 'superadmin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, per_page: perPage };
      if (searchTerm) params.search = searchTerm;
      if (filterType === 'files') params.is_directory = false;
      if (filterType === 'directories') params.is_directory = true;
      if (filterUser) params.deleted_by = filterUser;
      if (filterDateFrom) params.from_date = filterDateFrom;
      if (filterDateTo) params.to_date = filterDateTo;

      const response = await trashApi.list(params);
      setItems(response.results);
      setTotalPages(response.total_pages);

      // Extraer usuarios únicos de los resultados para el filtro
      const usersMap = new Map();
      response.results.forEach((item) => {
        if (!usersMap.has(item.deleted_by)) {
          usersMap.set(item.deleted_by, {
            id: item.deleted_by,
            username: item.deleted_by_username,
            full_name: item.deleted_by_full_name || item.deleted_by_username
          });
        }
      });
      // Mantener usuarios existentes y agregar nuevos
      setUniqueUsers(prev => {
        const combined = new Map(prev.map(u => [u.id, u]));
        usersMap.forEach((v, k) => combined.set(k, v));
        return Array.from(combined.values());
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar la papelera');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await trashApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadItems();
      loadStats();
    }
  }, [user, page]);

  // Filtrar items localmente
  const filteredItems = useMemo(() => {
    let result = items;

    if (filterStatus === 'expiring') {
      result = result.filter(item => item.days_until_expiry <= 7);
    } else if (filterStatus === 'pending') {
      result = result.filter(item => item.status === 'pending');
    }

    return result;
  }, [items, filterStatus]);

  const handleRestore = async (item: TrashItem) => {
    const confirmed = await confirm({
      title: 'Restaurar elemento',
      message: (
        <div className="space-y-2">
          <p>¿Restaurar "{item.original_name}" a su ubicación original?</p>
          <div className="mt-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Ruta:</p>
            <p className="text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded break-all font-mono">
              {item.original_path}
            </p>
          </div>
        </div>
      ),
      type: 'info',
      confirmText: 'Restaurar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    setRestoringId(item.trash_id);
    try {
      const result = await trashApi.restore(item.trash_id, { conflict_resolution: 'rename' });
      if (result.success) {
        await alert(`"${item.original_name}" restaurado exitosamente`, { type: 'success', title: 'Restaurado' });
        loadItems();
        loadStats();
      } else {
        await alert(result.error || 'Error al restaurar', { type: 'error', title: 'Error' });
      }
    } catch (err: any) {
      await alert(err.response?.data?.error || 'Error al restaurar', { type: 'error', title: 'Error' });
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (item: TrashItem) => {
    const confirmed = await confirm({
      title: 'Eliminar permanentemente',
      message: `¿Eliminar "${item.original_name}" de forma PERMANENTE?\n\nEsta acción NO se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar permanentemente',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    setDeletingId(item.trash_id);
    try {
      const result = await trashApi.deletePermanently(item.trash_id);
      if (result.success) {
        await alert('Elemento eliminado permanentemente', { type: 'success', title: 'Eliminado' });
        loadItems();
        loadStats();
      } else {
        await alert(result.error || 'Error al eliminar', { type: 'error', title: 'Error' });
      }
    } catch (err: any) {
      await alert(err.response?.data?.error || 'Error al eliminar', { type: 'error', title: 'Error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCleanup = async () => {
    const confirmed = await confirm({
      title: 'Limpiar elementos expirados',
      message: '¿Eliminar todos los elementos que han expirado?\n\nEsta acción eliminará permanentemente todos los items cuyo período de retención ha finalizado.',
      type: 'warning',
      confirmText: 'Limpiar expirados',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    setCleaningUp(true);
    try {
      const result = await trashApi.cleanup();
      if (result.success) {
        await alert(`Limpieza completada:\n- ${result.cleaned_count} elementos eliminados\n- ${result.cleaned_size_formatted} liberados`, { type: 'success', title: 'Limpieza completada' });
        loadItems();
        loadStats();
      }
    } catch (err: any) {
      await alert(err.response?.data?.error || 'Error en limpieza', { type: 'error', title: 'Error' });
    } finally {
      setCleaningUp(false);
    }
  };

  const handleShare = async (item: TrashItem) => {
    try {
      const result = await trashApi.share(item.trash_id, {
        permission: 'download',
        expires_hours: 24
      });
      if (result.success && result.share_url) {
        await navigator.clipboard.writeText(result.share_url);
        setCopiedId(item.trash_id);
        setTimeout(() => setCopiedId(null), 3000);
        await alert(
          `Link de descarga generado y copiado al portapapeles.\n\nExpira: ${new Date(result.expires_at!).toLocaleString('es-CO')}`,
          { type: 'success', title: 'Link generado' }
        );
      } else {
        await alert(result.error || 'Error al generar link', { type: 'error', title: 'Error' });
      }
    } catch (err: any) {
      await alert(err.response?.data?.error || 'Error al generar link', { type: 'error', title: 'Error' });
    }
  };

  const handleViewContents = async (item: TrashItem) => {
    setContentsModal({ open: true, item, loading: true, data: null });
    try {
      const result = await trashApi.getContents(item.trash_id);
      setContentsModal(prev => ({ ...prev, loading: false, data: result }));
    } catch (err: any) {
      setContentsModal(prev => ({
        ...prev,
        loading: false,
        data: { success: false, error: err.response?.data?.error || 'Error al cargar contenido' }
      }));
    }
  };

  const handleOpenConfig = async () => {
    setConfigModal(prev => ({ ...prev, open: true, loading: true }));
    try {
      const data = await trashApi.getConfig();
      setConfigModal(prev => ({
        ...prev,
        loading: false,
        data,
        formData: {
          max_size_gb: Number(data.config.max_size_gb),
          max_item_size_gb: Number(data.config.max_item_size_gb),
          retention_days: data.config.retention_days,
          auto_cleanup_enabled: data.config.auto_cleanup_enabled
        }
      }));
    } catch (err: any) {
      await alert(err.response?.data?.error || 'Error al cargar configuración', { type: 'error', title: 'Error' });
      setConfigModal(prev => ({ ...prev, open: false, loading: false }));
    }
  };

  const handleSaveConfig = async () => {
    const { formData, data } = configModal;

    // Verificar si se redujo el tiempo de retención
    if (data && formData.retention_days < data.config.retention_days) {
      const confirmed = await confirm({
        title: '⚠️ Reducir tiempo de retención',
        message: `Estás reduciendo el tiempo de retención de ${data.config.retention_days} a ${formData.retention_days} días.\n\nLos archivos que excedan el nuevo límite serán ELIMINADOS PERMANENTEMENTE.\n\n¿Deseas continuar?`,
        type: 'danger',
        confirmText: 'Sí, reducir y eliminar',
        cancelText: 'Cancelar'
      });
      if (!confirmed) return;
    }

    setConfigModal(prev => ({ ...prev, saving: true }));
    try {
      const result = await trashApi.updateConfig(formData);
      if (result.success) {
        await alert(result.message, { type: 'success', title: 'Configuración guardada' });
        setConfigModal(prev => ({ ...prev, open: false, saving: false }));
        loadStats();
        if (result.items_deleted > 0) {
          loadItems();
        }
      }
    } catch (err: any) {
      await alert(err.response?.data?.error || 'Error al guardar configuración', { type: 'error', title: 'Error' });
      setConfigModal(prev => ({ ...prev, saving: false }));
    }
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

  const getExpiryColor = (days: number) => {
    if (days <= 3) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50';
    if (days <= 7) return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700';
  };

  const handleSearch = () => {
    setPage(1);
    loadItems();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterUser('');
    setUserSearchFilter('');
    setShowUserDropdown(false);
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  };

  const hasActiveFilters = searchTerm || filterType !== 'all' || filterStatus !== 'all' || filterUser || filterDateFrom || filterDateTo;

  // Contar filtros activos
  const activeFilterCount = [
    searchTerm,
    filterType !== 'all',
    filterStatus !== 'all',
    filterUser,
    filterDateFrom,
    filterDateTo
  ].filter(Boolean).length;

  if (user?.role !== 'superadmin') {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Papelera de Reciclaje</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Gestión de archivos eliminados - Retención: {stats?.retention_days || 30} días
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenConfig}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  title="Configuración de papelera"
                >
                  <Settings className="w-4 h-4" />
                  Configuración
                </button>
                <button
                  onClick={handleCleanup}
                  disabled={cleaningUp}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${cleaningUp ? 'animate-spin' : ''}`} />
                  Limpiar expirados
                </button>
                <button
                  onClick={() => { loadItems(); loadStats(); }}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-xs mb-1">
                  <Trash2 className="w-4 h-4" />
                  Total Items
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_items}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs mb-1">
                  <HardDrive className="w-4 h-4" />
                  Espacio usado
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total_size_formatted}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-orange-600 text-xs mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Por expirar
                </div>
                <div className="text-2xl font-bold text-orange-600">{stats.expiring_soon}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs mb-1">
                  <CheckCircle className="w-4 h-4" />
                  Pendientes
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.by_status?.pending || 0}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs mb-1">
                  <RotateCcw className="w-4 h-4" />
                  Restaurados
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.by_status?.restored || 0}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-xs mb-1">
                  <Clock className="w-4 h-4" />
                  Retención
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.retention_days}d</div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o ruta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buscar
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Limpiar
                </button>
              )}
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tipo</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  >
                    <option value="all">Todos</option>
                    <option value="files">Solo archivos</option>
                    <option value="directories">Solo directorios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Estado</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendientes</option>
                    <option value="expiring">Por expirar (7 días)</option>
                  </select>
                </div>
                <div className="relative" data-user-filter>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Eliminado por
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={filterUser ? selectedUserName : userSearchFilter}
                      onChange={(e) => {
                        setUserSearchFilter(e.target.value);
                        setFilterUser('');
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      placeholder="Buscar usuario..."
                      className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    {(filterUser || userSearchFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterUser('');
                          setUserSearchFilter('');
                          setShowUserDropdown(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showUserDropdown && !filterUser && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/50 max-h-48 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          No se encontraron usuarios
                        </div>
                      ) : (
                        filteredUsers.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setFilterUser(u.id.toString());
                              setUserSearchFilter('');
                              setShowUserDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 text-sm"
                          >
                            <span className="font-medium">{u.full_name || u.username}</span>
                            {u.full_name && u.username && (
                              <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 ml-2">({u.username})</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Rango de fechas
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Desde"
                    />
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Hasta"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          {loading && items.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-600 dark:text-gray-300 mt-4">Cargando papelera...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
              <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                La papelera está vacía
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Los archivos eliminados aparecerán aquí
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                Mostrando {filteredItems.length} elementos
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ tableLayout: 'fixed' }}>
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider" style={{ width: '200px' }}>
                        Nombre
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider" style={{ width: '220px' }}>
                        Ruta Original
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider" style={{ width: '80px' }}>
                        Tamaño
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                        Eliminado por
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider" style={{ width: '90px' }}>
                        Fecha
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider" style={{ width: '60px' }}>
                        Expira
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider" style={{ width: '130px' }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredItems.map((item) => (
                      <tr key={item.trash_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.is_directory ? (
                              <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div
                                className="font-medium text-gray-900 dark:text-white text-sm truncate cursor-help"
                                title={item.original_name}
                              >
                                {item.original_name}
                              </div>
                              {item.is_directory && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                                  {item.file_count} archivos
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div
                            className="text-sm text-gray-600 dark:text-gray-300 truncate cursor-help"
                            title={item.original_path}
                          >
                            {item.original_path}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-sm text-gray-700 dark:text-gray-200 font-medium whitespace-nowrap">
                            {item.size_formatted}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div
                            className="text-sm text-gray-900 dark:text-white truncate cursor-help"
                            title={item.deleted_by_full_name || item.deleted_by_username}
                          >
                            {item.deleted_by_full_name || item.deleted_by_username}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {formatDate(item.deleted_at)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getExpiryColor(item.days_until_expiry)}`}>
                            {item.days_until_expiry}d
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => handleViewContents(item)}
                              className="p-1 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:bg-purple-900/30 rounded transition-colors"
                              title="Ver contenido"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleShare(item)}
                              className="p-1 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded transition-colors"
                              title="Generar link de descarga"
                            >
                              {copiedId === item.trash_id ? (
                                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <Link2 className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRestore(item)}
                              disabled={restoringId === item.trash_id}
                              className="p-1 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-900/30 rounded transition-colors disabled:opacity-50"
                              title="Restaurar"
                            >
                              {restoringId === item.trash_id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === item.trash_id}
                              className="p-1 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                              title="Eliminar permanentemente"
                            >
                              {deletingId === item.trash_id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Página {page} de {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de contenido */}
      {contentsModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <FolderTree className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Contenido: {contentsModal.item?.original_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    {contentsModal.item?.is_directory ? 'Directorio' : 'Archivo'} • {contentsModal.item?.size_formatted}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setContentsModal({ open: false, item: null, loading: false, data: null })}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {contentsModal.loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-300 mt-4">Cargando contenido...</p>
                </div>
              ) : contentsModal.data?.error ? (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <p className="text-red-800 dark:text-red-200">{contentsModal.data.error}</p>
                </div>
              ) : !contentsModal.data?.is_directory ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{contentsModal.data?.original_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        Tipo: {contentsModal.data?.mime_type || 'Desconocido'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        Tamaño: {contentsModal.data?.size_formatted}
                      </p>
                      {contentsModal.data?.file_hash && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">
                          SHA256: {contentsModal.data.file_hash.substring(0, 32)}...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                      <Folder className="w-5 h-5" />
                      <span className="font-medium">{contentsModal.data?.dir_count || 0} directorios</span>
                      <span className="text-purple-400">•</span>
                      <FileText className="w-5 h-5" />
                      <span className="font-medium">{contentsModal.data?.file_count || 0} archivos</span>
                    </div>
                    <span className="text-sm text-purple-600 dark:text-purple-400">{contentsModal.data?.size_formatted}</span>
                  </div>

                  {/* Árbol de archivos */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Estructura de archivos</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {contentsModal.data?.tree?.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 border-b last:border-b-0"
                          style={{ paddingLeft: `${16 + item.depth * 20}px` }}
                        >
                          {item.is_directory ? (
                            <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${item.is_directory ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                            {item.name}
                          </span>
                          {!item.is_directory && item.size_formatted && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                              {item.size_formatted}
                            </span>
                          )}
                        </div>
                      ))}
                      {(!contentsModal.data?.tree || contentsModal.data.tree.length === 0) && (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          No hay archivos en este directorio
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-4 border-t bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => setContentsModal({ open: false, item: null, loading: false, data: null })}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de configuración */}
      {configModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-lg w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Configuración de Papelera
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    Solo superadministrador
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfigModal(prev => ({ ...prev, open: false }))}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {configModal.loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-300 mt-4">Cargando configuración...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Uso actual */}
                  {configModal.data && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Uso actual</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Espacio usado:</span>
                          <span className="font-medium">{configModal.data.usage.current_size_formatted} / {configModal.data.usage.max_size_formatted}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              configModal.data.usage.usage_percent > 90 ? 'bg-red-500' :
                              configModal.data.usage.usage_percent > 70 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, configModal.data.usage.usage_percent)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Items en papelera:</span>
                          <span className="font-medium">{configModal.data.usage.total_items}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Por expirar (7 días):</span>
                          <span className="font-medium text-orange-600">{configModal.data.usage.expiring_soon}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Formulario */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Tamaño máximo total (GB)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        step="100"
                        value={configModal.formData.max_size_gb}
                        onChange={(e) => setConfigModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, max_size_gb: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        Capacidad total de la papelera (1 - 10,000 GB)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Tamaño máximo por archivo (GB)
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.5"
                        value={configModal.formData.max_item_size_gb}
                        onChange={(e) => setConfigModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, max_item_size_gb: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        Archivos mayores se eliminan sin respaldo (0.1 - 100 GB)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Días de retención
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={configModal.formData.retention_days}
                        onChange={(e) => setConfigModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, retention_days: parseInt(e.target.value) || 1 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        Días que los archivos permanecerán en papelera antes de eliminarse (1 - 365)
                      </p>
                      {configModal.data && configModal.formData.retention_days < configModal.data.config.retention_days && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                          <p className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Reducir los días de retención eliminará archivos que excedan el nuevo límite
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          Limpieza automática
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          Eliminar automáticamente archivos expirados
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfigModal(prev => ({
                          ...prev,
                          formData: { ...prev.formData, auto_cleanup_enabled: !prev.formData.auto_cleanup_enabled }
                        }))}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 ${
                          configModal.formData.auto_cleanup_enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-800 shadow ring-0 transition duration-200 ease-in-out ${
                            configModal.formData.auto_cleanup_enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Última actualización */}
                  {configModal.data?.config.updated_at && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 pt-2 border-t">
                      Última actualización: {new Date(configModal.data.config.updated_at).toLocaleString('es-CO')}
                      {configModal.data.config.updated_by_username && ` por ${configModal.data.config.updated_by_username}`}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => setConfigModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={configModal.saving || configModal.loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {configModal.saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Trash;
