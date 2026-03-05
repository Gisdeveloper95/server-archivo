import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// Use environment variable or fallback to relative path
// In Vite, env vars must be prefixed with VITE_
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Lista de rutas públicas que NO requieren autenticación
    const publicRoutes = [
      '/auth/login',
      '/auth/register',
      '/auth/request_password_reset',
      '/auth/confirm_password_reset'
    ];

    // No agregar token para rutas públicas
    const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));

    if (!isPublicRoute) {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Lista de rutas públicas que NO deben redirigir al login en 401
    const publicRoutes = [
      '/auth/login',
      '/auth/register',
      '/auth/request_password_reset',
      '/auth/confirm_password_reset'
    ];

    const isPublicRoute = publicRoutes.some(route => error.config?.url?.includes(route));

    if (error.response?.status === 401 && !isPublicRoute) {
      // Token expired or invalid (solo para rutas protegidas)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
