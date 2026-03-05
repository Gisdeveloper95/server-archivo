import { useState, useEffect } from 'react';
import {
  FileSearch,
  Activity,
  FolderSearch,
  Loader2,
  Calendar,
  Filter,
  X,
  Search,
  Download,
  Upload,
  Trash2,
  Edit,
  AlertCircle,
  Clock,
  Folder,
  File,
  XCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Scissors,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  FileCode,
  Package,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import { auditApi } from '../api';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

interface AuditLog {
  id: number;
  user: number;
  username: string;
  user_role: string;
  action: string;
  target_path?: string;
  target_name?: string;
  file_size?: number;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  timestamp: string;
}

export default function Audit() {
  const { user } = useAuthStore();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'directory' | 'file'>('dashboard');
  const [loading, setLoading] = useState(false);

  // Dashboard filters
  const [filterUsername, setFilterUsername] = useState('');
  const [filterAction, setFilterAction] = useState<string[]>([]); // Cambio a array para múltiples selecciones
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSuccess, setFilterSuccess] = useState<string>('');
  const [dashboardLogs, setDashboardLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 50;

  // Available filters from backend
  const [availableUsernames, setAvailableUsernames] = useState<string[]>([]);
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  // Directory Audit state
  const [directoryPath, setDirectoryPath] = useState('');
  const [directoryDateFrom, setDirectoryDateFrom] = useState('');
  const [directoryDateTo, setDirectoryDateTo] = useState('');
  const [directoryUsername, setDirectoryUsername] = useState('');
  const [directoryAction, setDirectoryAction] = useState('');
  const [directoryResults, setDirectoryResults] = useState<any>(null);

  // File Tracking state
  const [filename, setFilename] = useState('');
  const [fileDateFrom, setFileDateFrom] = useState('');
  const [fileDateTo, setFileDateTo] = useState('');
  const [fileUsername, setFileUsername] = useState('');
  const [fileAction, setFileAction] = useState('');
  const [fileResults, setFileResults] = useState<any>(null);

  // Export dropdown states
  const [showExportDropdown, setShowExportDropdown] = useState<'dashboard' | 'directory' | 'file' | null>(null);
  const [exportingPackage, setExportingPackage] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Movimiento de Usuarios', icon: Activity },
    { id: 'directory', label: 'Auditoría por Directorio', icon: FolderSearch },
    { id: 'file', label: 'Seguimiento de Archivo', icon: FileSearch },
  ];

  const actionLabels: Record<string, string> = {
    login: 'Inicio de Sesión',
    logout: 'Cierre de Sesión',
    upload: 'Subir Archivo',
    download: 'Descargar',
    delete: 'Eliminar',
    rename: 'Renombrar',
    create_folder: 'Crear Carpeta',
    move: 'Mover',
    copy: 'Copiar',
  };

  // Función para filtrar usuarios basado en el input (máximo 10)
  const getFilteredUsernames = (searchTerm: string): string[] => {
    if (!searchTerm) return availableUsernames.slice(0, 10);
    return availableUsernames
      .filter(username => username.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 10);
  };

  // Load available filters on mount
  useEffect(() => {
    loadAvailableFilters();
  }, []);

  // Load initial data on mount and when page changes
  useEffect(() => {
    loadDashboardLogs(); // Carga automática al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Auto-search when filters change (búsqueda dinámica)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadDashboardLogs();
      } else {
        setCurrentPage(1); // Trigger reload by resetting page
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUsername, filterAction, filterDateFrom, filterDateTo, filterSuccess]);

  const loadAvailableFilters = async () => {
    try {
      const data = await auditApi.getAvailableFilters();
      setAvailableUsernames(data.usernames || []);
      setAvailableActions(data.actions || []);
    } catch (err) {
      console.error('Error loading available filters:', err);
    }
  };

  const loadDashboardLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: logsPerPage,
        offset: (currentPage - 1) * logsPerPage,
      };
      if (filterUsername) params.username = filterUsername;
      // Si hay múltiples acciones seleccionadas, solo enviamos una por ahora
      // El backend no soporta múltiples acciones todavía
      if (filterAction.length === 1) params.action = filterAction[0];
      if (filterDateFrom) params.start_date = filterDateFrom;
      if (filterDateTo) params.end_date = filterDateTo;
      if (filterSuccess === 'success') params.success = true;
      if (filterSuccess === 'error') params.success = false;

      const data = await auditApi.getLogs(params);

      // Si hay múltiples acciones seleccionadas, filtrar en el frontend
      let results = data.results || data || [];
      if (filterAction.length > 1) {
        results = results.filter((log: AuditLog) => filterAction.includes(log.action));
      }

      setDashboardLogs(results);
      if (data.count) setTotalLogs(data.count);
    } catch (err) {
      console.error('Error loading logs:', err);
      setDashboardLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const searchDirectory = async () => {
    if (!directoryPath) {
      toast.warning('Por favor ingrese una ruta');
      return;
    }
    setLoading(true);
    try {
      const data = await auditApi.getDirectoryAudit(
        directoryPath,
        directoryDateFrom,
        directoryDateTo,
        directoryUsername,
        directoryAction
      );
      setDirectoryResults(data);
    } catch (err: any) {
      console.error('Error searching directory:', err);
      toast.error(err.response?.data?.message || 'Error al buscar en el directorio');
    } finally {
      setLoading(false);
    }
  };

  const trackFile = async () => {
    if (!filename) {
      toast.warning('Por favor ingrese un nombre de archivo');
      return;
    }
    setLoading(true);
    try {
      const data = await auditApi.trackFile(
        filename,
        fileDateFrom,
        fileDateTo,
        fileUsername,
        fileAction
      );
      setFileResults(data);
    } catch (err: any) {
      console.error('Error tracking file:', err);
      toast.error(err.response?.data?.message || 'Error al rastrear archivo');
    } finally {
      setLoading(false);
    }
  };

  const clearDashboardFilters = () => {
    setFilterUsername('');
    setFilterAction([]);
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterSuccess('');
    setCurrentPage(1);
  };

  const toggleAction = (action: string) => {
    if (filterAction.includes(action)) {
      setFilterAction(filterAction.filter((a) => a !== action));
    } else {
      setFilterAction([...filterAction, action]);
    }
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setShowExportDropdown(null);
    if (showExportDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportDropdown]);

  const downloadReportPackage = async (type: 'dashboard' | 'directory' | 'file') => {
    setExportingPackage(true);
    setShowExportDropdown(null);
    try {
      let blob;
      let zipFilename;

      if (type === 'dashboard') {
        const params: any = {};
        if (filterUsername) params.username = filterUsername;
        if (filterAction.length === 1) params.action = filterAction[0];
        if (filterDateFrom) params.start_date = filterDateFrom;
        if (filterDateTo) params.end_date = filterDateTo;
        if (filterSuccess === 'success') params.success = true;
        if (filterSuccess === 'error') params.success = false;

        blob = await auditApi.exportReportPackage(params);
        zipFilename = `reportes_auditoria_${new Date().toISOString().split('T')[0]}.zip`;
      } else if (type === 'directory') {
        if (!directoryPath) {
          toast.warning('Por favor ingrese una ruta de directorio');
          setExportingPackage(false);
          return;
        }
        blob = await auditApi.exportDirectoryReportPackage(
          directoryPath,
          directoryDateFrom,
          directoryDateTo,
          directoryUsername,
          directoryAction
        );
        zipFilename = `reportes_directorio_${new Date().toISOString().split('T')[0]}.zip`;
      } else if (type === 'file') {
        if (!filename) {
          toast.warning('Por favor ingrese un nombre de archivo');
          setExportingPackage(false);
          return;
        }
        blob = await auditApi.exportFileTrackingReportPackage(
          filename,
          fileDateFrom,
          fileDateTo,
          fileUsername,
          fileAction
        );
        zipFilename = `reportes_archivo_${new Date().toISOString().split('T')[0]}.zip`;
      }

      // Descargar el archivo
      const url = window.URL.createObjectURL(blob!);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipFilename!;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Paquete de reportes descargado correctamente');
    } catch (err: any) {
      console.error('Error downloading report package:', err);
      toast.error('Error al descargar el paquete de reportes');
    } finally {
      setExportingPackage(false);
    }
  };

  const downloadCSV = async (type: 'dashboard' | 'directory' | 'file') => {
    setShowExportDropdown(null);
    try {
      let blob;
      let csvFilename;

      if (type === 'dashboard') {
        const params: any = {};
        if (filterUsername) params.username = filterUsername;
        if (filterAction.length === 1) params.action = filterAction[0];
        if (filterDateFrom) params.start_date = filterDateFrom;
        if (filterDateTo) params.end_date = filterDateTo;
        if (filterSuccess === 'success') params.success = true;
        if (filterSuccess === 'error') params.success = false;

        blob = await auditApi.exportDashboardCSV(params);
        csvFilename = `auditoria_dashboard_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'directory') {
        if (!directoryPath) {
          toast.warning('Por favor ingrese una ruta de directorio');
          return;
        }
        blob = await auditApi.exportDirectoryCSV(
          directoryPath,
          directoryDateFrom,
          directoryDateTo,
          directoryUsername,
          directoryAction
        );
        csvFilename = `auditoria_directorio_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'file') {
        if (!filename) {
          toast.warning('Por favor ingrese un nombre de archivo');
          return;
        }
        blob = await auditApi.exportFileTrackingCSV(
          filename,
          fileDateFrom,
          fileDateTo,
          fileUsername,
          fileAction
        );
        csvFilename = `seguimiento_archivo_${new Date().toISOString().split('T')[0]}.csv`;
      }

      // Descargar el archivo
      const url = window.URL.createObjectURL(blob!);
      const link = document.createElement('a');
      link.href = url;
      link.download = csvFilename!;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading CSV:', err);
      toast.error('Error al descargar el CSV');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionLabel = (action: string): string => {
    return actionLabels[action] || action;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload':
        return <Upload className="w-4 h-4" />;
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      case 'rename':
        return <Edit className="w-4 h-4" />;
      case 'move':
        return <Scissors className="w-4 h-4 text-orange-600" />;
      case 'copy':
        return <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'create_folder':
        return <Folder className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const totalPages = Math.ceil(totalLogs / logsPerPage);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <FileSearch className="w-8 h-8 text-indigo-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Módulo de Auditoría</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Rastrea operaciones de usuarios, auditoría por directorio y seguimiento de archivos
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2">
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 flex-1
                  ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700'
                  }
                `}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tab - Movimiento de Usuarios */}
        {activeTab === 'dashboard' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Movimiento General de Usuarios</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Total de registros: <strong>{totalLogs}</strong>
                </span>
                {/* Dropdown de exportación */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowExportDropdown(showExportDropdown === 'dashboard' ? null : 'dashboard');
                    }}
                    disabled={exportingPackage}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    {exportingPackage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Exportar</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showExportDropdown === 'dashboard' && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                      <div className="p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Opciones de Exportación</p>
                      </div>

                      {/* CSV Rápido */}
                      <button
                        onClick={() => downloadCSV('dashboard')}
                        className="w-full flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors text-left border-b border-gray-100 dark:border-gray-700"
                      >
                        <FileText className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">CSV Rápido</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Exportación simple para análisis en Excel</p>
                        </div>
                      </button>

                      {/* Paquete Completo */}
                      <button
                        onClick={() => downloadReportPackage('dashboard')}
                        className="w-full flex items-start space-x-3 p-3 hover:bg-indigo-50 transition-colors text-left"
                      >
                        <Package className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Paquete Completo (ZIP)</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Incluye CSV, Excel, HTML Timeline, TXT árbol y README</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">CSV</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">Excel</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:text-purple-300 rounded">HTML</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded">TXT</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
              <div className="flex items-center space-x-3 mb-3">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <h4 className="font-semibold text-gray-900 dark:text-white">Filtros de Búsqueda</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={filterUsername}
                    onChange={(e) => setFilterUsername(e.target.value)}
                    placeholder="Buscar usuario..."
                    list="usernames-datalist"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <datalist id="usernames-datalist">
                    {getFilteredUsernames(filterUsername).map((username) => (
                      <option key={username} value={username} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Estado
                  </label>
                  <select
                    value={filterSuccess}
                    onChange={(e) => setFilterSuccess(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  >
                    <option value="">Todos</option>
                    <option value="success">Exitosas</option>
                    <option value="error">Con Errores</option>
                  </select>
                </div>
              </div>

              {/* Action Checkboxes */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                  Acciones ({filterAction.length > 0 ? filterAction.length + ' seleccionadas' : 'Todas'})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filterAction.includes(key)}
                        onChange={() => toggleAction(key)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 italic">
                  Los resultados se actualizan automáticamente al modificar los filtros
                </p>
                <button
                  onClick={clearDashboardFilters}
                  className="flex items-center space-x-2 px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300"
                >
                  <X className="w-5 h-5" />
                  <span>Limpiar Filtros</span>
                </button>
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : dashboardLogs.length > 0 ? (
              <>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    Resultados (Página {currentPage} de {totalPages})
                  </h4>
                  <div className="space-y-3">
                    {dashboardLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`border rounded-lg p-4 ${
                          log.success
                            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                            : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 hover:border-red-400'
                        } transition-colors`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div
                              className={`p-2 rounded-lg ${
                                log.success
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-red-200 text-red-800 dark:text-red-200'
                              }`}
                            >
                              {getActionIcon(log.action)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {getActionLabel(log.action)}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    log.success
                                      ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                                      : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
                                  }`}
                                >
                                  {log.success ? 'Éxito' : 'Error'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-300">Usuario: </span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {log.username}
                                  </span>
                                </div>
                                {log.target_name && (
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-300">Archivo: </span>
                                    <span className="font-mono text-gray-900 dark:text-white">
                                      {log.target_name}
                                    </span>
                                  </div>
                                )}
                                {log.target_path && (
                                  <div className="col-span-2">
                                    <span className="text-gray-600 dark:text-gray-300">Ruta: </span>
                                    <span className="font-mono text-gray-900 dark:text-white text-xs">
                                      {log.target_path}
                                    </span>
                                  </div>
                                )}
                                {log.file_size && (
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-300">Tamaño: </span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {formatFileSize(log.file_size)}
                                    </span>
                                  </div>
                                )}
                                {log.ip_address && (
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-300">IP: </span>
                                    <span className="font-mono text-gray-900 dark:text-white">
                                      {log.ip_address}
                                    </span>
                                  </div>
                                )}
                                {log.error_message && (
                                  <div className="col-span-2">
                                    <span className="text-red-600 dark:text-red-400 font-semibold">Error: </span>
                                    <span className="text-red-800 dark:text-red-200">{log.error_message}</span>
                                  </div>
                                )}
                                {log.action === 'rename' && log.details && (
                                  <div className="col-span-2 mt-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded p-2">
                                    <p className="text-xs text-gray-700 dark:text-gray-200">
                                      <span className="font-semibold text-red-700 dark:text-red-300">De:</span>{' '}
                                      <span className="font-mono">{log.details.old_name || 'N/A'}</span>
                                    </p>
                                    <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">
                                      <span className="font-semibold text-green-700 dark:text-green-300">A:</span>{' '}
                                      <span className="font-mono">{log.details.new_name || log.target_name || 'N/A'}</span>
                                    </p>
                                  </div>
                                )}
                                {(log.action === 'copy' || log.action === 'move') && log.details && (
                                  <div className="col-span-2 mt-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-3">
                                    <div className="space-y-2">
                                      <div>
                                        <span className="font-semibold text-blue-900 text-xs">Origen:</span>
                                        <p className="font-mono text-xs text-blue-800 dark:text-blue-200 mt-0.5 break-all">
                                          {log.details.source_path || log.target_path || 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-green-900 text-xs">Destino:</span>
                                        <p className="font-mono text-xs text-green-800 dark:text-green-200 mt-0.5 break-all">
                                          {log.details.dest_path || 'N/A'}
                                        </p>
                                      </div>
                                      {log.details.is_directory && (
                                        <div className="flex items-center space-x-2 text-xs text-indigo-700 mt-1">
                                          <Folder className="w-3 h-3" />
                                          <span>
                                            Directorio ({log.details.file_count || 0} archivos)
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {/* Detalles de eliminación de directorio */}
                                {log.action === 'delete' && log.details && log.details.deleted_items && log.details.deleted_items.length > 0 && (
                                  <div className="col-span-2 mt-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-red-900 text-xs flex items-center gap-1">
                                        <Trash2 className="w-3 h-3" />
                                        Contenido eliminado ({log.details.deleted_items.length} elementos)
                                      </span>
                                      <span className="text-xs text-red-700 dark:text-red-300">
                                        {log.details.total_size_formatted || ''}
                                      </span>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto bg-white dark:bg-gray-800 rounded border border-red-100 p-2">
                                      {log.details.deleted_items.slice(0, 20).map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs py-0.5 border-b border-red-50 last:border-0">
                                          {item.is_directory ? (
                                            <Folder className="w-3 h-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                          ) : (
                                            <File className="w-3 h-3 text-gray-500 dark:text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                          )}
                                          <span className="font-mono text-gray-800 dark:text-gray-100 truncate flex-1" title={item.path}>
                                            {item.name}
                                          </span>
                                          {!item.is_directory && item.size > 0 && (
                                            <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 flex-shrink-0">
                                              {(item.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                      {log.details.deleted_items.length > 20 && (
                                        <div className="text-xs text-red-600 dark:text-red-400 mt-1 text-center">
                                          ... y {log.details.deleted_items.length - 20} elementos más
                                        </div>
                                      )}
                                    </div>
                                    {log.details.stats_by_extension && Object.keys(log.details.stats_by_extension).length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-700">
                                        <span className="text-xs text-red-800 dark:text-red-200 font-medium">Por extensión: </span>
                                        <span className="text-xs text-red-700 dark:text-red-300">
                                          {Object.entries(log.details.stats_by_extension)
                                            .sort((a: any, b: any) => b[1] - a[1])
                                            .slice(0, 5)
                                            .map(([ext, count]: [string, any]) => `${ext} (${count})`)
                                            .join(', ')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* Contenido copiado (directorios) */}
                                {log.action === 'copy' && log.details && log.details.copied_items && log.details.copied_items.length > 0 && (
                                  <div className="col-span-2 mt-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-purple-900 dark:text-purple-200 text-xs flex items-center gap-1">
                                        <Folder className="w-3 h-3" />
                                        Contenido copiado ({log.details.copied_items.length} elementos)
                                      </span>
                                      <span className="text-xs text-purple-700 dark:text-purple-300">
                                        {log.details.total_size_formatted || ''}
                                      </span>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto bg-white dark:bg-gray-800 rounded border border-purple-100 p-2">
                                      {log.details.copied_items.slice(0, 20).map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs py-0.5 border-b border-purple-50 last:border-0">
                                          {item.is_directory ? (
                                            <Folder className="w-3 h-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                          ) : (
                                            <File className="w-3 h-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                          )}
                                          <span className="font-mono text-gray-800 dark:text-gray-100 truncate flex-1" title={item.path}>
                                            {item.name}
                                          </span>
                                          {!item.is_directory && item.size > 0 && (
                                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                                              {(item.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                      {log.details.copied_items.length > 20 && (
                                        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 text-center">
                                          ... y {log.details.copied_items.length - 20} elementos más
                                        </div>
                                      )}
                                    </div>
                                    {log.details.stats_by_extension && Object.keys(log.details.stats_by_extension).length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                                        <span className="text-xs text-purple-800 dark:text-purple-200 font-medium">Por extensión: </span>
                                        <span className="text-xs text-purple-700 dark:text-purple-300">
                                          {Object.entries(log.details.stats_by_extension)
                                            .sort((a: any, b: any) => b[1] - a[1])
                                            .slice(0, 5)
                                            .map(([ext, count]: [string, any]) => `${ext} (${count})`)
                                            .join(', ')}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {/* Archivos subidos (upload_batch) */}
                                {log.action === 'upload_batch' && log.details && log.details.uploaded_items && log.details.uploaded_items.length > 0 && (
                                  <div className="col-span-2 mt-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-green-900 dark:text-green-200 text-xs flex items-center gap-1">
                                        <File className="w-3 h-3" />
                                        Archivos subidos ({log.details.uploaded_items.filter((i: any) => i.status === 'success').length} exitosos
                                        {log.details.uploaded_items.filter((i: any) => i.status !== 'success').length > 0 &&
                                          `, ${log.details.uploaded_items.filter((i: any) => i.status !== 'success').length} con error`})
                                      </span>
                                      {log.details.stats && (
                                        <span className="text-xs text-green-700 dark:text-green-300">
                                          {log.details.stats.total_size_formatted || ''}
                                        </span>
                                      )}
                                    </div>
                                    <div className="max-h-32 overflow-y-auto bg-white dark:bg-gray-800 rounded border border-green-100 p-2">
                                      {log.details.uploaded_items.slice(0, 20).map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs py-0.5 border-b border-green-50 last:border-0">
                                          {item.is_directory ? (
                                            <Folder className="w-3 h-3 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                                          ) : (
                                            <File className="w-3 h-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                          )}
                                          <span className="font-mono text-gray-800 dark:text-gray-100 truncate flex-1" title={item.path}>
                                            {item.name}
                                          </span>
                                          {item.status !== 'success' && (
                                            <span className="text-red-500 flex-shrink-0">✗</span>
                                          )}
                                          {item.action_taken && item.action_taken !== 'uploaded' && (
                                            <span className="text-xs text-gray-400 flex-shrink-0">[{item.action_taken}]</span>
                                          )}
                                        </div>
                                      ))}
                                      {log.details.uploaded_items.length > 20 && (
                                        <div className="text-xs text-green-600 dark:text-green-400 mt-1 text-center">
                                          ... y {log.details.uploaded_items.length - 20} elementos más
                                        </div>
                                      )}
                                    </div>
                                    {log.details.stats && (
                                      <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700 flex gap-4">
                                        {log.details.stats.uploaded > 0 && (
                                          <span className="text-xs text-green-800 dark:text-green-200">✓ {log.details.stats.uploaded} subidos</span>
                                        )}
                                        {log.details.stats.skipped > 0 && (
                                          <span className="text-xs text-yellow-700 dark:text-yellow-300">⊘ {log.details.stats.skipped} omitidos</span>
                                        )}
                                        {log.details.stats.replaced > 0 && (
                                          <span className="text-xs text-blue-700 dark:text-blue-300">↺ {log.details.stats.replaced} reemplazados</span>
                                        )}
                                        {log.details.stats.failed > 0 && (
                                          <span className="text-xs text-red-700 dark:text-red-300">✗ {log.details.stats.failed} fallidos</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-600 dark:text-gray-300 ml-4">
                            <div className="flex items-center space-x-2 justify-end">
                              <Calendar className="w-4 h-4" />
                              {formatDateTime(log.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 dark:bg-gray-700 disabled:text-gray-400 dark:text-gray-500"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <span>Anterior</span>
                    </button>

                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Página {currentPage} de {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 dark:bg-gray-700 disabled:text-gray-400 dark:text-gray-500"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">No se encontraron registros</p>
                <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-2">
                  {filterUsername || filterAction || filterDateFrom || filterDateTo
                    ? 'Intenta ajustar los filtros'
                    : 'No hay logs de auditoría disponibles'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Directory Audit Tab */}
        {activeTab === 'directory' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Auditoría por Directorio</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Ingresa la ruta completa o parcial del directorio. Acepta rutas absolutas (\\repositorio\...) o relativas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Ruta del Directorio *
                </label>
                <input
                  type="text"
                  value={directoryPath}
                  onChange={(e) => setDirectoryPath(e.target.value)}
                  placeholder="prueba_nombre_largo o \\repositorio\...\prueba_nombre_largo"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={directoryUsername}
                  onChange={(e) => setDirectoryUsername(e.target.value)}
                  placeholder="Filtrar por usuario..."
                  list="dir-usernames-datalist"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <datalist id="dir-usernames-datalist">
                  {getFilteredUsernames(directoryUsername).map((username) => (
                    <option key={username} value={username} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Acción
                </label>
                <select
                  value={directoryAction}
                  onChange={(e) => setDirectoryAction(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
                  <option value="">Todas</option>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={directoryDateFrom}
                  onChange={(e) => setDirectoryDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  value={directoryDateTo}
                  onChange={(e) => setDirectoryDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={searchDirectory}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FolderSearch className="w-5 h-5" />
                )}
                <span>Buscar</span>
              </button>

              {directoryResults && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowExportDropdown(showExportDropdown === 'directory' ? null : 'directory');
                    }}
                    disabled={exportingPackage}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    {exportingPackage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Exportar</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showExportDropdown === 'directory' && (
                    <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                      <div className="p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Opciones de Exportación</p>
                      </div>

                      <button
                        onClick={() => downloadCSV('directory')}
                        className="w-full flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors text-left border-b border-gray-100 dark:border-gray-700"
                      >
                        <FileText className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">CSV Rápido</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Exportación simple para análisis en Excel</p>
                        </div>
                      </button>

                      <button
                        onClick={() => downloadReportPackage('directory')}
                        className="w-full flex items-start space-x-3 p-3 hover:bg-indigo-50 transition-colors text-left"
                      >
                        <Package className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Paquete Completo (ZIP)</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">CSV, Excel, HTML Timeline, TXT árbol</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">CSV</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">Excel</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:text-purple-300 rounded">HTML</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded">TXT</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {directoryResults && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Total</p>
                    <p className="text-xl font-bold text-blue-900">
                      {directoryResults.statistics.total_operations}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">Subidas</p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-200">
                      {directoryResults.statistics.uploads}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Descargas</p>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                      {directoryResults.statistics.downloads}
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 border border-red-200 dark:border-red-700">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-1">Eliminaciones</p>
                    <p className="text-xl font-bold text-red-900">
                      {directoryResults.statistics.deletes}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-xs text-orange-600 mb-1">Renombres</p>
                    <p className="text-xl font-bold text-orange-900">
                      {directoryResults.statistics.renames}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    Permisos Actuales
                  </h4>
                  {directoryResults.current_permissions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">
                              Usuario
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200">
                              Lectura
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200">
                              Escritura
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200">
                              Eliminar
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-200">
                              Crear Dir.
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">
                              Otorgado Por
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {directoryResults.current_permissions.map((perm: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                {perm.username}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {perm.permissions.read ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {perm.permissions.write ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {perm.permissions.delete ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {perm.permissions.create_directories ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                {perm.granted_by || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">No hay permisos activos</p>
                  )}
                </div>

                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    Operaciones Recientes
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {directoryResults.recent_operations.map((log: AuditLog) => (
                      <div
                        key={log.id}
                        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {getActionLabel(log.action)}
                            </span>
                            <span className="text-gray-600 dark:text-gray-300">por</span>
                            <span className="font-medium text-indigo-600">{log.username}</span>
                            {log.target_name && (
                              <>
                                <span className="text-gray-600 dark:text-gray-300">-</span>
                                <span className="font-mono text-gray-900 dark:text-white">{log.target_name}</span>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        {log.action === 'rename' && log.details && (
                          <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded p-2">
                            <p className="text-xs text-gray-700 dark:text-gray-200">
                              <span className="font-semibold text-red-700 dark:text-red-300">De:</span>{' '}
                              <span className="font-mono">{log.details.old_name || 'N/A'}</span>
                              {' '}
                              <span className="font-semibold text-green-700 dark:text-green-300">A:</span>{' '}
                              <span className="font-mono">{log.details.new_name || log.target_name || 'N/A'}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* File Tracking Tab */}
        {activeTab === 'file' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Seguimiento de Archivo</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Rastrea un archivo por nombre o ruta. Busca en nombres actuales, pasados (renombres) y rutas completas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Nombre o Ruta del Archivo *
                </label>
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="18_ap_afp.pdf o \\repositorio\...\18_ap_afp.pdf"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                  Busca por nombre, ruta completa o parcial
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Usuario
                </label>
                <input
                  type="text"
                  value={fileUsername}
                  onChange={(e) => setFileUsername(e.target.value)}
                  placeholder="Filtrar por usuario..."
                  list="file-usernames-datalist"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <datalist id="file-usernames-datalist">
                  {getFilteredUsernames(fileUsername).map((username) => (
                    <option key={username} value={username} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Acción
                </label>
                <select
                  value={fileAction}
                  onChange={(e) => setFileAction(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
                  <option value="">Todas</option>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  value={fileDateFrom}
                  onChange={(e) => setFileDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  value={fileDateTo}
                  onChange={(e) => setFileDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={trackFile}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileSearch className="w-5 h-5" />
                )}
                <span>Rastrear</span>
              </button>

              {fileResults && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowExportDropdown(showExportDropdown === 'file' ? null : 'file');
                    }}
                    disabled={exportingPackage}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    {exportingPackage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Exportar</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showExportDropdown === 'file' && (
                    <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                      <div className="p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Opciones de Exportación</p>
                      </div>

                      <button
                        onClick={() => downloadCSV('file')}
                        className="w-full flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors text-left border-b border-gray-100 dark:border-gray-700"
                      >
                        <FileText className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">CSV Rápido</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Exportación simple para análisis en Excel</p>
                        </div>
                      </button>

                      <button
                        onClick={() => downloadReportPackage('file')}
                        className="w-full flex items-start space-x-3 p-3 hover:bg-indigo-50 transition-colors text-left"
                      >
                        <Package className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Paquete Completo (ZIP)</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">CSV, Excel, HTML Timeline, TXT árbol</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">CSV</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">Excel</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:text-purple-300 rounded">HTML</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded">TXT</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {fileResults && (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <h4 className="font-bold text-blue-900 mb-2">Información del Archivo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Total operaciones:</span>
                      <span className="ml-2 text-blue-900 font-bold">
                        {fileResults.total_operations}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Primer registro:</span>
                      <span className="ml-2 text-blue-900">
                        {fileResults.first_seen ? formatDateTime(fileResults.first_seen) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Último registro:</span>
                      <span className="ml-2 text-blue-900">
                        {fileResults.last_seen ? formatDateTime(fileResults.last_seen) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Línea de Tiempo</h4>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {fileResults.timeline.map((event: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-indigo-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {getActionLabel(event.action)}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {formatDateTime(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Usuario: <span className="font-medium">{event.username}</span>
                          </p>
                          {event.action === 'rename' && event.details && (
                            <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded p-2">
                              <p className="text-xs text-gray-700 dark:text-gray-200">
                                <span className="font-semibold text-red-700 dark:text-red-300">De:</span>{' '}
                                <span className="font-mono">{event.details.old_name || 'N/A'}</span>
                              </p>
                              <p className="text-xs text-gray-700 dark:text-gray-200 mt-1">
                                <span className="font-semibold text-green-700 dark:text-green-300">A:</span>{' '}
                                <span className="font-mono">{event.details.new_name || event.target_name || 'N/A'}</span>
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-mono mt-1">
                            {event.target_path}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </Layout>
  );
}
