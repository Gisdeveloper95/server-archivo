import { type ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  Home,
  FolderOpen,
  Search,
  Users,
  BarChart3,
  Shield,
  Menu,
  X,
  Star,
  Settings,
  Sparkles,
  FileSearch,
  BookOpen,
  Link2,
  Trash2,
  Bell,
  MessageSquare,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeContext } from '../contexts/ThemeContext';
import { AISystemWidget } from './AISystemWidget';
import { NotificationBell } from './NotificationBell';
import { useNotificationStore } from '../store/notificationStore';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Usar el store centralizado (el polling ya lo maneja NotificationBell → startPolling)
  const { unreadMessagesCount: messagesUnreadCount, fetchUnreadMessagesCount } = useNotificationStore();

  // Solo refrescar al salir de la página de mensajes (para actualizar el badge inmediatamente)
  const [prevPath, setPrevPath] = useState(location.pathname);
  useEffect(() => {
    if (prevPath === '/mensajes' && location.pathname !== '/mensajes') {
      fetchUnreadMessagesCount();
    }
    setPrevPath(location.pathname);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: Home, label: 'Inicio', path: '/dashboard' },
    { icon: FolderOpen, label: 'Explorar Archivos', path: '/explorar' },
    { icon: Search, label: 'Búsqueda Global', path: '/buscar' },
    { icon: Star, label: 'Directorios Favoritos', path: '/favoritos' },
    { icon: Bell, label: 'Notificaciones', path: '/notifications' },
    { icon: MessageSquare, label: 'Mensajes', path: '/mensajes' },
    { icon: Shield, label: 'Mis Permisos', path: '/mis-permisos' },
    { icon: Sparkles, label: 'Ayuda de Renombramiento', path: '/ayuda-renombramiento' },
    { icon: BookOpen, label: 'Diccionario', path: '/diccionario' },
  ];

  // SuperAdmin menu
  if (user?.role === 'superadmin') {
    menuItems.push(
      { icon: Settings, label: 'Administración', path: '/administracion' },
      { icon: Link2, label: 'Links Compartidos', path: '/links-compartidos' },
      { icon: Trash2, label: 'Papelera', path: '/papelera' }
    );
  }

  // Admin menu
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    menuItems.push(
      { icon: Users, label: 'Usuarios', path: '/usuarios' },
      { icon: BarChart3, label: 'Estadísticas de Uso', path: '/estadisticas' },
      { icon: FileSearch, label: 'Auditoría', path: '/auditoria' }
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 transition-colors duration-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                NetApp Bridge IGAC
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* User info */}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* Notification Bell */}
              <NotificationBell />

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
            transform transition-all duration-300 ease-in-out lg:transform-none
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            mt-16 lg:mt-0
          `}
        >
          <div className="h-full flex flex-col">
            <nav className="p-4 space-y-2 flex-shrink-0">
              {menuItems.map((item) => {
                const isMessages = item.path === '/mensajes';
                const showBadge = isMessages && messagesUnreadCount > 0;

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left relative"
                  >
                    <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-200 flex-1">{item.label}</span>
                    {showBadge && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                        {messagesUnreadCount > 99 ? '99+' : messagesUnreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Widget de estado del Sistema de IA */}
            <div className="flex-grow overflow-y-auto">
              <AISystemWidget />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden mt-16"
        />
      )}
    </div>
  );
};
