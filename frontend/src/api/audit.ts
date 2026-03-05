import apiClient from './client';

export const auditApi = {
  // Obtener filtros disponibles
  async getAvailableFilters() {
    const response = await apiClient.get('/audit/available-filters');
    return response.data;
  },

  // Obtener logs con filtros
  async getLogs(params?: {
    username?: string;
    action?: string;
    success?: boolean;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await apiClient.get('/audit', { params });
    return response.data;
  },

  // Auditoría por directorio
  async getDirectoryAudit(
    path: string,
    dateFrom?: string,
    dateTo?: string,
    username?: string,
    action?: string
  ) {
    const params: any = { path };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (username) params.username = username;
    if (action) params.action = action;

    const response = await apiClient.get('/audit/directory-audit', { params });
    return response.data;
  },

  // Seguimiento de archivo
  async trackFile(
    filename: string,
    dateFrom?: string,
    dateTo?: string,
    username?: string,
    action?: string
  ) {
    const params: any = { filename };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (username) params.username = username;
    if (action) params.action = action;

    const response = await apiClient.get('/audit/file-tracking', { params });
    return response.data;
  },

  // Analizar ZIP
  async analyzeZip(zipPath: string) {
    const response = await apiClient.post('/audit/analyze-zip', { zip_path: zipPath });
    return response.data;
  },

  // Exportar CSV - Dashboard
  async exportDashboardCSV(params?: {
    username?: string;
    action?: string;
    success?: boolean;
    start_date?: string;
    end_date?: string;
  }) {
    const response = await apiClient.get('/audit/export-csv', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Exportar CSV - Auditoría por directorio
  async exportDirectoryCSV(
    path: string,
    dateFrom?: string,
    dateTo?: string,
    username?: string,
    action?: string
  ) {
    const params: any = { path };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (username) params.username = username;
    if (action) params.action = action;

    const response = await apiClient.get('/audit/directory-audit-csv', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Exportar CSV - Seguimiento de archivo
  async exportFileTrackingCSV(
    filename: string,
    dateFrom?: string,
    dateTo?: string,
    username?: string,
    action?: string
  ) {
    const params: any = { filename };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (username) params.username = username;
    if (action) params.action = action;

    const response = await apiClient.get('/audit/file-tracking-csv', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // ============== PAQUETES DE REPORTES COMPLETOS (ZIP) ==============

  // Exportar paquete completo - Dashboard general
  async exportReportPackage(params?: {
    username?: string;
    action?: string;
    success?: boolean;
    start_date?: string;
    end_date?: string;
  }) {
    const response = await apiClient.get('/audit/export-report-package', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Exportar paquete completo - Auditoría por directorio
  async exportDirectoryReportPackage(
    path: string,
    dateFrom?: string,
    dateTo?: string,
    username?: string,
    action?: string
  ) {
    const params: any = { path };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (username) params.username = username;
    if (action) params.action = action;

    const response = await apiClient.get('/audit/directory-audit-report-package', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Exportar paquete completo - Seguimiento de archivo
  async exportFileTrackingReportPackage(
    filename: string,
    dateFrom?: string,
    dateTo?: string,
    username?: string,
    action?: string
  ) {
    const params: any = { filename };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (username) params.username = username;
    if (action) params.action = action;

    const response = await apiClient.get('/audit/file-tracking-report-package', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },
};
