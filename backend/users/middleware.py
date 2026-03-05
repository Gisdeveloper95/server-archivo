"""
Middleware para gestión automática de permisos de usuario.
"""
from datetime import timedelta
from django.utils import timezone
from users.models import UserPermission


class PermissionExpirationMiddleware:
    """
    Middleware que gestiona permisos vencidos:
    - Los permisos expirados permanecen visibles para el usuario
    - Los permisos expirados hace más de 2 meses se eliminan automáticamente
    """

    # Días después de expirar para eliminar automáticamente el permiso
    DAYS_TO_AUTO_DELETE = 60  # 2 meses

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Antes de procesar el request, limpiar permisos muy antiguos
        if hasattr(request, 'user') and request.user.is_authenticated:
            self.cleanup_old_expired_permissions(request.user)

        response = self.get_response(request)
        return response

    def cleanup_old_expired_permissions(self, user):
        """
        Elimina permisos que expiraron hace más de 2 meses.

        Los permisos recién expirados permanecen visibles para que el usuario
        sepa que tenía acceso, pero después de 2 meses se limpian automáticamente.
        """
        cutoff_date = timezone.now() - timedelta(days=self.DAYS_TO_AUTO_DELETE)

        # Eliminar permisos que expiraron hace más de 2 meses
        old_expired = UserPermission.objects.filter(
            user=user,
            expires_at__isnull=False,
            expires_at__lt=cutoff_date
        )

        if old_expired.exists():
            count = old_expired.count()
            old_expired.delete()
            print(f"🗑️ Eliminados {count} permiso(s) expirado(s) hace +2 meses para {user.username}")
