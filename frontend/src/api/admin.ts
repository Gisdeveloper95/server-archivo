import api from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department?: string;
  position?: string;
}

export interface EffectivePermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_create_directories: boolean;
}

export interface UserWithAccess {
  user: User;
  permission: any; // UserPermission completo
  access_type: 'direct' | 'inherited';
  effective_permissions: EffectivePermissions;
}

export interface PathAccessResponse {
  path: string;
  users_with_access: UserWithAccess[];
  total_users: number;
}

/**
 * Obtiene todos los usuarios que tienen acceso a una ruta específica
 */
export async function getPathAccess(path: string): Promise<PathAccessResponse> {
  const encodedPath = encodeURIComponent(path);
  const response = await api.get(`/admin/users/path-access/${encodedPath}`);
  return response.data;
}

/**
 * Obtiene todos los usuarios del sistema
 */
export async function getAllUsers(): Promise<User[]> {
  const response = await api.get('/admin/users');
  return response.data.users;
}

/**
 * Asigna un permiso a un usuario
 */
export async function assignPermission(userId: number, permissionData: {
  base_path: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_create_directories: boolean;
  inheritance_mode?: string;
  max_depth?: number | null;
  blocked_paths?: string[];
  read_only_paths?: string[];
  edit_permission_level?: string;
  expires_at?: string | null;
}) {
  const response = await api.post(`/admin/users/${userId}/assign-permission`, permissionData);
  return response.data;
}

/**
 * Actualiza un permiso existente
 */
export async function updatePermission(permissionId: number, permissionData: Partial<{
  base_path: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_create_directories: boolean;
  inheritance_mode: string;
  max_depth: number | null;
  blocked_paths: string[];
  read_only_paths: string[];
  edit_permission_level: string;
  expires_at: string | null;
  is_active: boolean;
}>) {
  const response = await api.patch(`/admin/permissions/${permissionId}`, permissionData);
  return response.data;
}

/**
 * Elimina un permiso
 */
export async function deletePermission(permissionId: number) {
  const response = await api.delete(`/admin/permissions/${permissionId}`);
  return response.data;
}
