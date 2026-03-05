import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Search,
  BarChart3,
  Shield,
  HardDrive,
  Folder,
  Download,
  TrendingUp,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import { statsApi } from '../api';
import type { StatsOverview } from '../types';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StatsOverview | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      if (user?.role === 'admin' || user?.role === 'superadmin') {
        const response = await statsApi.getOverview();
        if (response.success) {
          setStats(response.data);
        }
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const quickAccessItems = [
    {
      icon: FolderOpen,
      label: 'Explorar Archivos',
      description: 'Navega por el sistema de archivos',
      color: 'blue',
      path: '/explorar',
    },
    {
      icon: Search,
      label: 'Búsqueda Global',
      description: 'Busca archivos en todo el sistema',
      color: 'green',
      path: '/buscar',
    },
    {
      icon: Shield,
      label: 'Mis Permisos',
      description: 'Ver tus rutas de acceso',
      color: 'purple',
      path: '/mis-permisos',
    },
  ];

  if (user?.role === 'admin' || user?.role === 'superadmin') {
    quickAccessItems.push({
      icon: BarChart3,
      label: 'Estadísticas',
      description: 'Ver estadísticas del sistema',
      color: 'orange',
      path: '/estadisticas',
    });
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/70',
      green: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/70',
      purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/70',
      orange: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/70',
    };
    return colors[color] || colors.blue;
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Bienvenido, {user?.full_name}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Sistema de Gestión de Archivos - Instituto Geográfico Agustín Codazzi
          </p>
        </div>

        {/* Statistics cards - Only for admin/superadmin */}
        {(user?.role === 'admin' || user?.role === 'superadmin') && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Archivos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total_files.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <HardDrive className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Directorios</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total_directories.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                  <Folder className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Espacio Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total_size_formatted}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Descargas Hoy</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total_downloads_today}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Download className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick access */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Accesos Rápidos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickAccessItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  p-6 rounded-lg transition-all duration-200
                  transform hover:scale-105 hover:shadow-lg dark:shadow-gray-900/50
                  ${getColorClasses(item.color)}
                `}
              >
                <div className="flex items-center space-x-4">
                  <item.icon className="w-12 h-12" />
                  <div className="text-left">
                    <h4 className="font-bold text-lg">{item.label}</h4>
                    <p className="text-sm opacity-80">{item.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Información del Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Usuario:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">{user?.username}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Rol:</span>{' '}
              <span className="font-medium capitalize text-gray-900 dark:text-white">{user?.role}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Email:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">{user?.email}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Estado:</span>{' '}
              <span className="text-green-600 dark:text-green-400 font-medium">Activo</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
