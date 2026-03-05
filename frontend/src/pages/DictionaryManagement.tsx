import { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, AlertCircle, Download, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { CreateDictionaryEntryModal } from '../components/dictionary/CreateDictionaryEntryModal';
import { EditDictionaryEntryModal } from '../components/dictionary/EditDictionaryEntryModal';
import { AIAbbreviationsManager } from '../components/AIAbbreviationsManager';
import { Layout } from '../components/Layout';
import { useToast } from '../hooks/useToast';
import { useModal } from '../hooks/useModal';
import { ToastContainer } from '../components/Toast';

interface DictionaryEntry {
  id: number;
  key: string;
  value: string;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_by?: number;
  updated_at: string;
}

export const DictionaryManagement = () => {
  const toast = useToast();
  const { confirm } = useModal();
  const [filteredEntries, setFilteredEntries] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const entriesPerPage = 50;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);

  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    checkPermissions();
    loadEntries();
  }, [currentPage, searchTerm, filterActive]);

  const checkPermissions = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setCanManage(userData.role === 'superadmin' || userData.can_manage_dictionary === true);
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
    }
  };

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError('');

      let url = `/api/dictionary?page=${currentPage}&page_size=${entriesPerPage}`;

      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      if (filterActive !== 'all') {
        url += `&is_active=${filterActive === 'active'}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar el diccionario');
      }

      const data = await response.json();

      if (data.results) {
        setFilteredEntries(data.results);
        setTotalCount(data.count || data.results.length);
      } else {
        setFilteredEntries([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el diccionario');
      setFilteredEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entry: DictionaryEntry) => {
    const confirmed = await confirm({
      title: 'Eliminar término del diccionario',
      message: `¿Estás seguro de eliminar el término "${entry.key}"?\n\nEsta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/dictionary/${entry.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar el término');
      }

      toast.success(`Término "${entry.key}" eliminado exitosamente`);
      loadEntries();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el término');
    }
  };

  const handleToggleActive = async (entry: DictionaryEntry) => {
    try {
      const response = await fetch(`/api/dictionary/${entry.id}/toggle-active`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cambiar estado');
      }

      const result = await response.json();
      toast.success(result.message);
      loadEntries();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado');
    }
  };

  const handleEdit = (entry: DictionaryEntry) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/dictionary/export-csv', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al exportar el diccionario');
      }

      // Obtener el blob del CSV
      const blob = await response.blob();

      // Crear un enlace temporal para descargar
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diccionario_igac.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      toast.error(err.message || 'Error al exportar el diccionario');
    }
  };

  const totalPages = Math.ceil(totalCount / entriesPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gestión del Diccionario</h1>
                <p className="text-gray-600 dark:text-gray-300">Administra los términos y abreviaciones del sistema</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Botón Exportar CSV - Visible para todos */}
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                title="Exportar diccionario completo a CSV"
              >
                <Download className="w-5 h-5" />
                Exportar CSV
              </button>

              {/* Botón Agregar - Solo para usuarios con permisos */}
              {canManage && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Término
                </button>
              )}
            </div>
          </div>

          {!canManage && (
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-200">Modo Consulta</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Puedes buscar y consultar todos los términos del diccionario.
                  Solo los superadministradores o usuarios autorizados pueden crear, editar o eliminar términos.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sección de Sugerencias de IA - Solo para usuarios con permisos */}
        {canManage && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 mb-6 overflow-hidden">
            <button
              onClick={() => setShowAISuggestions(!showAISuggestions)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 dark:from-purple-900/30 to-blue-50 dark:to-blue-900/30 hover:from-purple-100 dark:hover:from-purple-900/50 hover:to-blue-100 dark:hover:to-blue-900/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <div className="text-left">
                  <h2 className="font-semibold text-gray-800 dark:text-gray-100">Sugerencias de IA</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Revisa y aprueba las abreviaciones generadas automáticamente
                  </p>
                </div>
              </div>
              {showAISuggestions ? (
                <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
              )}
            </button>

            {showAISuggestions && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <AIAbbreviationsManager onDictionaryUpdated={loadEntries} />
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Buscar término o descripción
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Escribe para buscar..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>

            {/* Filter by status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Estado
              </label>
              <select
                value={filterActive}
                onChange={(e) => {
                  setFilterActive(e.target.value as 'all' | 'active' | 'inactive');
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              >
                <option value="all">Todos ({totalCount})</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Cargando diccionario...</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Término
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Última actualización
                      </th>
                      {canManage && (
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={canManage ? 5 : 4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-lg font-semibold">No se encontraron términos</p>
                          <p className="text-sm">
                            {searchTerm ? 'Intenta con otro término de búsqueda' : 'Agrega tu primer término al diccionario'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{entry.key}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-700 dark:text-gray-200">
                            {entry.value.length > 100 ? entry.value.substring(0, 100) + '...' : entry.value}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {entry.is_active ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-full text-sm font-semibold">
                                <ToggleRight className="w-4 h-4" />
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-sm font-semibold">
                                <ToggleLeft className="w-4 h-4" />
                                Inactivo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                            {new Date(entry.updated_at).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          {canManage && (
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(entry)}
                                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg transition-colors"
                                  title="Editar término"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleActive(entry)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    entry.is_active
                                      ? 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:bg-yellow-900/30'
                                      : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-green-900/30'
                                  }`}
                                  title={entry.is_active ? 'Desactivar' : 'Activar'}
                                >
                                  {entry.is_active ? (
                                    <ToggleLeft className="w-4 h-4" />
                                  ) : (
                                    <ToggleRight className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDelete(entry)}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors"
                                  title="Eliminar término"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/50 p-6 mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Mostrando {(currentPage - 1) * entriesPerPage + 1} -{' '}
                    {Math.min(currentPage * entriesPerPage, totalCount)} de {totalCount} términos
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modals */}
        {showCreateModal && (
          <CreateDictionaryEntryModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadEntries();
            }}
          />
        )}

        {showEditModal && selectedEntry && (
          <EditDictionaryEntryModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedEntry(null);
            }}
            entry={selectedEntry}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedEntry(null);
              loadEntries();
            }}
          />
        )}
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </Layout>
  );
};
