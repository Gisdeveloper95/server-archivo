/**
 * API para Sistema de Notificaciones
 */
import apiClient from './client';

// === TIPOS ===

export type NotificationType =
  | 'system'
  | 'trash_expiry'
  | 'permission_expiry'
  | 'path_renamed'
  | 'admin_message'
  | 'user_message'
  | 'support_ticket'
  | 'warning'
  | 'info';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ThreadType = 'warning' | 'info' | 'support' | 'direct';

export type AttachmentFileType = 'image' | 'video' | 'document' | 'other';

export interface MessageAttachment {
  id: number;
  file: string;
  file_url: string;
  download_url: string;  // URL para descargar con nombre original
  original_filename: string;
  file_type: AttachmentFileType;
  file_type_display: string;
  mime_type: string;
  file_size: number;
  file_size_human: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnail: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  recipient: number;
  recipient_username: string;
  thread: number | null;
  notification_type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  related_path: string | null;
  related_object_type: string | null;
  related_object_id: string | null;
  action_url: string | null;
  sender: number | null;
  sender_username: string | null;
  sender_full_name: string | null;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  email_sent: boolean;
  created_at: string;
  expires_at: string | null;
  time_ago: string;
  attachments?: MessageAttachment[];
}

export interface OtherParticipant {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

export interface UserSearchResult {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

export interface MessageThread {
  id: number;
  // Legacy fields
  admin: number;
  admin_username: string;
  admin_full_name: string;
  user: number;
  user_username: string;
  user_full_name: string;
  admin_unread_count: number;
  user_unread_count: number;
  // New fields
  other_participant: OtherParticipant | null;
  my_unread_count: number;
  // Common fields
  subject: string;
  thread_type: ThreadType;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: number | null;
  created_at: string;
  last_message_at: string;
  last_message_preview: string | null;
  message_count: number;
}

export interface MessageThreadDetail extends MessageThread {
  messages: Notification[];
}

export interface NotificationTemplate {
  id: number;
  template_id: string;
  name: string;
  notification_type: NotificationType;
  subject: string;
  message_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export interface UnreadCountResponse {
  unread_count: number;
  by_type: Record<NotificationType, number>;
  has_urgent: boolean;
}

export interface SendNotificationRequest {
  recipient_type: 'user' | 'role' | 'users' | 'all';
  // Campos según recipient_type
  recipient_id?: number;           // Para 'user'
  recipient_role?: string;         // Para 'role'
  recipient_ids?: number[];        // Para 'users'
  // Contenido
  subject: string;
  message: string;
  thread_type?: ThreadType;
  priority?: NotificationPriority;
  allow_reply?: boolean;
  send_email?: boolean;
}

export interface SendNotificationResponse {
  success: boolean;
  notifications_created: number;
  thread_id?: number;
  message: string;
}

// === API CLIENT ===

export const notificationsApi = {
  /**
   * Lista notificaciones del usuario actual
   */
  list: async (params?: {
    page?: number;
    per_page?: number;
    is_read?: boolean;
    notification_type?: NotificationType;
    priority?: NotificationPriority;
    sender_username?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<NotificationListResponse> => {
    const response = await apiClient.get('/notifications/', { params });
    return response.data;
  },

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get('/notifications/unread-count/');
    return response.data;
  },

  /**
   * Obtiene el conteo de hilos de mensajes con mensajes no leídos
   */
  getThreadsUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get('/notifications/threads-unread-count/');
    return response.data;
  },

  /**
   * Marca una notificación como leída
   */
  markAsRead: async (notificationId: number): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/notifications/${notificationId}/mark-read/`);
    return response.data;
  },

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead: async (): Promise<{ success: boolean; marked_count: number }> => {
    const response = await apiClient.post('/notifications/mark-all-read/');
    return response.data;
  },

  /**
   * Archiva (elimina visualmente) una notificación
   */
  archive: async (notificationId: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/notifications/${notificationId}/`);
    return response.data;
  },

  // === HILOS DE MENSAJES ===

  /**
   * Lista hilos de conversación del usuario actual
   */
  listThreads: async (params?: {
    page?: number;
    is_closed?: boolean;
  }): Promise<{ count: number; results: MessageThread[] }> => {
    const response = await apiClient.get('/notifications/threads/', { params });
    return response.data;
  },

  /**
   * Obtiene detalle de un hilo con todos sus mensajes
   */
  getThread: async (threadId: number): Promise<MessageThreadDetail> => {
    const response = await apiClient.get(`/notifications/${threadId}/thread/`);
    return response.data;
  },

  /**
   * Responde en un hilo de conversación
   */
  replyToThread: async (threadId: number, message: string): Promise<{
    success: boolean;
    notification: Notification;
  }> => {
    const response = await apiClient.post(`/notifications/${threadId}/reply/`, { message });
    return response.data;
  },

  // === SOLO SUPERADMIN ===

  /**
   * Envía una notificación/mensaje (solo superadmin)
   */
  send: async (data: SendNotificationRequest): Promise<SendNotificationResponse> => {
    const response = await apiClient.post('/notifications/send/', data);
    return response.data;
  },

  /**
   * Lista todos los hilos del admin (solo superadmin)
   */
  listAdminThreads: async (params?: {
    page?: number;
    is_closed?: boolean;
    user_id?: number;
  }): Promise<{ count: number; results: MessageThread[] }> => {
    const response = await apiClient.get('/notifications/admin/threads/', { params });
    return response.data;
  },

  /**
   * Cierra un hilo de conversación (solo admin)
   */
  closeThread: async (threadId: number): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/notifications/${threadId}/close/`);
    return response.data;
  },

  /**
   * Reabre un hilo de conversación cerrado (solo admin)
   */
  reopenThread: async (threadId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/notifications/${threadId}/reopen/`);
    return response.data;
  },

  /**
   * Lista plantillas de mensajes disponibles (solo superadmin)
   */
  listTemplates: async (): Promise<NotificationTemplate[]> => {
    const response = await apiClient.get('/notifications/templates/');
    return response.data;
  },

  // === MENSAJERÍA ENTRE USUARIOS ===

  /**
   * Busca usuarios para enviarles mensajes
   */
  searchUsers: async (query: string, limit: number = 10): Promise<{ results: UserSearchResult[] }> => {
    const response = await apiClient.get('/notifications/users-search/', {
      params: { q: query, limit },
    });
    return response.data;
  },

  /**
   * Crea un nuevo mensaje directo a otro usuario
   */
  sendDirectMessage: async (data: {
    recipient_id: number;
    subject?: string;
    message: string;
  }): Promise<{
    success: boolean;
    thread_id: number;
    created: boolean;
    notification_id: number;
  }> => {
    const response = await apiClient.post('/notifications/new-message/', data);
    return response.data;
  },

  /**
   * Crea un ticket de soporte
   */
  createSupportTicket: async (data: {
    subject: string;
    message: string;
  }): Promise<{
    success: boolean;
    thread_id: number;
    message: string;
  }> => {
    const response = await apiClient.post('/notifications/support-ticket/', data);
    return response.data;
  },

  /**
   * Obtiene detalle de un hilo por ID (nuevo endpoint)
   */
  getThreadById: async (threadId: number): Promise<MessageThreadDetail> => {
    const response = await apiClient.get(`/notifications/${threadId}/thread/`);
    return response.data;
  },

  // === ARCHIVOS ADJUNTOS ===

  /**
   * Sube un archivo adjunto
   */
  uploadAttachment: async (
    file: File,
    options?: { notificationId?: number; threadId?: number }
  ): Promise<{ success: boolean; attachment: MessageAttachment }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.notificationId) {
      formData.append('notification_id', options.notificationId.toString());
    }
    if (options?.threadId) {
      formData.append('thread_id', options.threadId.toString());
    }
    const response = await apiClient.post('/notifications/upload-attachment/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Responde en un hilo con archivos adjuntos
   */
  replyWithAttachments: async (
    threadId: number,
    message: string,
    files: File[],
    attachmentIds?: number[]
  ): Promise<{ success: boolean; notification: Notification; attachments_count: number }> => {
    const formData = new FormData();
    formData.append('message', message);
    files.forEach((file) => formData.append('files', file));
    if (attachmentIds?.length) {
      formData.append('attachment_ids', JSON.stringify(attachmentIds));
    }
    const response = await apiClient.post(
      `/notifications/${threadId}/reply-with-attachments/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  /**
   * Elimina un archivo adjunto
   */
  deleteAttachment: async (attachmentId: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/notifications/attachment/${attachmentId}/`);
    return response.data;
  },
};

export default notificationsApi;
