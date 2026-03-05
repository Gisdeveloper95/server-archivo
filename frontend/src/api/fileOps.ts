/**
 * API para operaciones de archivos con NetApp (nuevo)
 */
import apiClient from './client';
import { AxiosError } from 'axios';

/**
 * Helper para reintentar operaciones con backoff exponencial
 * Útil para conexiones inestables (VPN, red lenta)
 */
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Determinar si es un error de conexión que vale la pena reintentar
      const isNetworkError = isConnectionError(error);

      // No reintentar si no es error de red o si es el último intento
      if (!isNetworkError || attempt === maxRetries) {
        throw error;
      }

      // Esperar antes de reintentar (backoff exponencial)
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️ Error de conexión, reintentando en ${delay}ms... (intento ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Detecta si un error es de conexión/red
 */
const isConnectionError = (error: any): boolean => {
  if (!error) return false;

  // Errores de Axios sin respuesta (network error)
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
    return true;
  }

  // Error de timeout
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return true;
  }

  // Sin respuesta del servidor
  if (error.response === undefined && error.request) {
    return true;
  }

  // Errores HTTP de servidor (5xx) - pueden ser temporales
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }

  // Error genérico de conexión
  if (error.message?.toLowerCase().includes('network') ||
      error.message?.toLowerCase().includes('connection') ||
      error.message?.toLowerCase().includes('failed to fetch')) {
    return true;
  }

  return false;
};

/**
 * Obtiene un mensaje de error amigable para el usuario
 */
export const getConnectionErrorMessage = (error: any): string => {
  if (isConnectionError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return '❌ Error de conexión. Verifique su conexión a internet/VPN e intente de nuevo.';
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return '⏱️ La operación tardó demasiado. Verifique su conexión y vuelva a intentar.';
    }
    if (error.response?.status >= 500) {
      return '🔧 Error temporal del servidor. Intente de nuevo en unos segundos.';
    }
    return '🌐 Problema de conexión detectado. Verifique su red/VPN e intente nuevamente.';
  }

  // Error normal del backend
  return error.response?.data?.error ||
         error.response?.data?.message ||
         error.message ||
         'Error desconocido';
};

export interface SuggestNameRequest {
  original_name: string;
  current_path: string;
  extension?: string;
  use_dictionary?: boolean; // true = enforce dictionary, false = allow any words
}

export interface SuggestNameResponse {
  suggested_name: string;
  suggested_base: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    original_name: string;
    original_length: number;
    suggested_length: number;
    path_length: number;
    available_chars: number;
    ai_model: string;
    used_fallback: boolean;
    dictionary_warnings?: boolean;
  };
}

export interface ValidateNameRequest {
  name: string;
  current_path: string;
  extension?: string;
}

export interface ValidateNameResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  name: string;
}

export interface PathInfoResponse {
  path: string;
  extension: string;
  available_chars: number;
  max_name_length: number;
  path_length: number;
  full_path_preview?: string;
  base_path_length?: number;
}

export const fileOpsApi = {
  /**
   * Sugerir nombre de archivo usando GROQ AI
   */
  suggestName: async (data: SuggestNameRequest): Promise<SuggestNameResponse> => {
    const response = await apiClient.post<SuggestNameResponse>(
      '/file-ops/suggest_name',
      data
    );
    return response.data;
  },

  /**
   * Validar nombre de archivo/directorio
   */
  validateName: async (data: ValidateNameRequest): Promise<ValidateNameResponse> => {
    const response = await apiClient.post<ValidateNameResponse>(
      '/file-ops/validate-name',
      data
    );
    return response.data;
  },

  /**
   * Obtener información de caracteres disponibles
   */
  getPathInfo: async (path: string, extension?: string): Promise<PathInfoResponse> => {
    const response = await apiClient.get<PathInfoResponse>('/file-ops/path_info', {
      params: { path, extension },
    });
    return response.data;
  },

  /**
   * Obtener información detallada de un directorio
   */
  getFolderDetails: async (path: string): Promise<any> => {
    const response = await apiClient.get('/file-ops/folder_details', {
      params: { path },
    });
    return response.data;
  },

  /**
   * Obtener información detallada de un archivo
   */
  getFileDetails: async (path: string): Promise<any> => {
    const response = await apiClient.get('/file-ops/file_details', {
      params: { path },
    });
    return response.data;
  },

  /**
   * Subir archivo (con retry automático para conexiones inestables)
   */
  uploadFile: async (path: string, file: File, customFilename?: string): Promise<any> => {
    return withRetry(async () => {
      const formData = new FormData();
      formData.append('path', path);
      formData.append('file', file);
      if (customFilename) {
        formData.append('filename', customFilename);
      }

      const response = await apiClient.post('/file-ops/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutos para archivos grandes
      });
      return response.data;
    }, 2, 1000); // 2 reintentos con 1s base delay
  },

  /**
   * Crear carpeta
   */
  createFolder: async (path: string, name: string): Promise<any> => {
    const response = await apiClient.post('/file-ops/create_folder', {
      path,
      name,
    });
    return response.data;
  },

  /**
   * Renombrar archivo/directorio
   */
  rename: async (data: { old_path: string; new_name: string }): Promise<any> => {
    const response = await apiClient.post('/file-ops/rename', data);
    return response.data;
  },

  /**
   * Previsualizar eliminación de directorio
   * Escanea y retorna lista detallada de lo que se eliminará
   */
  previewDelete: async (path: string): Promise<{
    is_directory: boolean;
    directory_name?: string;
    directory_path?: string;
    item?: {
      name: string;
      path: string;
      size: number;
      size_formatted: string;
    };
    summary: {
      total_items_display: number;
      total_files_display: number;
      total_directories_display: number;
      total_items_real: number;
      total_files_real: number;
      total_directories_real: number;
      total_size_bytes: number;
      total_size_formatted: string;
      scan_time_seconds: number;
      geospatial_groups_count: number;
      geospatial_groups: Record<string, {
        type: string;
        path: string;
        size: number;
        size_formatted?: string;
        components?: string[];
        component_count?: number;
      }>;
      top_extensions: Record<string, number>;
      items: Array<{
        name: string;
        path: string;
        full_path: string;
        type: string;
        extension: string | null;
        size: number;
        size_formatted: string;
        modified: string | null;
        is_directory: boolean;
        is_grouped: boolean;
        grouped_type: string | null;
      }>;
      has_more: boolean;
    };
    can_delete: boolean;
    scan_time_seconds?: number;
  }> => {
    const response = await apiClient.post('/file-ops/preview-delete', { path });
    return response.data;
  },

  /**
   * Eliminar archivo/directorio
   */
  delete: async (path: string, confirm: boolean = true): Promise<{
    message: string;
    deleted_items_count?: number;
    total_size_formatted?: string;
  }> => {
    const response = await apiClient.post('/file-ops/delete', {
      path,
      confirm,
    });
    return response.data;
  },

  /**
   * Eliminar múltiples archivos/directorios
   */
  deleteBatch: async (paths: string[]): Promise<{
    message: string;
    success: Array<{ path: string; name: string; is_directory: boolean; backed_up: boolean }>;
    failed: Array<{ path: string; name?: string; error: string }>;
    total_requested: number;
    total_deleted: number;
    total_failed: number;
  }> => {
    const response = await apiClient.post('/file-ops/delete-batch', {
      paths,
      confirm: true,
    });
    return response.data;
  },

  /**
   * Navegar directorio
   */
  browse: async (path: string): Promise<any> => {
    const response = await apiClient.get('/file-ops/browse', {
      params: { path },
    });
    return response.data;
  },

  /**
   * Buscar archivos
   */
  search: async (path: string, query: string, recursive: boolean = false): Promise<any> => {
    const response = await apiClient.get('/file-ops/search', {
      params: { path, query, recursive },
    });
    return response.data;
  },

  /**
   * Descargar carpeta como ZIP
   */
  downloadFolder: async (path: string): Promise<Blob> => {
    const response = await apiClient.get('/file-ops/download_folder', {
      params: { path },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Descarga múltiples archivos/carpetas como un único ZIP.
   * Abre la descarga directamente en el navegador.
   */
  downloadBatch: (paths: string[], zipName: string = 'seleccion_archivos'): void => {
    const token = localStorage.getItem('token');
    const pathParams = paths.map(p => `paths=${encodeURIComponent(p)}`).join('&');
    const downloadUrl = `/api/file-ops/download-batch?${pathParams}&zip_name=${encodeURIComponent(zipName)}&token=${token}`;
    window.open(downloadUrl, '_blank');
  },

  /**
   * Obtener permisos de un directorio
   */
  getFolderPermissions: async (path: string): Promise<any> => {
    const response = await apiClient.get('/file-ops/folder_permissions', {
      params: { path },
    });
    return response.data;
  },

  /**
   * Copiar archivo o directorio
   */
  copyItem: async (data: {
    source_path: string;
    dest_path: string;
    overwrite?: boolean;
    rename_if_exists?: boolean;
  }): Promise<any> => {
    const response = await apiClient.post('/file-ops/copy_item', data);
    return response.data;
  },

  /**
   * Mover archivo o directorio
   */
  moveItem: async (data: {
    source_path: string;
    dest_path: string;
    overwrite?: boolean;
    rename_if_exists?: boolean;
  }): Promise<any> => {
    const response = await apiClient.post('/file-ops/move_item', data);
    return response.data;
  },

  /**
   * Verificar permisos del usuario para una ruta específica
   */
  checkPermissions: async (path: string): Promise<any> => {
    const response = await apiClient.get('/file-ops/check-permissions', {
      params: { path }
    });
    return response.data;
  },

  /**
   * Validar múltiples archivos en lote
   */
  validateBatch: async (path: string, files: Array<{ name: string; path: string }>): Promise<any> => {
    const response = await apiClient.post('/file-ops/validate-batch', {
      path,
      files
    });
    return response.data;
  },

  /**
   * Subir carpeta completa
   */
  uploadFolder: async (formData: FormData): Promise<any> => {
    const response = await apiClient.post('/file-ops/upload-folder', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Sugerir nombres con IA en lote para múltiples archivos
   */
  suggestBatch: async (data: {
    files: Array<{ original_name: string; extension?: string }>;
    current_path: string;
    use_dictionary?: boolean;
  }): Promise<any> => {
    const response = await apiClient.post('/file-ops/suggest_batch', data);
    return response.data;
  },

  /**
   * Subida masiva de archivos/carpetas con auditoría consolidada
   *
   * Características:
   * - Un único registro de auditoría padre con JSON de detalles
   * - Soporte para estrategias de conflicto: skip, replace, keep_both
   * - Preserva estructura de carpetas anidadas
   * - Reporta progreso de cada item individual
   */
  uploadBatch: async (data: {
    destinationPath: string;
    conflictStrategy: 'skip' | 'replace' | 'keep_both';
    items: Array<{
      originalName: string;
      targetName: string;
      relativePath: string;
      isDirectory: boolean;
      size: number;
    }>;
    files: File[];
  }, onProgress?: (progress: number) => void): Promise<{
    message: string;
    audit_id: number;
    summary: {
      total: number;
      uploaded: number;
      created_dirs: number;
      skipped: number;
      replaced: number;
      renamed: number;
      failed: number;
      total_size: number;
      total_size_formatted: string;
      duration_seconds: number;
      success: boolean;
    };
    results: Array<{
      index: number;
      original_name: string;
      target_name: string;
      path: string;
      is_directory: boolean;
      status: 'uploaded' | 'skipped' | 'failed';
      error: string | null;
      action_taken: string | null;
    }>;
  }> => {
    const formData = new FormData();
    formData.append('destination_path', data.destinationPath);
    formData.append('conflict_strategy', data.conflictStrategy);

    // Convertir items a formato snake_case para el backend
    // IMPORTANTE: También incluir file_index para mapear correctamente archivos
    let fileIndex = 0;
    const itemsForBackend = data.items.map((item, idx) => {
      const backendItem: any = {
        original_name: item.originalName,
        target_name: item.targetName,
        relative_path: item.relativePath,
        is_directory: item.isDirectory,
        size: item.size,
        item_index: idx  // índice del item para referencia
      };

      // Asignar índice de archivo solo si no es directorio
      if (!item.isDirectory) {
        backendItem.file_index = fileIndex;
        fileIndex++;
      }

      return backendItem;
    });
    formData.append('items', JSON.stringify(itemsForBackend));

    // Agregar archivos con índice secuencial
    data.files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    // Upload con retry para conexiones inestables
    // NOTA: No usamos withRetry aquí porque el progreso se perdería en retry
    // En su lugar, usamos timeout largo y dejamos que el catch maneje errores
    try {
      const response = await apiClient.post('/file-ops/upload-batch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 10 minutos para batch grandes
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      return response.data;
    } catch (error: any) {
      // Enriquecer el error con información de conexión
      if (isConnectionError(error)) {
        error.isConnectionError = true;
        error.friendlyMessage = getConnectionErrorMessage(error);
      }
      throw error;
    }
  },
};
