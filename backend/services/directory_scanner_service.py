"""
DirectoryScannerService - Servicio para escanear directorios antes de eliminar
Incluye:
- Iteración recursiva de directorios
- Agrupación de formatos geoespaciales (GDB, Shapefile, etc.)
- Generación de reportes detallados
"""
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass
class ScanResult:
    """Resultado del escaneo de un directorio"""
    total_files: int = 0
    total_directories: int = 0
    total_size_bytes: int = 0

    # Conteo agrupado (para mostrar al usuario)
    grouped_items: List[Dict] = field(default_factory=list)

    # Lista completa sin agrupar (para auditoría)
    all_items: List[Dict] = field(default_factory=list)

    # Estadísticas por tipo
    stats_by_extension: Dict[str, int] = field(default_factory=dict)
    geospatial_groups: Dict[str, Dict] = field(default_factory=dict)

    # Tiempo de escaneo
    scan_time_seconds: float = 0

    # Errores durante escaneo
    errors: List[str] = field(default_factory=list)


class DirectoryScannerService:
    """
    Escanea directorios para obtener lista detallada de contenido.
    Agrupa formatos geoespaciales para evitar inflar reportes.
    """

    # Extensiones que se tratan como archivo único (son directorios en realidad)
    DIRECTORY_AS_FILE_EXTENSIONS = {'.gdb', '.eslpk'}

    # Extensiones componentes de Shapefile (se agrupan bajo el .shp principal)
    SHAPEFILE_COMPONENTS = {'.dbf', '.shx', '.prj', '.cpg', '.sbn', '.sbx', '.xml', '.qix', '.fix', '.atx'}

    # Extensiones a ignorar completamente (archivos de sistema/temporales)
    IGNORE_EXTENSIONS = {
        '.lock', '.lck', '.tmp', '.temp', '.bak', '.dwl', '.dwl2',
        '.gdbtable', '.gdbtablx', '.gdbindexes', '.freelist',
        '.horizon', '.spx', '.log', '.aux', '.ovr', '.pyr', '.rdx', '.dng'
    }

    # Archivos a ignorar por nombre (solo archivos de sistema que nunca son útiles)
    IGNORE_FILENAMES = {'desktop.ini', '.ds_store'}

    def __init__(self, base_path: str = None):
        if base_path is not None:
            self.base_path = base_path
        else:
            try:
                from django.conf import settings
                self.base_path = getattr(settings, 'NETAPP_BASE_PATH', '/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy')
            except Exception:
                self.base_path = '/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy'

    def _should_ignore(self, name: str) -> bool:
        """Verifica si un archivo debe ser ignorado"""
        name_lower = name.lower()

        # Ignorar por nombre exacto
        if name_lower in self.IGNORE_FILENAMES:
            return True

        # Ignorar archivos ocultos (excepto .gdb)
        if name_lower.startswith('.') and not name_lower.endswith('.gdb'):
            return True

        # Ignorar por extensión
        for ext in self.IGNORE_EXTENSIONS:
            if name_lower.endswith(ext):
                return True

        return False

    def _is_shapefile_component(self, name: str) -> bool:
        """Verifica si es un archivo componente de shapefile"""
        name_lower = name.lower()
        for ext in self.SHAPEFILE_COMPONENTS:
            if name_lower.endswith(ext):
                return True
        return False

    def _get_shapefile_base(self, name: str) -> Optional[str]:
        """Obtiene el nombre base de un shapefile sin extensión"""
        name_lower = name.lower()
        if name_lower.endswith('.shp'):
            return name[:-4]  # Remover .shp
        return None

    def _is_geodatabase_dir(self, name: str) -> bool:
        """Verifica si un directorio es una geodatabase"""
        return name.lower().endswith('.gdb')

    def _format_size(self, size_bytes: int) -> str:
        """Formatea tamaño en bytes a formato legible"""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

    def _get_directory_size(self, path: str) -> int:
        """Calcula el tamaño total de un directorio recursivamente"""
        total_size = 0
        try:
            for dirpath, dirnames, filenames in os.walk(path):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    try:
                        total_size += os.path.getsize(filepath)
                    except (OSError, IOError):
                        continue
        except (OSError, IOError):
            pass
        return total_size

    def scan_directory(self, path: str, progress_callback=None) -> ScanResult:
        """
        Escanea un directorio recursivamente.

        Args:
            path: Ruta del directorio a escanear
            progress_callback: Función opcional para reportar progreso (current, total, item_name)

        Returns:
            ScanResult con toda la información del escaneo
        """
        result = ScanResult()
        start_time = datetime.now()

        # Normalizar backslashes a forward slashes (igual que SMBService)
        normalized_path = path.replace('\\', '/')

        # Construir ruta completa
        if normalized_path.startswith('/'):
            # Ruta absoluta: usar tal cual
            full_path = normalized_path
        else:
            # Ruta relativa: unir con base_path, removiendo slash inicial si lo hay
            full_path = os.path.join(self.base_path, normalized_path.lstrip('/'))

        print(f"[SCANNER] scan_directory: path='{path}' → full_path='{full_path}' (base='{self.base_path}')")

        if not os.path.exists(full_path):
            print(f"[SCANNER] ERROR: La ruta no existe: '{full_path}'")
            result.errors.append(f"La ruta no existe: {path}")
            return result

        if not os.path.isdir(full_path):
            print(f"[SCANNER] ERROR: La ruta no es un directorio: '{full_path}'")
            result.errors.append(f"La ruta no es un directorio: {path}")
            return result

        # Diccionarios para agrupar
        shapefile_groups = defaultdict(list)  # base_name -> [components]
        all_items = []
        grouped_items = []

        # Primero, contar total de elementos para progreso
        total_items = 0
        for root, dirs, files in os.walk(full_path):
            # Filtrar geodatabases de dirs (se tratarán como archivos)
            gdb_dirs = [d for d in dirs if self._is_geodatabase_dir(d)]
            total_items += len(files) + len(gdb_dirs)

        current_item = 0

        try:
            for root, dirs, files in os.walk(full_path):
                relative_root = os.path.relpath(root, full_path)
                if relative_root == '.':
                    relative_root = ''

                # Procesar geodatabases (directorios que se tratan como archivos)
                dirs_to_remove = []
                for dir_name in dirs:
                    if self._is_geodatabase_dir(dir_name):
                        dirs_to_remove.append(dir_name)
                        current_item += 1

                        dir_full_path = os.path.join(root, dir_name)
                        relative_path = os.path.join(relative_root, dir_name) if relative_root else dir_name

                        try:
                            size = self._get_directory_size(dir_full_path)
                            stat_info = os.stat(dir_full_path)
                            modified = datetime.fromtimestamp(stat_info.st_mtime)
                        except (OSError, IOError):
                            size = 0
                            modified = None

                        item = {
                            'name': dir_name,
                            'path': relative_path,
                            'full_path': dir_full_path,
                            'type': 'geodatabase',
                            'extension': '.gdb',
                            'size': size,
                            'size_formatted': self._format_size(size),
                            'modified': modified.isoformat() if modified else None,
                            'is_directory': False,  # Se trata como archivo para el reporte
                            'is_grouped': True,
                            'grouped_type': 'geodatabase'
                        }

                        all_items.append(item)
                        grouped_items.append(item)
                        result.total_files += 1
                        result.total_size_bytes += size
                        result.stats_by_extension['.gdb'] = result.stats_by_extension.get('.gdb', 0) + 1
                        result.geospatial_groups[dir_name] = {
                            'type': 'geodatabase',
                            'path': relative_path,
                            'size': size,
                            'components': []  # GDB tiene archivos internos pero no los listamos
                        }

                        if progress_callback:
                            progress_callback(current_item, total_items, dir_name)

                # Remover geodatabases de la lista para no recorrerlas
                for d in dirs_to_remove:
                    dirs.remove(d)

                # Procesar archivos
                for file_name in files:
                    if self._should_ignore(file_name):
                        continue

                    current_item += 1
                    file_full_path = os.path.join(root, file_name)
                    relative_path = os.path.join(relative_root, file_name) if relative_root else file_name

                    try:
                        stat_info = os.stat(file_full_path)
                        size = stat_info.st_size
                        modified = datetime.fromtimestamp(stat_info.st_mtime)
                    except (OSError, IOError):
                        size = 0
                        modified = None

                    # Obtener extensión
                    ext = os.path.splitext(file_name)[1].lower()

                    item = {
                        'name': file_name,
                        'path': relative_path,
                        'full_path': file_full_path,
                        'type': 'file',
                        'extension': ext,
                        'size': size,
                        'size_formatted': self._format_size(size),
                        'modified': modified.isoformat() if modified else None,
                        'is_directory': False,
                        'is_grouped': False,
                        'grouped_type': None
                    }

                    # Siempre agregar a all_items (para auditoría completa)
                    all_items.append(item)
                    result.total_files += 1
                    result.total_size_bytes += size
                    result.stats_by_extension[ext] = result.stats_by_extension.get(ext, 0) + 1

                    # Manejar shapefile y sus componentes
                    if ext == '.shp':
                        # Es el archivo principal del shapefile
                        base_name = file_name[:-4]
                        shapefile_groups[base_name].append(item)
                        item['is_grouped'] = True
                        item['grouped_type'] = 'shapefile_main'
                        grouped_items.append(item)

                    elif self._is_shapefile_component(file_name):
                        # Es un componente de shapefile
                        # Encontrar el nombre base
                        for comp_ext in self.SHAPEFILE_COMPONENTS:
                            if file_name.lower().endswith(comp_ext):
                                base_name = file_name[:-len(comp_ext)]
                                break

                        shapefile_groups[base_name].append(item)
                        item['is_grouped'] = True
                        item['grouped_type'] = 'shapefile_component'
                        # NO agregar a grouped_items (solo el .shp se muestra)

                    else:
                        # Archivo regular
                        grouped_items.append(item)

                    if progress_callback:
                        progress_callback(current_item, total_items, file_name)

                # Contar subdirectorios (excepto geodatabases ya procesadas)
                for dir_name in dirs:
                    if not self._should_ignore(dir_name):
                        dir_full_path = os.path.join(root, dir_name)
                        relative_path = os.path.join(relative_root, dir_name) if relative_root else dir_name

                        item = {
                            'name': dir_name,
                            'path': relative_path,
                            'full_path': dir_full_path,
                            'type': 'directory',
                            'extension': None,
                            'size': 0,
                            'size_formatted': '-',
                            'modified': None,
                            'is_directory': True,
                            'is_grouped': False,
                            'grouped_type': None
                        }

                        all_items.append(item)
                        grouped_items.append(item)
                        result.total_directories += 1

        except Exception as e:
            result.errors.append(f"Error durante escaneo: {str(e)}")

        # Registrar grupos de shapefiles
        for base_name, components in shapefile_groups.items():
            shp_main = next((c for c in components if c['extension'] == '.shp'), None)
            if shp_main:
                total_shp_size = sum(c['size'] for c in components)
                result.geospatial_groups[f"{base_name}.shp"] = {
                    'type': 'shapefile',
                    'path': shp_main['path'],
                    'size': total_shp_size,
                    'size_formatted': self._format_size(total_shp_size),
                    'components': [c['name'] for c in components],
                    'component_count': len(components)
                }

        # Ordenar: directorios primero, luego archivos
        grouped_items.sort(key=lambda x: (0 if x['is_directory'] else 1, x['name'].lower()))
        all_items.sort(key=lambda x: (0 if x['is_directory'] else 1, x['name'].lower()))

        result.grouped_items = grouped_items
        result.all_items = all_items
        result.scan_time_seconds = (datetime.now() - start_time).total_seconds()

        print(f"[SCANNER] scan_directory DONE: files={result.total_files}, dirs={result.total_directories}, all_items={len(result.all_items)}, errors={result.errors}")

        return result

    def generate_audit_details(self, result: ScanResult, target_path: str) -> Dict:
        """
        Genera el diccionario de detalles para auditoría.
        Incluye TODOS los archivos (sin agrupar) para registro completo.
        """
        return {
            'target_path': target_path,
            'total_files': result.total_files,
            'total_directories': result.total_directories,
            'total_size_bytes': result.total_size_bytes,
            'total_size_formatted': self._format_size(result.total_size_bytes),
            'scan_time_seconds': result.scan_time_seconds,
            'geospatial_groups': result.geospatial_groups,
            'stats_by_extension': result.stats_by_extension,
            'deleted_items': [
                {
                    'name': item['name'],
                    'path': item['path'],
                    'type': item['type'],
                    'extension': item['extension'],
                    'size': item['size'],
                    'is_directory': item['is_directory']
                }
                for item in result.all_items
            ]
        }

    def generate_summary(self, result: ScanResult) -> Dict:
        """
        Genera un resumen para mostrar al usuario.
        Usa items agrupados para no inflar números.
        """
        # Contar items agrupados
        files_count = sum(1 for i in result.grouped_items if not i['is_directory'])
        dirs_count = sum(1 for i in result.grouped_items if i['is_directory'])

        # Top extensiones
        top_extensions = sorted(
            result.stats_by_extension.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]

        return {
            'total_items_display': len(result.grouped_items),
            'total_files_display': files_count,
            'total_directories_display': dirs_count,
            'total_items_real': len(result.all_items),
            'total_files_real': result.total_files,
            'total_directories_real': result.total_directories,
            'total_size_bytes': result.total_size_bytes,
            'total_size_formatted': self._format_size(result.total_size_bytes),
            'scan_time_seconds': result.scan_time_seconds,
            'geospatial_groups_count': len(result.geospatial_groups),
            'geospatial_groups': result.geospatial_groups,
            'top_extensions': dict(top_extensions),
            'items': result.grouped_items,
            'has_more': len(result.all_items) > len(result.grouped_items)
        }
