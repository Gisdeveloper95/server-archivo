"""
Servicio para operaciones directas en NetApp
"""
import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
from django.conf import settings


class NetAppConnectionError(Exception):
    """Error de conexión a NetApp"""
    pass


class NetAppPermissionError(Exception):
    """Error de permisos en NetApp"""
    pass


class NetAppService:
    """Servicio para operaciones en NetApp (conexión directa al filesystem)"""

    def __init__(self):
        self.base_path = settings.NETAPP_BASE_PATH

        # Verificar que la ruta base existe
        if not os.path.exists(self.base_path):
            raise NetAppConnectionError(
                f"No se puede acceder a NetApp en: {self.base_path}. "
                "Verifica que el servidor tiene acceso a la red compartida."
            )

    def _get_full_path(self, relative_path: str = "") -> str:
        """
        Construye ruta completa desde ruta relativa

        Args:
            relative_path: Ruta relativa desde Sub_Proy

        Returns:
            Ruta completa normalizada
        """
        # Remover barras iniciales
        relative_path = relative_path.lstrip('\\/')

        full_path = os.path.join(self.base_path, relative_path)
        return os.path.normpath(full_path)

    def _validate_path(self, full_path: str):
        """Valida que la ruta está dentro de los límites permitidos"""
        normalized_path = os.path.normpath(full_path)

        # Asegurar que no salga de base_path
        if not normalized_path.startswith(os.path.normpath(self.base_path)):
            raise NetAppPermissionError(
                "Acceso denegado: la ruta está fuera del directorio base permitido"
            )

    def list_directory(self, relative_path: str = "", include_hidden: bool = False) -> List[Dict]:
        """
        Lista contenido de un directorio

        Args:
            relative_path: Ruta relativa desde Sub_Proy
            include_hidden: Si incluir archivos/carpetas ocultas

        Returns:
            Lista de diccionarios con información de archivos/carpetas
            [
                {
                    'name': str,
                    'path': str,  # Ruta relativa
                    'is_directory': bool,
                    'size': int,  # Solo para archivos
                    'modified': datetime,
                    'created': datetime,
                    'extension': str  # Solo para archivos
                }
            ]
        """
        full_path = self._get_full_path(relative_path)
        self._validate_path(full_path)

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Directorio no encontrado: {relative_path}")

        if not os.path.isdir(full_path):
            raise ValueError(f"La ruta no es un directorio: {relative_path}")

        items = []

        try:
            for entry in os.scandir(full_path):
                # Saltar archivos ocultos si no se solicitan
                if not include_hidden and entry.name.startswith('.'):
                    continue

                try:
                    stat = entry.stat()

                    item = {
                        'name': entry.name,
                        'path': os.path.join(relative_path, entry.name).replace('\\', '/'),
                        'is_directory': entry.is_dir(),
                        'modified': datetime.fromtimestamp(stat.st_mtime),
                        'created': datetime.fromtimestamp(stat.st_ctime),
                    }

                    if entry.is_file():
                        item['size'] = stat.st_size
                        item['extension'] = os.path.splitext(entry.name)[1].lower()
                    else:
                        item['size'] = 0
                        item['extension'] = ''

                    items.append(item)

                except (PermissionError, OSError) as e:
                    # Saltar archivos que no se pueden leer
                    continue

        except PermissionError:
            raise NetAppPermissionError(f"Sin permisos para acceder a: {relative_path}")

        # Ordenar: directorios primero, luego por nombre
        items.sort(key=lambda x: (not x['is_directory'], x['name'].lower()))

        return items

    def get_file_metadata(self, relative_path: str) -> Dict:
        """
        Obtiene metadatos de un archivo o directorio

        Args:
            relative_path: Ruta relativa del archivo

        Returns:
            Diccionario con metadatos del archivo
        """
        full_path = self._get_full_path(relative_path)
        self._validate_path(full_path)

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Archivo no encontrado: {relative_path}")

        stat = os.stat(full_path)

        metadata = {
            'name': os.path.basename(full_path),
            'path': relative_path.replace('\\', '/'),
            'is_directory': os.path.isdir(full_path),
            'size': stat.st_size if os.path.isfile(full_path) else 0,
            'created': datetime.fromtimestamp(stat.st_ctime),
            'modified': datetime.fromtimestamp(stat.st_mtime),
            'extension': os.path.splitext(full_path)[1].lower() if os.path.isfile(full_path) else '',
            'full_path': full_path
        }

        return metadata

    def create_directory(self, relative_path: str, name: str) -> Dict:
        """
        Crea un nuevo directorio

        Args:
            relative_path: Ruta donde crear el directorio
            name: Nombre del nuevo directorio

        Returns:
            {'path': ruta_relativa_del_nuevo_directorio}
        """
        parent_full_path = self._get_full_path(relative_path)
        new_dir_full_path = os.path.join(parent_full_path, name)

        self._validate_path(new_dir_full_path)

        if os.path.exists(new_dir_full_path):
            raise FileExistsError(f"El directorio ya existe: {name}")

        try:
            os.makedirs(new_dir_full_path, exist_ok=False)
        except PermissionError:
            raise NetAppPermissionError(f"Sin permisos para crear directorio en: {relative_path}")
        except OSError as e:
            raise NetAppConnectionError(f"Error al crear directorio: {str(e)}")

        new_relative_path = os.path.join(relative_path, name).replace('\\', '/')

        return {
            'path': new_relative_path,
            'name': name
        }

    def create_directory_recursive(self, relative_path: str) -> Dict:
        """
        Crea directorios recursivamente (incluyendo padres que no existan)

        Args:
            relative_path: Ruta completa de directorios a crear

        Returns:
            {'path': ruta_relativa_creada}
        """
        full_path = self._get_full_path(relative_path)

        self._validate_path(full_path)

        try:
            os.makedirs(full_path, exist_ok=True)
        except PermissionError:
            raise NetAppPermissionError(f"Sin permisos para crear directorios en: {relative_path}")
        except OSError as e:
            raise NetAppConnectionError(f"Error al crear directorios: {str(e)}")

        return {
            'path': relative_path.replace('\\', '/')
        }

    def rename_path(self, old_relative_path: str, new_name: str) -> Dict:
        """
        Renombra un archivo o directorio

        Args:
            old_relative_path: Ruta actual del archivo/directorio
            new_name: Nuevo nombre (solo el nombre, no la ruta completa)

        Returns:
            {
                'old_path': str,
                'new_path': str,
                'old_name': str,
                'new_name': str
            }
        """
        old_full_path = self._get_full_path(old_relative_path)
        self._validate_path(old_full_path)

        if not os.path.exists(old_full_path):
            raise FileNotFoundError(f"Archivo/directorio no encontrado: {old_relative_path}")

        parent_dir = os.path.dirname(old_full_path)
        new_full_path = os.path.join(parent_dir, new_name)
        self._validate_path(new_full_path)

        if os.path.exists(new_full_path):
            raise FileExistsError(f"Ya existe un archivo/directorio con el nombre: {new_name}")

        try:
            os.rename(old_full_path, new_full_path)
        except PermissionError:
            raise NetAppPermissionError(f"Sin permisos para renombrar: {old_relative_path}")
        except OSError as e:
            raise NetAppConnectionError(f"Error al renombrar: {str(e)}")

        new_relative_path = os.path.join(
            os.path.dirname(old_relative_path),
            new_name
        ).replace('\\', '/')

        return {
            'old_path': old_relative_path.replace('\\', '/'),
            'new_path': new_relative_path,
            'old_name': os.path.basename(old_relative_path),
            'new_name': new_name
        }

    def delete_path(self, relative_path: str) -> bool:
        """
        Elimina un archivo o directorio

        Args:
            relative_path: Ruta del archivo/directorio a eliminar

        Returns:
            True si se eliminó exitosamente
        """
        full_path = self._get_full_path(relative_path)
        self._validate_path(full_path)

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Archivo/directorio no encontrado: {relative_path}")

        try:
            if os.path.isdir(full_path):
                shutil.rmtree(full_path)
            else:
                os.remove(full_path)
        except PermissionError:
            raise NetAppPermissionError(f"Sin permisos para eliminar: {relative_path}")
        except OSError as e:
            raise NetAppConnectionError(f"Error al eliminar: {str(e)}")

        return True

    def upload_file(self, relative_path: str, file_obj, filename: str) -> Dict:
        """
        Sube un archivo a NetApp

        Args:
            relative_path: Ruta de destino
            file_obj: Objeto archivo de Django (InMemoryUploadedFile o TemporaryUploadedFile)
            filename: Nombre del archivo

        Returns:
            {
                'path': str,
                'size': int,
                'name': str
            }
        """
        dest_dir = self._get_full_path(relative_path)
        dest_file = os.path.join(dest_dir, filename)

        self._validate_path(dest_file)

        if not os.path.exists(dest_dir):
            raise FileNotFoundError(f"Directorio de destino no encontrado: {relative_path}")

        if os.path.exists(dest_file):
            raise FileExistsError(f"El archivo ya existe: {filename}")

        try:
            with open(dest_file, 'wb+') as destination:
                for chunk in file_obj.chunks():
                    destination.write(chunk)
        except PermissionError:
            raise NetAppPermissionError(f"Sin permisos para subir archivo en: {relative_path}")
        except OSError as e:
            raise NetAppConnectionError(f"Error al subir archivo: {str(e)}")

        file_size = os.path.getsize(dest_file)
        file_relative_path = os.path.join(relative_path, filename).replace('\\', '/')

        return {
            'path': file_relative_path,
            'size': file_size,
            'name': filename
        }

    def get_file_content(self, relative_path: str) -> bytes:
        """
        Lee el contenido de un archivo (para descargas)

        Args:
            relative_path: Ruta del archivo

        Returns:
            Contenido del archivo en bytes
        """
        full_path = self._get_full_path(relative_path)
        self._validate_path(full_path)

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Archivo no encontrado: {relative_path}")

        if not os.path.isfile(full_path):
            raise ValueError(f"La ruta no es un archivo: {relative_path}")

        try:
            with open(full_path, 'rb') as f:
                return f.read()
        except PermissionError:
            raise NetAppPermissionError(f"Sin permisos para leer: {relative_path}")
        except OSError as e:
            raise NetAppConnectionError(f"Error al leer archivo: {str(e)}")

    def search_in_directory(self, relative_path: str, query: str, recursive: bool = False,
                           page: int = 1, page_size: int = 100) -> Dict:
        """
        Busca archivos/directorios en un directorio con paginación

        Args:
            relative_path: Directorio donde buscar
            query: Término de búsqueda (usa búsqueda LIKE - contiene)
            recursive: Si buscar en subdirectorios
            page: Número de página (inicia en 1)
            page_size: Resultados por página (máximo 100)

        Returns:
            Dict con resultados paginados, total y metadata
        """
        all_results = []
        query_lower = query.lower()

        if recursive:
            full_path = self._get_full_path(relative_path)
            self._validate_path(full_path)

            for root, dirs, files in os.walk(full_path):
                for name in dirs + files:
                    # Búsqueda LIKE (contiene)
                    if query_lower in name.lower():
                        full_item_path = os.path.join(root, name)
                        rel_path = os.path.relpath(full_item_path, self.base_path).replace('\\', '/')

                        try:
                            stat = os.stat(full_item_path)
                            is_dir = os.path.isdir(full_item_path)
                            all_results.append({
                                'name': name,
                                'path': rel_path,
                                'is_directory': is_dir,
                                'size': stat.st_size if not is_dir else 0,
                                'modified_date': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                                'size_formatted': self._format_size(stat.st_size) if not is_dir else '-',
                                'extension': os.path.splitext(name)[1].lower() if not is_dir else None,
                            })
                        except (PermissionError, OSError):
                            continue
        else:
            items = self.list_directory(relative_path)
            # Filtrar por query Y convertir datetime a string para serialización JSON
            for item in items:
                if query_lower in item['name'].lower():
                    # Convertir datetime objects a strings ISO
                    if 'modified' in item and hasattr(item['modified'], 'isoformat'):
                        item['modified_date'] = item['modified'].isoformat()
                        del item['modified']
                    if 'created' in item and hasattr(item['created'], 'isoformat'):
                        item['created_date'] = item['created'].isoformat()
                        del item['created']
                    # Agregar size_formatted si no existe
                    if 'size_formatted' not in item:
                        item['size_formatted'] = self._format_size(item['size']) if not item['is_directory'] else '-'
                    all_results.append(item)

        # Paginación
        total = len(all_results)
        total_pages = (total + page_size - 1) // page_size  # Ceil division

        # Validar página
        if page < 1:
            page = 1
        if page > total_pages and total_pages > 0:
            page = total_pages

        # Calcular índices
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        # Retornar resultados paginados
        return {
            'results': all_results[start_idx:end_idx],
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1
        }

    def get_directory_size(self, relative_path: str) -> int:
        """
        Calcula el tamaño total de un directorio

        Args:
            relative_path: Ruta del directorio

        Returns:
            Tamaño total en bytes
        """
        full_path = self._get_full_path(relative_path)
        self._validate_path(full_path)

        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Directorio no encontrado: {relative_path}")

        if not os.path.isdir(full_path):
            raise ValueError(f"La ruta no es un directorio: {relative_path}")

        total_size = 0

        for dirpath, dirnames, filenames in os.walk(full_path):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                try:
                    total_size += os.path.getsize(filepath)
                except (PermissionError, OSError):
                    continue

        return total_size

    def file_exists(self, relative_path: str) -> bool:
        """
        Verifica si un archivo o directorio existe

        Args:
            relative_path: Ruta relativa

        Returns:
            True si existe, False en caso contrario
        """
        full_path = self._get_full_path(relative_path)
        return os.path.exists(full_path)

    def copy_item(self, source_path: str, dest_path: str, overwrite: bool = False) -> Dict:
        """
        Copia un archivo o directorio desde source_path a dest_path

        Args:
            source_path: Ruta origen (relativa)
            dest_path: Ruta destino (relativa)
            overwrite: Si True, sobrescribe si el destino existe

        Returns:
            dict: {
                'success': bool,
                'source_path': str,
                'dest_path': str,
                'is_directory': bool,
                'size': int (bytes copiados),
                'file_count': int (si es directorio),
                'error': str (si falla),
                'conflict': bool (si destino ya existe)
            }
        """
        try:
            source_full = self._get_full_path(source_path)
            dest_full = self._get_full_path(dest_path)

            self._validate_path(source_full)
            self._validate_path(dest_full)

            if not os.path.exists(source_full):
                return {'success': False, 'error': 'Origen no existe'}

            # Si existe y NO queremos sobrescribir, retornar conflicto
            if os.path.exists(dest_full) and not overwrite:
                return {'success': False, 'error': 'Destino ya existe', 'conflict': True}

            # Si existe y queremos sobrescribir, eliminar primero
            if os.path.exists(dest_full) and overwrite:
                if os.path.isdir(dest_full):
                    shutil.rmtree(dest_full)
                else:
                    os.remove(dest_full)

            is_dir = os.path.isdir(source_full)

            if is_dir:
                # Copiar directorio recursivamente
                shutil.copytree(source_full, dest_full)

                # Calcular tamaño total y cantidad de archivos
                total_size = 0
                file_count = 0
                for root, dirs, files in os.walk(dest_full):
                    for file in files:
                        file_path = os.path.join(root, file)
                        try:
                            total_size += os.path.getsize(file_path)
                            file_count += 1
                        except (PermissionError, OSError):
                            continue

                return {
                    'success': True,
                    'source_path': source_path,
                    'dest_path': dest_path,
                    'is_directory': True,
                    'size': total_size,
                    'file_count': file_count
                }
            else:
                # Copiar archivo (preserva metadata)
                shutil.copy2(source_full, dest_full)
                size = os.path.getsize(dest_full)

                return {
                    'success': True,
                    'source_path': source_path,
                    'dest_path': dest_path,
                    'is_directory': False,
                    'size': size,
                    'file_count': 1
                }

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos para copiar'}
        except Exception as e:
            return {'success': False, 'error': f'Error al copiar: {str(e)}'}

    def move_item(self, source_path: str, dest_path: str, overwrite: bool = False) -> Dict:
        """
        Mueve un archivo o directorio desde source_path a dest_path

        Args:
            source_path: Ruta origen (relativa)
            dest_path: Ruta destino (relativa)
            overwrite: Si True, sobrescribe si el destino existe

        Returns:
            dict: {
                'success': bool,
                'source_path': str,
                'dest_path': str,
                'is_directory': bool,
                'size': int (bytes movidos),
                'file_count': int (si es directorio),
                'error': str (si falla),
                'conflict': bool (si destino ya existe)
            }
        """
        try:
            source_full = self._get_full_path(source_path)
            dest_full = self._get_full_path(dest_path)

            self._validate_path(source_full)
            self._validate_path(dest_full)

            if not os.path.exists(source_full):
                return {'success': False, 'error': 'Origen no existe'}

            # Si existe y NO queremos sobrescribir, retornar conflicto
            if os.path.exists(dest_full) and not overwrite:
                return {'success': False, 'error': 'Destino ya existe', 'conflict': True}

            # Si existe y queremos sobrescribir, eliminar primero
            if os.path.exists(dest_full) and overwrite:
                if os.path.isdir(dest_full):
                    shutil.rmtree(dest_full)
                else:
                    os.remove(dest_full)

            is_dir = os.path.isdir(source_full)

            # Calcular tamaño ANTES de mover
            if is_dir:
                total_size = 0
                file_count = 0
                for root, dirs, files in os.walk(source_full):
                    for file in files:
                        file_path = os.path.join(root, file)
                        try:
                            total_size += os.path.getsize(file_path)
                            file_count += 1
                        except (PermissionError, OSError):
                            continue
            else:
                total_size = os.path.getsize(source_full)
                file_count = 1

            # Mover archivo o directorio
            shutil.move(source_full, dest_full)

            return {
                'success': True,
                'source_path': source_path,
                'dest_path': dest_path,
                'is_directory': is_dir,
                'size': total_size,
                'file_count': file_count
            }

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos para mover'}
        except Exception as e:
            return {'success': False, 'error': f'Error al mover: {str(e)}'}

    def get_unique_name(self, relative_path: str) -> str:
        """
        Genera un nombre único para evitar conflictos agregando _1, _2, etc.

        Args:
            relative_path: Ruta relativa del archivo/directorio

        Returns:
            str: Nombre único (solo el nombre, no la ruta completa)
        """
        full_path = self._get_full_path(relative_path)
        directory = os.path.dirname(full_path)
        base_name = os.path.basename(relative_path)

        # Separar nombre y extensión
        name_without_ext, ext = os.path.splitext(base_name)

        counter = 1
        new_name = base_name

        while True:
            test_path = os.path.join(directory, new_name)
            if not os.path.exists(test_path):
                return new_name

            new_name = f"{name_without_ext}_{counter}{ext}"
            counter += 1

            # Evitar bucle infinito
            if counter > 1000:
                raise Exception("No se pudo generar un nombre único")
