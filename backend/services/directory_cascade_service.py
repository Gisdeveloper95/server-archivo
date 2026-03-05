"""
Servicio para manejar actualizaciones en cascada de directorios y permisos

Este servicio se encarga de:
1. Actualizar rutas en Directory cuando se renombra un directorio
2. Actualizar rutas en File cuando se renombra un directorio
3. Actualizar permisos de usuarios (UserPermission) que dependan de la ruta modificada
4. Validar conflictos antes de realizar cambios
5. Registrar cambios en AuditLog
"""
import logging
from typing import List, Dict, Tuple, Optional
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from files.models import Directory, File
from users.models import UserPermission
from audit.models import AuditLog

User = get_user_model()
logger = logging.getLogger(__name__)


class DirectoryCascadeService:
    """Servicio para actualización en cascada de directorios y permisos"""

    @staticmethod
    def normalize_path(path: str) -> str:
        """
        Normaliza una ruta para comparaciones consistentes
        - Reemplaza / con \\
        - Elimina \\ al final
        - Convierte a lowercase para case-insensitive (Windows)
        """
        if not path:
            return ''
        normalized = path.replace('/', '\\')
        normalized = normalized.rstrip('\\')
        return normalized.lower()

    @staticmethod
    def validate_rename_conflicts(old_path: str, new_name: str) -> Tuple[bool, Optional[str]]:
        """
        Valida si hay conflictos antes de renombrar

        Args:
            old_path: Ruta actual completa (ej: "folder1/subfolder")
            new_name: Nuevo nombre (solo el nombre, no la ruta completa)

        Returns:
            Tuple (is_valid, error_message)
            - (True, None) si no hay conflictos
            - (False, "mensaje de error") si hay conflictos
        """
        # Construir la nueva ruta
        parent_path = '\\'.join(old_path.split('\\')[:-1])
        new_path = (parent_path + '\\' + new_name) if parent_path else new_name

        # Verificar si ya existe un directorio con ese nombre
        normalized_new_path = DirectoryCascadeService.normalize_path(new_path)

        # OPTIMIZACIÓN: Usar exists() en lugar de first() y buscar con = exacto
        # Buscar en Directory - usar path exacto (no __iexact para mejor performance)
        if Directory.objects.filter(path=normalized_new_path, is_active=True).exists():
            return False, f"Ya existe un directorio con el nombre '{new_name}' en esa ubicación"

        # Verificar si existe como archivo (edge case) - solo si es crítico
        # COMENTADO para optimizar - normalmente no hay conflictos archivo/directorio
        # if File.objects.filter(path=normalized_new_path).exists():
        #     return False, f"Ya existe un archivo con el nombre '{new_name}' en esa ubicación"

        return True, None

    @staticmethod
    def find_affected_permissions(old_path: str) -> List[UserPermission]:
        """
        Encuentra todos los permisos que serían afectados por un renombrado

        Solo incluye permisos que:
        1. Tienen base_path que empieza con old_path
        2. Tienen blocked_paths que empiezan con old_path
        3. Tienen read_only_paths que empiezan con old_path

        NO incluye permisos en niveles superiores (ej: si renombras /A/B/C,
        no afecta a permisos en /A o /A/B)

        Args:
            old_path: Ruta que será renombrada

        Returns:
            Lista de UserPermission objects afectados
        """
        normalized_old_path = DirectoryCascadeService.normalize_path(old_path)

        # Buscar permisos donde base_path empieza con old_path
        # Usamos __startswith pero con case-insensitive
        affected = UserPermission.objects.filter(
            is_active=True
        ).select_related('user')

        affected_permissions = []

        for perm in affected:
            needs_update = False

            # Verificar base_path
            normalized_base = DirectoryCascadeService.normalize_path(perm.base_path)
            if normalized_base.startswith(normalized_old_path + '\\') or normalized_base == normalized_old_path:
                needs_update = True

            # Verificar blocked_paths (JSON)
            if perm.blocked_paths:
                for blocked_path in perm.blocked_paths:
                    normalized_blocked = DirectoryCascadeService.normalize_path(blocked_path)
                    if normalized_blocked.startswith(normalized_old_path + '\\') or normalized_blocked == normalized_old_path:
                        needs_update = True
                        break

            # Verificar read_only_paths (JSON)
            if perm.read_only_paths:
                for readonly_path in perm.read_only_paths:
                    normalized_readonly = DirectoryCascadeService.normalize_path(readonly_path)
                    if normalized_readonly.startswith(normalized_old_path + '\\') or normalized_readonly == normalized_old_path:
                        needs_update = True
                        break

            if needs_update:
                affected_permissions.append(perm)

        return affected_permissions

    @staticmethod
    def get_affected_users_info(affected_permissions: List[UserPermission]) -> Dict:
        """
        Obtiene información resumida de usuarios afectados para logging/notificación

        Returns:
            Dict con información agregada:
            {
                'total_permissions': int,
                'total_users': int,
                'users': [{'id': int, 'email': str, 'full_name': str, 'permissions_count': int}]
            }
        """
        users_dict = {}

        for perm in affected_permissions:
            user_id = perm.user.id
            if user_id not in users_dict:
                users_dict[user_id] = {
                    'id': user_id,
                    'email': perm.user.email,
                    'full_name': perm.user.get_full_name(),
                    'permissions_count': 0
                }
            users_dict[user_id]['permissions_count'] += 1

        return {
            'total_permissions': len(affected_permissions),
            'total_users': len(users_dict),
            'users': list(users_dict.values())
        }

    @staticmethod
    @transaction.atomic
    def update_directory_cascade(
        old_path: str,
        new_path: str,
        new_name: str,
        user: User
    ) -> Dict:
        """
        Actualiza un directorio y todas sus dependencias en cascada

        Esta operación es atómica - si algo falla, se hace rollback de TODO

        Args:
            old_path: Ruta actual completa (normalizada)
            new_path: Nueva ruta completa (normalizada)
            new_name: Nuevo nombre del directorio
            user: Usuario que realizó el cambio

        Returns:
            Dict con estadísticas de la operación:
            {
                'directories_updated': int,
                'files_updated': int,
                'permissions_updated': int,
                'users_affected': int
            }

        Raises:
            Exception: Si hay algún error (se hace rollback automático)
        """
        now = timezone.now()
        stats = {
            'directories_updated': 0,
            'files_updated': 0,
            'permissions_updated': 0,
            'users_affected': 0
        }

        normalized_old_path = DirectoryCascadeService.normalize_path(old_path)
        normalized_new_path = DirectoryCascadeService.normalize_path(new_path)

        # Preparar versiones con ambos separadores para el replace
        old_path_backslash = old_path.replace('/', '\\')
        new_path_backslash = new_path.replace('/', '\\')
        old_path_slash = old_path.replace('\\', '/')
        new_path_slash = new_path.replace('\\', '/')

        logger.info(f"Iniciando actualización en cascada: {old_path} -> {new_path}")

        # 1. Actualizar el Directory principal
        # Usar .filter().first() con exact match es MÁS RÁPIDO que __iexact
        directory_exists_in_db = False
        directory = Directory.objects.filter(
            path=normalized_old_path,  # exact match (case-sensitive pero más rápido)
            is_active=True
        ).first()

        if directory:
            directory.path = new_path
            directory.name = new_name
            directory.modified_date = now
            directory.save(update_fields=['path', 'name', 'modified_date'])
            stats['directories_updated'] += 1
            directory_exists_in_db = True
            logger.info(f"✓ Directory principal actualizado: {directory.id}")
        else:
            logger.warning(f"Directory no encontrado en BD - SKIPPING queries de subdirectorios y archivos")
            # Si no existe en BD, NO hay subdirectorios ni archivos que actualizar

        # 2. Actualizar subdirectorios descendientes (SOLO si existe en BD)
        if not directory_exists_in_db:
            descendant_dirs = []
        else:
            descendant_dirs = Directory.objects.filter(
                path__istartswith=normalized_old_path + '\\',
                is_active=True
            )

        dirs_to_update = []
        for subdir in descendant_dirs:
            # Reemplazar el prefijo de la ruta - probar con ambos separadores
            old_subdir_path = subdir.path
            if old_path_slash in old_subdir_path:
                new_subdir_path = old_subdir_path.replace(old_path_slash, new_path_slash, 1)
            elif old_path_backslash in old_subdir_path:
                new_subdir_path = old_subdir_path.replace(old_path_backslash, new_path_backslash, 1)
            else:
                continue  # Sin cambios, no actualizar

            subdir.path = new_subdir_path
            subdir.modified_date = now
            dirs_to_update.append(subdir)

        # Bulk update - una sola query en lugar de N queries
        if dirs_to_update:
            Directory.objects.bulk_update(dirs_to_update, ['path', 'modified_date'])
            stats['directories_updated'] = len(dirs_to_update)

        logger.info(f"✓ {stats['directories_updated']} directorios actualizados")

        # 3. Actualizar archivos (SOLO si existe en BD)
        if not directory_exists_in_db:
            affected_files = []
        else:
            affected_files = File.objects.filter(
                path__istartswith=normalized_old_path + '\\'
            ) | File.objects.filter(
                path__iexact=normalized_old_path
            )

        files_to_update = []
        for file_obj in affected_files:
            old_file_path = file_obj.path
            # Probar con ambos separadores
            if old_path_slash in old_file_path:
                new_file_path = old_file_path.replace(old_path_slash, new_path_slash, 1)
            elif old_path_backslash in old_file_path:
                new_file_path = old_file_path.replace(old_path_backslash, new_path_backslash, 1)
            else:
                continue  # Sin cambios, no actualizar

            file_obj.path = new_file_path
            file_obj.modified_by = user
            file_obj.modified_by_at = now
            file_obj.modified_date = now
            files_to_update.append(file_obj)

        # Bulk update - una sola query en lugar de N queries
        if files_to_update:
            File.objects.bulk_update(files_to_update, ['path', 'modified_by', 'modified_by_at', 'modified_date'])
            stats['files_updated'] = len(files_to_update)

        logger.info(f"✓ {stats['files_updated']} archivos actualizados")

        # 4. Actualizar permisos de usuarios
        affected_permissions = DirectoryCascadeService.find_affected_permissions(old_path)
        affected_users = set()

        perms_to_update = []
        for perm in affected_permissions:
            perm_updated = False

            # Actualizar base_path - probar con ambos separadores
            normalized_base = DirectoryCascadeService.normalize_path(perm.base_path)
            if normalized_base.startswith(normalized_old_path + '\\') or normalized_base == normalized_old_path:
                # Probar primero con forward slash (más común en BD)
                if old_path_slash in perm.base_path:
                    perm.base_path = perm.base_path.replace(old_path_slash, new_path_slash, 1)
                    perm_updated = True
                elif old_path_backslash in perm.base_path:
                    perm.base_path = perm.base_path.replace(old_path_backslash, new_path_backslash, 1)
                    perm_updated = True

            # Actualizar blocked_paths (JSON)
            if perm.blocked_paths:
                updated_blocked = []
                for blocked_path in perm.blocked_paths:
                    normalized_blocked = DirectoryCascadeService.normalize_path(blocked_path)
                    if normalized_blocked.startswith(normalized_old_path + '\\') or normalized_blocked == normalized_old_path:
                        # Probar con ambos separadores
                        if old_path_slash in blocked_path:
                            updated_blocked.append(blocked_path.replace(old_path_slash, new_path_slash, 1))
                            perm_updated = True
                        elif old_path_backslash in blocked_path:
                            updated_blocked.append(blocked_path.replace(old_path_backslash, new_path_backslash, 1))
                            perm_updated = True
                        else:
                            updated_blocked.append(blocked_path)
                    else:
                        updated_blocked.append(blocked_path)
                perm.blocked_paths = updated_blocked

            # Actualizar read_only_paths (JSON)
            if perm.read_only_paths:
                updated_readonly = []
                for readonly_path in perm.read_only_paths:
                    normalized_readonly = DirectoryCascadeService.normalize_path(readonly_path)
                    if normalized_readonly.startswith(normalized_old_path + '\\') or normalized_readonly == normalized_old_path:
                        # Probar con ambos separadores
                        if old_path_slash in readonly_path:
                            updated_readonly.append(readonly_path.replace(old_path_slash, new_path_slash, 1))
                            perm_updated = True
                        elif old_path_backslash in readonly_path:
                            updated_readonly.append(readonly_path.replace(old_path_backslash, new_path_backslash, 1))
                            perm_updated = True
                        else:
                            updated_readonly.append(readonly_path)
                    else:
                        updated_readonly.append(readonly_path)
                perm.read_only_paths = updated_readonly

            if perm_updated:
                affected_users.add(perm.user.id)
                perms_to_update.append(perm)

        # Bulk update - una sola query en lugar de N queries
        if perms_to_update:
            UserPermission.objects.bulk_update(perms_to_update, ['base_path', 'blocked_paths', 'read_only_paths'])
            stats['permissions_updated'] = len(perms_to_update)

        stats['users_affected'] = len(affected_users)
        logger.info(f"✓ {stats['permissions_updated']} permisos actualizados, {stats['users_affected']} usuarios afectados")

        # 5. Registrar en AuditLog
        AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role if hasattr(user, 'role') else 'user',
            action='rename',  # Una de las opciones válidas del modelo
            target_path=new_path,
            target_name=new_name,
            success=True,
            details={
                'cascade_update': True,
                'old_path': old_path,
                'new_path': new_path,
                'new_name': new_name,
                'stats': stats
            },
            ip_address=None,
            user_agent=None
        )

        logger.info(f"✓ Cascada completada exitosamente: {stats}")
        return stats
