"""
Comando para enviar notificaciones de vencimiento de permisos
Envía emails Y notificaciones in-app 7 días y 3 días antes del vencimiento

Uso:
    python manage.py send_expiration_notifications
    python manage.py send_expiration_notifications --dry-run
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from datetime import timedelta
from users.models import UserPermission, User


class Command(BaseCommand):
    help = 'Envía notificaciones de vencimiento de permisos (7 y 3 días antes) por email e in-app'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar los emails que se enviarían sin enviarlos realmente',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        # Notificaciones para 7 días antes
        seven_days_from_now = now + timedelta(days=7)
        notifications_7days = UserPermission.objects.filter(
            is_active=True,
            expires_at__isnull=False,
            expires_at__date=seven_days_from_now.date(),
            expiration_notified_7days=False
        ).select_related('user', 'granted_by')

        # Notificaciones para 3 días antes
        three_days_from_now = now + timedelta(days=3)
        notifications_3days = UserPermission.objects.filter(
            is_active=True,
            expires_at__isnull=False,
            expires_at__date=three_days_from_now.date(),
            expiration_notified_3days=False
        ).select_related('user', 'granted_by')

        total_7days = notifications_7days.count()
        total_3days = notifications_3days.count()

        if total_7days == 0 and total_3days == 0:
            self.stdout.write(
                self.style.SUCCESS('No hay notificaciones de vencimiento pendientes para enviar')
            )
            return

        # Enviar notificaciones de 7 días
        sent_7days = self._send_notifications(notifications_7days, 7, dry_run)

        # Enviar notificaciones de 3 días
        sent_3days = self._send_notifications(notifications_3days, 3, dry_run)

        # Resumen
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN - Se enviarían {sent_7days + sent_3days} notificación(es): '
                    f'{sent_7days} de 7 días, {sent_3days} de 3 días'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Se enviaron {sent_7days + sent_3days} notificación(es) exitosamente: '
                    f'{sent_7days} de 7 días, {sent_3days} de 3 días'
                )
            )

    def _send_notifications(self, permissions, days_before, dry_run):
        """Envía notificaciones para un conjunto de permisos (email + in-app)"""
        from notifications.services import NotificationService

        sent_count = 0

        for perm in permissions:
            try:
                if dry_run:
                    self.stdout.write(
                        f'  [{days_before} días] {perm.user.email} - {perm.base_path} - '
                        f'Vence: {perm.expires_at.strftime("%Y-%m-%d")}'
                    )
                    sent_count += 1
                else:
                    # Preparar contexto para el template
                    # Construir display de ruta (NO dentro de f-string por los backslashes)
                    base_path_display = f"\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\{perm.base_path}" if perm.base_path else "\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy"

                    context = {
                        'user_name': perm.user.get_full_name(),
                        'days_remaining': days_before,
                        'expires_at': perm.expires_at.strftime('%d de %B de %Y'),
                        'base_path_display': base_path_display,
                        'granted_at': perm.granted_at.strftime('%d de %B de %Y'),
                        'granted_by': perm.granted_by.get_full_name() if perm.granted_by else 'Sistema',
                        'frontend_url': settings.FRONTEND_URL,
                    }

                    # Renderizar HTML
                    html_content = render_to_string('emails/permission_expiring.html', context)

                    # Enviar email
                    send_mail(
                        subject=f'Sus permisos vencen en {days_before} días - Sistema IGAC',
                        message=f'Sus permisos de acceso vencerán en {days_before} días. Vea los detalles en: {settings.FRONTEND_URL}',
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[perm.user.email],
                        html_message=html_content,
                        fail_silently=False,
                    )

                    # === CREAR NOTIFICACIÓN IN-APP ===
                    # Determinar prioridad (3 días = urgente, 7 días = alta)
                    priority = 'urgent' if days_before == 3 else 'high'

                    # Construir mensaje para notificación in-app
                    folder_name = perm.base_path.split('/')[-1] if perm.base_path else 'Raíz del repositorio'

                    if days_before == 3:
                        title = f'ÚLTIMO AVISO: Permiso vence en {days_before} días'
                        message = (
                            f'Tu acceso a "{folder_name}" vence el {perm.expires_at.strftime("%d/%m/%Y")}.\n\n'
                            f'Ruta: {perm.base_path}\n\n'
                            f'Esta es tu última advertencia. Contacta al administrador para renovar tu permiso.'
                        )
                    else:
                        title = f'Permiso por vencer en {days_before} días'
                        message = (
                            f'Tu acceso a "{folder_name}" vence el {perm.expires_at.strftime("%d/%m/%Y")}.\n\n'
                            f'Ruta: {perm.base_path}\n\n'
                            f'Contacta al administrador si necesitas renovar tu permiso.'
                        )

                    try:
                        NotificationService.create(
                            recipient=perm.user,
                            notification_type='permission_expiry',
                            priority=priority,
                            title=title,
                            message=message,
                            related_path=perm.base_path,
                            related_object_type='permission',
                            related_object_id=str(perm.id),
                            action_url='/my-permissions',
                            sender=perm.granted_by  # El admin que otorgó el permiso
                        )
                        self.stdout.write(
                            f'  ✓ Notificación in-app creada para {perm.user.email}'
                        )
                    except Exception as notif_error:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  ⚠ Error creando notificación in-app para {perm.user.email}: {str(notif_error)}'
                            )
                        )

                    # Marcar como notificado
                    if days_before == 7:
                        perm.expiration_notified_7days = True
                    elif days_before == 3:
                        perm.expiration_notified_3days = True
                    perm.save(update_fields=[f'expiration_notified_{days_before}days'])

                    sent_count += 1
                    self.stdout.write(
                        f'  ✓ Email enviado a {perm.user.email} ({days_before} días antes)'
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'  ✗ Error enviando a {perm.user.email}: {str(e)}'
                    )
                )

        return sent_count
