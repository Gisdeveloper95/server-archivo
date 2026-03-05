/**
 * API client para gestión de abreviaciones generadas por IA
 */
import apiClient from './client';

export interface AIAbbreviation {
  id: number;
  original_word: string;
  abbreviation: string;
  times_used: number;
  status: 'pending' | 'approved' | 'rejected' | 'corrected';
  original_ai_abbreviation: string | null;
  created_at: string;
  last_used_at: string | null;
  reviewed_by: number | null;
  reviewed_by_detail?: {
    id: number;
    username: string;
    full_name: string;
  } | null;
  reviewed_at: string | null;
}

export interface AIAbbreviationSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  corrected: number;
  top_used: AIAbbreviation[];
}

export interface AIAbbreviationListResponse {
  results: AIAbbreviation[];
  count: number;
}

export const aiAbbreviationsApi = {
  // Listar todas las abreviaciones
  list: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<AIAbbreviationListResponse> => {
    const response = await apiClient.get<AIAbbreviationListResponse>('/ai-abbreviations', { params });
    return response.data;
  },

  // Obtener resumen de estadísticas
  getSummary: async (): Promise<AIAbbreviationSummary> => {
    const response = await apiClient.get<AIAbbreviationSummary>('/ai-abbreviations/summary');
    return response.data;
  },

  // Aprobar una abreviación
  approve: async (id: number): Promise<{ message: string; entry: AIAbbreviation }> => {
    const response = await apiClient.post(`/ai-abbreviations/${id}/approve`);
    return response.data;
  },

  // Rechazar una abreviación
  reject: async (id: number): Promise<{ message: string; entry: AIAbbreviation }> => {
    const response = await apiClient.post(`/ai-abbreviations/${id}/reject`);
    return response.data;
  },

  // Corregir una abreviación
  correct: async (id: number, newAbbreviation: string): Promise<{ message: string; entry: AIAbbreviation }> => {
    const response = await apiClient.post(`/ai-abbreviations/${id}/correct`, {
      new_abbreviation: newAbbreviation,
    });
    return response.data;
  },

  // Agregar al diccionario oficial
  addToDictionary: async (id: number): Promise<{
    message: string;
    dictionary_entry: any;
    ai_abbreviation: AIAbbreviation;
  }> => {
    const response = await apiClient.post(`/ai-abbreviations/${id}/add-to-dictionary`);
    return response.data;
  },

  // Aprobar masivamente
  bulkApprove: async (params: {
    ids?: number[];
    all_pending?: boolean;
  }): Promise<{ message: string; approved_count: number }> => {
    const response = await apiClient.post('/ai-abbreviations/bulk-approve', params);
    return response.data;
  },

  // Agregar masivamente al diccionario
  bulkAddToDictionary: async (params: {
    ids?: number[];
    all_approved?: boolean;
  }): Promise<{
    message: string;
    added_count: number;
    skipped_count: number;
    errors: string[] | null;
  }> => {
    const response = await apiClient.post('/ai-abbreviations/bulk-add-to-dictionary', params);
    return response.data;
  },
};
