"""
Validadores reutilizables para el sistema
"""
import re
from django.core.exceptions import ValidationError


def validate_email_format(email):
    """
    Valida formato de email IGAC

    Args:
        email: Email a validar

    Raises:
        ValidationError: Si el formato no es válido
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValidationError('Formato de email inválido')


def validate_username_from_email(email):
    """
    Extrae y valida username desde email

    Args:
        email: Email del usuario

    Returns:
        str: Username extraído (parte antes del @)

    Raises:
        ValidationError: Si el email es inválido
    """
    validate_email_format(email)
    username = email.split('@')[0]
    return username


def validate_path_safety(path):
    """
    Valida que la ruta no contenga secuencias peligrosas

    Previene path traversal attacks

    Args:
        path: Ruta a validar

    Raises:
        ValidationError: Si la ruta contiene secuencias peligrosas
    """
    dangerous_patterns = ['..', '~', '$', '`', ';', '|', '&']

    for pattern in dangerous_patterns:
        if pattern in path:
            raise ValidationError(f'Ruta contiene secuencia peligrosa: {pattern}')


# Extensiones de archivos realmente peligrosos (ejecutables y scripts de sistema)
DANGEROUS_EXTENSIONS = {
    # Ejecutables Windows - los más peligrosos
    'exe', 'com', 'bat', 'cmd', 'scr', 'pif',
    # Scripts Windows que ejecutan directamente
    'vbs', 'vbe', 'wsf', 'wsh',
    # HTML Application - ejecuta como aplicación
    'hta',
}


def validate_dangerous_extension(filename):
    """
    Valida que el archivo no tenga una extensión peligrosa.

    IMPORTANTE: Esta es una capa de seguridad crítica que bloquea
    archivos ejecutables, scripts y otros formatos potencialmente maliciosos.

    Args:
        filename: Nombre del archivo a validar

    Raises:
        ValidationError: Si el archivo tiene una extensión peligrosa
    """
    if '.' not in filename:
        return  # Sin extensión, permitir (se validará el contenido si es necesario)

    # Obtener extensión (puede haber múltiples puntos)
    ext = filename.rsplit('.', 1)[1].lower()

    if ext in DANGEROUS_EXTENSIONS:
        raise ValidationError(
            f'Por seguridad, no se permiten archivos .{ext}. '
            f'Si necesita subir este archivo, comprímalo en un .zip primero.'
        )

    # También verificar extensiones dobles sospechosas (ej: documento.pdf.exe)
    parts = filename.lower().split('.')
    if len(parts) > 2:
        for part in parts[1:]:
            if part in DANGEROUS_EXTENSIONS:
                raise ValidationError(
                    f'Archivo sospechoso: contiene extensión .{part} oculta. '
                    f'Si es legítimo, comprímalo en un .zip primero.'
                )


def validate_file_extension(filename, allowed_extensions=None):
    """
    Valida que la extensión del archivo esté permitida

    Args:
        filename: Nombre del archivo
        allowed_extensions: Lista de extensiones permitidas (None = todas)

    Raises:
        ValidationError: Si la extensión no está permitida
    """
    # SIEMPRE verificar extensiones peligrosas primero
    validate_dangerous_extension(filename)

    if allowed_extensions is None:
        return

    if '.' not in filename:
        raise ValidationError('El archivo debe tener una extensión')

    ext = filename.rsplit('.', 1)[1].lower()

    if ext not in allowed_extensions:
        raise ValidationError(
            f'Extensión .{ext} no permitida. Permitidas: {", ".join(allowed_extensions)}'
        )


def validate_file_size(file_size, max_size_mb=500):
    """
    Valida el tamaño del archivo

    Args:
        file_size: Tamaño en bytes
        max_size_mb: Tamaño máximo en MB

    Raises:
        ValidationError: Si el archivo excede el tamaño máximo
    """
    max_size_bytes = max_size_mb * 1024 * 1024

    if file_size > max_size_bytes:
        raise ValidationError(
            f'El archivo excede el tamaño máximo de {max_size_mb}MB'
        )


def validate_directory_name(name):
    """
    Valida que el nombre de directorio sea válido

    Args:
        name: Nombre del directorio

    Raises:
        ValidationError: Si el nombre no es válido
    """
    if not name or name.strip() == '':
        raise ValidationError('El nombre del directorio no puede estar vacío')

    # No permitir espacios al inicio o final
    if name != name.strip():
        raise ValidationError('El nombre no puede tener espacios al inicio o final')

    # No permitir puntos solos
    if name in ['.', '..']:
        raise ValidationError('Nombre de directorio inválido')


def validate_rename_operation(old_name, new_name):
    """
    Valida una operación de renombrado

    Args:
        old_name: Nombre antiguo
        new_name: Nombre nuevo

    Raises:
        ValidationError: Si la operación no es válida
    """
    if old_name == new_name:
        raise ValidationError('El nuevo nombre debe ser diferente al antiguo')

    validate_directory_name(new_name)


def sanitize_filename(filename):
    """
    Sanitiza un nombre de archivo eliminando caracteres peligrosos

    Args:
        filename: Nombre a sanitizar

    Returns:
        str: Nombre sanitizado
    """
    # Eliminar caracteres no permitidos
    dangerous_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']

    sanitized = filename
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '_')

    # Eliminar espacios múltiples
    sanitized = re.sub(r'\s+', ' ', sanitized)

    # Eliminar espacios al inicio y final
    sanitized = sanitized.strip()

    return sanitized
