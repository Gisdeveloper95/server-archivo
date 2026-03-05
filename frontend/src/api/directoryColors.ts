/**
 * API para gestión de colores de directorios personalizados
 *
 * Cada usuario puede asignar colores a los directorios que solo él verá.
 */
import apiClient from './client';

export interface DirectoryColorsResponse {
  success: boolean;
  colors: Record<string, string>;  // path -> color
  count: number;
}

export interface SetColorResponse {
  success: boolean;
  path: string;
  color: string;
  created?: boolean;
}

export interface RemoveColorResponse {
  success: boolean;
  path: string;
  deleted: boolean;
}

export interface BatchColorsResponse {
  success: boolean;
  updated: number;
  errors: string[] | null;
}

export const directoryColorsApi = {
  /**
   * Obtener todos los colores de directorios del usuario actual
   * @param paths - Lista opcional de rutas para filtrar
   */
  getAll: async (paths?: string[]): Promise<Record<string, string>> => {
    const params = paths?.length ? { paths: paths.join(',') } : {};
    const response = await apiClient.get<DirectoryColorsResponse>('/file-ops/directory-colors', { params });
    return response.data.colors || {};
  },

  /**
   * Establecer el color de un directorio
   * @param path - Ruta del directorio
   * @param color - Color en formato hex (#RRGGBB)
   */
  setColor: async (path: string, color: string): Promise<SetColorResponse> => {
    const response = await apiClient.post<SetColorResponse>('/file-ops/set-directory-color', { path, color });
    return response.data;
  },

  /**
   * Eliminar el color de un directorio (vuelve al color por defecto)
   * @param path - Ruta del directorio
   */
  removeColor: async (path: string): Promise<RemoveColorResponse> => {
    const response = await apiClient.post<RemoveColorResponse>('/file-ops/remove-directory-color', { path });
    return response.data;
  },

  /**
   * Establecer colores para múltiples directorios a la vez
   * @param colors - Objeto con path -> color
   */
  setBatch: async (colors: Record<string, string>): Promise<BatchColorsResponse> => {
    const response = await apiClient.post<BatchColorsResponse>('/file-ops/set-directory-colors-batch', { colors });
    return response.data;
  },
};
