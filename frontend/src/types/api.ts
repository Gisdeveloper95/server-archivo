export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode?: number;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}
