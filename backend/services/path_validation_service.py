"""
Servicio para validación de rutas y límites de caracteres
"""
import os
from django.conf import settings
from utils.validators import DANGEROUS_EXTENSIONS


class PathValidationService:
    """
    Servicio para validar rutas de archivos/directorios

    Funcionalidades:
    - Validar límite de 260 caracteres
    - Normalizar rutas
    - Validar caracteres permitidos
    """

    MAX_PATH_LENGTH = settings.MAX_PATH_LENGTH

    @staticmethod
    def validate_path_length(full_path, user=None):
        """
        Valida que la ruta no exceda el límite de caracteres

        Args:
            full_path: Ruta completa a validar
            user: Usuario (para verificar si puede exceder el límite)

        Returns:
            dict: {
                'valid': bool,
                'length': int,
                'max_length': int,
                'exceeded_by': int,
                'can_exceed': bool
            }
        """
        length = len(full_path)
        max_length = PathValidationService.MAX_PATH_LENGTH

        # Si el usuario puede exceder el límite
        can_exceed = user and user.can_exceed_path_limit() if user else False

        if can_exceed:
            return {
                'valid': True,
                'length': length,
                'max_length': max_length,
                'exceeded_by': max(0, length - max_length),
                'can_exceed': True,
                'warning': f"Ruta excede el límite recomendado por {length - max_length} caracteres" if length > max_length else None
            }

        is_valid = length <= max_length

        return {
            'valid': is_valid,
            'length': length,
            'max_length': max_length,
            'exceeded_by': max(0, length - max_length),
            'can_exceed': False,
            'error': f"La ruta excede el límite de {max_length} caracteres por {length - max_length}" if not is_valid else None
        }

    @staticmethod
    def validate_name_chars(name):
        """
        Valida que el nombre no contenga caracteres inválidos para Windows

        Caracteres no permitidos: < > : " / \ | ? *

        Args:
            name: Nombre de archivo/carpeta

        Returns:
            dict: {'valid': bool, 'invalid_chars': list, 'error': str}
        """
        invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        found_invalid = [char for char in invalid_chars if char in name]

        is_valid = len(found_invalid) == 0

        return {
            'valid': is_valid,
            'invalid_chars': found_invalid,
            'error': f"El nombre contiene caracteres inválidos: {', '.join(found_invalid)}" if not is_valid else None
        }

    @staticmethod
    def validate_uppercase(name, user=None):
        """
        Valida que el nombre no contenga letras mayúsculas
        Excepción: superadmin puede usar mayúsculas

        Args:
            name: Nombre de archivo/carpeta
            user: Usuario (para verificar si es superadmin)

        Returns:
            dict: {'valid': bool, 'error': str}
        """
        # Superadmin puede usar mayúsculas
        if user and user.role == 'superadmin':
            return {
                'valid': True,
                'error': None
            }

        # Verificar si hay letras mayúsculas
        has_uppercase = any(c.isupper() for c in name)

        return {
            'valid': not has_uppercase,
            'error': 'El nombre no puede contener letras mayúsculas' if has_uppercase else None
        }

    @staticmethod
    def validate_gdb_extension(name):
        """
        Valida que archivos .gdb estén comprimidos
        Windows interpreta .gdb como directorio, por lo que debe estar comprimido

        Args:
            name: Nombre de archivo

        Returns:
            dict: {'valid': bool, 'error': str}
        """
        # Convertir a minúsculas para comparación
        name_lower = name.lower()

        # Verificar si termina en .gdb
        if name_lower.endswith('.gdb'):
            # No está comprimido - BLOQUEAR
            return {
                'valid': False,
                'error': 'Los archivos .gdb deben estar comprimidos (.gdb.zip, .gdb.7z, .gdb.gz, .gdb.rar)'
            }

        # Verificar si tiene .gdb pero está comprimido correctamente
        # Extensiones de compresión válidas
        valid_compressed_extensions = ['.gdb.zip', '.gdb.7z', '.gdb.gz', '.gdb.rar']

        # Si tiene .gdb en el nombre, verificar que esté seguido de extensión de compresión
        if '.gdb' in name_lower:
            is_compressed = any(name_lower.endswith(ext) for ext in valid_compressed_extensions)
            if not is_compressed:
                return {
                    'valid': False,
                    'error': 'Los archivos .gdb deben estar comprimidos (.gdb.zip, .gdb.7z, .gdb.gz, .gdb.rar)'
                }

        # Si no tiene .gdb o está correctamente comprimido
        return {
            'valid': True,
            'error': None
        }

    @staticmethod
    def normalize_path(path):
        """
        Normaliza una ruta para consistencia

        Args:
            path: Ruta a normalizar

        Returns:
            str: Ruta normalizada
        """
        # Convertir a barras inversas (Windows)
        normalized = path.replace('/', '\\')

        # Eliminar dobles barras
        while '\\\\\\\\' in normalized:
            normalized = normalized.replace('\\\\\\\\', '\\\\')

        # Eliminar espacios al inicio/final
        normalized = normalized.strip()

        return normalized

    @staticmethod
    def build_full_path(base_path, *parts):
        """
        Construye una ruta completa desde componentes

        Args:
            base_path: Ruta base
            *parts: Componentes adicionales

        Returns:
            str: Ruta completa normalizada
        """
        full_path = os.path.join(base_path, *parts)
        return PathValidationService.normalize_path(full_path)

    @staticmethod
    def validate_dangerous_extension(name):
        """
        Valida que el archivo no tenga una extensión potencialmente peligrosa.

        SEGURIDAD CRÍTICA: Bloquea ejecutables, scripts y otros formatos
        que podrían ser utilizados para comprometer el sistema.

        Args:
            name: Nombre del archivo

        Returns:
            dict: {'valid': bool, 'error': str, 'blocked_extension': str}
        """
        if '.' not in name:
            return {'valid': True, 'error': None, 'blocked_extension': None}

        # Obtener la extensión final
        ext = name.rsplit('.', 1)[1].lower()

        if ext in DANGEROUS_EXTENSIONS:
            return {
                'valid': False,
                'error': f'Por seguridad, no se permiten archivos con extensión .{ext}. Este tipo de archivo podría ser potencialmente peligroso.',
                'blocked_extension': ext
            }

        # Verificar extensiones dobles sospechosas (ej: documento.pdf.exe)
        parts = name.lower().split('.')
        if len(parts) > 2:
            for part in parts[1:]:
                if part in DANGEROUS_EXTENSIONS:
                    return {
                        'valid': False,
                        'error': f'Archivo sospechoso: contiene extensión .{part} oculta. Por seguridad, este archivo no está permitido.',
                        'blocked_extension': part
                    }

        return {'valid': True, 'error': None, 'blocked_extension': None}

    @staticmethod
    def validate_full_creation(base_path, new_name, user=None):
        """
        Validación completa para creación de archivo/carpeta

        Args:
            base_path: Ruta base donde se creará
            new_name: Nombre del nuevo archivo/carpeta
            user: Usuario que crea

        Returns:
            dict: Resultado completo de validación
        """
        from services.dictionary_service import DictionaryService

        # 0. SEGURIDAD CRÍTICA: Validar extensiones peligrosas PRIMERO
        dangerous_validation = PathValidationService.validate_dangerous_extension(new_name)
        if not dangerous_validation['valid']:
            return {
                'valid': False,
                'errors': [dangerous_validation['error']],
                'validations': {'dangerous_extension': dangerous_validation},
                'security_blocked': True  # Flag para auditoría
            }

        # 1. Validar caracteres del nombre
        char_validation = PathValidationService.validate_name_chars(new_name)
        if not char_validation['valid']:
            return {
                'valid': False,
                'errors': [char_validation['error']],
                'validations': {'characters': char_validation}
            }

        # 2. Validar mayúsculas (solo para no-superadmin)
        uppercase_validation = PathValidationService.validate_uppercase(new_name, user)
        if not uppercase_validation['valid']:
            return {
                'valid': False,
                'errors': [uppercase_validation['error']],
                'validations': {
                    'characters': char_validation,
                    'uppercase': uppercase_validation
                }
            }

        # 3. Validar extensión .gdb (debe estar comprimida)
        gdb_validation = PathValidationService.validate_gdb_extension(new_name)
        if not gdb_validation['valid']:
            return {
                'valid': False,
                'errors': [gdb_validation['error']],
                'validations': {
                    'characters': char_validation,
                    'uppercase': uppercase_validation,
                    'gdb': gdb_validation
                }
            }

        # 4. Validar nombre contra diccionario
        dict_service = DictionaryService()
        dict_validation = dict_service.validate_name(new_name, user)

        # 5. Construir ruta completa y validar longitud
        full_path = PathValidationService.build_full_path(base_path, new_name)
        length_validation = PathValidationService.validate_path_length(full_path, user)

        # Determinar si es válido
        is_valid = (
            char_validation['valid'] and
            uppercase_validation['valid'] and
            gdb_validation['valid'] and
            dict_validation['valid'] and
            length_validation['valid']
        )

        errors = []
        warnings = []

        if not char_validation['valid']:
            errors.append(char_validation['error'])

        if not uppercase_validation['valid']:
            errors.append(uppercase_validation['error'])

        if not gdb_validation['valid']:
            errors.append(gdb_validation['error'])

        if not dict_validation['valid']:
            errors.extend(dict_validation['errors'])

        if not length_validation['valid']:
            errors.append(length_validation['error'])
        elif length_validation.get('warning'):
            warnings.append(length_validation['warning'])

        return {
            'valid': is_valid,
            'errors': errors,
            'warnings': warnings,
            'full_path': full_path,
            'validations': {
                'characters': char_validation,
                'uppercase': uppercase_validation,
                'gdb': gdb_validation,
                'dictionary': dict_validation,
                'length': length_validation
            }
        }
