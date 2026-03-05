"""
Middleware para capturar información de auditoría en cada petición
"""


class AuditMiddleware:
    """
    Middleware que adjunta información de auditoría al request

    Captura:
    - client_ip: Dirección IP del cliente
    - user_agent: User-Agent del navegador

    SECURITY NOTE:
    - La IP del cliente se obtiene desde X-Forwarded-For para propósitos de AUDITORÍA únicamente
    - NUNCA usar client_ip para control de acceso o autenticación
    - X-Forwarded-For puede ser falsificado por el cliente
    - Solo usar para logging, estadísticas y auditoría
    - El nginx reverse proxy es quien establece estos headers de forma confiable
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Capturar IP del cliente (SOLO PARA AUDITORÍA, NO PARA AUTENTICACIÓN)
        # El header X-Forwarded-For es establecido por nginx (nuestro reverse proxy)
        # pero podría ser falsificado si se accede directamente al backend
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Tomar la primera IP (cliente original)
            client_ip = x_forwarded_for.split(',')[0].strip()
        else:
            # Fallback a REMOTE_ADDR si no hay proxy
            client_ip = request.META.get('REMOTE_ADDR')

        # Capturar User-Agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Adjuntar al request para uso en las vistas
        # WARNING: Solo usar para logging/auditoría, NO para autenticación
        request.client_ip = client_ip
        request.user_agent = user_agent

        response = self.get_response(request)
        return response
