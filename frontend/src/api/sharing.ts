import api from './client';

export interface ShareLink {
  id: number;
  token: string;
  path: string;
  is_directory: boolean;
  permission: 'view' | 'download';
  password: string | null;
  require_email: boolean;
  allowed_domain: string | null;
  created_by: number;
  created_by_username: string;
  created_at: string;
  expires_at: string | null;
  max_downloads: number | null;
  is_active: boolean;
  deactivated_at: string | null;
  deactivated_by: number | null;
  access_count: number;
  download_count: number;
  last_accessed_at: string | null;
  description: string;
  full_url: string;
  is_expired: boolean;
  is_valid: boolean;
}

export interface ShareLinkCreate {
  path: string;
  permission?: 'view' | 'download';
  password?: string;
  require_email?: boolean;
  allowed_domain?: string;
  expires_at?: string;
  max_downloads?: number;
  description?: string;
}

export interface ShareLinkAccess {
  id: number;
  share_link: number;
  share_link_path: string;
  accessed_at: string;
  ip_address: string;
  user_agent: string;
  email_provided: string | null;
  action: string;
  success: boolean;
  error_message: string | null;
}

export interface ShareLinkStats {
  access_count: number;
  download_count: number;
  last_accessed: string | null;
  is_valid: boolean;
  is_expired: boolean;
  recent_accesses: ShareLinkAccess[];
}

/**
 * Listar todos los links compartidos (solo superadmin)
 */
export const listShareLinks = async (): Promise<ShareLink[]> => {
  const response = await api.get('/sharing');
  return response.data;
};

/**
 * Obtener detalles de un link compartido (solo superadmin)
 */
export const getShareLink = async (id: number): Promise<ShareLink> => {
  const response = await api.get(`/sharing/${id}`);
  return response.data;
};

/**
 * Crear nuevo link compartido (solo superadmin)
 */
export const createShareLink = async (data: ShareLinkCreate): Promise<{
  success: boolean;
  share_link: ShareLink;
  url: string;
}> => {
  const response = await api.post('/sharing/create_share', data);
  return response.data;
};

/**
 * Desactivar un link compartido (solo superadmin)
 */
export const deactivateShareLink = async (id: number): Promise<{ success: boolean }> => {
  const response = await api.post(`/sharing/${id}/deactivate`);
  return response.data;
};

/**
 * Obtener estadísticas de un link compartido (solo superadmin)
 */
export const getShareLinkStats = async (id: number): Promise<ShareLinkStats> => {
  const response = await api.get(`/sharing/${id}/stats`);
  return response.data;
};

/**
 * Acceder a un archivo compartido de forma pública (sin autenticación)
 */
export const accessSharedFile = async (
  token: string,
  password?: string,
  email?: string
): Promise<Blob> => {
  const params = new URLSearchParams({ token });
  if (password) params.append('password', password);
  if (email) params.append('email', email);

  const response = await api.get(`/sharing/access?${params.toString()}`, {
    responseType: 'blob'
  });

  return response.data;
};
