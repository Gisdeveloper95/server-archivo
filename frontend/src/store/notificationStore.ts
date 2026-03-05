/**
 * Store de Zustand para gestión de notificaciones
 */
import { create } from 'zustand';
import { notificationsApi, Notification, NotificationType, UnreadCountResponse } from '../api/notifications';

interface NotificationState {
  // Estado
  notifications: Notification[];
  unreadCount: number;
  unreadByType: Record<NotificationType, number>;
  hasUrgent: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;

  // Conteo de mensajes/hilos no leídos
  unreadMessagesCount: number;

  // Configuración de polling
  pollingInterval: number; // ms
  isPollingActive: boolean;

  // Acciones
  fetchNotifications: (forceRefresh?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  fetchUnreadMessagesCount: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (notificationId: number) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  clearError: () => void;
}

// Intervalo de polling en milisegundos (30 segundos)
const DEFAULT_POLLING_INTERVAL = 30000;

// Cache de 10 segundos para evitar requests excesivos
const CACHE_DURATION = 10000;

let pollingTimer: ReturnType<typeof setInterval> | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Estado inicial
  notifications: [],
  unreadCount: 0,
  unreadByType: {} as Record<NotificationType, number>,
  hasUrgent: false,
  isLoading: false,
  error: null,
  lastFetch: null,
  unreadMessagesCount: 0,
  pollingInterval: DEFAULT_POLLING_INTERVAL,
  isPollingActive: false,

  // Fetch de notificaciones recientes (para dropdown)
  fetchNotifications: async (forceRefresh = false) => {
    const state = get();

    // Usar cache si no forzamos refresh
    if (!forceRefresh && state.lastFetch && Date.now() - state.lastFetch < CACHE_DURATION) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await notificationsApi.list({ per_page: 10 });
      set({
        notifications: response.results,
        isLoading: false,
        lastFetch: Date.now(),
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({
        error: 'Error al cargar notificaciones',
        isLoading: false,
      });
    }
  },

  // Fetch solo del conteo de no leídas (más ligero)
  fetchUnreadCount: async () => {
    try {
      const response: UnreadCountResponse = await notificationsApi.getUnreadCount();
      set({
        unreadCount: response.unread_count,
        unreadByType: response.by_type,
        hasUrgent: response.has_urgent,
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // No setear error aquí para no interrumpir la UX
    }
  },

  // Fetch conteo de hilos de mensajes con mensajes no leídos
  fetchUnreadMessagesCount: async () => {
    try {
      const response = await notificationsApi.getThreadsUnreadCount();
      set({ unreadMessagesCount: response.count });
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
    }
  },

  // Marcar una notificación como leída
  markAsRead: async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);

      // Actualizar estado local
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Marcar todas como leídas
  markAllAsRead: async () => {
    try {
      const response = await notificationsApi.markAllAsRead();

      if (response.success) {
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            is_read: true,
            read_at: new Date().toISOString(),
          })),
          unreadCount: 0,
          unreadByType: {} as Record<NotificationType, number>,
          hasUrgent: false,
        }));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },

  // Archivar notificación
  archiveNotification: async (notificationId: number) => {
    try {
      await notificationsApi.archive(notificationId);

      // Remover de la lista local
      set((state) => {
        const notification = state.notifications.find((n) => n.id === notificationId);
        const wasUnread = notification && !notification.is_read;

        return {
          notifications: state.notifications.filter((n) => n.id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  },

  // Iniciar polling
  startPolling: () => {
    const state = get();

    if (state.isPollingActive) return;

    set({ isPollingActive: true });

    // Fetch inicial de notificaciones y mensajes
    get().fetchUnreadCount();
    get().fetchUnreadMessagesCount();

    // Configurar interval para ambos conteos
    pollingTimer = setInterval(() => {
      get().fetchUnreadCount();
      get().fetchUnreadMessagesCount();
    }, state.pollingInterval);
  },

  // Detener polling
  stopPolling: () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    set({ isPollingActive: false });
  },

  // Limpiar error
  clearError: () => set({ error: null }),
}));

// Hook para usar las notificaciones con auto-cleanup
export const useNotifications = () => {
  const store = useNotificationStore();
  return store;
};

export default useNotificationStore;
