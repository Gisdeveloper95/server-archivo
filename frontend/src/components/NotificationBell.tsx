/**
 * NotificationBell - Componente de campana de notificaciones con dropdown
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  AlertTriangle,
  Info,
  MessageSquare,
  FolderEdit,
  X,
  ChevronRight,
} from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { Notification, NotificationType } from '../api/notifications';

// Configuración de iconos y colores por tipo
const notificationConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  system: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/50' },
  trash_expiry: { icon: Trash2, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/50' },
  permission_expiry: { icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/50' },
  path_renamed: { icon: FolderEdit, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/50' },
  admin_message: { icon: MessageSquare, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/50' },
  user_message: { icon: MessageSquare, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/50' },
  support_ticket: { icon: MessageSquare, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/50' },
  warning: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/50' },
  info: { icon: Info, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700' },
};

// Interfaz para notificaciones agrupadas por usuario
interface GroupedNotification {
  senderId: number | null;
  senderName: string;
  senderUsername: string;
  latestNotification: Notification;
  count: number;
  unreadCount: number;
  latestMessage: string;
}

// Función para agrupar notificaciones por remitente
const groupNotificationsBySender = (notifications: Notification[]): GroupedNotification[] => {
  const groups: Record<string, GroupedNotification> = {};

  notifications.forEach((notif) => {
    // Usar sender_id o 'system' para notificaciones del sistema
    const key = notif.sender ? `user_${notif.sender}` : `system_${notif.notification_type}`;

    if (!groups[key]) {
      groups[key] = {
        senderId: notif.sender,
        senderName: notif.sender_full_name || notif.sender_username || 'Sistema',
        senderUsername: notif.sender_username || 'system',
        latestNotification: notif,
        count: 1,
        unreadCount: notif.is_read ? 0 : 1,
        latestMessage: notif.message,
      };
    } else {
      groups[key].count++;
      if (!notif.is_read) groups[key].unreadCount++;
      // Mantener el mensaje más reciente
      if (new Date(notif.created_at) > new Date(groups[key].latestNotification.created_at)) {
        groups[key].latestNotification = notif;
        groups[key].latestMessage = notif.message;
      }
    }
  });

  // Ordenar por fecha del último mensaje
  return Object.values(groups).sort(
    (a, b) => new Date(b.latestNotification.created_at).getTime() - new Date(a.latestNotification.created_at).getTime()
  );
};

// Componente de item de notificación agrupado por usuario
const GroupedNotificationItem: React.FC<{
  group: GroupedNotification;
  onClick: () => void;
}> = ({ group, onClick }) => {
  const config = notificationConfig[group.latestNotification.notification_type] || notificationConfig.info;
  const Icon = config.icon;
  const hasUnread = group.unreadCount > 0;

  // Iniciales del remitente
  const initials = group.senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all
        ${hasUnread ? 'bg-blue-50/60 dark:bg-blue-900/30 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Avatar con iniciales */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs
              ${hasUnread ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600'}`}
          >
            {group.senderId ? initials : <Icon className="w-4 h-4" />}
          </div>
          {/* Badge de tipo en esquina */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 ${config.bgColor}`}>
            <Icon className={`w-2 h-2 ${config.color}`} />
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Primera línea: Nombre + Badge de no leídos */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
                {group.senderName}
              </h4>
              {group.unreadCount > 0 && (
                <span className="flex-shrink-0 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full font-bold min-w-[18px] text-center">
                  {group.unreadCount}
                </span>
              )}
            </div>
            <span className={`text-xs flex-shrink-0 ${hasUnread ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
              {group.latestNotification.time_ago}
            </span>
          </div>

          {/* Segunda línea: Asunto/Título */}
          <p className={`text-xs mt-0.5 truncate ${hasUnread ? 'font-semibold text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
            {group.latestNotification.title}
          </p>

          {/* Tercera línea: Preview del último mensaje */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate italic">
            "{group.latestMessage.slice(0, 60)}{group.latestMessage.length > 60 ? '...' : ''}"
          </p>

          {/* Indicador si hay más mensajes */}
          {group.count > 1 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              +{group.count - 1} mensaje{group.count > 2 ? 's' : ''} más
            </p>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 self-center" />
      </div>
    </div>
  );
};

// Componente principal
export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    unreadMessagesCount,
    hasUrgent,
    isLoading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    startPolling,
    stopPolling,
  } = useNotificationStore();

  // Total de items no leídos (notificaciones + mensajes)
  const totalUnread = unreadCount + unreadMessagesCount;

  // Iniciar polling al montar
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Cargar notificaciones cuando se abre el dropdown
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen, fetchNotifications]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como leída
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navegar si hay action_url
    if (notification.action_url) {
      navigate(notification.action_url);
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    await fetchUnreadCount();
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  // Icono de campana (animado si hay notificaciones urgentes o mensajes no leídos)
  const BellIcon = hasUrgent || unreadMessagesCount > 0 ? BellRing : Bell;
  const hasMessages = unreadMessagesCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors
          ${isOpen ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
          ${hasUrgent || hasMessages ? 'animate-pulse' : ''}`}
        aria-label="Notificaciones"
      >
        <BellIcon
          className={`w-5 h-5 ${hasUrgent ? 'text-red-600 dark:text-red-400' : hasMessages ? 'text-orange-500 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'}`}
        />

        {/* Badge de conteo - color más llamativo cuando hay mensajes */}
        {totalUnread > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center
              text-xs font-bold text-white rounded-full px-1 shadow-lg
              ${hasUrgent ? 'bg-red-500 animate-bounce' : hasMessages ? 'bg-orange-500' : 'bg-blue-500'}`}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}

        {/* Indicador adicional de mensajes no leídos (punto verde) */}
        {hasMessages && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas como leídas
                </button>
              )}
            </div>
            {/* Indicador de mensajes no leídos */}
            {unreadMessagesCount > 0 && (
              <div
                onClick={() => { setIsOpen(false); navigate('/messages'); }}
                className="mt-2 flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm text-orange-700 dark:text-orange-300 flex-1">
                  Tienes <strong>{unreadMessagesCount}</strong> {unreadMessagesCount === 1 ? 'conversación' : 'conversaciones'} con mensajes nuevos
                </span>
                <ChevronRight className="w-4 h-4 text-orange-400" />
              </div>
            )}
          </div>

          {/* Lista de notificaciones agrupadas por usuario */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-sm">Cargando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              // Agrupar notificaciones por usuario y mostrar máximo 5 grupos
              groupNotificationsBySender(notifications).slice(0, 5).map((group) => (
                <GroupedNotificationItem
                  key={`group_${group.senderId || group.latestNotification.notification_type}`}
                  group={group}
                  onClick={() => handleNotificationClick(group.latestNotification)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={handleViewAll}
                className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center justify-center gap-1"
              >
                Ver todas las notificaciones
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
