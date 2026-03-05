import apiClient from './client';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  ChangePasswordRequest,
} from '../types';

export const authApi = {
  // Login
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      data
    );
    return response.data;
  },

  // Register
  register: async (data: RegisterRequest): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.post<ApiResponse<{ user: User }>>(
      '/auth/register',
      data
    );
    return response.data;
  },

  // Get current user
  me: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  // Change password
  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>(
      '/auth/change_password',
      data
    );
    return response.data;
  },

  // Reset password (admin only)
  resetPassword: async (
    userId: number,
    newPassword: string
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>(
      '/auth/reset_password',
      {
        user_id: userId,
        new_password: newPassword,
      }
    );
    return response.data;
  },

  // Get my accesses
  myAccess: async (): Promise<any> => {
    const response = await apiClient.get('/auth/my_access');
    return response.data;
  },

  // Request password reset
  requestPasswordReset: async (data: { email_or_username: string }): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>(
      '/auth/request_password_reset',
      data
    );
    return response.data;
  },

  // Confirm password reset
  confirmPasswordReset: async (data: { token: string; new_password: string }): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>(
      '/auth/confirm_password_reset',
      data
    );
    return response.data;
  },
};
