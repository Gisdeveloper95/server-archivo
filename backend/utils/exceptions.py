"""
Excepciones personalizadas del sistema
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


class PermissionDeniedException(Exception):
    """Excepción cuando el usuario no tiene permisos"""
    def __init__(self, message="No tienes permisos para realizar esta acción"):
        self.message = message
        super().__init__(self.message)


class PathValidationException(Exception):
    """Excepción cuando la validación de ruta falla"""
    def __init__(self, errors, warnings=None):
        self.errors = errors
        self.warnings = warnings or []
        super().__init__(', '.join(errors))


class DictionaryValidationException(Exception):
    """Excepción cuando la validación del diccionario falla"""
    def __init__(self, errors, suggestions=None):
        self.errors = errors
        self.suggestions = suggestions or []
        super().__init__(', '.join(errors))


class FileOperationException(Exception):
    """Excepción cuando una operación de archivo falla"""
    def __init__(self, message, operation=None, path=None):
        self.message = message
        self.operation = operation
        self.path = path
        super().__init__(self.message)


class SMBConnectionException(Exception):
    """Excepción cuando falla la conexión SMB"""
    def __init__(self, message="Error al conectar con el servidor de archivos"):
        self.message = message
        super().__init__(self.message)


def custom_exception_handler(exc, context):
    """
    Manejador de excepciones personalizado para DRF

    Convierte las excepciones personalizadas en respuestas HTTP apropiadas
    """
    # Llamar al manejador por defecto primero
    response = exception_handler(exc, context)

    # Si ya se manejó, retornar
    if response is not None:
        return response

    # Manejar excepciones personalizadas
    if isinstance(exc, PermissionDeniedException):
        return Response(
            {'error': exc.message},
            status=status.HTTP_403_FORBIDDEN
        )

    if isinstance(exc, PathValidationException):
        return Response(
            {
                'error': 'Validación de ruta fallida',
                'errors': exc.errors,
                'warnings': exc.warnings
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, DictionaryValidationException):
        return Response(
            {
                'error': 'Validación de diccionario fallida',
                'errors': exc.errors,
                'suggestions': exc.suggestions
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    if isinstance(exc, FileOperationException):
        return Response(
            {
                'error': exc.message,
                'operation': exc.operation,
                'path': exc.path
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    if isinstance(exc, SMBConnectionException):
        return Response(
            {'error': exc.message},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    # Si no es una excepción conocida, retornar error genérico
    return Response(
        {'error': 'Error interno del servidor'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
