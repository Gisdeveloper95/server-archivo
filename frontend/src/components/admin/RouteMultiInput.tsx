import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../Toast';
import { CheckCircle2, XCircle, Loader2, X, AlertCircle, Info } from 'lucide-react';

export interface RouteConfig {
  base_path: string;
  blocked_paths: string[];
  read_only_paths: string[];
  exists?: boolean;
  validating?: boolean;
  error?: string;
  users_with_permission?: Array<{ id: number; email: string; name: string }>;
  users_with_parent_permission?: Array<{
    id: number;
    email: string;
    name: string;
    parent_path: string;
    has_restrictions: boolean;
    restriction_details?: string;
  }>;
  warning?: string;
  info?: string;
  alert_type?: string;
}

interface RouteMultiInputProps {
  routes: RouteConfig[];
  onRoutesChange: (routes: RouteConfig[]) => void;
  userIds?: number[];  // IDs de usuarios para validar permisos existentes
}

export const RouteMultiInput: React.FC<RouteMultiInputProps> = ({ routes, onRoutesChange, userIds = [] }) => {
  const toast = useToast();
  const [newRoute, setNewRoute] = useState('');
  const prevUserIdsRef = useRef<number[]>([]);

  /**
   * Revalidar rutas cuando cambian los usuarios seleccionados
   */
  useEffect(() => {
    // Solo revalidar si:
    // 1. Hay rutas para validar
    // 2. Los userIds han cambiado
    // 3. Hay al menos un usuario seleccionado
    const userIdsChanged = JSON.stringify(prevUserIdsRef.current) !== JSON.stringify(userIds);

    if (routes.length > 0 && userIdsChanged && userIds.length > 0) {
      // Revalidar todas las rutas existentes
      const pathsToRevalidate = routes.map(r => r.base_path);
      revalidateExistingRoutes(pathsToRevalidate);
    }

    prevUserIdsRef.current = userIds;
  }, [userIds]);

  /**
   * Revalida rutas existentes (cuando cambian los usuarios seleccionados)
   */
  const revalidateExistingRoutes = async (pathsToRevalidate: string[]) => {
    if (pathsToRevalidate.length === 0) return;

    // Marcar todas las rutas como "validando"
    onRoutesChange(routes.map(r => ({ ...r, validating: true })));

    // Validar rutas
    const validationResults = await validatePaths(pathsToRevalidate);

    // Actualizar rutas con resultados de validación
    onRoutesChange(routes.map(route => {
      const validation = validationResults.find((v: any) => v.path === route.base_path);
      if (validation) {
        return {
          ...route,
          validating: false,
          exists: validation.exists,
          error: validation.error,
          users_with_permission: validation.users_with_permission,
          users_with_parent_permission: validation.users_with_parent_permission,
          warning: validation.warning,
          info: validation.info,
          alert_type: validation.alert_type
        };
      }
      return { ...route, validating: false };
    }));
  };

  /**
   * Valida múltiples rutas en el backend y opcionalmente verifica permisos de usuarios
   */
  const validatePaths = async (pathsToValidate: string[]) => {
    try {
      const response = await fetch('/api/admin/users/validate-paths', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          paths: pathsToValidate,
          user_ids: userIds.length > 0 ? userIds : undefined  // Validar permisos para todos los usuarios
        }),
      });

      if (!response.ok) {
        throw new Error('Error al validar rutas');
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Error validando rutas:', error);
      return pathsToValidate.map(path => ({ path, exists: false, error: 'Error de validación' }));
    }
  };

  const handleAddRoute = () => {
    if (newRoute.trim() === '') return;

    // Verificar que no exista ya
    if (routes.some((r) => r.base_path === newRoute.trim())) {
      toast.warning('Esta ruta ya fue agregada');
      return;
    }

    onRoutesChange([
      ...routes,
      {
        base_path: newRoute.trim(),
        blocked_paths: [],
        read_only_paths: [],
      },
    ]);
    setNewRoute('');
  };

  const handleRemoveRoute = (index: number) => {
    onRoutesChange(routes.filter((_, i) => i !== index));
  };

  const handleAddBlockedPath = (routeIndex: number, path: string) => {
    if (path.trim() === '') return;

    const updatedRoutes = [...routes];
    if (!updatedRoutes[routeIndex].blocked_paths.includes(path.trim())) {
      updatedRoutes[routeIndex].blocked_paths.push(path.trim());
      onRoutesChange(updatedRoutes);
    }
  };

  const handleRemoveBlockedPath = (routeIndex: number, pathIndex: number) => {
    const updatedRoutes = [...routes];
    updatedRoutes[routeIndex].blocked_paths.splice(pathIndex, 1);
    onRoutesChange(updatedRoutes);
  };

  const handleAddReadOnlyPath = (routeIndex: number, path: string) => {
    if (path.trim() === '') return;

    const updatedRoutes = [...routes];
    if (!updatedRoutes[routeIndex].read_only_paths.includes(path.trim())) {
      updatedRoutes[routeIndex].read_only_paths.push(path.trim());
      onRoutesChange(updatedRoutes);
    }
  };

  const handleRemoveReadOnlyPath = (routeIndex: number, pathIndex: number) => {
    const updatedRoutes = [...routes];
    updatedRoutes[routeIndex].read_only_paths.splice(pathIndex, 1);
    onRoutesChange(updatedRoutes);
  };

  const handleBulkPaste = async () => {
    if (newRoute.trim() === '') return;

    // Detectar separadores: coma, tabulación, salto de línea
    const separators = /[,\t\n\r]+/;
    const routesToAdd = newRoute
      .split(separators)
      .map(r => r.trim())
      .filter(r => r !== '');

    if (routesToAdd.length === 0) return;

    // Filtrar rutas que ya existen
    const existingPaths = routes.map(r => r.base_path);
    const newRoutes = routesToAdd.filter(path => !existingPaths.includes(path));

    if (newRoutes.length === 0) {
      toast.warning('Todas las rutas ya fueron agregadas');
      return;
    }

    // Agregar todas las rutas nuevas con estado "validando"
    const routesWithConfig = newRoutes.map(path => ({
      base_path: path,
      blocked_paths: [],
      read_only_paths: [],
      validating: true,
    }));

    onRoutesChange([...routes, ...routesWithConfig]);
    setNewRoute('');

    // Validar rutas en el backend
    const validationResults = await validatePaths(newRoutes);

    // Actualizar rutas con resultados de validación
    onRoutesChange([
      ...routes,
      ...routesWithConfig.map((route, index) => {
        const validation = validationResults.find((v: any) => v.path === route.base_path);
        if (validation) {
          return {
            ...route,
            validating: false,
            exists: validation.exists,
            error: validation.error,
            users_with_permission: validation.users_with_permission,
            users_with_parent_permission: validation.users_with_parent_permission,
            warning: validation.warning,
            info: validation.info,
            alert_type: validation.alert_type
          };
        }
        return { ...route, validating: false };
      })
    ]);

    const validCount = validationResults.filter((v: any) => v.exists).length;
    if (validCount === newRoutes.length) {
      toast.success(`${validCount} ruta(s) agregada(s) y validada(s) exitosamente`);
    } else {
      toast.warning(`${validCount}/${newRoutes.length} rutas válidas. Revise las rutas con error.`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add New Route */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Agregar Rutas</label>
        <div className="flex gap-2">
          <textarea
            value={newRoute}
            onChange={(e) => setNewRoute(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleBulkPaste();
              }
            }}
            placeholder="ej: Proyecto_A/Datos&#10;O múltiples separadas por coma, tabulación o salto de línea:&#10;Proyecto_A/Datos, Proyecto_B/Informes, Proyecto_C/Reportes"
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
            rows={3}
          />
          <button
            type="button"
            onClick={handleBulkPaste}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 self-start"
          >
            + Agregar
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
          📋 Pega múltiples rutas separadas por coma, tabulación o salto de línea. Presiona Enter o "Agregar"
        </p>
      </div>

      {/* List of Routes */}
      {routes.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Rutas Agregadas ({routes.length})
          </h4>

          {routes.map((route, routeIndex) => {
            // Determinar el tipo de alerta y color de fondo
            const hasInfo = route.info && route.users_with_parent_permission?.some(u => !u.has_restrictions);
            const hasWarning = route.warning || route.users_with_parent_permission?.some(u => u.has_restrictions);

            return (
            <div
              key={routeIndex}
              className={`p-4 border rounded-lg ${
                route.validating
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                  : hasInfo && !hasWarning
                  ? 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-700'
                  : hasWarning
                  ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'
                  : route.exists
                  ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                  : route.exists === false
                  ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Route Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0 flex items-start gap-2">
                  {route.validating ? (
                    <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                  ) : hasInfo && !hasWarning ? (
                    <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                  ) : hasWarning ? (
                    <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  ) : route.exists ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : route.exists === false ? (
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  ) : null}
                  <div className="flex-1">
                    <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold break-all">
                      {route.base_path}
                    </div>
                    {route.validating && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Validando ruta...</p>
                    )}
                    {route.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{route.error}</p>
                    )}
                    {route.info && (
                      <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-1 font-semibold">{route.info}</p>
                    )}
                    {route.warning && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-semibold">{route.warning}</p>
                    )}

                    {/* Usuarios con permisos EXACTOS en esta ruta */}
                    {route.users_with_permission && route.users_with_permission.length > 0 && (
                      <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/50 rounded border border-orange-300 dark:border-orange-600">
                        <p className="text-xs text-orange-800 dark:text-orange-200 font-semibold mb-1">
                          ⚠️ Permisos en esta ruta exacta ({route.users_with_permission.length} usuario(s)):
                        </p>
                        <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-0.5 ml-4">
                          {route.users_with_permission.map((user, idx) => (
                            <li key={idx} className="list-disc">
                              {user.name} ({user.email})
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 italic">
                          💡 Se actualizarán con la nueva configuración
                        </p>
                      </div>
                    )}

                    {/* Usuarios con permisos en RUTA SUPERIOR (padre) */}
                    {route.users_with_parent_permission && route.users_with_parent_permission.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {/* Usuarios SIN restricciones - NO necesitan este permiso */}
                        {route.users_with_parent_permission.filter(u => !u.has_restrictions).length > 0 && (
                          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/50 rounded border border-cyan-300 dark:border-cyan-600">
                            <p className="text-xs text-cyan-800 dark:text-cyan-200 font-semibold mb-1">
                              ✓ NO necesitan permisos aquí ({route.users_with_parent_permission.filter(u => !u.has_restrictions).length} usuario(s)):
                            </p>
                            <ul className="text-xs text-cyan-700 dark:text-cyan-300 space-y-0.5 ml-4">
                              {route.users_with_parent_permission.filter(u => !u.has_restrictions).map((user, idx) => (
                                <li key={idx} className="list-disc">
                                  {user.name} ({user.email}) - Ya tiene acceso total desde <span className="font-mono">{user.parent_path}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1 italic">
                              💡 Estos usuarios ya tienen acceso completo desde una ruta superior sin restricciones
                            </p>
                          </div>
                        )}

                        {/* Usuarios CON restricciones - Se sobrescribirán */}
                        {route.users_with_parent_permission.filter(u => u.has_restrictions).length > 0 && (
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded border border-orange-300 dark:border-orange-600">
                            <p className="text-xs text-orange-800 dark:text-orange-200 font-semibold mb-1">
                              ⚠️ Tienen permisos con restricciones ({route.users_with_parent_permission.filter(u => u.has_restrictions).length} usuario(s)):
                            </p>
                            <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1 ml-4">
                              {route.users_with_parent_permission.filter(u => u.has_restrictions).map((user, idx) => (
                                <li key={idx} className="list-disc">
                                  <div>{user.name} ({user.email})</div>
                                  <div className="text-xs italic ml-2">
                                    Ruta actual: <span className="font-mono">{user.parent_path}</span>
                                  </div>
                                  {user.restriction_details && (
                                    <div className="text-xs italic ml-2 text-orange-600 dark:text-orange-400">
                                      Restricciones actuales: {user.restriction_details}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 italic">
                              💡 Los nuevos permisos sobrescribirán las restricciones anteriores
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveRoute(routeIndex)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex-shrink-0"
                  title="Eliminar ruta"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Blocked Paths */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                  🚫 Rutas Bloqueadas (opcional)
                </label>
                <PathListInput
                  paths={route.blocked_paths}
                  onAdd={(path) => handleAddBlockedPath(routeIndex, path)}
                  onRemove={(pathIndex) => handleRemoveBlockedPath(routeIndex, pathIndex)}
                  placeholder="ej: sub_carpeta1/datos_sensibles"
                  addButtonColor="red"
                />
              </div>

              {/* Read-Only Paths */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
                  👁️ Solo Lectura (opcional)
                </label>
                <PathListInput
                  paths={route.read_only_paths}
                  onAdd={(path) => handleAddReadOnlyPath(routeIndex, path)}
                  onRemove={(pathIndex) => handleRemoveReadOnlyPath(routeIndex, pathIndex)}
                  placeholder="ej: sub_carpeta2/archivos_finales"
                  addButtonColor="yellow"
                />
              </div>
            </div>
          );
          })}
        </div>
      )}

      {routes.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed rounded-lg">
          No hay rutas agregadas. Agrega al menos una ruta arriba.
        </div>
      )}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
};

// Helper component for adding/removing paths
interface PathListInputProps {
  paths: string[];
  onAdd: (path: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  addButtonColor: 'red' | 'yellow';
}

const PathListInput: React.FC<PathListInputProps> = ({
  paths,
  onAdd,
  onRemove,
  placeholder,
  addButtonColor,
}) => {
  const [newPath, setNewPath] = useState('');

  const handleAdd = () => {
    if (newPath.trim()) {
      onAdd(newPath);
      setNewPath('');
    }
  };

  const buttonClasses =
    addButtonColor === 'red'
      ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-200'
      : 'bg-yellow-100 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200';

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="flex-1 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        <button type="button" onClick={handleAdd} className={`px-3 py-1 text-xs rounded ${buttonClasses}`}>
          + Agregar
        </button>
      </div>

      {paths.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {paths.map((path, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border rounded text-xs max-w-full"
            >
              <span className="break-all">{path}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-red-600 dark:text-red-400 font-bold ml-1 flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
