"""
Servicio para gestión de permisos jerárquicos
"""
from users.models import UserPermission

# Configuración de DEBUG - Cambiar a True para activar logs detallados
DEBUG_PERMISSIONS = False


class PermissionService:
    """Gestiona la lógica de permisos jerárquicos"""

    @staticmethod
    def normalize_path(path):
        """
        Normaliza una ruta para comparaciones consistentes

        Args:
            path: Ruta a normalizar

        Returns:
            str: Ruta normalizada con forward slashes y sin trailing slash
        """
        if not path:
            return ''

        # Convertir todos los backslashes a forward slashes (para compatibilidad Linux)
        normalized = path.replace('\\', '/')

        # Eliminar trailing slash (excepto para rutas raíz)
        if normalized.endswith('/') and normalized.count('/') > 1:
            normalized = normalized.rstrip('/')

        return normalized

    @staticmethod
    def get_path_depth(base_path, full_path):
        """
        Calcula la profundidad de una ruta respecto a su base

        Args:
            base_path: Ruta base del permiso
            full_path: Ruta completa a verificar

        Returns:
            int: Número de niveles de profundidad (0 = mismo nivel)
        """
        base = PermissionService.normalize_path(base_path)
        full = PermissionService.normalize_path(full_path)

        # Si no está dentro del base_path, retornar -1
        if not full.startswith(base):
            return -1

        # Obtener la parte relativa
        if base:
            relative = full[len(base):].lstrip('/')
        else:
            relative = full

        # Contar niveles
        if not relative:
            return 0

        return relative.count('/') + 1

    @staticmethod
    def is_path_blocked(perm, path):
        """
        Verifica si una ruta está bloqueada según las restricciones del permiso

        Args:
            perm: Objeto UserPermission
            path: Ruta a verificar

        Returns:
            bool: True si la ruta está bloqueada
        """
        normalized_path = PermissionService.normalize_path(path)
        base_path = PermissionService.normalize_path(perm.base_path)

        if DEBUG_PERMISSIONS:
            print(f"\n  [DEBUG is_path_blocked] Verificando si '{normalized_path}' esta bloqueado")
        if DEBUG_PERMISSIONS:
            print(f"  [DEBUG is_path_blocked] Base path del permiso: '{base_path}'")
        if DEBUG_PERMISSIONS:
            print(f"  [DEBUG is_path_blocked] Inheritance mode: {perm.inheritance_mode}")

        # SIEMPRE verificar blocked_paths (independiente del inheritance_mode)
        blocked_paths = perm.blocked_paths or []
        if blocked_paths:
            if DEBUG_PERMISSIONS:
                print(f"  [DEBUG is_path_blocked] Blocked paths raw: {blocked_paths}")

            for blocked in blocked_paths:
                # Normalizar ruta bloqueada
                blocked_normalized = PermissionService.normalize_path(blocked)

                if DEBUG_PERMISSIONS:
                    print(f"    [DEBUG] Procesando blocked path: '{blocked}'")
                if DEBUG_PERMISSIONS:
                    print(f"    [DEBUG] Blocked normalizado: '{blocked_normalized}'")

                # Extraer la parte relativa después de Sub_Proy
                blocked_relative = None

                if '/Sub_Proy/' in blocked_normalized:
                    # Ruta absoluta - extraer la parte después de Sub_Proy
                    blocked_relative = blocked_normalized.split('/Sub_Proy/')[-1]
                    if DEBUG_PERMISSIONS:
                        print(f"    [DEBUG] Ruta absoluta detectada, parte relativa: '{blocked_relative}'")
                elif blocked_normalized.startswith('//') or blocked_normalized.startswith('/mnt/'):
                    # Ruta absoluta sin Sub_Proy - puede ser que este mal formada
                    if DEBUG_PERMISSIONS:
                        print(f"    [DEBUG] Ruta absoluta sin Sub_Proy: '{blocked_normalized}'")
                    continue
                else:
                    # Ya es relativa
                    blocked_relative = blocked_normalized
                    if DEBUG_PERMISSIONS:
                        print(f"    [DEBUG] Ya es ruta relativa: '{blocked_relative}'")

                # Normalizar la parte relativa
                blocked_relative = PermissionService.normalize_path(blocked_relative)
                if DEBUG_PERMISSIONS:
                    print(f"    [DEBUG] Blocked relative normalizado: '{blocked_relative}'")

                # Ahora comparar la ruta normalizada del request con la parte relativa bloqueada
                # Ejemplo:
                # normalized_path = '05_grup_trab\\11_gest_info\\2025\\06_arch\\jose_aguilar'
                # blocked_relative = '05_grup_trab\\11_gest_info\\2025\\06_arch\\jose_aguilar'
                # Estos deben coincidir exactamente o normalized_path debe ser hijo de blocked_relative

                is_exact_match = normalized_path == blocked_relative
                is_child = normalized_path.startswith(blocked_relative + '/')
                is_match = is_exact_match or is_child

                if DEBUG_PERMISSIONS:
                    print(f"    [DEBUG] Comparando:")
                    print(f"      normalized_path: '{normalized_path}'")
                    print(f"      blocked_relative: '{blocked_relative}'")
                    print(f"      is_exact_match: {is_exact_match}")
                    print(f"      is_child: {is_child}")
                    print(f"      is_match: {is_match}")

                if is_match:
                    if DEBUG_PERMISSIONS:
                        print(f"    [DEBUG] BLOQUEADO!")
                    return True

        # SIEMPRE verificar profundidad máxima (independiente del inheritance_mode)
        if perm.max_depth is not None:
            depth = PermissionService.get_path_depth(base_path, normalized_path)
            if DEBUG_PERMISSIONS:
                print(f"  [DEBUG is_path_blocked] Profundidad: {depth}, Max permitida: {perm.max_depth}")
            if depth > perm.max_depth:
                if DEBUG_PERMISSIONS:
                    print(f"  [DEBUG is_path_blocked] BLOQUEADO por profundidad!")
                return True

        if DEBUG_PERMISSIONS:
            print(f"  [DEBUG is_path_blocked] NO esta bloqueado")
        return False

    @staticmethod
    def is_path_read_only(perm, path):
        """
        Verifica si una ruta tiene restricciones de solo lectura

        Args:
            perm: Objeto UserPermission
            path: Ruta a verificar

        Returns:
            bool: True si la ruta es de solo lectura (no puede escribir/eliminar)
        """
        normalized_path = PermissionService.normalize_path(path)
        base_path = PermissionService.normalize_path(perm.base_path)

        if DEBUG_PERMISSIONS:
            print(f"\n  [DEBUG is_path_read_only] Verificando si '{normalized_path}' es solo lectura")
        if DEBUG_PERMISSIONS:
            print(f"  [DEBUG is_path_read_only] Base path del permiso: '{base_path}'")
        if DEBUG_PERMISSIONS:
            print(f"  [DEBUG is_path_read_only] Inheritance mode: {perm.inheritance_mode}")

        # SIEMPRE verificar read_only_paths (independiente del inheritance_mode)
        read_only_paths = perm.read_only_paths or []
        if read_only_paths:
            if DEBUG_PERMISSIONS:
                print(f"  [DEBUG is_path_read_only] Read-only paths raw: {read_only_paths}")

            for read_only in read_only_paths:
                # Normalizar ruta de solo lectura
                read_only_normalized = PermissionService.normalize_path(read_only)

                if DEBUG_PERMISSIONS:
                    print(f"    [DEBUG] Procesando read-only path: '{read_only}'")
                if DEBUG_PERMISSIONS:
                    print(f"    [DEBUG] Read-only normalizado: '{read_only_normalized}'")

                # Estrategia: Buscar el base_path dentro de la ruta read_only para extraer solo la parte después
                read_only_relative = None

                # Normalizar base_path para que ambos usen backslashes
                base_path_normalized = PermissionService.normalize_path(base_path) if base_path else ''

                # Si la ruta read_only contiene el base_path, extraer la parte que viene después
                if base_path_normalized and base_path_normalized in read_only_normalized:
                    # Encontrar dónde termina el base_path en la ruta read_only
                    base_path_index = read_only_normalized.find(base_path_normalized)
                    # Tomar todo lo que viene después del base_path
                    read_only_relative = read_only_normalized[base_path_index:]
                    if DEBUG_PERMISSIONS:
                        print(f"    [DEBUG] base_path encontrado en read_only, extrayendo: '{read_only_relative}'")
                elif '/Sub_Proy/' in read_only_normalized:
                    # Ruta absoluta - extraer la parte después de Sub_Proy
                    read_only_relative = read_only_normalized.split('/Sub_Proy/')[-1]
                    if DEBUG_PERMISSIONS:
                        print(f"    [DEBUG] Ruta con Sub_Proy, parte relativa: '{read_only_relative}'")
                elif read_only_normalized.startswith('//') or read_only_normalized.startswith('/mnt/'):
                    # Ruta absoluta - intentar encontrar alguna coincidencia parcial con normalized_path
                    # Tomar la última parte de la ruta
                    parts = read_only_normalized.split('/')
                    # Si normalized_path está al final de la ruta absoluta, buscar coincidencia
                    for i in range(len(parts)):
                        potential_relative = '/'.join(parts[i:])
                        if potential_relative and (normalized_path == potential_relative or normalized_path.startswith(potential_relative + '/')):
                            read_only_relative = potential_relative
                            if DEBUG_PERMISSIONS:
                                print(f"    [DEBUG] Coincidencia encontrada, usando: '{read_only_relative}'")
                            break

                    if not read_only_relative:
                        if DEBUG_PERMISSIONS:
                            print(f"    [DEBUG] No se pudo extraer parte relativa de ruta absoluta: '{read_only_normalized}'")
                        continue
                else:
                    # Ya es relativa
                    read_only_relative = read_only_normalized
                    if DEBUG_PERMISSIONS:
                        print(f"    [DEBUG] Ya es ruta relativa: '{read_only_relative}'")

                # Normalizar la parte relativa
                read_only_relative = PermissionService.normalize_path(read_only_relative)
                if DEBUG_PERMISSIONS:
                    print(f"    [DEBUG] Read-only relative normalizado final: '{read_only_relative}'")

                # Comparar rutas
                # La ruta que llega (normalized_path) es relativa
                # La ruta de solo lectura (read_only_relative) también debe ser relativa ahora
                is_exact_match = normalized_path == read_only_relative
                is_child = normalized_path.startswith(read_only_relative + '/')
                is_match = is_exact_match or is_child

                if DEBUG_PERMISSIONS:
                    print(f"    [DEBUG] Comparando:")
                    print(f"      normalized_path: '{normalized_path}'")
                    print(f"      read_only_relative: '{read_only_relative}'")
                    print(f"      is_exact_match: {is_exact_match}")
                    print(f"      is_child: {is_child}")
                    print(f"      is_match: {is_match}")

                if is_match:
                    if DEBUG_PERMISSIONS:
                        print(f"    [DEBUG] SOLO LECTURA!")
                    return True

        if DEBUG_PERMISSIONS:
            print(f"  [DEBUG is_path_read_only] NO es solo lectura")
        return False

    @staticmethod
    def can_access_path(user, path, action='read'):
        """
        Verifica si el usuario puede acceder a una ruta

        Args:
            user: Usuario
            path: Ruta completa
            action: 'read', 'write', 'delete'

        Returns:
            bool: True si tiene permiso
        """
        try:
            # Superadmin siempre tiene acceso total
            if user.role == 'superadmin':
                return True

            # Normalizar ruta
            normalized_path = PermissionService.normalize_path(path)

            # Admin tiene acceso total dentro de sus rutas base (ignora restricciones granulares)
            if user.role == 'admin':
                permissions = UserPermission.objects.filter(
                    user=user,
                    is_active=True
                )

                for perm in permissions:
                    try:
                        # Verificar vencimiento y desactivar automáticamente si es necesario
                        if perm.is_expired():
                            continue  # Este permiso está vencido, saltar
                        base_path = PermissionService.normalize_path(perm.base_path)

                        if normalized_path.startswith(base_path) or normalized_path == base_path:
                            # Admin ignora blocked_paths, inheritance_mode, max_depth, etc.
                            if action == 'read' and perm.can_read:
                                return True
                            elif action == 'write' and perm.can_write:
                                return True
                            elif action == 'delete' and perm.can_delete:
                                return True
                    except Exception as e:
                        if DEBUG_PERMISSIONS:
                            print(f"[ERROR can_access_path] Error procesando permiso admin {perm.id}: {e}")
                        import traceback
                        traceback.print_exc()
                        continue

                return False

            # Para roles normales (consultation, consultation_edit): aplicar restricciones granulares
            permissions = UserPermission.objects.filter(
                user=user,
                is_active=True
            )

            # PASO 1: Verificar si algún permiso MÁS ESPECÍFICO bloquea esta ruta
            # Ordenar permisos por especificidad (más específicos primero)
            applicable_permissions = []
            for perm in permissions:
                try:
                    if perm.is_expired():
                        continue

                    base_path = PermissionService.normalize_path(perm.base_path)

                    # Solo considerar permisos que aplican a esta ruta
                    if normalized_path.startswith(base_path) or normalized_path == base_path:
                        applicable_permissions.append({
                            'perm': perm,
                            'base_path': base_path,
                            'specificity': len(base_path)  # Rutas más largas son más específicas
                        })
                except Exception as e:
                    if DEBUG_PERMISSIONS:
                        print(f"[ERROR can_access_path] Error al filtrar permiso {perm.id}: {e}")
                    continue

            if not applicable_permissions:
                return False

            # Ordenar por especificidad (más específico primero)
            applicable_permissions.sort(key=lambda x: x['specificity'], reverse=True)

            if DEBUG_PERMISSIONS:
                print(f"\n[DEBUG can_access_path] Usuario: {user.username}, path: '{normalized_path}', action: '{action}'")
            if DEBUG_PERMISSIONS:
                print(f"[DEBUG can_access_path] Permisos aplicables: {len(applicable_permissions)}")
                for ap in applicable_permissions:
                    print(f"  - Permiso ID {ap['perm'].id}: base_path='{ap['base_path']}' (especificidad: {ap['specificity']})")

            # PASO 2: Verificar bloqueos en orden de especificidad
            # Si un permiso más específico bloquea, debe mantenerse bloqueado
            for ap in applicable_permissions:
                perm = ap['perm']
                base_path = ap['base_path']

                try:
                    # Si este permiso bloquea la ruta, DENEGAR acceso inmediatamente
                    if PermissionService.is_path_blocked(perm, normalized_path):
                        if DEBUG_PERMISSIONS:
                            print(f"[DEBUG can_access_path] Ruta BLOQUEADA por permiso {perm.id} (base_path: '{base_path}')")
                        return False  # Bloqueo tiene prioridad
                except Exception as e:
                    if DEBUG_PERMISSIONS:
                        print(f"[ERROR can_access_path] Error verificando bloqueo en permiso {perm.id}: {e}")
                    continue

            # PASO 3: Verificar read-only PRIMERO en todos los permisos específicos
            # Si CUALQUIER permiso marca la ruta como solo lectura para escritura, DENEGAR inmediatamente
            if action in ['write', 'delete', 'create_directories']:
                for ap in applicable_permissions:
                    perm = ap['perm']
                    try:
                        if PermissionService.is_path_read_only(perm, normalized_path):
                            if DEBUG_PERMISSIONS:
                                print(f"[DEBUG can_access_path] Accion '{action}' DENEGADA FINALMENTE - ruta es SOLO LECTURA por permiso {perm.id}")
                            if DEBUG_PERMISSIONS:
                                print(f"[DEBUG can_access_path] Un permiso más específico marcó esta ruta como solo lectura, DENEGAR acceso")
                            return False  # DENEGAR inmediatamente, sin permitir otros permisos
                    except Exception as e:
                        if DEBUG_PERMISSIONS:
                            print(f"[ERROR can_access_path] Error verificando read-only en permiso {perm.id}: {e}")
                        continue

            # PASO 4: Si NO es solo lectura, verificar si algún permiso concede acceso
            for ap in applicable_permissions:
                perm = ap['perm']
                base_path = ap['base_path']

                try:
                    # Verificar permiso básico solicitado
                    if action == 'read' and perm.can_read:
                        if DEBUG_PERMISSIONS:
                            print(f"[DEBUG can_access_path] Acceso CONCEDIDO por permiso {perm.id} (base_path: '{base_path}')")
                        return True
                    elif action == 'write' and perm.can_write:
                        if DEBUG_PERMISSIONS:
                            print(f"[DEBUG can_access_path] Acceso CONCEDIDO por permiso {perm.id} (base_path: '{base_path}')")
                        return True
                    elif action == 'delete' and perm.can_delete:
                        if DEBUG_PERMISSIONS:
                            print(f"[DEBUG can_access_path] Acceso CONCEDIDO por permiso {perm.id} (base_path: '{base_path}')")
                        return True
                    elif action == 'create_directories' and perm.can_create_directories:
                        if DEBUG_PERMISSIONS:
                            print(f"[DEBUG can_access_path] Acceso CONCEDIDO por permiso {perm.id} (base_path: '{base_path}')")
                        return True
                except Exception as e:
                    if DEBUG_PERMISSIONS:
                        print(f"[ERROR can_access_path] Error verificando acceso en permiso {perm.id}: {e}")
                    continue

            if DEBUG_PERMISSIONS:
                print(f"[DEBUG can_access_path] Acceso DENEGADO - ningun permiso concede '{action}'")
            return False

        except Exception as e:
            if DEBUG_PERMISSIONS:
                print(f"[ERROR can_access_path] Error general verificando permisos para usuario {user.username}, path '{path}', action '{action}': {e}")
            import traceback
            traceback.print_exc()
            return False

    @staticmethod
    def get_path_permissions_detail(user, path):
        """
        Retorna detalles granulares de permisos para una ruta específica

        Args:
            user: Usuario
            path: Ruta a verificar

        Returns:
            dict: Diccionario con permisos detallados
            {
                'can_read': bool,
                'can_write': bool,
                'can_delete': bool,
                'can_create_directories': bool,
                'read_only_mode': bool  # True si está en modo solo lectura
            }
        """
        try:
            # Superadmin tiene todos los permisos
            if user.role == 'superadmin':
                return {
                    'can_read': True,
                    'can_write': True,
                    'can_delete': True,
                    'can_create_directories': True,
                    'read_only_mode': False
                }

            # Inicializar permisos
            result = {
                'can_read': PermissionService.can_access_path(user, path, 'read'),
                'can_write': PermissionService.can_access_path(user, path, 'write'),
                'can_delete': PermissionService.can_access_path(user, path, 'delete'),
                'can_create_directories': PermissionService.can_access_path(user, path, 'create_directories'),
                'read_only_mode': False
            }

            # Verificar si está en modo solo lectura
            # (puede leer pero no puede escribir/eliminar/crear)
            if result['can_read'] and not result['can_write'] and not result['can_delete'] and not result['can_create_directories']:
                result['read_only_mode'] = True

            return result

        except Exception as e:
            if DEBUG_PERMISSIONS:
                print(f"[ERROR get_path_permissions_detail] Error obteniendo detalles de permisos: {e}")
            return {
                'can_read': False,
                'can_write': False,
                'can_delete': False,
                'can_create_directories': False,
                'read_only_mode': False
            }

    @staticmethod
    def get_accessible_paths(user):
        """Retorna todas las rutas accesibles para un usuario"""
        if user.role == 'superadmin':
            return ['/mnt/repositorio']  # Acceso total

        permissions = UserPermission.objects.filter(
            user=user,
            is_active=True,
            can_read=True
        )

        # Filtrar permisos vencidos
        accessible_paths = []
        for perm in permissions:
            if not perm.is_expired():
                accessible_paths.append(perm.base_path)

        return accessible_paths

    @staticmethod
    def get_parent_paths(path):
        """
        Retorna todos los paths padres de una ruta

        Ejemplo:
        Input: /mnt/repositorio/dir1/dir2/file.txt
        Output: ['/mnt/repositorio', '/mnt/repositorio/dir1', '/mnt/repositorio/dir1/dir2']
        """
        import os
        parts = path.split('/')
        parents = []

        for i in range(1, len(parts)):
            parent = '/'.join(parts[:i+1])
            if parent:
                parents.append(parent)

        return parents

    @staticmethod
    def can_navigate_to_parent(user, path):
        """
        Verifica si el usuario puede navegar hacia arriba

        Permite navegar a padres aunque no tenga permisos explícitos,
        siempre que tenga permiso a algún hijo
        """
        if user.role == 'superadmin':
            return True

        # Obtener todos los permisos del usuario
        user_paths = PermissionService.get_accessible_paths(user)

        # Verificar si algún permiso es hijo de la ruta actual
        for user_path in user_paths:
            if user_path.startswith(path):
                return True

        return False

    @staticmethod
    def filter_accessible_items(user, items, base_path):
        """
        Filtra items según permisos del usuario aplicando restricciones granulares

        Args:
            user: Usuario
            items: Lista de archivos/directorios
            base_path: Ruta base actual

        Returns:
            list: Items filtrados según permisos (excluye bloqueados y fuera de profundidad)
        """
        if DEBUG_PERMISSIONS:
            print(f"\n[DEBUG filter_accessible_items] Usuario: {user.username}, base_path: '{base_path}'")

        if user.role == 'superadmin':
            if DEBUG_PERMISSIONS:
                print("[DEBUG] Superadmin - retornando todos los items")
            return items

        # Normalizar base_path
        normalized_base = PermissionService.normalize_path(base_path)
        if DEBUG_PERMISSIONS:
            print(f"[DEBUG] Base path normalizado: '{normalized_base}'")

        accessible = []

        # Obtener permisos activos del usuario
        permissions = UserPermission.objects.filter(
            user=user,
            is_active=True,
            can_read=True  # Solo consideramos permisos de lectura para navegación
        )

        if DEBUG_PERMISSIONS:
            print(f"[DEBUG] Permisos encontrados: {permissions.count()}")
            for perm in permissions:
                print(f"  - base_path: '{perm.base_path}', inheritance_mode: {perm.inheritance_mode}, blocked_paths: {perm.blocked_paths}")

        for item in items:
            # Construir ruta completa del item
            if normalized_base:
                item_path = f"{normalized_base}/{item['name']}"
            else:
                item_path = item['name']

            item_path = PermissionService.normalize_path(item_path)

            if DEBUG_PERMISSIONS:
                print(f"\n[DEBUG] Verificando item: '{item['name']}'")
                print(f"  - Item path completo: '{item_path}'")

            # Verificar si el usuario tiene acceso a este item
            has_access = False

            for perm in permissions:
                perm_base = PermissionService.normalize_path(perm.base_path)

                # Verificar si el item está dentro del alcance del permiso
                # Puede ser:
                # 1. Item dentro del base_path del permiso
                # 2. Item es padre de un base_path (para permitir navegación hacia abajo)
                is_within_permission = (
                    item_path.startswith(perm_base) or
                    item_path == perm_base or
                    perm_base.startswith(item_path)
                )

                if DEBUG_PERMISSIONS:
                    print(f"  - Comparando con permiso base: '{perm_base}'")
                    print(f"    - is_within_permission: {is_within_permission}")

                if is_within_permission:
                    # Para usuarios admin: acceso total sin restricciones granulares
                    if user.role == 'admin':
                        has_access = True
                        if DEBUG_PERMISSIONS:
                            print(f"    - ACCESO CONCEDIDO (admin)")
                        break

                    # Para usuarios normales: verificar restricciones granulares
                    # Solo aplicar restricciones si el item está DENTRO del base_path (no si es padre)
                    if item_path.startswith(perm_base) or item_path == perm_base:
                        # Verificar si está bloqueado
                        is_blocked = PermissionService.is_path_blocked(perm, item_path)
                        if DEBUG_PERMISSIONS:
                            print(f"    - is_path_blocked: {is_blocked}")
                        if is_blocked:
                            # Este item está bloqueado por este permiso
                            if DEBUG_PERMISSIONS:
                                print(f"    - BLOQUEADO!")
                            continue  # Probar con siguiente permiso

                    # Si llegamos aquí, tiene acceso
                    has_access = True
                    if DEBUG_PERMISSIONS:
                        print(f"    - ACCESO CONCEDIDO")
                    break

            if has_access:
                # Agregar permisos específicos del item al diccionario
                # Solo verificar permisos para directorios, para archivos usar permisos del padre
                if item.get('is_directory'):
                    item_permissions = PermissionService.get_path_permissions_detail(user, item_path)
                    item['can_write'] = item_permissions.get('can_write', False)
                    item['can_delete'] = item_permissions.get('can_delete', False)
                    item['can_rename'] = item_permissions.get('can_write', False)  # Renombrar requiere write
                    item['read_only_mode'] = item_permissions.get('read_only_mode', False)
                else:
                    # Para archivos, usar los permisos del directorio padre (base_path actual)
                    parent_permissions = PermissionService.get_path_permissions_detail(user, normalized_base)
                    item['can_write'] = parent_permissions.get('can_write', False)
                    item['can_delete'] = parent_permissions.get('can_delete', False)
                    item['can_rename'] = parent_permissions.get('can_write', False)
                    item['read_only_mode'] = parent_permissions.get('read_only_mode', False)

                accessible.append(item)
                if DEBUG_PERMISSIONS:
                    print(f"  [OK] Item accesible: '{item['name']}' (can_write={item.get('can_write')}, can_delete={item.get('can_delete')})")
            else:
                if DEBUG_PERMISSIONS:
                    print(f"  [BLOCKED] Item bloqueado: '{item['name']}'")

        if DEBUG_PERMISSIONS:
            print(f"\n[DEBUG] Total items accesibles: {len(accessible)} de {len(items)}")
        return accessible

    @staticmethod
    def can_modify_or_delete_item(user, path, owner_user, action='delete'):
        """
        Verifica si el usuario puede modificar o eliminar un archivo/directorio específico
        teniendo en cuenta el edit_permission_level y el propietario del item.

        Args:
            user: Usuario que intenta realizar la acción
            path: Ruta completa del archivo/directorio
            owner_user: Usuario que creó/subió el archivo (puede ser None)
            action: 'delete' o 'write'

        Returns:
            dict: {'allowed': bool, 'reason': str}
        """
        # Superadmin siempre puede
        if user.role == 'superadmin':
            return {'allowed': True, 'reason': 'Superadmin'}

        # Admin puede todo dentro de sus rutas (ya verificado por can_access_path)
        if user.role == 'admin':
            return {'allowed': True, 'reason': 'Admin'}

        # Para consultation_edit: verificar edit_permission_level
        if user.role == 'consultation_edit':
            from django.conf import settings
            import os

            # Normalizar el path y convertirlo a ruta absoluta
            normalized_path = PermissionService.normalize_path(path)
            # Si el path no empieza con el base, agregar el NETAPP_BASE_PATH
            if not normalized_path.startswith('/mnt/'):
                normalized_path = os.path.normpath(os.path.join(settings.NETAPP_BASE_PATH, normalized_path))
                normalized_path = PermissionService.normalize_path(normalized_path)
            print(f"[DEBUG can_modify_or_delete_item] normalized_path: '{normalized_path}'")

            # Obtener permisos aplicables
            permissions = UserPermission.objects.filter(
                user=user,
                is_active=True
            )
            print(f"[DEBUG can_modify_or_delete_item] Total permisos del usuario: {permissions.count()}")

            for perm in permissions:
                print(f"[DEBUG can_modify_or_delete_item] Evaluando permiso ID {perm.id}")

                if perm.is_expired():
                    print(f"[DEBUG can_modify_or_delete_item]   - Permiso expirado, saltar")
                    continue

                # Construir base_path como ruta absoluta para que coincida con normalized_path
                base_path_relative = PermissionService.normalize_path(perm.base_path)
                base_path = os.path.normpath(os.path.join(settings.NETAPP_BASE_PATH, base_path_relative))
                base_path = PermissionService.normalize_path(base_path)
                print(f"[DEBUG can_modify_or_delete_item]   - base_path (absoluta): '{base_path}'")

                # Solo considerar permisos que aplican a esta ruta
                if not (normalized_path.startswith(base_path) or normalized_path == base_path):
                    print(f"[DEBUG can_modify_or_delete_item]   - Ruta no aplica, saltar")
                    continue

                print(f"[DEBUG can_modify_or_delete_item]   - Permiso aplica a esta ruta!")
                print(f"[DEBUG can_modify_or_delete_item]   - can_delete: {perm.can_delete}")
                print(f"[DEBUG can_modify_or_delete_item]   - can_write: {perm.can_write}")

                # Verificar el permiso básico primero
                if action == 'delete' and not perm.can_delete:
                    print(f"[DEBUG can_modify_or_delete_item]   - NO tiene can_delete, saltar")
                    continue
                if action == 'write' and not perm.can_write:
                    print(f"[DEBUG can_modify_or_delete_item]   - NO tiene can_write, saltar")
                    continue

                # Verificar edit_permission_level
                level = perm.edit_permission_level or 'upload_only'
                print(f"[DEBUG can_modify_or_delete_item]   - edit_permission_level: '{level}'")

                if level == 'upload_only':
                    # No puede modificar ni eliminar nada
                    return {
                        'allowed': False,
                        'reason': 'El nivel de edición "Solo Subir" no permite modificar ni eliminar archivos'
                    }

                elif level == 'upload_own':
                    # Solo puede modificar/eliminar propios
                    if owner_user is None:
                        # Si no hay propietario registrado, denegar por seguridad
                        return {
                            'allowed': False,
                            'reason': 'No se puede verificar el propietario del archivo. Solo puedes eliminar tus propios archivos.'
                        }

                    if owner_user.id != user.id:
                        return {
                            'allowed': False,
                            'reason': f'Solo puedes eliminar tus propios archivos. Este archivo fue creado por: {owner_user.username}'
                        }

                    # Es propio, permitir
                    return {'allowed': True, 'reason': 'Archivo propio'}

                elif level == 'upload_all':
                    # Puede modificar/eliminar todos
                    return {'allowed': True, 'reason': 'Nivel de edición: Todos'}

            # Si no encontró permiso aplicable
            return {
                'allowed': False,
                'reason': 'No tienes permiso para esta operación'
            }

        # Rol consultation: no puede modificar ni eliminar
        return {
            'allowed': False,
            'reason': 'El rol "Consulta" no permite modificar ni eliminar archivos'
        }
