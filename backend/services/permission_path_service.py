"""
PermissionPathService - Servicio para actualizar permisos cuando se renombran rutas
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class PermissionPathService:
    """
    Servicio para mantener sincronizados los permisos cuando se renombran carpetas.
    Actualiza automáticamente los base_path, blocked_paths y read_only_paths.
    """

    @classmethod
    def handle_path_rename(
        cls,
        old_path: str,
        new_path: str,
        renamed_by
    ) -> Dict[str, Any]:
        """
        Actualiza todos los permisos afectados cuando se renombra una carpeta.
        También notifica a los usuarios afectados.

        Args:
            old_path: Ruta original de la carpeta
            new_path: Nueva ruta de la carpeta
            renamed_by: Usuario que realizó el renombrado

        Returns:
            dict con estadísticas de la operación
        """
        from users.models import UserPermission
        from notifications.services import NotificationService

        result = {
            'permissions_updated': 0,
            'users_notified': [],
            'blocked_paths_updated': 0,
            'readonly_paths_updated': 0
        }

        try:
            # Normalizar rutas (asegurar formato consistente)
            old_path = cls._normalize_path(old_path)
            new_path = cls._normalize_path(new_path)

            if old_path == new_path:
                return result

            # === 1. Actualizar base_path de permisos afectados ===
            affected_permissions = UserPermission.objects.filter(
                base_path__startswith=old_path,
                is_active=True
            ).select_related('user')

            for perm in affected_permissions:
                old_base_path = perm.base_path
                # Reemplazar el prefijo old_path por new_path
                new_base_path = perm.base_path.replace(old_path, new_path, 1)

                perm.base_path = new_base_path
                perm.save(update_fields=['base_path'])
                result['permissions_updated'] += 1

                # Notificar al usuario si no es el mismo que renombró
                if perm.user and perm.user != renamed_by and perm.user.is_active:
                    NotificationService.create(
                        recipient=perm.user,
                        notification_type='path_renamed',
                        priority='normal',
                        title='Ruta de acceso actualizada',
                        message=(
                            f'La carpeta "{old_path.split("/")[-1] or old_path}" fue renombrada.\n\n'
                            f'Ruta anterior: {old_base_path}\n'
                            f'Nueva ruta: {new_base_path}\n\n'
                            f'Tu permiso ha sido actualizado automáticamente para que sigas teniendo acceso.'
                        ),
                        related_path=new_base_path,
                        related_object_type='permission',
                        related_object_id=str(perm.id),
                        action_url='/my-permissions',
                        sender=renamed_by
                    )
                    result['users_notified'].append(perm.user.username)

            # === 2. Actualizar blocked_paths y read_only_paths ===
            all_permissions = UserPermission.objects.filter(is_active=True)

            for perm in all_permissions:
                updated = False

                # Actualizar blocked_paths
                if perm.blocked_paths:
                    new_blocked = []
                    for blocked in perm.blocked_paths:
                        if blocked.startswith(old_path):
                            new_blocked.append(blocked.replace(old_path, new_path, 1))
                            updated = True
                            result['blocked_paths_updated'] += 1
                        else:
                            new_blocked.append(blocked)
                    if updated:
                        perm.blocked_paths = new_blocked

                # Actualizar read_only_paths
                readonly_updated = False
                if perm.read_only_paths:
                    new_readonly = []
                    for ro_path in perm.read_only_paths:
                        if ro_path.startswith(old_path):
                            new_readonly.append(ro_path.replace(old_path, new_path, 1))
                            readonly_updated = True
                            result['readonly_paths_updated'] += 1
                        else:
                            new_readonly.append(ro_path)
                    if readonly_updated:
                        perm.read_only_paths = new_readonly
                        updated = True

                if updated:
                    perm.save(update_fields=['blocked_paths', 'read_only_paths'])

            logger.info(
                f"Permisos actualizados por renombrado: "
                f"{result['permissions_updated']} permisos, "
                f"{len(result['users_notified'])} usuarios notificados"
            )

            return result

        except Exception as e:
            logger.exception(f"Error actualizando permisos por renombrado: {e}")
            return {
                'error': str(e),
                **result
            }

    @classmethod
    def _normalize_path(cls, path: str) -> str:
        """Normaliza una ruta para comparaciones consistentes."""
        # Remover barras finales
        path = path.rstrip('/')

        # Convertir backslashes
        path = path.replace('\\', '/')

        # Remover dobles slashes
        while '//' in path:
            path = path.replace('//', '/')

        return path
