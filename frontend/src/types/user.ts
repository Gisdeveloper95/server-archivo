// Nuevos roles según requerimientos
export type UserRole = 'consultation' | 'consultation_edit' | 'admin' | 'superadmin';

// Niveles de permisos de edición (para consultation_edit)
export type EditPermissionLevel = 'upload_only' | 'upload_own' | 'upload_all';

// Modos de herencia de permisos
export type InheritanceMode = 'total' | 'blocked' | 'limited_depth' | 'partial_write';

// Exenciones de nombrado del usuario
export interface NamingExemptions {
  exempt_from_naming_rules: boolean;
  exempt_from_path_limit: boolean;
  exempt_from_name_length: boolean;
  exemption_reason?: string;
  is_privileged_role: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  department?: string;
  position?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  created_by?: number;
  // Campos de exención de nombrado
  exempt_from_naming_rules?: boolean;
  exempt_from_path_limit?: boolean;
  exempt_from_name_length?: boolean;
  // Exenciones calculadas (incluye rol + campos individuales)
  naming_exemptions?: NamingExemptions;
}

export interface UserPermission {
  id?: number;
  user: number;
  directory?: number;  // ID del directorio
  base_path: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_create_directories: boolean;
  exempt_from_dictionary: boolean;

  // Permisos granulares para consultation_edit
  edit_permission_level?: EditPermissionLevel;

  // Control de herencia
  inheritance_mode: InheritanceMode;
  blocked_paths: string[];
  read_only_paths: string[];
  max_depth?: number;

  // Metadatos
  is_active: boolean;
  granted_by?: number;
  granted_by_detail?: User;  // Objeto completo del usuario que otorgó el permiso
  granted_at?: string;
  expires_at?: string | null;  // Fecha de expiración del permiso
  revoked_at?: string;
  notes?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  email?: string;
  full_name?: string;
  role?: UserRole;
}

export interface UserWithPermissions extends User {
  permissions: UserPermission[];
}

// Tipos para auditoría
export type AuditAction =
  | 'upload'
  | 'download'
  | 'delete'
  | 'rename'
  | 'create_folder'
  | 'move'
  | 'copy'
  | 'login'
  | 'logout';

export interface AuditLog {
  id: number;
  user?: number;
  username: string;
  user_role: UserRole;
  action: AuditAction;
  target_path: string;
  target_name?: string;
  file_size?: number;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  timestamp: string;
}
