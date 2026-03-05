import type { UserRole, User, NamingExemptions } from '../types/user';

/**
 * Labels en español para los roles del sistema
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  consultation: 'Consulta',
  consultation_edit: 'Consulta + Edición',
  admin: 'Administrador',
  superadmin: 'Super Administrador',
};

/**
 * Clases de estilos para badges de roles
 */
export const ROLE_COLORS: Record<UserRole, string> = {
  consultation: 'bg-gray-100 text-gray-800 border-gray-300',
  consultation_edit: 'bg-blue-100 text-blue-800 border-blue-300',
  admin: 'bg-purple-100 text-purple-800 border-purple-300',
  superadmin: 'bg-red-100 text-red-800 border-red-300',
};

/**
 * Descripciones detalladas de cada rol
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  consultation: 'Solo puede consultar y descargar archivos en rutas autorizadas',
  consultation_edit: 'Puede consultar y editar archivos, con validación obligatoria de diccionario y límite de caracteres',
  admin: 'Puede renombrar sin restricciones y superar límites de caracteres en rutas asignadas',
  superadmin: 'Acceso total al sistema incluyendo gestión de usuarios y permisos',
};

/**
 * Obtiene el label de un rol en español
 */
export const getRoleLabel = (role: UserRole): string => {
  return ROLE_LABELS[role] || role;
};

/**
 * Obtiene las clases de estilo para un rol
 */
export const getRoleColor = (role: UserRole): string => {
  return ROLE_COLORS[role] || ROLE_COLORS.consultation;
};

/**
 * Obtiene la descripción de un rol
 */
export const getRoleDescription = (role: UserRole): string => {
  return ROLE_DESCRIPTIONS[role] || '';
};

/**
 * Verifica si un usuario puede saltarse la validación de diccionario
 * Considera tanto el rol como las exenciones individuales del usuario
 * @deprecated Use user.naming_exemptions directamente cuando esté disponible
 */
export const canBypassDictionary = (role: UserRole, exemptions?: NamingExemptions): boolean => {
  if (exemptions?.exempt_from_naming_rules) return true;
  return role === 'admin' || role === 'superadmin';
};

/**
 * Verifica si un usuario puede exceder el límite de 260 caracteres
 * Considera tanto el rol como las exenciones individuales del usuario
 * @deprecated Use user.naming_exemptions directamente cuando esté disponible
 */
export const canExceedPathLimit = (role: UserRole, exemptions?: NamingExemptions): boolean => {
  if (exemptions?.exempt_from_path_limit) return true;
  return role === 'admin' || role === 'superadmin';
};

/**
 * Verifica si un usuario puede exceder el límite de 30 caracteres en nombres
 * Considera tanto el rol como las exenciones individuales del usuario
 */
export const canExceedNameLimit = (role: UserRole, exemptions?: NamingExemptions): boolean => {
  if (exemptions?.exempt_from_name_length) return true;
  return role === 'admin' || role === 'superadmin';
};

/**
 * Verifica si un rol es de administración
 */
export const isAdminRole = (role: UserRole): boolean => {
  return role === 'admin' || role === 'superadmin';
};

/**
 * Obtiene las exenciones efectivas de un usuario
 * Combina rol privilegiado + exenciones individuales
 */
export const getUserExemptions = (user: User | null): NamingExemptions => {
  if (!user) {
    return {
      exempt_from_naming_rules: false,
      exempt_from_path_limit: false,
      exempt_from_name_length: false,
      is_privileged_role: false
    };
  }

  // Si tiene naming_exemptions del backend, usarlas
  if (user.naming_exemptions) {
    return user.naming_exemptions;
  }

  // Fallback: calcular basado en rol
  const isPrivileged = user.role === 'admin' || user.role === 'superadmin';
  return {
    exempt_from_naming_rules: isPrivileged || user.exempt_from_naming_rules || false,
    exempt_from_path_limit: isPrivileged || user.exempt_from_path_limit || false,
    exempt_from_name_length: isPrivileged || user.exempt_from_name_length || false,
    is_privileged_role: isPrivileged
  };
};

/**
 * Obtiene todos los roles disponibles para selección
 * (solo superadmin puede asignar todos los roles)
 */
export const getAvailableRoles = (currentUserRole: UserRole): UserRole[] => {
  if (currentUserRole === 'superadmin') {
    return ['consultation', 'consultation_edit', 'admin', 'superadmin'];
  }
  // Los admin solo pueden crear consultation y consultation_edit
  return ['consultation', 'consultation_edit'];
};
