"""
TrashService - Servicio para gestión de la Papelera de Reciclaje
"""
import os
import uuid
import shutil
import tarfile
import hashlib
import logging
from datetime import timedelta
from typing import Optional, Dict, Any, Tuple

from django.conf import settings
from django.utils import timezone
from django.db import transaction

from .models import TrashItem

logger = logging.getLogger(__name__)


class TrashService:
    """
    Servicio principal para operaciones de papelera de reciclaje.
    Maneja el respaldo, restauración y limpieza de archivos eliminados.
    """

    def __init__(self):
        self.enabled = getattr(settings, 'TRASH_ENABLED', True)
        # Usar NETAPP_PATH como base (raíz del repositorio montado)
        self.netapp_path = getattr(settings, 'NETAPP_PATH', '/mnt/repositorio')
        # NETAPP_BASE_PATH es donde los usuarios tienen acceso
        self.base_path = getattr(settings, 'NETAPP_BASE_PATH', '/mnt/repositorio')
        self.trash_relative_path = getattr(settings, 'TRASH_PATH', '.trash')

        # Cargar configuración de la base de datos
        self._load_config()

        # Ruta completa del directorio de papelera (usar NETAPP_PATH como base)
        self.trash_path = os.path.join(self.netapp_path, self.trash_relative_path)

    def _load_config(self):
        """Carga la configuración desde la base de datos"""
        from .models import TrashConfig
        config = TrashConfig.get_config()
        self.max_size_gb = float(config.max_size_gb)
        self.max_item_size_gb = float(config.max_item_size_gb)
        self.retention_days = config.retention_days
        self.auto_cleanup_enabled = config.auto_cleanup_enabled

        # Calcular tamaños en bytes
        self.max_size_bytes = config.max_size_bytes
        self.max_item_size_bytes = config.max_item_size_bytes

    def ensure_trash_directory(self) -> bool:
        """
        Asegura que el directorio de papelera exista.
        Returns True si existe o fue creado exitosamente.
        """
        try:
            if not os.path.exists(self.trash_path):
                os.makedirs(self.trash_path, mode=0o755, exist_ok=True)
                logger.info(f"Directorio de papelera creado: {self.trash_path}")
            return True
        except Exception as e:
            logger.error(f"Error creando directorio de papelera: {e}")
            return False

    def get_item_size(self, full_path: str) -> int:
        """
        Calcula el tamaño total de un archivo o directorio.
        """
        if os.path.isfile(full_path):
            return os.path.getsize(full_path)
        elif os.path.isdir(full_path):
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(full_path):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    try:
                        total_size += os.path.getsize(filepath)
                    except (OSError, IOError):
                        pass
            return total_size
        return 0

    def count_items(self, full_path: str) -> Tuple[int, int]:
        """
        Cuenta archivos y directorios dentro de una ruta.
        Returns: (file_count, dir_count)
        """
        if os.path.isfile(full_path):
            return (1, 0)

        file_count = 0
        dir_count = 0
        for dirpath, dirnames, filenames in os.walk(full_path):
            file_count += len(filenames)
            dir_count += len(dirnames)
        return (file_count, dir_count)

    def calculate_hash(self, file_path: str) -> Optional[str]:
        """
        Calcula el hash SHA256 de un archivo.
        Para directorios comprimidos, se calcula del .tar.gz resultante.
        """
        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(65536), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except Exception as e:
            logger.error(f"Error calculando hash: {e}")
            return None

    def get_mime_type(self, file_path: str) -> Optional[str]:
        """
        Obtiene el tipo MIME de un archivo.
        """
        import mimetypes
        mime_type, _ = mimetypes.guess_type(file_path)
        return mime_type

    def should_use_trash(self, size_bytes: int) -> bool:
        """
        Determina si un item debe ir a la papelera basado en su tamaño.
        Usa max_item_size_bytes (límite por archivo individual).
        """
        if not self.enabled:
            return False
        return size_bytes <= self.max_item_size_bytes

    def get_current_trash_size(self) -> int:
        """Obtiene el tamaño actual total de la papelera en bytes"""
        from django.db.models import Sum
        result = TrashItem.objects.filter(status='stored').aggregate(
            total=Sum('size_bytes')
        )
        return result['total'] or 0

    def make_space_for(self, needed_bytes: int) -> Dict[str, Any]:
        """
        Libera espacio en la papelera eliminando los archivos más antiguos.
        Retorna información sobre los archivos eliminados.
        """
        current_size = self.get_current_trash_size()
        available_space = self.max_size_bytes - current_size

        if available_space >= needed_bytes:
            # Ya hay espacio suficiente
            return {'freed': 0, 'deleted_count': 0, 'items': []}

        space_to_free = needed_bytes - available_space
        freed = 0
        deleted_items = []

        # Obtener items ordenados por fecha de eliminación (más antiguos primero)
        oldest_items = TrashItem.objects.filter(status='stored').order_by('deleted_at')

        for item in oldest_items:
            if freed >= space_to_free:
                break

            try:
                # Eliminar archivo físico
                trash_file = item.get_trash_file_path()
                item_size = item.size_bytes

                if os.path.exists(trash_file):
                    os.remove(trash_file)

                deleted_items.append({
                    'name': item.original_name,
                    'size': item_size,
                    'deleted_at': item.deleted_at.isoformat()
                })

                # Marcar como expirado y eliminar registro
                item.status = 'expired'
                item.save()
                item.delete()

                freed += item_size
                logger.info(f"Espacio liberado: {item.original_name} ({self._format_size(item_size)})")

            except Exception as e:
                logger.error(f"Error liberando espacio con {item.original_name}: {e}")

        return {
            'freed': freed,
            'freed_formatted': self._format_size(freed),
            'deleted_count': len(deleted_items),
            'items': deleted_items
        }

    def move_to_trash(
        self,
        path: str,
        user,
        is_directory: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Mueve un archivo o directorio a la papelera.

        Args:
            path: Ruta del archivo/directorio a eliminar (relativa o estilo Windows)
            user: Usuario que realiza la eliminación
            is_directory: Si es un directorio
            metadata: Información adicional a guardar

        Returns:
            dict con 'success', 'trash_id', 'message', 'skipped' (si no fue a papelera)
        """
        try:
            # Normalizar la ruta
            normalized_path = self._normalize_path(path)
            full_path = os.path.join(self.base_path, normalized_path.lstrip('/'))

            # Verificar que existe
            if not os.path.exists(full_path):
                return {
                    'success': False,
                    'error': 'El archivo o directorio no existe',
                    'skipped': False
                }

            # Obtener información
            original_name = os.path.basename(full_path)
            original_dir = os.path.dirname(normalized_path)
            size_bytes = self.get_item_size(full_path)
            file_count, dir_count = self.count_items(full_path)

            # Verificar si debe ir a papelera (límite por archivo individual)
            if not self.should_use_trash(size_bytes):
                logger.info(
                    f"Archivo/directorio muy grande para papelera: "
                    f"{original_name} ({size_bytes} bytes > {self.max_item_size_bytes} bytes)"
                )
                return {
                    'success': True,
                    'skipped': True,
                    'message': f'Archivo muy grande ({self._format_size(size_bytes)} > {self._format_size(self.max_item_size_bytes)}), se eliminará sin respaldo',
                    'size_bytes': size_bytes
                }

            # Verificar si hay espacio suficiente en la papelera
            # Si no hay, liberar espacio eliminando los archivos más antiguos (FIFO)
            space_result = self.make_space_for(size_bytes)
            if space_result['deleted_count'] > 0:
                logger.info(
                    f"Espacio liberado automáticamente: {space_result['freed_formatted']} "
                    f"({space_result['deleted_count']} archivos eliminados) para hacer espacio para {original_name}"
                )

            # Asegurar que existe el directorio de papelera
            if not self.ensure_trash_directory():
                return {
                    'success': False,
                    'error': 'No se pudo crear el directorio de papelera',
                    'skipped': False
                }

            # Generar ID único
            trash_id = uuid.uuid4()

            # Crear registro en DB (estado: pending)
            trash_item = TrashItem(
                trash_id=trash_id,
                original_name=original_name,
                original_path=normalized_path,
                is_directory=is_directory or os.path.isdir(full_path),
                size_bytes=size_bytes,
                file_count=file_count,
                dir_count=dir_count,
                deleted_by=user,
                status='storing',
                metadata=metadata or {}
            )

            # Obtener mime type para archivos
            if not trash_item.is_directory:
                trash_item.mime_type = self.get_mime_type(full_path)

            trash_item.save()

            try:
                # Determinar nombre del archivo en papelera
                if trash_item.is_directory:
                    trash_filename = f"{trash_id}.tar.gz"
                    trash_file_path = os.path.join(self.trash_path, trash_filename)

                    # Comprimir directorio
                    logger.info(f"Comprimiendo directorio: {full_path}")
                    self._compress_directory(full_path, trash_file_path)
                else:
                    trash_filename = f"{trash_id}.data"
                    trash_file_path = os.path.join(self.trash_path, trash_filename)

                    # Copiar archivo
                    logger.info(f"Copiando archivo a papelera: {full_path}")
                    shutil.copy2(full_path, trash_file_path)

                # Calcular hash del archivo en papelera
                file_hash = self.calculate_hash(trash_file_path)
                trash_item.file_hash = file_hash
                trash_item.status = 'stored'
                trash_item.save()

                logger.info(
                    f"Item movido a papelera: {original_name} -> {trash_filename} "
                    f"(hash: {file_hash[:16]}...)"
                )

                # Construir mensaje incluyendo info de espacio liberado si aplica
                message = f'Respaldado en papelera (expira en {self.retention_days} días)'
                if space_result['deleted_count'] > 0:
                    message += f'. Se liberaron {space_result["freed_formatted"]} eliminando {space_result["deleted_count"]} archivo(s) antiguo(s).'

                return {
                    'success': True,
                    'trash_id': str(trash_id),
                    'message': message,
                    'expires_at': trash_item.expires_at.isoformat(),
                    'skipped': False,
                    'space_freed': space_result if space_result['deleted_count'] > 0 else None
                }

            except Exception as e:
                # Si falla el respaldo, marcar como error
                trash_item.status = 'error'
                trash_item.error_message = str(e)
                trash_item.save()

                logger.error(f"Error moviendo a papelera: {e}")
                return {
                    'success': False,
                    'error': f'Error al respaldar en papelera: {str(e)}',
                    'skipped': False
                }

        except Exception as e:
            logger.error(f"Error en move_to_trash: {e}")
            return {
                'success': False,
                'error': str(e),
                'skipped': False
            }

    def restore_from_trash(
        self,
        trash_id: str,
        user,
        target_path: Optional[str] = None,
        conflict_resolution: str = 'rename'
    ) -> Dict[str, Any]:
        """
        Restaura un item desde la papelera.

        Args:
            trash_id: UUID del item en papelera
            user: Usuario que realiza la restauración
            target_path: Ruta alternativa de destino (opcional)
            conflict_resolution: 'replace', 'rename', o 'fail'

        Returns:
            dict con 'success', 'restored_path', 'message'
        """
        try:
            # Buscar item en papelera
            try:
                trash_item = TrashItem.objects.get(trash_id=trash_id)
            except TrashItem.DoesNotExist:
                return {
                    'success': False,
                    'error': 'Item no encontrado en papelera'
                }

            # Verificar estado
            if trash_item.status not in ['stored', 'error']:
                return {
                    'success': False,
                    'error': f'Item no disponible para restaurar (estado: {trash_item.status})'
                }

            # Determinar ruta de destino
            if target_path:
                dest_dir = os.path.join(self.base_path, self._normalize_path(target_path).lstrip('/'))
                dest_path = os.path.join(dest_dir, trash_item.original_name)
            else:
                dest_path = os.path.join(self.base_path, trash_item.original_path.lstrip('/'))
                dest_dir = os.path.dirname(dest_path)

            # Verificar que existe el directorio destino
            if not os.path.exists(dest_dir):
                return {
                    'success': False,
                    'error': f'El directorio destino no existe: {dest_dir}'
                }

            # Verificar conflicto de nombres
            if os.path.exists(dest_path):
                if conflict_resolution == 'fail':
                    return {
                        'success': False,
                        'error': 'Ya existe un archivo/directorio con ese nombre',
                        'conflict': True
                    }
                elif conflict_resolution == 'rename':
                    dest_path = self._get_unique_name(dest_path, trash_item.is_directory)
                # Si es 'replace', se sobrescribirá

            # Obtener ruta del archivo en papelera
            trash_file_path = trash_item.get_trash_file_path()

            if not os.path.exists(trash_file_path):
                trash_item.status = 'error'
                trash_item.error_message = 'Archivo de respaldo no encontrado'
                trash_item.save()
                return {
                    'success': False,
                    'error': 'El archivo de respaldo no existe en la papelera'
                }

            # Marcar como restaurando
            trash_item.status = 'restoring'
            trash_item.save()

            try:
                if trash_item.is_directory:
                    # Extraer tar.gz
                    logger.info(f"Extrayendo directorio desde papelera: {trash_file_path}")

                    # Si existe y es replace, eliminar primero
                    if os.path.exists(dest_path) and conflict_resolution == 'replace':
                        shutil.rmtree(dest_path)

                    self._extract_directory(trash_file_path, dest_dir, trash_item.original_name)
                else:
                    # Copiar archivo
                    logger.info(f"Restaurando archivo desde papelera: {trash_file_path}")

                    if os.path.exists(dest_path) and conflict_resolution == 'replace':
                        os.remove(dest_path)

                    shutil.copy2(trash_file_path, dest_path)

                # Verificar integridad (opcional)
                if trash_item.file_hash and not trash_item.is_directory:
                    restored_hash = self.calculate_hash(dest_path)
                    if restored_hash != trash_item.file_hash:
                        logger.warning(
                            f"Hash mismatch al restaurar {trash_item.original_name}: "
                            f"esperado {trash_item.file_hash[:16]}..., "
                            f"obtenido {restored_hash[:16]}..."
                        )

                # Actualizar registro
                trash_item.status = 'restored'
                trash_item.restored_at = timezone.now()
                trash_item.restored_by = user
                trash_item.restored_path = dest_path.replace(self.base_path, '')
                trash_item.save()

                # Eliminar archivo de papelera
                os.remove(trash_file_path)

                logger.info(f"Item restaurado: {trash_item.original_name} -> {dest_path}")

                return {
                    'success': True,
                    'restored_path': dest_path.replace(self.base_path, ''),
                    'message': f'Restaurado exitosamente en {os.path.basename(dest_path)}'
                }

            except Exception as e:
                trash_item.status = 'error'
                trash_item.error_message = str(e)
                trash_item.save()

                logger.error(f"Error restaurando desde papelera: {e}")
                return {
                    'success': False,
                    'error': f'Error al restaurar: {str(e)}'
                }

        except Exception as e:
            logger.error(f"Error en restore_from_trash: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def delete_permanently(self, trash_id: str, user) -> Dict[str, Any]:
        """
        Elimina permanentemente un item de la papelera.
        """
        try:
            try:
                trash_item = TrashItem.objects.get(trash_id=trash_id)
            except TrashItem.DoesNotExist:
                return {
                    'success': False,
                    'error': 'Item no encontrado en papelera'
                }

            # Eliminar archivo físico
            trash_file_path = trash_item.get_trash_file_path()
            if os.path.exists(trash_file_path):
                os.remove(trash_file_path)
                logger.info(f"Archivo de papelera eliminado: {trash_file_path}")

            # Eliminar registro de DB
            original_name = trash_item.original_name
            trash_item.delete()

            logger.info(f"Item eliminado permanentemente de papelera: {original_name}")

            return {
                'success': True,
                'message': f'{original_name} eliminado permanentemente'
            }

        except Exception as e:
            logger.error(f"Error en delete_permanently: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def cleanup_expired(self) -> Dict[str, Any]:
        """
        Limpia todos los items expirados de la papelera.
        Diseñado para ser llamado por una tarea Celery.
        """
        try:
            now = timezone.now()
            expired_items = TrashItem.objects.filter(
                expires_at__lt=now,
                status='stored'
            )

            cleaned_count = 0
            cleaned_size = 0
            errors = []

            for item in expired_items:
                try:
                    # Eliminar archivo físico
                    trash_file_path = item.get_trash_file_path()
                    if os.path.exists(trash_file_path):
                        file_size = os.path.getsize(trash_file_path)
                        os.remove(trash_file_path)
                        cleaned_size += file_size

                    # Marcar como expirado
                    item.status = 'expired'
                    item.save()

                    cleaned_count += 1
                    logger.info(f"Item expirado limpiado: {item.original_name}")

                except Exception as e:
                    errors.append(f"{item.original_name}: {str(e)}")
                    logger.error(f"Error limpiando item expirado {item.original_name}: {e}")

            return {
                'success': True,
                'cleaned_count': cleaned_count,
                'cleaned_size': cleaned_size,
                'cleaned_size_formatted': self._format_size(cleaned_size),
                'errors': errors
            }

        except Exception as e:
            logger.error(f"Error en cleanup_expired: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_trash_stats(self) -> Dict[str, Any]:
        """
        Obtiene estadísticas de la papelera.
        """
        try:
            from django.db.models import Sum, Count

            stats = TrashItem.objects.filter(status='stored').aggregate(
                total_items=Count('trash_id'),
                total_size=Sum('size_bytes')
            )

            # Items por expirar pronto (próximos 7 días)
            expiring_soon = TrashItem.objects.filter(
                status='stored',
                expires_at__lte=timezone.now() + timedelta(days=7)
            ).count()

            # Items por estado
            by_status = dict(
                TrashItem.objects.values('status').annotate(
                    count=Count('trash_id')
                ).values_list('status', 'count')
            )

            return {
                'total_items': stats['total_items'] or 0,
                'total_size_bytes': stats['total_size'] or 0,
                'total_size_formatted': self._format_size(stats['total_size'] or 0),
                'expiring_soon': expiring_soon,
                'by_status': by_status,
                'retention_days': self.retention_days,
                'max_size_gb': self.max_size_gb,
                'enabled': self.enabled
            }

        except Exception as e:
            logger.error(f"Error obteniendo stats de papelera: {e}")
            return {
                'error': str(e)
            }

    def get_items_for_path(self, path: str) -> list:
        """
        Obtiene los items de papelera que fueron eliminados de una ruta específica.
        """
        normalized_path = self._normalize_path(path)

        # Buscar items cuya ruta original comienza con esta ruta
        # o que estaban directamente en este directorio
        items = TrashItem.objects.filter(
            status='stored',
            original_path__startswith=normalized_path
        ).order_by('-deleted_at')

        return list(items)

    def get_item_contents(self, trash_id: str) -> Dict[str, Any]:
        """
        Obtiene el contenido/árbol de un item en papelera.
        Para directorios, lista los archivos dentro del tar.gz.
        Para archivos, retorna información básica.
        """
        try:
            try:
                trash_item = TrashItem.objects.get(trash_id=trash_id)
            except TrashItem.DoesNotExist:
                return {
                    'success': False,
                    'error': 'Item no encontrado en papelera'
                }

            trash_file_path = trash_item.get_trash_file_path()

            if not os.path.exists(trash_file_path):
                return {
                    'success': False,
                    'error': 'Archivo de respaldo no encontrado'
                }

            if not trash_item.is_directory:
                # Es un archivo simple
                return {
                    'success': True,
                    'is_directory': False,
                    'original_name': trash_item.original_name,
                    'size_bytes': trash_item.size_bytes,
                    'size_formatted': self._format_size(trash_item.size_bytes),
                    'mime_type': trash_item.mime_type,
                    'file_hash': trash_item.file_hash,
                    'contents': None
                }

            # Es un directorio - listar contenido del tar.gz
            contents = []
            try:
                with tarfile.open(trash_file_path, "r:gz") as tar:
                    for member in tar.getmembers():
                        contents.append({
                            'name': member.name,
                            'path': member.name,
                            'is_directory': member.isdir(),
                            'size_bytes': member.size,
                            'size_formatted': self._format_size(member.size),
                            'modified_time': member.mtime,
                        })
            except Exception as e:
                logger.error(f"Error leyendo contenido de tar.gz: {e}")
                return {
                    'success': False,
                    'error': f'Error leyendo contenido: {str(e)}'
                }

            # Ordenar: directorios primero, luego por nombre
            contents.sort(key=lambda x: (not x['is_directory'], x['path'].lower()))

            # Construir árbol jerárquico
            tree = self._build_tree(contents)

            return {
                'success': True,
                'is_directory': True,
                'original_name': trash_item.original_name,
                'size_bytes': trash_item.size_bytes,
                'size_formatted': self._format_size(trash_item.size_bytes),
                'file_count': trash_item.file_count,
                'dir_count': trash_item.dir_count,
                'contents': contents,
                'tree': tree
            }

        except Exception as e:
            logger.error(f"Error en get_item_contents: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _build_tree(self, contents: list) -> Dict[str, Any]:
        """
        Construye un árbol jerárquico a partir de una lista plana de rutas.
        """
        root = {'name': '', 'children': {}, 'is_directory': True}

        for item in contents:
            path_parts = item['path'].split('/')
            current = root

            for i, part in enumerate(path_parts):
                if not part:
                    continue

                if part not in current['children']:
                    is_last = (i == len(path_parts) - 1)
                    current['children'][part] = {
                        'name': part,
                        'path': '/'.join(path_parts[:i+1]),
                        'is_directory': item['is_directory'] if is_last else True,
                        'size_bytes': item['size_bytes'] if is_last else 0,
                        'size_formatted': item['size_formatted'] if is_last else '',
                        'children': {}
                    }
                current = current['children'][part]

        return self._tree_to_list(root)

    def _tree_to_list(self, node: Dict[str, Any], depth: int = 0) -> list:
        """
        Convierte el árbol de diccionarios a una lista ordenada con niveles.
        """
        result = []

        # Ordenar hijos: directorios primero, luego por nombre
        children = sorted(
            node['children'].values(),
            key=lambda x: (not x['is_directory'], x['name'].lower())
        )

        for child in children:
            result.append({
                'name': child['name'],
                'path': child['path'],
                'is_directory': child['is_directory'],
                'size_bytes': child['size_bytes'],
                'size_formatted': child['size_formatted'],
                'depth': depth
            })
            if child['children']:
                result.extend(self._tree_to_list(child, depth + 1))

        return result

    # ==================== Métodos privados ====================

    def _normalize_path(self, path: str) -> str:
        """
        Normaliza una ruta de Windows o Linux a formato Unix.
        """
        # Remover prefijos de red Windows
        path = path.replace('\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\', '')
        path = path.replace('\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy', '')
        path = path.replace('\\\\repositorio\\', '')

        # Convertir backslashes a forward slashes
        path = path.replace('\\', '/')

        # Remover dobles slashes
        while '//' in path:
            path = path.replace('//', '/')

        return path

    def _compress_directory(self, source_path: str, dest_path: str) -> None:
        """
        Comprime un directorio en un archivo tar.gz.
        """
        parent_dir = os.path.dirname(source_path)
        dir_name = os.path.basename(source_path)

        with tarfile.open(dest_path, "w:gz") as tar:
            tar.add(source_path, arcname=dir_name)

    def _extract_directory(self, tar_path: str, dest_dir: str, original_name: str) -> None:
        """
        Extrae un archivo tar.gz a un directorio.
        """
        with tarfile.open(tar_path, "r:gz") as tar:
            tar.extractall(path=dest_dir)

    def _get_unique_name(self, path: str, is_directory: bool) -> str:
        """
        Genera un nombre único para evitar conflictos.
        Ej: archivo.pdf -> archivo_restored.pdf
            archivo.pdf -> archivo_restored_2.pdf (si ya existe)
        """
        base_dir = os.path.dirname(path)
        filename = os.path.basename(path)

        if is_directory:
            new_name = f"{filename}_restored"
            new_path = os.path.join(base_dir, new_name)
            counter = 2
            while os.path.exists(new_path):
                new_name = f"{filename}_restored_{counter}"
                new_path = os.path.join(base_dir, new_name)
                counter += 1
        else:
            name, ext = os.path.splitext(filename)
            new_name = f"{name}_restored{ext}"
            new_path = os.path.join(base_dir, new_name)
            counter = 2
            while os.path.exists(new_path):
                new_name = f"{name}_restored_{counter}{ext}"
                new_path = os.path.join(base_dir, new_name)
                counter += 1

        return new_path

    def _format_size(self, size_bytes: int) -> str:
        """
        Formatea un tamaño en bytes a una representación legible.
        """
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"
