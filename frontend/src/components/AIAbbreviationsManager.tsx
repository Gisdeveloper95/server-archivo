/**
 * Componente para gestionar abreviaciones generadas por IA
 * Permite aprobar, rechazar, corregir y agregar al diccionario
 */
import { useState, useEffect } from 'react';
import {
  Brain,
  CheckCircle,
  XCircle,
  Edit3,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Clock,
  TrendingUp,
  Search,
  Loader2,
  CheckCheck,
  BookPlus,
} from 'lucide-react';
import { aiAbbreviationsApi, type AIAbbreviation, type AIAbbreviationSummary } from '../api/aiAbbreviations';

interface AIAbbreviationsManagerProps {
  onDictionaryUpdated?: () => void;
}

export const AIAbbreviationsManager: React.FC<AIAbbreviationsManagerProps> = ({
  onDictionaryUpdated,
}) => {
  const [abbreviations, setAbbreviations] = useState<AIAbbreviation[]>([]);
  const [summary, setSummary] = useState<AIAbbreviationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [listResponse, summaryResponse] = await Promise.all([
        aiAbbreviationsApi.list({
          status: statusFilter || undefined,
          search: searchTerm || undefined,
        }),
        aiAbbreviationsApi.getSummary(),
      ]);

      setAbbreviations(listResponse.results);
      setSummary(summaryResponse);
    } catch (err: any) {
      console.error('Error loading AI abbreviations:', err);
      setError(err.response?.data?.error || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setProcessingId(id);
      await aiAbbreviationsApi.approve(id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al aprobar');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setProcessingId(id);
      await aiAbbreviationsApi.reject(id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al rechazar');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCorrect = async (id: number) => {
    if (!editValue.trim()) return;

    try {
      setProcessingId(id);
      await aiAbbreviationsApi.correct(id, editValue.trim());
      setEditingId(null);
      setEditValue('');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al corregir');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddToDictionary = async (id: number) => {
    try {
      setProcessingId(id);
      await aiAbbreviationsApi.addToDictionary(id);
      await loadData();
      onDictionaryUpdated?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al agregar al diccionario');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (!summary || summary.pending === 0) return;

    try {
      setBulkProcessing(true);
      setError(null);
      const result = await aiAbbreviationsApi.bulkApprove({ all_pending: true });
      await loadData();
      // Mostrar mensaje de éxito temporalmente
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al aprobar masivamente');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkAddToDictionary = async () => {
    try {
      setBulkProcessing(true);
      setError(null);
      const result = await aiAbbreviationsApi.bulkAddToDictionary({ all_approved: true });
      await loadData();
      onDictionaryUpdated?.();
      if (result.skipped_count > 0) {
        setError(`${result.added_count} agregados, ${result.skipped_count} ya existían en el diccionario`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al agregar masivamente');
    } finally {
      setBulkProcessing(false);
    }
  };

  const startEditing = (abbr: AIAbbreviation) => {
    setEditingId(abbr.id);
    setEditValue(abbr.abbreviation);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Aprobada
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rechazada
          </span>
        );
      case 'corrected':
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            Corregida
          </span>
        );
      default:
        return null;
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
        <span className="ml-2 text-gray-600 dark:text-gray-300">Cargando sugerencias de IA...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Sugerencias de IA</h3>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:text-purple-200 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-md p-2 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{summary.total}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Total</div>
            </div>
            <div
              className={`rounded-md p-2 text-center shadow-sm cursor-pointer transition-all ${
                statusFilter === 'pending' ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-white dark:bg-gray-800 hover:bg-yellow-50 dark:bg-yellow-900/30'
              }`}
              onClick={() => setStatusFilter('pending')}
            >
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.pending}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Pendientes</div>
            </div>
            <div
              className={`rounded-md p-2 text-center shadow-sm cursor-pointer transition-all ${
                statusFilter === 'approved' ? 'bg-green-100 dark:bg-green-900/50 ring-2 ring-green-400' : 'bg-white dark:bg-gray-800 hover:bg-green-50 dark:bg-green-900/30'
              }`}
              onClick={() => setStatusFilter('approved')}
            >
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.approved}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Aprobadas</div>
            </div>
            <div
              className={`rounded-md p-2 text-center shadow-sm cursor-pointer transition-all ${
                statusFilter === 'rejected' ? 'bg-red-100 dark:bg-red-900/50 ring-2 ring-red-400' : 'bg-white dark:bg-gray-800 hover:bg-red-50 dark:bg-red-900/30'
              }`}
              onClick={() => setStatusFilter('rejected')}
            >
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.rejected}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Rechazadas</div>
            </div>
            <div
              className={`rounded-md p-2 text-center shadow-sm cursor-pointer transition-all ${
                statusFilter === 'corrected' ? 'bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-400' : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30'
              }`}
              onClick={() => setStatusFilter('corrected')}
            >
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.corrected}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Corregidas</div>
            </div>
          </div>
        )}
      </div>

      {/* Acciones masivas */}
      {summary && (summary.pending > 0 || summary.approved > 0 || summary.corrected > 0) && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-300 font-medium self-center mr-2">Acciones masivas:</span>

          {summary.pending > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {bulkProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Aprobar todas ({summary.pending})
            </button>
          )}

          {(summary.approved > 0 || summary.corrected > 0) && (
            <button
              onClick={handleBulkAddToDictionary}
              disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {bulkProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BookPlus className="w-4 h-4" />
              )}
              Agregar todas al diccionario ({summary.approved + summary.corrected})
            </button>
          )}
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Buscar palabra o abreviación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === ''
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600'
          }`}
        >
          Todos
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:text-red-200"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lista de abreviaciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {abbreviations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
            <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay abreviaciones {statusFilter ? `con estado "${statusFilter}"` : ''}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {abbreviations.map((abbr) => (
              <div
                key={abbr.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 transition-colors ${
                  processingId === abbr.id ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">{abbr.original_word}</span>
                      <span className="text-gray-400 dark:text-gray-500">→</span>
                      {editingId === abbr.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="px-2 py-1 border border-purple-300 dark:border-purple-600 rounded text-sm font-mono focus:ring-2 focus:ring-purple-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCorrect(abbr.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                      ) : (
                        <span className="font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                          {abbr.abbreviation}
                        </span>
                      )}
                      {getStatusBadge(abbr.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {abbr.times_used} usos
                      </span>
                      <span>
                        Creada: {new Date(abbr.created_at).toLocaleDateString('es-CO')}
                      </span>
                      {abbr.original_ai_abbreviation && abbr.original_ai_abbreviation !== abbr.abbreviation && (
                        <span className="text-gray-400 dark:text-gray-500">
                          (Original IA: {abbr.original_ai_abbreviation})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    {processingId === abbr.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" />
                    ) : editingId === abbr.id ? (
                      <>
                        <button
                          onClick={() => handleCorrect(abbr.id)}
                          className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:bg-green-900/50 rounded transition-colors"
                          title="Guardar corrección"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded transition-colors"
                          title="Cancelar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {abbr.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(abbr.id)}
                              className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:bg-green-900/50 rounded transition-colors"
                              title="Aprobar"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(abbr.id)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:bg-red-900/50 rounded transition-colors"
                              title="Rechazar"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => startEditing(abbr)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:bg-blue-900/50 rounded transition-colors"
                          title="Corregir"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {(abbr.status === 'approved' || abbr.status === 'corrected') && (
                          <button
                            onClick={() => handleAddToDictionary(abbr.id)}
                            className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-100 rounded transition-colors"
                            title="Agregar al diccionario oficial"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Flujo de trabajo:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-700 dark:text-blue-300">
              <li>La IA genera abreviaciones automáticamente al procesar nombres</li>
              <li>Revisa y aprueba/rechaza/corrige las sugerencias pendientes</li>
              <li>Las aprobadas se agregan al diccionario oficial para consistencia</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
