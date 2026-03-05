import { useEffect, useState } from 'react';
import { BarChart3, Loader2, HardDrive, Folder, Download, Search } from 'lucide-react';
import { Layout } from '../components/Layout';
import { statsApi } from '../api';
import type { StatsOverview } from '../types';

export const Statistics = () => {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await statsApi.getOverview();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-6">
            <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Estadísticas del Sistema</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Overview cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Total Archivos</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {stats.total_files.toLocaleString()}
                      </p>
                    </div>
                    <HardDrive className="w-12 h-12 text-blue-600 dark:text-blue-400 opacity-50" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium mb-1">Directorios</p>
                      <p className="text-3xl font-bold text-yellow-900">
                        {stats.total_directories.toLocaleString()}
                      </p>
                    </div>
                    <Folder className="w-12 h-12 text-yellow-600 dark:text-yellow-400 opacity-50" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Espacio Total</p>
                      <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                        {stats.total_size_formatted}
                      </p>
                    </div>
                    <HardDrive className="w-12 h-12 text-purple-600 dark:text-purple-400 opacity-50" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">Descargas Hoy</p>
                      <p className="text-3xl font-bold text-green-900 dark:text-green-200">
                        {stats.total_downloads_today}
                      </p>
                    </div>
                    <Download className="w-12 h-12 text-green-600 dark:text-green-400 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Users stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Usuarios</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_users}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Usuarios Activos</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active_users}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Usuarios Pendientes</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pending_users}</p>
                </div>
              </div>

              {/* Activity stats */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Actividad del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                      <Download className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Descargas Hoy</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {stats.total_downloads_today}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <Search className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Búsquedas Hoy</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {stats.total_searches_today}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last update */}
              <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 text-center">
                Última actualización: {new Date(stats.last_updated).toLocaleString('es-CO')}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
};
