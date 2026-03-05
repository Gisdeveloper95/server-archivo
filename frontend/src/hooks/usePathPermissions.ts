import { useState, useEffect } from 'react';
import { fileOpsApi } from '../api/fileOps';
import { useAuthStore } from '../store/authStore';

export interface PathPermissions {
  path: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_create_directories: boolean;
  can_rename: boolean;
  can_download: boolean;
  can_copy: boolean;
  can_cut: boolean;
  is_exempt_from_dictionary: boolean;
  read_only_mode?: boolean;
}

const DEFAULT_PERMISSIONS: PathPermissions = {
  path: '',
  can_read: false,
  can_write: false,
  can_delete: false,
  can_create_directories: false,
  can_rename: false,
  can_download: false,
  can_copy: false,
  can_cut: false,
  is_exempt_from_dictionary: false,
  read_only_mode: false,
};

const SUPERADMIN_PERMISSIONS: PathPermissions = {
  path: '',
  can_read: true,
  can_write: true,
  can_delete: true,
  can_create_directories: true,
  can_rename: true,
  can_download: true,
  can_copy: true,
  can_cut: true,
  is_exempt_from_dictionary: true,
  read_only_mode: false,
};

/**
 * Hook para obtener los permisos del usuario en una ruta específica
 * Llama al endpoint check-permissions del backend
 */
export function usePathPermissions(currentPath: string) {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<PathPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      // Si currentPath está vacío (pantalla "Mis Accesos" o raíz)
      if (!currentPath || currentPath.trim() === '') {
        // Si es superadmin, dar todos los permisos incluso en la raíz
        if (user?.role === 'superadmin') {
          setPermissions({ ...SUPERADMIN_PERMISSIONS, path: '' });
        } else {
          // Para otros usuarios, sin permisos en la raíz
          setPermissions({ ...DEFAULT_PERMISSIONS, path: '' });
        }
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fileOpsApi.checkPermissions(currentPath);
        setPermissions(response);
      } catch (err: any) {
        console.error('Error al obtener permisos:', err);
        setError(err.response?.data?.error || 'Error al obtener permisos');
        // En caso de error, asumir sin permisos
        setPermissions({ ...DEFAULT_PERMISSIONS, path: currentPath });
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [currentPath, user]);

  return { permissions, loading, error };
}
