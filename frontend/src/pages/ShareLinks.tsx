import React, { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  Trash2,
  BarChart3,
  Copy,
  Check,
  Eye,
  Download,
  Calendar,
  Mail,
  Lock,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  X
} from 'lucide-react';
import {
  listShareLinks,
  deactivateShareLink,
  getShareLinkStats,
  ShareLink,
  ShareLinkStats
} from '../api/sharing';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../hooks/useModal';
import { Layout } from '../components/Layout';

export const ShareLinksPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { confirm, alert } = useModal();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [statsModalLink, setStatsModalLink] = useState<ShareLink | null>(null);
  const [stats, setStats] = useState<ShareLinkStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [filterPermission, setFilterPermission] = useState<'all' | 'view' | 'download'>('all');
  const [filterCreator, setFilterCreator] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Verificar que sea superadmin
  useEffect(() => {
    if (user?.role !== 'superadmin') {
      navigate('/files');
    }
  }, [user, navigate]);

  const loadLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listShareLinks();
      setLinks(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar links compartidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadLinks();
    }
  }, [user]);

  // Obtener creadores únicos para el filtro
  const uniqueCreators = useMemo(() => {
    const creators = new Set(links.map(l => l.created_by_username));
    return Array.from(creators).sort();
  }, [links]);

  // Filtrar links
  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      // Búsqueda por texto
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesPath = link.path.toLowerCase().includes(search);
        const matchesDescription = link.description?.toLowerCase().includes(search);
        const matchesCreator = link.created_by_username?.toLowerCase().includes(search);
        if (!matchesPath && !matchesDescription && !matchesCreator) return false;
      }

      // Filtro por estado
      if (filterStatus === 'active' && !link.is_valid) return false;
      if (filterStatus === 'inactive' && link.is_active) return false;
      if (filterStatus === 'expired' && !link.is_expired) return false;

      // Filtro por permiso
      if (filterPermission !== 'all' && link.permission !== filterPermission) return false;

      // Filtro por creador
      if (filterCreator && link.created_by_username !== filterCreator) return false;

      // Filtro por fecha
      if (filterDateFrom && link.created_at) {
        const linkDate = new Date(link.created_at).toISOString().split('T')[0];
        if (linkDate < filterDateFrom) return false;
      }
      if (filterDateTo && link.created_at) {
        const linkDate = new Date(link.created_at).toISOString().split('T')[0];
        if (linkDate > filterDateTo) return false;
      }

      return true;
    });
  }, [links, searchTerm, filterStatus, filterPermission, filterCreator, filterDateFrom, filterDateTo]);

  // Estadísticas globales
  const globalStats = useMemo(() => {
    const total = links.length;
    const active = links.filter(l => l.is_valid).length;
    const inactive = links.filter(l => !l.is_active).length;
    const expired = links.filter(l => l.is_expired).length;
    const totalAccesses = links.reduce((sum, l) => sum + l.access_count, 0);
    const totalDownloads = links.reduce((sum, l) => sum + l.download_count, 0);
    const withPassword = links.filter(l => l.password).length;
    const withEmail = links.filter(l => l.require_email).length;

    return { total, active, inactive, expired, totalAccesses, totalDownloads, withPassword, withEmail };
  }, [links]);

  const handleCopyUrl = (link: ShareLink) => {
    navigator.clipboard.writeText(link.full_url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeactivate = async (link: ShareLink) => {
    const confirmed = await confirm({
      title: 'Desactivar link compartido',
      message: `¿Desactivar el link para "${link.path}"?\n\nEl link dejará de funcionar inmediatamente.`,
      type: 'warning',
      confirmText: 'Desactivar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await deactivateShareLink(link.id);
      await loadLinks();
    } catch (err: any) {
      await alert(err.response?.data?.error || 'Error al desactivar link', { type: 'error', title: 'Error' });
    }
  };

  const handleShowStats = async (link: ShareLink) => {
    setStatsModalLink(link);
    setLoadingStats(true);
    try {
      const data = await getShareLinkStats(link.id);
      setStats(data);
    } catch (err: any) {
      await alert(err.response?.data?.error || 'Error al cargar estadísticas', { type: 'error', title: 'Error' });
      setStatsModalLink(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterPermission('all');
    setFilterCreator('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasActiveFilters = searchTerm || filterStatus !== 'all' || filterPermission !== 'all' || filterCreator || filterDateFrom || filterDateTo;

  // Exportar a CSV
  const exportToCSV = () => {
    const BOM = '\uFEFF';
    const headers = [
      'ID',
      'Ruta',
      'Descripcion',
      'Permiso',
      'Estado',
      'Creado Por',
      'Fecha Creacion',
      'Fecha Expiracion',
      'Con Contrasena',
      'Requiere Email',
      'Dominio Permitido',
      'Max Descargas',
      'Total Accesos',
      'Total Descargas',
      'Ultimo Acceso',
      'URL Completa'
    ];

    const rows = filteredLinks.map(link => [
      link.id,
      `"${link.path.replace(/"/g, '""')}"`,
      `"${(link.description || '').replace(/"/g, '""')}"`,
      link.permission === 'download' ? 'Descargar' : 'Solo ver',
      link.is_valid ? 'Activo' : (link.is_expired ? 'Expirado' : 'Inactivo'),
      link.created_by_username,
      link.created_at ? new Date(link.created_at).toISOString() : '',
      link.expires_at ? new Date(link.expires_at).toISOString() : '',
      link.password ? 'Si' : 'No',
      link.require_email ? 'Si' : 'No',
      link.allowed_domain || '',
      link.max_downloads || '',
      link.access_count,
      link.download_count,
      link.last_accessed_at ? new Date(link.last_accessed_at).toISOString() : '',
      `"${link.full_url}"`
    ]);

    const csvContent = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `links_compartidos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (user?.role !== 'superadmin') {
    return null;
  }

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Links Compartidos</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Gestión de archivos compartidos públicamente
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                disabled={filteredLinks.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={loadLinks}
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
      {links.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-xs mb-1">
                <Link2 className="w-4 h-4" />
                Total
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{globalStats.total}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs mb-1">
                <CheckCircle className="w-4 h-4" />
                Activos
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{globalStats.active}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs mb-1">
                <XCircle className="w-4 h-4" />
                Inactivos
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{globalStats.inactive}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-orange-600 text-xs mb-1">
                <Clock className="w-4 h-4" />
                Expirados
              </div>
              <div className="text-2xl font-bold text-orange-600">{globalStats.expired}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs mb-1">
                <TrendingUp className="w-4 h-4" />
                Accesos
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{globalStats.totalAccesses}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs mb-1">
                <Download className="w-4 h-4" />
                Descargas
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{globalStats.totalDownloads}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs mb-1">
                <Lock className="w-4 h-4" />
                Con clave
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{globalStats.withPassword}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-indigo-600 text-xs mb-1">
                <Mail className="w-4 h-4" />
                Con email
              </div>
              <div className="text-2xl font-bold text-indigo-600">{globalStats.withEmail}</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-4 mb-6">
          {/* Barra de búsqueda principal */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por ruta, descripción o creador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
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
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {[searchTerm, filterStatus !== 'all', filterPermission !== 'all', filterCreator, filterDateFrom, filterDateTo].filter(Boolean).length}
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

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="expired">Expirados</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Permiso</label>
                <select
                  value={filterPermission}
                  onChange={(e) => setFilterPermission(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
                  <option value="all">Todos</option>
                  <option value="view">Solo ver</option>
                  <option value="download">Descargar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Creador</label>
                <select
                  value={filterCreator}
                  onChange={(e) => setFilterCreator(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
                  <option value="">Todos</option>
                  {uniqueCreators.map(creator => (
                    <option key={creator} value={creator}>{creator}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Desde</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Hasta</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading && links.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600 dark:text-gray-300 mt-4">Cargando links...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        ) : links.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
            <Link2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No hay links compartidos
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Los links creados aparecerán aquí
            </p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No se encontraron resultados
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Intenta ajustar los filtros de búsqueda
            </p>
            <button
              onClick={clearFilters}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            {/* Contador de resultados */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              Mostrando {filteredLinks.length} de {links.length} links
              {hasActiveFilters && ' (filtrados)'}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Archivo/Directorio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Permisos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Seguridad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Estadísticas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLinks.map((link) => (
                    <tr key={link.id} className={!link.is_active ? 'bg-gray-50 dark:bg-gray-900 opacity-60' : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900'}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-md" title={link.path}>
                            {link.path}
                          </span>
                          {link.description && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">{link.description}</span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Creado: {formatDate(link.created_at)} por {link.created_by_username}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          link.permission === 'download'
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                        }`}>
                          {link.permission === 'download' ? (
                            <Download className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                          {link.permission === 'download' ? 'Descargar' : 'Solo ver'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {link.password && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                              <Lock className="w-3 h-3" />
                              Con contraseña
                            </span>
                          )}
                          {link.require_email && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                              <Mail className="w-3 h-3" />
                              Requiere email
                              {link.allowed_domain && ` (@${link.allowed_domain})`}
                            </span>
                          )}
                          {link.expires_at && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                              <Calendar className="w-3 h-3" />
                              Expira: {formatDate(link.expires_at)}
                            </span>
                          )}
                          {!link.password && !link.require_email && !link.expires_at && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">Sin restricciones</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                            Accesos: <span className="font-medium">{link.access_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                            Descargas: <span className="font-medium">{link.download_count}</span>
                          </div>
                          {link.max_downloads && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                              Máx: {link.max_downloads}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            link.is_valid
                              ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                          }`}>
                            {link.is_valid ? 'Activo' : 'Inactivo'}
                          </span>
                          {link.is_expired && (
                            <span className="text-xs text-orange-600">Expirado</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={link.full_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg transition-colors"
                            title="Abrir link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleCopyUrl(link)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg transition-colors"
                            title="Copiar URL"
                          >
                            {copiedId === link.id ? (
                              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleShowStats(link)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg transition-colors"
                            title="Ver estadísticas"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          {link.is_active && (
                            <button
                              onClick={() => handleDeactivate(link)}
                              className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors"
                              title="Desactivar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Stats Modal */}
      {statsModalLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold">Estadísticas del Link</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1 truncate max-w-md" title={statsModalLink.path}>
                  {statsModalLink.path}
                </p>
              </div>
              <button
                onClick={() => {
                  setStatsModalLink(null);
                  setStats(null);
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {loadingStats ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                  <p className="text-gray-600 dark:text-gray-300 mt-4">Cargando estadísticas...</p>
                </div>
              ) : stats ? (
                <div className="space-y-6">
                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Total de accesos</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.access_count}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Descargas</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.download_count}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">Último acceso</div>
                      <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {stats.last_accessed ? formatDate(stats.last_accessed) : 'Nunca'}
                      </div>
                    </div>
                  </div>

                  {/* Link info */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Información del Link</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Estado:</span>
                        <span className={`ml-2 font-medium ${stats.is_valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {stats.is_valid ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Expirado:</span>
                        <span className={`ml-2 font-medium ${stats.is_expired ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>
                          {stats.is_expired ? 'Sí' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recent accesses */}
                  {stats.recent_accesses.length > 0 ? (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Accesos recientes</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Fecha</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">IP</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Email</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Acción</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {stats.recent_accesses.map((access) => (
                              <tr key={access.id}>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {formatDate(access.accessed_at)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{access.ip_address}</td>
                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                  {access.email_provided || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                  {access.action === 'view' ? 'Ver' : access.action === 'download' ? 'Descargar' : access.action}
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                    access.success
                                      ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                                      : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                                  }`}>
                                    {access.success ? 'Exitoso' : 'Fallido'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      No hay accesos registrados para este link
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
};
