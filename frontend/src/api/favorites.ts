/**
 * API para gestión de favoritos
 */
import apiClient from './client';

export interface Favorite {
  id: number;
  path: string;
  name: string;
  description?: string;
  color: string;
  order: number;
  created_at: string;
  access_count: number;
  last_accessed: string | null;
}

export interface CreateFavoriteRequest {
  path: string;
  name: string;
  description?: string;
  color?: string;
}

export const favoritesApi = {
  /**
   * Listar favoritos del usuario actual
   */
  list: async (): Promise<Favorite[]> => {
    const response = await apiClient.get<{ results?: Favorite[]; count?: number } | Favorite[]>('/favorites');
    // DRF puede devolver paginado {results: [...], count: N} o array directo
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results || [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Agregar un favorito
   */
  create: async (data: CreateFavoriteRequest): Promise<Favorite> => {
    console.log('[DEBUG favoritesApi.create] Datos a enviar:', data);
    try {
      const response = await apiClient.post<Favorite>('/favorites', data);
      console.log('[DEBUG favoritesApi.create] Respuesta:', response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DEBUG favoritesApi.create] Error:', error.response?.status, error.response?.data, error.message);
      throw error;
    }
  },

  /**
   * Eliminar un favorito
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/favorites/${id}`);
  },

  /**
   * Registrar acceso a un favorito
   */
  access: async (id: number): Promise<any> => {
    const response = await apiClient.post(`/favorites/${id}/access`);
    return response.data;
  },

  /**
   * Reordenar favoritos
   */
  reorder: async (order: Array<{ id: number; order: number }>): Promise<any> => {
    const response = await apiClient.post('/favorites/reorder', { order });
    return response.data;
  },

  /**
   * Actualizar color de un favorito
   */
  updateColor: async (id: number, color: string): Promise<Favorite> => {
    const response = await apiClient.patch<Favorite>(`/favorites/${id}`, { color });
    return response.data;
  },

  /**
   * Actualizar nombre y/o descripción de un favorito
   */
  update: async (id: number, data: { name?: string; description?: string }): Promise<Favorite> => {
    const response = await apiClient.patch<Favorite>(`/favorites/${id}`, data);
    return response.data;
  },
};
