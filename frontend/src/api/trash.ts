/**
 * API para Papelera de Reciclaje
 */
import apiClient from './client';

export interface TrashItem {
  trash_id: string;
  original_name: string;
  original_path: string;
  is_directory: boolean;
  size_bytes: number;
  size_formatted: string;
  file_count: number;
  dir_count: number;
  mime_type: string | null;
  extension: string | null;
  deleted_by: number;
  deleted_by_username: string;
  deleted_by_full_name: string | null;
  deleted_at: string;
  expires_at: string;
  days_until_expiry: number;
  is_expired: boolean;
  status: string;
  restored_at: string | null;
  restored_by: number | null;
  restored_path: string | null;
  trash_filename: string;
}

export interface TrashStats {
  total_items: number;
  total_size_bytes: number;
  total_size_formatted: string;
  expiring_soon: number;
  by_status: Record<string, number>;
  retention_days: number;
  max_size_gb: number;
  enabled: boolean;
}

export interface TrashConfig {
  id: number;
  max_size_gb: number;
  max_item_size_gb: number;
  retention_days: number;
  auto_cleanup_enabled: boolean;
  updated_at: string;
  updated_by: number | null;
  updated_by_username: string | null;
}

export interface TrashConfigWithUsage {
  config: TrashConfig;
  usage: {
    current_size_bytes: number;
    current_size_formatted: string;
    max_size_bytes: number;
    max_size_formatted: string;
    usage_percent: number;
    total_items: number;
    expiring_soon: number;
  };
}

export interface TrashListResponse {
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
  results: TrashItem[];
}

export interface RestoreOptions {
  conflict_resolution?: 'replace' | 'rename' | 'fail';
  target_path?: string;
}

export interface ShareOptions {
  permission?: 'download' | 'preview';
  expires_hours?: number;
  max_downloads?: number;
  password?: string;
  require_email?: boolean;
}

export const trashApi = {
  /**
   * Lista items en la papelera
   */
  list: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    deleted_by?: number;
    is_directory?: boolean;
    from_date?: string;
    to_date?: string;
  }): Promise<TrashListResponse> => {
    const response = await apiClient.get('/trash/', { params });
    return response.data;
  },

  /**
   * Obtiene items de papelera para una ruta específica
   */
  getByPath: async (path: string): Promise<{ path: string; count: number; results: TrashItem[] }> => {
    const response = await apiClient.get('/trash/by-path/', { params: { path } });
    return response.data;
  },

  /**
   * Obtiene detalle de un item
   */
  get: async (trashId: string): Promise<TrashItem> => {
    const response = await apiClient.get(`/trash/${trashId}/`);
    return response.data;
  },

  /**
   * Restaura un item desde la papelera
   */
  restore: async (trashId: string, options?: RestoreOptions): Promise<{
    success: boolean;
    restored_path?: string;
    message?: string;
    error?: string;
    conflict?: boolean;
  }> => {
    const response = await apiClient.post(`/trash/${trashId}/restore/`, options || {});
    return response.data;
  },

  /**
   * Elimina permanentemente un item
   */
  deletePermanently: async (trashId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => {
    const response = await apiClient.delete(`/trash/${trashId}/`);
    return response.data;
  },

  /**
   * Obtiene estadísticas de la papelera
   */
  getStats: async (): Promise<TrashStats> => {
    const response = await apiClient.get('/trash/stats/');
    return response.data;
  },

  /**
   * Limpia items expirados
   */
  cleanup: async (): Promise<{
    success: boolean;
    cleaned_count: number;
    cleaned_size: number;
    cleaned_size_formatted: string;
    errors?: string[];
  }> => {
    const response = await apiClient.delete('/trash/cleanup/');
    return response.data;
  },

  /**
   * Genera un link de descarga para un item en papelera
   */
  share: async (trashId: string, options?: ShareOptions): Promise<{
    success: boolean;
    share_url?: string;
    token?: string;
    expires_at?: string;
    error?: string;
  }> => {
    const response = await apiClient.post(`/trash/${trashId}/share/`, options || {
      permission: 'download',
      expires_hours: 24
    });
    return response.data;
  },

  /**
   * Obtiene el contenido/árbol de un item en papelera
   */
  getContents: async (trashId: string): Promise<{
    success: boolean;
    is_directory: boolean;
    original_name: string;
    size_bytes: number;
    size_formatted: string;
    file_count?: number;
    dir_count?: number;
    mime_type?: string | null;
    file_hash?: string | null;
    contents?: Array<{
      name: string;
      path: string;
      is_directory: boolean;
      size_bytes: number;
      size_formatted: string;
      modified_time?: number;
    }>;
    tree?: Array<{
      name: string;
      path: string;
      is_directory: boolean;
      size_bytes: number;
      size_formatted: string;
      depth: number;
    }>;
    error?: string;
  }> => {
    const response = await apiClient.get(`/trash/${trashId}/contents/`);
    return response.data;
  },

  /**
   * Obtiene la configuración de la papelera (solo superadmin)
   */
  getConfig: async (): Promise<TrashConfigWithUsage> => {
    const response = await apiClient.get('/trash/config/');
    return response.data;
  },

  /**
   * Actualiza la configuración de la papelera (solo superadmin)
   */
  updateConfig: async (config: Partial<Pick<TrashConfig, 'max_size_gb' | 'max_item_size_gb' | 'retention_days' | 'auto_cleanup_enabled'>>): Promise<{
    success: boolean;
    config: TrashConfig;
    items_deleted: number;
    message: string;
  }> => {
    const response = await apiClient.patch('/trash/config/update/', config);
    return response.data;
  },
};

export default trashApi;
