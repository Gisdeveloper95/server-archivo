import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle, XCircle, Ban, Clock } from 'lucide-react';
import { groqStatsApi, type GroqPoolSummary } from '../api/groqStats';

export const GroqStatsWidget = () => {
  const [stats, setStats] = useState<GroqPoolSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    // Recargar cada 180 segundos (3 minutos)
    const interval = setInterval(loadStats, 180000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await groqStatsApi.getPoolSummary();
      setStats(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading Groq stats:', err);
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
          <Activity className="w-4 h-4 animate-spin" />
          <span>Cargando stats IA...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // Determinar el color del indicador de salud
  const getHealthColor = () => {
    // Si todas las keys están restringidas, es crítico
    if (stats.restricted_keys >= stats.total_keys) return 'text-red-600 dark:text-red-400';
    // Si hay keys restringidas pero no todas
    if (stats.restricted_keys > 0) return 'text-orange-600';
    // Si hay rate limits activos
    if (stats.rate_limited_keys >= stats.total_keys) return 'text-red-600 dark:text-red-400';
    if (stats.rate_limited_keys > 0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getHealthIcon = () => {
    if (stats.restricted_keys >= stats.total_keys) return Ban;
    if (stats.restricted_keys > 0) return AlertCircle;
    if (stats.rate_limited_keys >= stats.total_keys) return XCircle;
    if (stats.rate_limited_keys > 0) return AlertCircle;
    return CheckCircle;
  };

  const HealthIcon = getHealthIcon();

  // Calcular porcentaje de uso de requests
  const requestUsagePercent = stats.daily_request_limit > 0
    ? ((stats.total_successes_all_keys / stats.daily_request_limit) * 100)
    : 0;

  // Calcular porcentaje de uso de tokens
  const tokenUsagePercent = stats.daily_token_limit > 0
    ? ((stats.total_tokens_all_keys / stats.daily_token_limit) * 100)
    : 0;

  return (
    <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Activity className={`w-4 h-4 ${getHealthColor()}`} />
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            Estado IA Groq
          </h3>
        </div>
        <HealthIcon className={`w-4 h-4 ${getHealthColor()}`} />
      </div>

      {/* Alerta de restricción si todas las keys están bloqueadas */}
      {stats.restricted_keys >= stats.total_keys && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
          <div className="flex items-center gap-2 text-xs text-red-800 dark:text-red-200">
            <Ban className="w-4 h-4 flex-shrink-0" />
            <div>
              <strong>Cuentas restringidas</strong>
              <p className="text-[10px] mt-0.5">Todas las API keys fueron bloqueadas por GROQ. Contacta soporte.</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-300">Tasa de éxito:</span>
          <span className={`font-semibold ${
            stats.overall_success_rate >= 95 ? 'text-green-600 dark:text-green-400' :
            stats.overall_success_rate >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {stats.overall_success_rate.toFixed(1)}%
          </span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-300">Llamadas (hoy):</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {stats.total_successes_all_keys.toLocaleString()}
            <span className="text-gray-400 dark:text-gray-500 text-xs">/{stats.daily_request_limit.toLocaleString()}</span>
          </span>
        </div>

        {/* Barra de progreso de requests */}
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              requestUsagePercent >= 90 ? 'bg-red-500' :
              requestUsagePercent >= 70 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, requestUsagePercent)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-300">Tokens (hoy):</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {stats.total_tokens_all_keys.toLocaleString()}
            <span className="text-gray-400 dark:text-gray-500 text-xs">/{(stats.daily_token_limit / 1000).toFixed(0)}K</span>
          </span>
        </div>

        {/* Barra de progreso de tokens */}
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              tokenUsagePercent >= 90 ? 'bg-red-500' :
              tokenUsagePercent >= 70 ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, tokenUsagePercent)}%` }}
          />
        </div>
      </div>

      {/* API Keys Status */}
      <div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2">
          Estado de API Keys ({stats.active_keys - stats.restricted_keys}/{stats.total_keys} disponibles)
        </div>
        <div className="grid grid-cols-5 gap-1">
          {stats.keys_details.map((key) => {
            const isRestricted = key.is_restricted;
            const isRateLimited = key.is_rate_limited_recently;
            const isInactive = !key.is_active;

            let statusColor = 'bg-green-500';
            let statusTitle = `${key.key_identifier}: Disponible`;

            if (isInactive) {
              statusColor = 'bg-gray-400';
              statusTitle = `${key.key_identifier}: Inactiva`;
            } else if (isRestricted) {
              statusColor = 'bg-red-600';
              statusTitle = `${key.key_identifier}: RESTRINGIDA - ${key.last_error_message || 'Cuenta bloqueada por GROQ'}`;
            } else if (isRateLimited) {
              statusColor = 'bg-yellow-500';
              statusTitle = `${key.key_identifier}: Rate Limited`;
            }

            return (
              <div
                key={key.id}
                className={`h-2 rounded-full ${statusColor}`}
                title={`${statusTitle}\nLlamadas: ${key.total_calls}\nÉxito: ${key.success_rate.toFixed(1)}%`}
              />
            );
          })}
        </div>
      </div>

      {/* Warning if restricted or rate limited */}
      {stats.restricted_keys > 0 && stats.restricted_keys < stats.total_keys && (
        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-xs text-orange-800">
            {stats.restricted_keys} key(s) restringidas por GROQ
          </p>
        </div>
      )}

      {stats.rate_limited_keys > 0 && stats.restricted_keys === 0 && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            {stats.rate_limited_keys} key(s) con límite alcanzado
          </p>
        </div>
      )}

      {/* Reset info */}
      <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
        <Clock className="w-3 h-3" />
        <span>
          Reset diario automático
          {stats.last_reset_date && ` (último: ${stats.last_reset_date})`}
        </span>
      </div>
    </div>
  );
};
