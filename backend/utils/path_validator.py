"""
Validador de longitud de rutas
"""
import os
from django.conf import settings


class PathValidator:
    """Valida longitud de rutas para cumplir límite de 260 caracteres"""

    MAX_PATH_LENGTH = getattr(settings, 'MAX_PATH_LENGTH', 260)
    BASE_PATH = getattr(settings, 'NETAPP_BASE_PATH', '/mnt/repositorio/DirGesCat/2510SP/H_Informacion_Consulta/Sub_Proy')

    def validate_path_length(self, relative_path: str, new_name: str = None) -> dict:
        """
        Valida que la ruta completa no exceda 260 caracteres (ajustado para Linux)

        Args:
            relative_path: Ruta relativa desde Sub_Proy
            new_name: Nombre del archivo/directorio a agregar (opcional)

        Returns:
            {
                'valid': bool,
                'current_length': int,
                'max_length': 260,
                'available': int,
                'full_path': str,
                'exceeds_by': int  # Solo si excede
            }
        """
        # Construir ruta completa
        if new_name:
            full_path = os.path.join(self.BASE_PATH, relative_path, new_name)
        else:
            full_path = os.path.join(self.BASE_PATH, relative_path)

        # Normalizar ruta
        full_path = os.path.normpath(full_path)
        current_length = len(full_path)
        available = self.MAX_PATH_LENGTH - current_length

        result = {
            'valid': current_length <= self.MAX_PATH_LENGTH,
            'current_length': current_length,
            'max_length': self.MAX_PATH_LENGTH,
            'available': available,
            'full_path': full_path
        }

        # Ajustar lógica para Linux si es necesario
        if not result['valid']:
            result['exceeds_by'] = abs(available)

        return result

    def get_available_chars_for_name(self, current_path: str, extension: str = '') -> dict:
        """
        Calcula cuántos caracteres están disponibles para un nombre de archivo

        Args:
            current_path: Ruta actual donde se creará el archivo
            extension: Extensión del archivo (incluyendo el punto, ej: '.pdf')

        Returns:
            {
                'available': int,
                'path_length': int,
                'max_name_length': int
            }
        """
        # Calcular longitud de la ruta base + ruta actual
        base_full_path = os.path.join(self.BASE_PATH, current_path)
        base_length = len(base_full_path)

        # Agregar separador de directorio
        if not base_full_path.endswith(os.sep):
            base_length += 1

        # Restar longitud de la extensión
        extension_length = len(extension)

        # Caracteres disponibles para el nombre
        available = self.MAX_PATH_LENGTH - base_length - extension_length

        return {
            'available': max(0, available),
            'path_length': base_length,
            'max_name_length': max(0, available),
            'extension_length': extension_length
        }

    def validate_batch_paths(self, paths: list) -> dict:
        """
        Valida múltiples rutas a la vez

        Args:
            paths: Lista de tuplas (relative_path, name)

        Returns:
            {
                'valid_count': int,
                'invalid_count': int,
                'results': list
            }
        """
        results = []
        valid_count = 0
        invalid_count = 0

        for relative_path, name in paths:
            result = self.validate_path_length(relative_path, name)
            result['path'] = relative_path
            result['name'] = name

            if result['valid']:
                valid_count += 1
            else:
                invalid_count += 1

            results.append(result)

        return {
            'valid_count': valid_count,
            'invalid_count': invalid_count,
            'results': results
        }

    def suggest_truncated_name(self, name: str, max_length: int) -> str:
        """
        Sugiere un nombre truncado que cumpla con el límite

        Args:
            name: Nombre original
            max_length: Longitud máxima permitida

        Returns:
            Nombre truncado
        """
        if len(name) <= max_length:
            return name

        # Si tiene extensión, preservarla
        if '.' in name:
            base, ext = name.rsplit('.', 1)
            available_for_base = max_length - len(ext) - 1  # -1 por el punto
            if available_for_base > 0:
                return f"{base[:available_for_base]}.{ext}"
            else:
                return f"{name[:max_length]}"

        return name[:max_length]
