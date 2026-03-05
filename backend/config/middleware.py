"""
Middleware personalizado para configuraciones de seguridad
"""


class SecurityHeadersMiddleware:
    """
    Middleware que agrega headers de seguridad a todas las respuestas de API

    Agrega:
    - Cache-Control: no-cache, no-store, must-revalidate, private
      (Previene que datos sensibles sean cacheados)
    - Pragma: no-cache (Compatibilidad con HTTP/1.0)
    - Expires: 0 (Forzar expiración inmediata)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Solo aplicar a endpoints de API (no static/media)
        if request.path.startswith('/api/'):
            # Prevenir caché de respuestas de API que puedan contener datos sensibles
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'

        return response
