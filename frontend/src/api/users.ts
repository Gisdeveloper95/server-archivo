import apiClient from './client';
import type {
  ApiResponse,
  User,
  UserWithPermissions,
  CreateUserRequest,
  UpdateUserRequest,
  UserPermission,
  AuditLog,
} from '../types';

export const usersApi = {
  // Get all users
  getAll: async (params?: {
    role?: string;
    is_active?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<{ count: number; next: string | null; previous: string | null; results: User[] }> => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  // Get user by ID
  getById: async (userId: number): Promise<UserWithPermissions> => {
    const response = await apiClient.get<UserWithPermissions>(
      `/users/${userId}`
    );
    return response.data;
  },

  // Create user
  create: async (data: CreateUserRequest): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.post<ApiResponse<{ user: User }>>(
      '/users/create',
      data
    );
    return response.data;
  },

  // Update user
  update: async (
    userId: number,
    data: UpdateUserRequest
  ): Promise<{ message: string; user: User }> => {
    const response = await apiClient.patch<{ message: string; user: User }>(
      `/admin/users/${userId}`,
      data
    );
    return response.data;
  },

  // Delete user (solo superadmin)
  delete: async (userId: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/admin/users/${userId}`
    );
    return response.data;
  },

  // Toggle user status
  toggleStatus: async (userId: number): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.post<ApiResponse<{ user: User }>>(
      `/users/${userId}/toggle_status`
    );
    return response.data;
  },

  // Update user permissions
  updatePermissions: async (
    userId: number,
    permissions: UserPermission[]
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.put<ApiResponse<null>>(
      `/users/${userId}/permissions`,
      { permissions }
    );
    return response.data;
  },

  // Get user audit logs (solo superadmin)
  getAuditLogs: async (
    userId: number,
    params?: {
      action?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLog[]>(
      `/users/${userId}/audit_logs`,
      { params }
    );
    return response.data;
  },

  // Reset password (solo superadmin)
  resetPassword: async (
    userId: number,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/users/${userId}/reset_password`,
      { new_password: newPassword }
    );
    return response.data;
  },

  // Bulk assign permissions (solo superadmin)
  bulkAssignPermissions: async (data: {
    user_ids: number[];
    routes: Array<{
      base_path: string;
      blocked_paths?: string[];
      read_only_paths?: string[];
    }>;
    can_read?: boolean;
    can_write?: boolean;
    can_delete?: boolean;
    can_create_directories?: boolean;
    exempt_from_dictionary?: boolean;
    edit_permission_level?: string | null;
    inheritance_mode?: string;
    max_depth?: number | null;
    expires_at?: string;
    group_name: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    total_assignments: number;
    users_notified: number;
    group_name: string;
    assignments: Array<{
      user_id: number;
      user_email: string;
      user_name: string;
      routes: string[];
      permission_ids: number[];
    }>;
    warning?: string;
  }> => {
    const response = await apiClient.post('/admin/users/bulk-assign-permissions', data);
    return response.data;
  },

  // List all groups (solo superadmin)
  listGroups: async (): Promise<{
    groups: Array<{
      group_name: string;
      user_count: number;
      route_count: number;
      total_permissions: number;
      created_at: string;
      granted_by: string;
      expires_at: string;
    }>;
  }> => {
    const response = await apiClient.get('/admin/users/groups');
    return response.data;
  },

  // Get group permissions (solo superadmin)
  getGroupPermissions: async (groupName: string): Promise<{
    group_name: string;
    permissions: UserPermission[];
    users: Array<{ id: number; email: string; name: string }>;
    routes: string[];
  }> => {
    const response = await apiClient.get(`/admin/users/groups/${encodeURIComponent(groupName)}/permissions`);
    return response.data;
  },

  // Update group permissions (solo superadmin)
  updateGroupPermissions: async (
    groupName: string,
    data: {
      can_read?: boolean;
      can_write?: boolean;
      can_delete?: boolean;
      can_create_directories?: boolean;
      exempt_from_dictionary?: boolean;
      edit_permission_level?: string | null;
      inheritance_mode?: string;
      max_depth?: number | null;
      expires_at?: string;
      notes?: string;
    }
  ): Promise<{
    success: boolean;
    group_name: string;
    updated_count: number;
    message: string;
  }> => {
    const response = await apiClient.patch(`/admin/users/groups/${encodeURIComponent(groupName)}/update`, data);
    return response.data;
  },

  // Delete group (solo superadmin)
  deleteGroup: async (groupName: string): Promise<{
    success: boolean;
    group_name: string;
    deleted_count: number;
    message: string;
  }> => {
    const response = await apiClient.delete(`/admin/users/groups/${encodeURIComponent(groupName)}`);
    return response.data;
  },

  // Add users to group (solo superadmin)
  addUsersToGroup: async (
    groupName: string,
    userIds: number[]
  ): Promise<{
    success: boolean;
    group_name: string;
    users_added: number;
    total_assignments: number;
  }> => {
    const response = await apiClient.post(
      `/admin/users/groups/${encodeURIComponent(groupName)}/add-users`,
      { user_ids: userIds }
    );
    return response.data;
  },

  // Remove user from group (solo superadmin)
  removeUserFromGroup: async (
    groupName: string,
    userId: number
  ): Promise<{
    success: boolean;
    group_name: string;
    user_id: number;
    deleted_count: number;
  }> => {
    const response = await apiClient.delete(
      `/admin/users/groups/${encodeURIComponent(groupName)}/remove-user/${userId}`
    );
    return response.data;
  },

  // Add routes to group (solo superadmin)
  addRoutesToGroup: async (
    groupName: string,
    routes: Array<{
      base_path: string;
      blocked_paths?: string[];
      read_only_paths?: string[];
    }>,
    notifyUsers?: boolean,
    notifyLeader?: boolean
  ): Promise<{
    success: boolean;
    group_name: string;
    new_routes_count: number;
    total_assignments: number;
    users_affected: number;
    emails_sent?: string[];
    message: string;
  }> => {
    const response = await apiClient.post(
      `/admin/users/groups/${encodeURIComponent(groupName)}/add-routes`,
      { routes, notify_users: notifyUsers, notify_leader: notifyLeader }
    );
    return response.data;
  },

  // Update route permissions in group (solo superadmin)
  updateRoutePermissions: async (
    groupName: string,
    routePath: string,
    permissions: {
      can_read?: boolean;
      can_write?: boolean;
      can_delete?: boolean;
      can_create_directories?: boolean;
      exempt_from_dictionary?: boolean;
      edit_permission_level?: string | null;
      inheritance_mode?: string;
      max_depth?: number | null;
      blocked_paths?: string[];
      read_only_paths?: string[];
      authorized_by_email?: string;
      authorized_by_name?: string;
    },
    notifyUsers?: boolean,
    notifyLeader?: boolean
  ): Promise<{
    success: boolean;
    group_name: string;
    route_path: string;
    updated_count: number;
    emails_sent?: string[];
    message: string;
  }> => {
    const response = await apiClient.patch(
      `/admin/users/groups/${encodeURIComponent(groupName)}/routes/${encodeURIComponent(routePath)}/permissions`,
      {
        ...permissions,
        notify_users: notifyUsers,
        notify_leader: notifyLeader
      }
    );
    return response.data;
  },

  // Update group expiration date (solo superadmin)
  updateGroupExpiration: async (
    groupName: string,
    expiresAt: string
  ): Promise<{
    success: boolean;
    group_name: string;
    updated_count: number;
    new_expires_at: string;
    message: string;
  }> => {
    const response = await apiClient.patch(
      `/admin/users/groups/${encodeURIComponent(groupName)}/expiration`,
      { expires_at: expiresAt }
    );
    return response.data;
  },

  // Delete route from group (solo superadmin)
  deleteRouteFromGroup: async (
    groupName: string,
    routePath: string
  ): Promise<{
    success: boolean;
    group_name: string;
    route_path: string;
    deleted_count: number;
    users_affected: number;
    message: string;
  }> => {
    const response = await apiClient.delete(
      `/admin/users/groups/${encodeURIComponent(groupName)}/routes/${encodeURIComponent(routePath)}`
    );
    return response.data;
  },

  // Eliminar/ocultar un permiso expirado de la lista del usuario
  dismissExpiredPermission: async (permissionId: number): Promise<{
    message: string;
    success: boolean;
  }> => {
    const response = await apiClient.delete(`/permissions/${permissionId}/dismiss_expired`);
    return response.data;
  },
};
