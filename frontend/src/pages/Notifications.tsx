/**
 * Notifications - Página completa de notificaciones
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  ArrowLeft,
  Calendar,
  User,
  Users,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import {
  notificationsApi,
  Notification,
  NotificationType,
  NotificationPriority,
  MessageThread,
  MessageThreadDetail,
} from '../api/notifications';
import { useNotificationStore } from '../store/notificationStore';

// Configuración de iconos y colores por tipo
const notificationConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  system: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/50', label: 'Sistema' },
  trash_expiry: {
    icon: Trash2,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Papelera',
  },
  permission_expiry: {
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100',
    label: 'Permisos',
  },
  path_renamed: {
    icon: FolderEdit,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100',
    label: 'Rutas',
  },
  admin_message: {
    icon: MessageSquare,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/50',
    label: 'Mensaje',
  },
  user_message: {
    icon: MessageSquare,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100',
    label: 'Mensaje Usuario',
  },
  support_ticket: {
    icon: MessageSquare,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    label: 'Soporte',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    label: 'Advertencia',
  },
  info: { icon: Info, color: 'text-gray-600 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700', label: 'Información' },
};

// Interfaz para notificaciones agrupadas por remitente
interface GroupedNotification {
  senderId: number | null;
  senderName: string;
  senderUsername: string;
  notifications: Notification[];
  latestNotification: Notification;
  unreadCount: number;
  isExpanded: boolean;
}

// Función para agrupar notificaciones por remitente
const groupNotificationsBySender = (notifications: Notification[]): GroupedNotification[] => {
  const groups: Map<string, GroupedNotification> = new Map();

  notifications.forEach((notification) => {
    // Clave única por remitente
    const key = notification.sender
      ? `user_${notification.sender}`
      : `system_${notification.notification_type}`;

    if (!groups.has(key)) {
      groups.set(key, {
        senderId: notification.sender,
        senderName: notification.sender_full_name || 'Sistema',
        senderUsername: notification.sender_username || 'system',
        notifications: [],
        latestNotification: notification,
        unreadCount: 0,
        isExpanded: false,
      });
    }

    const group = groups.get(key)!;
    group.notifications.push(notification);
    if (!notification.is_read) {
      group.unreadCount++;
    }
    // Actualizar la notificación más reciente
    if (new Date(notification.created_at) > new Date(group.latestNotification.created_at)) {
      group.latestNotification = notification;
    }
  });

  // Ordenar por fecha de la notificación más reciente
  return Array.from(groups.values()).sort(
    (a, b) =>
      new Date(b.latestNotification.created_at).getTime() -
      new Date(a.latestNotification.created_at).getTime()
  );
};

// Interfaz para opciones de filtro avanzado
interface AdvancedFilters {
  senderUsername: string;
  dateFrom: string;
  dateTo: string;
}

// Componente de filtros
const NotificationFilters: React.FC<{
  filter: 'all' | 'unread' | NotificationType;
  onFilterChange: (filter: 'all' | 'unread' | NotificationType) => void;
  advancedFilters: AdvancedFilters;
  onAdvancedFiltersChange: (filters: AdvancedFilters) => void;
  senderSuggestions: { username: string; fullName: string }[];
  onSearchSender: (query: string) => void;
  isSuperAdmin: boolean;
}> = ({ filter, onFilterChange, advancedFilters, onAdvancedFiltersChange, senderSuggestions, onSearchSender, isSuperAdmin }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [senderSearch, setSenderSearch] = useState('');
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);

  const filters: { value: 'all' | 'unread' | NotificationType; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'unread', label: 'No leídas' },
    { value: 'admin_message', label: 'Mensajes' },
    { value: 'trash_expiry', label: 'Papelera' },
    { value: 'permission_expiry', label: 'Permisos' },
    { value: 'path_renamed', label: 'Rutas' },
    { value: 'warning', label: 'Advertencias' },
  ];

  const hasActiveAdvancedFilters = advancedFilters.senderUsername || advancedFilters.dateFrom || advancedFilters.dateTo;

  const handleSenderSearchChange = (value: string) => {
    setSenderSearch(value);
    onSearchSender(value);
    setShowSenderDropdown(value.length >= 2);
  };

  const handleSelectSender = (username: string) => {
    onAdvancedFiltersChange({ ...advancedFilters, senderUsername: username });
    setSenderSearch('');
    setShowSenderDropdown(false);
  };

  const clearAdvancedFilters = () => {
    onAdvancedFiltersChange({ senderUsername: '', dateFrom: '', dateTo: '' });
    setSenderSearch('');
  };

  return (
    <div className="space-y-4">
      {/* Filtros básicos por tipo */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600'
              }`}
          >
            {f.label}
          </button>
        ))}

        {/* Botón para mostrar filtros avanzados */}
        {isSuperAdmin && (
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1
              ${hasActiveAdvancedFilters
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:bg-gray-600'}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros avanzados
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Filtros avanzados (solo para superadmin) */}
      {showAdvanced && isSuperAdmin && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Filtro por remitente */}
            <div className="flex-1 min-w-[200px] relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Filtrar por remitente
              </label>
              {advancedFilters.senderUsername ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">{advancedFilters.senderUsername}</span>
                  <button
                    onClick={() => onAdvancedFiltersChange({ ...advancedFilters, senderUsername: '' })}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={senderSearch}
                    onChange={(e) => handleSenderSearchChange(e.target.value)}
                    placeholder="Buscar usuario..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500"
                    onFocus={() => senderSearch.length >= 2 && setShowSenderDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSenderDropdown(false), 200)}
                  />
                  {showSenderDropdown && senderSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/50 max-h-48 overflow-auto">
                      {senderSuggestions.map((user) => (
                        <button
                          key={user.username}
                          onClick={() => handleSelectSender(user.username)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 text-sm"
                        >
                          <span className="font-medium">{user.fullName}</span>
                          <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 ml-1">@{user.username}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Filtro por fecha desde */}
            <div className="min-w-[160px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Desde
              </label>
              <input
                type="date"
                value={advancedFilters.dateFrom}
                onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500"
              />
            </div>

            {/* Filtro por fecha hasta */}
            <div className="min-w-[160px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Hasta
              </label>
              <input
                type="date"
                value={advancedFilters.dateTo}
                onChange={(e) => onAdvancedFiltersChange({ ...advancedFilters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500"
              />
            </div>

            {/* Botón limpiar */}
            {hasActiveAdvancedFilters && (
              <button
                onClick={clearAdvancedFilters}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de item de notificación expandido
const NotificationCard: React.FC<{
  notification: Notification;
  onMarkRead: (id: number) => void;
  onArchive: (id: number) => void;
  onOpenThread?: (threadId: number) => void;
}> = ({ notification, onMarkRead, onArchive, onOpenThread }) => {
  const navigate = useNavigate();
  const config = notificationConfig[notification.notification_type] || notificationConfig.info;
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }

    if (notification.thread && onOpenThread) {
      onOpenThread(notification.thread);
    } else if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer
        ${!notification.is_read ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30/30' : 'border-gray-200 dark:border-gray-700'}`}
      onClick={handleClick}
    >
      <div className="flex gap-4">
        {/* Icono */}
        <div className={`p-3 rounded-full ${config.bgColor} flex-shrink-0 h-fit`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color} mb-1`}
              >
                {config.label}
              </span>
              <h3
                className={`text-base font-semibold ${
                  !notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {notification.title}
              </h3>
            </div>
            {!notification.is_read && (
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line">{notification.message}</p>

          {/* Metadata */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
              <span>{notification.time_ago}</span>
              {notification.sender_full_name && (
                <span>De: {notification.sender_full_name}</span>
              )}
              {notification.priority === 'urgent' && (
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded font-medium">
                  Urgente
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {!notification.is_read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(notification.id);
                  }}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded transition-colors"
                  title="Marcar como leída"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(notification.id);
                }}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar un grupo de notificaciones del mismo remitente
const NotificationGroup: React.FC<{
  group: GroupedNotification;
  onMarkRead: (id: number) => void;
  onMarkAllGroupRead: (ids: number[]) => void;
  onArchive: (id: number) => void;
  onOpenThread?: (threadId: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({ group, onMarkRead, onMarkAllGroupRead, onArchive, onOpenThread, isExpanded, onToggleExpand }) => {
  const latestConfig = notificationConfig[group.latestNotification.notification_type] || notificationConfig.info;
  const LatestIcon = latestConfig.icon;

  // Si solo hay una notificación, mostrar como tarjeta simple
  if (group.notifications.length === 1) {
    return (
      <NotificationCard
        notification={group.notifications[0]}
        onMarkRead={onMarkRead}
        onArchive={onArchive}
        onOpenThread={onOpenThread}
      />
    );
  }

  const handleGroupClick = () => {
    onToggleExpand();
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const unreadIds = group.notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      onMarkAllGroupRead(unreadIds);
    }
  };

  return (
    <div className="space-y-2">
      {/* Encabezado del grupo */}
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer
          ${group.unreadCount > 0 ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30/30' : 'border-gray-200 dark:border-gray-700'}`}
        onClick={handleGroupClick}
      >
        <div className="flex gap-4">
          {/* Avatar o icono del remitente */}
          <div className={`p-3 rounded-full ${latestConfig.bgColor} flex-shrink-0 h-fit relative`}>
            {group.senderId ? (
              <Users className={`w-5 h-5 ${latestConfig.color}`} />
            ) : (
              <LatestIcon className={`w-5 h-5 ${latestConfig.color}`} />
            )}
            {/* Badge con cantidad */}
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {group.notifications.length}
            </span>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 dark:text-white">{group.senderName}</span>
                  {group.senderUsername !== 'system' && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">@{group.senderUsername}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {group.latestNotification.message}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {group.unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                    {group.unreadCount} sin leer
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                <span>{group.latestNotification.time_ago}</span>
                <span>{group.notifications.length} mensajes</span>
              </div>

              <div className="flex gap-2">
                {group.unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded transition-colors"
                    title="Marcar todos como leídos"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notificaciones expandidas */}
      {isExpanded && (
        <div className="ml-8 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
          {group.notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
              onArchive={onArchive}
              onOpenThread={onOpenThread}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Componente de vista de hilo (chat)
const ThreadView: React.FC<{
  thread: MessageThreadDetail;
  onBack: () => void;
  onReply: (message: string) => Promise<void>;
}> = ({ thread, onBack, onReply }) => {
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await onReply(replyMessage);
      setReplyMessage('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Header del hilo */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-lg">{thread.subject}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Conversación con {thread.admin_full_name}
              {thread.is_closed && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                  Cerrado
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        {thread.messages.map((msg) => {
          const isAdmin = msg.sender !== null;
          return (
            <div
              key={msg.id}
              className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  isAdmin
                    ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{msg.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    isAdmin ? 'text-gray-400 dark:text-gray-500' : 'text-blue-200'
                  }`}
                >
                  {msg.time_ago}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input de respuesta */}
      {!thread.is_closed && (
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!replyMessage.trim() || isSending}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// Componente principal
export const Notifications: React.FC = () => {
  const { fetchUnreadCount } = useNotificationStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Estado para vista de hilo
  const [selectedThread, setSelectedThread] = useState<MessageThreadDetail | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Estado para filtros avanzados
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    senderUsername: '',
    dateFrom: '',
    dateTo: '',
  });
  const [senderSuggestions, setSenderSuggestions] = useState<{ username: string; fullName: string }[]>([]);

  // Estado para grupos expandidos
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Obtener el rol del usuario del localStorage
  const userRole = useMemo(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.role || '';
      }
    } catch {
      return '';
    }
    return '';
  }, []);
  const isSuperAdmin = userRole === 'superadmin';

  // Cargar notificaciones
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, per_page: 100 }; // Aumentado para mejor agrupación

      if (filter === 'unread') {
        params.is_read = false;
      } else if (filter !== 'all') {
        params.notification_type = filter;
      }

      // Agregar filtros avanzados
      if (advancedFilters.senderUsername) {
        params.sender_username = advancedFilters.senderUsername;
      }
      if (advancedFilters.dateFrom) {
        params.date_from = advancedFilters.dateFrom;
      }
      if (advancedFilters.dateTo) {
        params.date_to = advancedFilters.dateTo;
      }

      const response = await notificationsApi.list(params);
      setNotifications(response.results);
      setTotalCount(response.count);
      setTotalPages(Math.ceil(response.count / 100));
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, page, advancedFilters]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Agrupar notificaciones por remitente
  const groupedNotifications = useMemo(() => {
    return groupNotificationsBySender(notifications);
  }, [notifications]);

  // Buscar usuarios para sugerencias
  const handleSearchSender = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSenderSuggestions([]);
      return;
    }
    try {
      const response = await notificationsApi.searchUsers(query);
      setSenderSuggestions(
        response.results.map((u) => ({
          username: u.username,
          fullName: u.full_name,
        }))
      );
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }, []);

  // Toggle grupo expandido
  const handleToggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Marcar como leída
  const handleMarkRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Marcar múltiples notificaciones como leídas (para grupos)
  const handleMarkAllGroupRead = async (ids: number[]) => {
    try {
      // Marcar cada una como leída
      await Promise.all(ids.map((id) => notificationsApi.markAsRead(id)));
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
      );
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking group as read:', error);
    }
  };

  // Marcar todas como leídas
  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Archivar notificación
  const handleArchive = async (id: number) => {
    try {
      await notificationsApi.archive(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalCount((prev) => prev - 1);
      fetchUnreadCount();
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  // Abrir hilo de conversación
  const handleOpenThread = async (threadId: number) => {
    setIsLoadingThread(true);
    try {
      const thread = await notificationsApi.getThread(threadId);
      setSelectedThread(thread);
    } catch (error) {
      console.error('Error loading thread:', error);
    } finally {
      setIsLoadingThread(false);
    }
  };

  // Responder en hilo
  const handleReplyToThread = async (message: string) => {
    if (!selectedThread) return;

    try {
      const response = await notificationsApi.replyToThread(selectedThread.id, message);
      if (response.success) {
        // Recargar el hilo para ver el nuevo mensaje
        const updatedThread = await notificationsApi.getThread(selectedThread.id);
        setSelectedThread(updatedThread);
      }
    } catch (error) {
      console.error('Error replying to thread:', error);
      throw error;
    }
  };

  // Vista de hilo
  if (selectedThread) {
    return (
      <Layout>
        <ThreadView
          thread={selectedThread}
          onBack={() => setSelectedThread(null)}
          onReply={handleReplyToThread}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-7 h-7" />
              Notificaciones
            </h1>
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              {totalCount} notificación{totalCount !== 1 ? 'es' : ''}
            </p>
          </div>

          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg transition-colors"
          >
            <CheckCheck className="w-5 h-5" />
            Marcar todas como leídas
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Filtrar por:</span>
          </div>
          <NotificationFilters
            filter={filter}
            onFilterChange={(f) => {
              setFilter(f);
              setPage(1);
            }}
            advancedFilters={advancedFilters}
            onAdvancedFiltersChange={(filters) => {
              setAdvancedFilters(filters);
              setPage(1);
            }}
            senderSuggestions={senderSuggestions}
            onSearchSender={handleSearchSender}
            isSuperAdmin={isSuperAdmin}
          />
        </div>

        {/* Resumen de agrupación */}
        {!isLoading && groupedNotifications.length > 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
            Mostrando {groupedNotifications.length} conversación{groupedNotifications.length !== 1 ? 'es' : ''} de {totalCount} notificación{totalCount !== 1 ? 'es' : ''}
          </div>
        )}

        {/* Lista de notificaciones agrupadas */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="mt-3 text-gray-500 dark:text-gray-400 dark:text-gray-500">Cargando notificaciones...</p>
            </div>
          ) : groupedNotifications.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Bell className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No hay notificaciones
              </h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                {filter === 'unread'
                  ? 'No tienes notificaciones sin leer'
                  : advancedFilters.senderUsername || advancedFilters.dateFrom || advancedFilters.dateTo
                  ? 'No hay notificaciones con los filtros seleccionados'
                  : 'No hay notificaciones que mostrar'}
              </p>
            </div>
          ) : (
            groupedNotifications.map((group) => {
              const groupKey = group.senderId
                ? `user_${group.senderId}`
                : `system_${group.latestNotification.notification_type}`;
              return (
                <NotificationGroup
                  key={groupKey}
                  group={group}
                  onMarkRead={handleMarkRead}
                  onMarkAllGroupRead={handleMarkAllGroupRead}
                  onArchive={handleArchive}
                  onOpenThread={handleOpenThread}
                  isExpanded={expandedGroups.has(groupKey)}
                  onToggleExpand={() => handleToggleGroup(groupKey)}
                />
              );
            })
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;
