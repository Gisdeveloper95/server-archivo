/**
 * Widget que muestra el estado del sistema híbrido de IA
 * Prioridad: Caché -> Ollama Local -> GROQ Cloud -> Algoritmo
 */
import { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Server,
  Cloud,
  Database,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { groqStatsApi, type AISystemStatus } from '../api/groqStats';

export const AISystemWidget = () => {
  const [status, setStatus] = useState<AISystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    // Recargar cada 60 segundos
    const interval = setInterval(loadStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await groqStatsApi.getAISystemStatus();
      setStatus(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading AI system status:', err);
      setError('Error al cargar estado');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Activity className="w-4 h-4 animate-spin" />
          <span>Cargando estado IA...</span>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  // Determinar colores según estado
  const getOverallColor = () => {
    switch (status.overall_status) {
      case 'optimal':
        return 'text-green-600 dark:text-green-400';
      case 'degraded':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'fallback':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (available: boolean) => {
    return available ? (
      <CheckCircle className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
    ) : (
      <XCircle className="w-3.5 h-3.5 text-red-400 dark:text-red-500" />
    );
  };

  const getBackendIcon = (backend: string) => {
    switch (backend) {
      case 'ollama':
        return <Server className="w-3.5 h-3.5" />;
      case 'groq':
        return <Cloud className="w-3.5 h-3.5" />;
      case 'algorithmic':
        return <Cpu className="w-3.5 h-3.5" />;
      default:
        return <Activity className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Activity className={`w-4 h-4 ${getOverallColor()}`} />
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Sistema IA
          </h3>
        </div>
        <button
          onClick={loadStatus}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Estado general */}
      <div className={`mb-3 p-2 rounded-md ${
        status.overall_status === 'optimal' ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' :
        status.overall_status === 'degraded' ? 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800' :
        'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-center gap-2">
          {status.overall_status === 'optimal' ? (
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          ) : status.overall_status === 'degraded' ? (
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <div>
            <p className={`text-xs font-medium ${
              status.overall_status === 'optimal' ? 'text-green-800 dark:text-green-300' :
              status.overall_status === 'degraded' ? 'text-yellow-800 dark:text-yellow-300' :
              'text-red-800 dark:text-red-300'
            }`}>
              {status.overall_message}
            </p>
          </div>
        </div>
      </div>

      {/* Backends */}
      <div className="space-y-2 mb-3">
        {/* Ollama Local */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-gray-600 dark:text-gray-400">Ollama Local</span>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(status.ollama.available)}
            <span className={status.ollama.available ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'}>
              {status.ollama.available ? status.ollama.model : 'No disponible'}
            </span>
          </div>
        </div>

        {/* GROQ Cloud */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-600 dark:text-gray-400">GROQ Cloud</span>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(status.groq.available)}
            <span className={status.groq.available ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-gray-500'}>
              {status.groq.available
                ? `${status.groq.active_keys}/${status.groq.total_keys} keys`
                : status.groq.all_restricted
                  ? 'Restringido'
                  : 'No disponible'}
            </span>
          </div>
        </div>
      </div>

      {/* Caché de abreviaciones */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-2 mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Database className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Caché IA</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Palabras:</span>
            <span className="ml-1 font-medium text-slate-700 dark:text-slate-300">{status.cache.total_cached}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Usos:</span>
            <span className="ml-1 font-medium text-slate-700 dark:text-slate-300">{status.cache.total_uses}</span>
          </div>
        </div>
        {status.cache.pending_review > 0 && (
          <div className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400">
            {status.cache.pending_review} pendientes de revisión
          </div>
        )}
      </div>

      {/* Orden de prioridad */}
      <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
        <span>Prioridad:</span>
        {status.priority_order.map((backend, idx) => (
          <span key={backend} className="flex items-center gap-0.5">
            {idx > 0 && <span className="text-gray-300 dark:text-gray-600">→</span>}
            <span className={`px-1 py-0.5 rounded ${
              backend === status.primary_backend
                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 font-medium'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {backend === 'cache' ? 'Caché' :
               backend === 'ollama' ? 'Ollama' :
               backend === 'groq' ? 'GROQ' : 'Algo'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};
