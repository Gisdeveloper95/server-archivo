import apiClient from './client';
import type {
  ApiResponse,
  BrowseResponse,
  BrowseParams,
  QuickAccessResponse,
  SearchParams,
  FileItem,
} from '../types';

export const filesApi = {
  // Browse files (LIVE mode - direct filesystem)
  browseLive: async (params: BrowseParams): Promise<ApiResponse<any>> => {
    try {
      const response = await apiClient.get(
        '/file-ops/browse',
        { params }
      );
      // Backend devuelve {path, items, total, breadcrumbs} directamente
      // Lo transformamos al formato esperado por el frontend
      const backendData = response.data;
      const transformedData = {
        files: backendData.items || [],
        total: backendData.total || 0,
        page: 1,
        pages: 1,
        current_path: backendData.path || '',
        breadcrumbs: backendData.breadcrumbs || [],
        available_filters: {
          extensions: [],
          years: [],
          months: []
        }
      };

      return {
        success: true,
        data: transformedData,
        message: 'OK'
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        message: error.response?.data?.error || 'Error al cargar archivos'
      };
    }
  },

  // Browse files (DB mode - with advanced filters)
  browseDB: async (params: BrowseParams): Promise<ApiResponse<BrowseResponse>> => {
    const response = await apiClient.get<ApiResponse<BrowseResponse>>(
      '/files/browse',
      { params }
    );
    return response.data;
  },

  // Get quick access items
  quickAccess: async (): Promise<ApiResponse<QuickAccessResponse>> => {
    const response = await apiClient.get<ApiResponse<QuickAccessResponse>>(
      '/files/quick-access'
    );
    return response.data;
  },

  // Search files globally
  search: async (params: SearchParams): Promise<ApiResponse<BrowseResponse>> => {
    const response = await apiClient.get<ApiResponse<BrowseResponse>>(
      '/files/search',
      { params }
    );
    return response.data;
  },

  // Get file info
  getFileInfo: async (fileId: number): Promise<ApiResponse<FileItem>> => {
    const response = await apiClient.get<ApiResponse<FileItem>>(
      `/files/info/${fileId}`
    );
    return response.data;
  },

  // Download file
  downloadFile: async (path: string): Promise<Blob> => {
    const response = await apiClient.get('/file-ops/download', {
      params: { path },
      responseType: 'blob',
    });
    return response.data;
  },

  // View file (opens in new tab with proper authentication)
  viewFile: async (path: string): Promise<void> => {
    try {
      // Fetch con autenticación a través de apiClient (incluye Authorization header)
      const response = await apiClient.get('/file-ops/view', {
        params: { path },
        responseType: 'blob',
      });

      // Crear URL temporal del blob
      const blob = response.data;
      const blobUrl = window.URL.createObjectURL(blob);

      // Abrir en nueva pestaña
      window.open(blobUrl, '_blank');

      // Limpiar URL después de un tiempo
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (error: any) {
      console.error('Error viewing file:', error);
      // No usar alert aquí - el error se propaga al componente que llama
      throw error;
    }
  },

  // Get file details (metadata, audit info, etc.)
  getFileDetails: async (path: string): Promise<{
    success: boolean;
    file: {
      name: string;
      path: string;
      windows_path: string;
      extension: string;
      mime_type: string;
      size: number;
      size_formatted: string;
      created_at: number;
      modified_at: number;
      accessed_at: number;
    };
    upload_info: {
      uploaded_by: string;
      uploaded_by_full_name?: string;
      uploaded_at: string;
      ip_address?: string;
    } | null;
    access_history: Array<{
      action: string;
      user: string;
      date: string;
      ip: string;
    }>;
    stats: {
      total_downloads: number;
      total_views: number;
    };
  }> => {
    const response = await apiClient.get('/file-ops/file-details', {
      params: { path },
    });
    return response.data;
  },

  // Get available extensions
  getExtensions: async (): Promise<ApiResponse<{
    total_extensions: number;
    extensions: Array<{ extension: string; count: number }>;
  }>> => {
    const response = await apiClient.get('/files/extensions');
    return response.data;
  },

  // Get available filters for a path
  getFilters: async (path?: string): Promise<ApiResponse<{
    extensions: string[];
    years: number[];
    months: number[];
  }>> => {
    const response = await apiClient.get('/files/filters', {
      params: path ? { path } : {},
    });
    return response.data;
  },

  // Upload files
  uploadFiles: async (path: string, files: File[]): Promise<ApiResponse<null>> => {
    const formData = new FormData();
    formData.append('path', path);
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post<ApiResponse<null>>(
      '/upload/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Create folder
  createFolder: async (path: string, folderName: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>(
      '/upload/create-folder',
      {
        path,
        folder_name: folderName,
      }
    );
    return response.data;
  },

  // Delete file
  deleteFile: async (fileId: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/upload/delete/${fileId}`
    );
    return response.data;
  },

  // Delete multiple files
  deleteBulk: async (fileIds: number[]): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>(
      '/upload/delete-bulk',
      {
        file_ids: fileIds,
      }
    );
    return response.data;
  },

  // Suggest name with AI (legacy endpoint)
  suggestName: async (data: {
    original_name: string;
    current_path: string;
    extension?: string;
    use_dictionary?: boolean;
  }): Promise<any> => {
    const response = await apiClient.post(
      '/file-ops/suggest_name',
      data
    );
    return response.data;
  },

  // === SMART NAMING (NEW) ===

  // Validate name with IGAC rules
  smartValidate: async (data: {
    name: string;
    current_path?: string;
  }): Promise<SmartValidateResponse> => {
    const response = await apiClient.post('/file-ops/smart-validate/', data);
    return response.data;
  },

  // Get smart rename suggestion (uses AI when needed)
  smartRename: async (data: {
    name: string;
    current_path?: string;
  }): Promise<SmartRenameResponse> => {
    const response = await apiClient.post('/file-ops/smart-rename/', data);
    return response.data;
  },

  // Get batch smart rename suggestions
  smartRenameBatch: async (data: {
    files: Array<{ original_name: string }>;
    current_path?: string;
  }): Promise<SmartRenameBatchResponse> => {
    const response = await apiClient.post('/file-ops/smart-rename-batch/', data);
    return response.data;
  },

  // Search dictionary terms
  dictionarySearch: async (query: string, limit?: number): Promise<DictionarySearchResponse> => {
    const response = await apiClient.get('/file-ops/dictionary-search/', {
      params: { q: query, limit: limit || 20 },
    });
    return response.data;
  },

  // Get user's naming exemptions
  getNamingExemptions: async (): Promise<NamingExemptionsResponse> => {
    const response = await apiClient.get('/file-ops/naming-exemptions/');
    return response.data;
  },
};

// === TIPOS PARA SMART NAMING ===

export interface PartAnalysis {
  type: 'number' | 'date' | 'dictionary' | 'connector' | 'generic' | 'standard_english' | 'proper_name' | 'unknown' | 'unknown_with_suggestion' | 'cadastral_code' | 'empty';
  value: string;
  meaning?: string;
  suggestion?: { key: string; value: string };
  source: 'preserved' | 'dictionary' | 'removed' | 'warning' | 'ai_candidate' | 'skip';
}

export interface UserExemptions {
  exempt_from_naming_rules: boolean;
  exempt_from_path_limit: boolean;
  exempt_from_name_length: boolean;
  exemption_reason: string | null;
  is_privileged_role: boolean;
}

export interface SmartValidateResponse {
  success: boolean;
  valid: boolean;
  errors: string[];
  warnings: string[];
  original_name: string;
  formatted_name: string;
  formatted_base: string;
  extension: string;
  format_changes: string[];
  parts_analysis: PartAnalysis[];
  unknown_parts: string[];
  needs_ai: boolean;
  detected_date: string | null;
  user_exemptions: UserExemptions;
}

export interface SmartRenameResponse {
  success: boolean;
  original_name: string;
  suggested_name: string;
  suggested_base: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  format_changes: string[];
  used_ai: boolean;
  ai_metadata?: Record<string, any>;
  ai_error?: string;
  parts_analysis: PartAnalysis[];
}

export interface SmartRenameBatchResult {
  index: number;
  original_name: string;
  suggested_name: string;
  suggested_base: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  used_ai: boolean;
  ai_error?: string;
}

export interface SmartRenameBatchResponse {
  success: boolean;
  results: SmartRenameBatchResult[];
  total: number;
}

export interface DictionarySearchResponse {
  success: boolean;
  results: Array<{ key: string; value: string }>;
  query: string;
}

export interface NamingExemptionsResponse {
  success: boolean;
  exemptions: UserExemptions;
  user: {
    username: string;
    role: string;
  };
}
