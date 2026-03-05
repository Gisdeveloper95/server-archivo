"""
Comando para desactivar permisos vencidos automáticamente
Se puede ejecutar como tarea programada diaria

Uso:
    python manage.py deactivate_expired_permissions
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import UserPermission


class Command(BaseCommand):
    help = 'Desactiva permisos de usuario que han vencido'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar los permisos que se desactivarían sin realizar cambios',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        # Buscar permisos activos que ya vencieron
        expired_permissions = UserPermission.objects.filter(
            is_active=True,
            expires_at__isnull=False,
            expires_at__lte=now
        ).select_related('user')

        count = expired_permissions.count()

        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('No hay permisos vencidos para desactivar')
            )
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN - Se desactivarían {count} permiso(s):')
            )
            for perm in expired_permissions:
                self.stdout.write(
                    f'  - Usuario: {perm.user.username} | Ruta: {perm.base_path} | '
                    f'Vencido: {perm.expires_at.strftime("%Y-%m-%d %H:%M")}'
                )
        else:
            # Desactivar permisos vencidos
            for perm in expired_permissions:
                perm.is_active = False
                perm.revoked_at = now
                perm.save(update_fields=['is_active', 'revoked_at'])

                self.stdout.write(
                    f'Desactivado - Usuario: {perm.user.username} | '
                    f'Ruta: {perm.base_path} | Vencido: {perm.expires_at.strftime("%Y-%m-%d")}'
                )

            self.stdout.write(
                self.style.SUCCESS(f'Se desactivaron {count} permiso(s) vencido(s) exitosamente')
            )
