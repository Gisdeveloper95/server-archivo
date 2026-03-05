import apiClient from './client';

// Types para Groq Stats
export interface GroqAPIKeyUsage {
  id: number;
  key_identifier: string;
  key_name: string | null;
  is_active: boolean;
  is_restricted: boolean;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  success_rate: number;
  rate_limit_errors: number;
  restriction_errors: number;
  total_tokens_used: number;
  last_used_at: string | null;
  last_error_at: string | null;
  last_rate_limit_at: string | null;
  last_success_at: string | null;
  last_error_message: string | null;
  last_reset_date: string | null;
  is_rate_limited_recently: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroqPoolSummary {
  total_keys: number;
  active_keys: number;
  rate_limited_keys: number;
  restricted_keys: number;
  total_calls_all_keys: number;
  total_successes_all_keys: number;
  total_failures_all_keys: number;
  total_tokens_all_keys: number;
  overall_success_rate: number;
  last_reset_date: string | null;
  keys_details: GroqAPIKeyUsage[];
  // Límites diarios
  daily_request_limit: number;
  daily_token_limit: number;
  requests_remaining: number;
  tokens_remaining: number;
}

// Types para el sistema híbrido de IA
export interface OllamaStatus {
  enabled: boolean;
  available: boolean;
  model: string;
  base_url: string;
  error: string | null;
  installed_models?: string[];
}

export interface GroqStatus {
  enabled: boolean;
  available: boolean;
  total_keys: number;
  active_keys: number;
  restricted_keys: number;
  all_restricted: boolean;
  daily_request_limit: number;
  daily_token_limit: number;
}

export interface CacheStats {
  total_cached: number;
  pending_review: number;
  approved: number;
  total_uses: number;
  top_used: Array<{
    word: string;
    abbrev: string;
    uses: number;
  }>;
}

export interface AISystemStatus {
  overall_status: 'optimal' | 'degraded' | 'fallback';
  overall_message: string;
  primary_backend: 'ollama' | 'groq' | 'algorithmic';
  primary_status: 'online' | 'fallback';
  fallback_backend: 'groq' | 'algorithmic' | null;
  ollama: OllamaStatus;
  groq: GroqStatus;
  cache: CacheStats;
  priority_order: string[];
}

export const groqStatsApi = {
  // Get all API keys with their stats
  getAllKeys: async (): Promise<GroqAPIKeyUsage[]> => {
    const response = await apiClient.get<GroqAPIKeyUsage[]>('/groq-stats');
    return response.data;
  },

  // Get specific key details
  getKeyDetails: async (id: number): Promise<GroqAPIKeyUsage> => {
    const response = await apiClient.get<GroqAPIKeyUsage>(`/groq-stats/${id}`);
    return response.data;
  },

  // Get pool summary (agregado de todas las keys)
  getPoolSummary: async (): Promise<GroqPoolSummary> => {
    const response = await apiClient.get<GroqPoolSummary>('/groq-stats/pool-summary');
    return response.data;
  },

  // Reset statistics for a specific key (solo superadmin)
  resetKeyStats: async (id: number): Promise<{ message: string; key_identifier: string }> => {
    const response = await apiClient.post(`/groq-stats/${id}/reset-stats`);
    return response.data;
  },

  // Toggle active status for a key (solo superadmin)
  toggleKeyActive: async (id: number): Promise<{
    message: string;
    key_identifier: string;
    is_active: boolean;
  }> => {
    const response = await apiClient.post(`/groq-stats/${id}/toggle-active`);
    return response.data;
  },

  // Get AI system status (Ollama + GROQ + Cache)
  getAISystemStatus: async (): Promise<AISystemStatus> => {
    const response = await apiClient.get<AISystemStatus>('/groq-stats/ai-system-status');
    return response.data;
  },
};
