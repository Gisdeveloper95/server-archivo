import apiClient from './client';
import type {
  ApiResponse,
  StatsOverview,
  DownloadStat,
  SearchStat,
  TopUser,
  TopFile,
} from '../types';

export const statsApi = {
  // Get overview statistics
  getOverview: async (): Promise<ApiResponse<StatsOverview>> => {
    const response = await apiClient.get<ApiResponse<StatsOverview>>(
      '/stats/overview'
    );
    return response.data;
  },

  // Get download statistics
  getDownloads: async (days: number = 30): Promise<ApiResponse<{
    downloads: DownloadStat[];
    total: number;
  }>> => {
    const response = await apiClient.get('/stats/downloads', {
      params: { days },
    });
    return response.data;
  },

  // Get search statistics
  getSearches: async (days: number = 30): Promise<ApiResponse<{
    searches: SearchStat[];
    total: number;
  }>> => {
    const response = await apiClient.get('/stats/searches', {
      params: { days },
    });
    return response.data;
  },

  // Get top users
  getTopUsers: async (limit: number = 10): Promise<ApiResponse<{
    users: TopUser[];
    total: number;
  }>> => {
    const response = await apiClient.get('/stats/top-users', {
      params: { limit },
    });
    return response.data;
  },

  // Get top files
  getTopFiles: async (limit: number = 10): Promise<ApiResponse<{
    files: TopFile[];
    total: number;
  }>> => {
    const response = await apiClient.get('/stats/top-files', {
      params: { limit },
    });
    return response.data;
  },
};
