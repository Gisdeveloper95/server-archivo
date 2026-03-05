"""
Tareas Celery para el sistema de notificaciones
"""
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(name='notifications.tasks.send_permission_expiration_notifications')
def send_permission_expiration_notifications():
    """
    Envía notificaciones de expiración de permisos (7 y 3 días antes).
    Esta tarea se ejecuta diariamente a las 8:30 AM.

    - 7 días antes: Notificación de prioridad 'high' (solo in-app)
    - 3 días antes: Notificación de prioridad 'urgent' (in-app + email)
    """
    from users.models import UserPermission
    from notifications.services import NotificationService

    now = timezone.now()
    results = {
        'notified_7days': 0,
        'notified_3days': 0,
        'errors': []
    }

    # === NOTIFICACIONES DE 7 DÍAS ===
    seven_days_from_now = now + timedelta(days=7)
    permissions_7days = UserPermission.objects.filter(
        is_active=True,
        expires_at__isnull=False,
        expires_at__date=seven_days_from_now.date(),
        expiration_notified_7days=False
    ).select_related('user', 'granted_by')

    for perm in permissions_7days:
        try:
            folder_name = perm.base_path.split('/')[-1] if perm.base_path else 'Raíz del repositorio'

            NotificationService.create(
                recipient=perm.user,
                notification_type='permission_expiry',
                priority='high',
                title='Permiso por vencer en 7 días',
                message=(
                    f'Tu acceso a "{folder_name}" vence el {perm.expires_at.strftime("%d/%m/%Y")}.\n\n'
                    f'Ruta: {perm.base_path}\n\n'
                    f'Contacta al administrador si necesitas renovar tu permiso.'
                ),
                related_path=perm.base_path,
                related_object_type='permission',
                related_object_id=str(perm.id),
                action_url='/my-permissions',
                sender=perm.granted_by
            )

            # Marcar como notificado
            perm.expiration_notified_7days = True
            perm.save(update_fields=['expiration_notified_7days'])

            results['notified_7days'] += 1
            logger.info(f"Notificación 7 días enviada a {perm.user.email} para permiso {perm.id}")

        except Exception as e:
            error_msg = f"Error notificando permiso {perm.id} a {perm.user.email}: {str(e)}"
            logger.error(error_msg)
            results['errors'].append(error_msg)

    # === NOTIFICACIONES DE 3 DÍAS (URGENTE) ===
    three_days_from_now = now + timedelta(days=3)
    permissions_3days = UserPermission.objects.filter(
        is_active=True,
        expires_at__isnull=False,
        expires_at__date=three_days_from_now.date(),
        expiration_notified_3days=False
    ).select_related('user', 'granted_by')

    for perm in permissions_3days:
        try:
            folder_name = perm.base_path.split('/')[-1] if perm.base_path else 'Raíz del repositorio'

            # Crear notificación in-app (prioridad urgente = también envía email)
            NotificationService.create(
                recipient=perm.user,
                notification_type='permission_expiry',
                priority='urgent',  # Esto dispara envío de email automático
                title='ÚLTIMO AVISO: Permiso vence en 3 días',
                message=(
                    f'Tu acceso a "{folder_name}" vence el {perm.expires_at.strftime("%d/%m/%Y")}.\n\n'
                    f'Ruta: {perm.base_path}\n\n'
                    f'Esta es tu última advertencia. Contacta al administrador para renovar tu permiso.'
                ),
                related_path=perm.base_path,
                related_object_type='permission',
                related_object_id=str(perm.id),
                action_url='/my-permissions',
                sender=perm.granted_by
            )

            # Marcar como notificado
            perm.expiration_notified_3days = True
            perm.save(update_fields=['expiration_notified_3days'])

            results['notified_3days'] += 1
            logger.info(f"Notificación 3 días (urgente) enviada a {perm.user.email} para permiso {perm.id}")

        except Exception as e:
            error_msg = f"Error notificando permiso {perm.id} a {perm.user.email}: {str(e)}"
            logger.error(error_msg)
            results['errors'].append(error_msg)

    total = results['notified_7days'] + results['notified_3days']
    logger.info(
        f"Notificaciones de expiración de permisos completadas: "
        f"{results['notified_7days']} de 7 días, {results['notified_3days']} de 3 días, "
        f"{len(results['errors'])} errores"
    )

    return results


@shared_task(name='notifications.tasks.cleanup_old_notifications')
def cleanup_old_notifications():
    """
    Limpia notificaciones antiguas:
    - Notificaciones leídas de más de 90 días
    - Notificaciones archivadas de más de 30 días

    Esta tarea se ejecuta semanalmente.
    """
    from notifications.models import Notification

    now = timezone.now()
    results = {
        'deleted_read': 0,
        'deleted_archived': 0
    }

    # Eliminar notificaciones leídas de más de 90 días
    ninety_days_ago = now - timedelta(days=90)
    deleted_read = Notification.objects.filter(
        is_read=True,
        read_at__lt=ninety_days_ago
    ).delete()
    results['deleted_read'] = deleted_read[0] if deleted_read else 0

    # Eliminar notificaciones archivadas de más de 30 días
    thirty_days_ago = now - timedelta(days=30)
    deleted_archived = Notification.objects.filter(
        is_archived=True,
        created_at__lt=thirty_days_ago
    ).delete()
    results['deleted_archived'] = deleted_archived[0] if deleted_archived else 0

    logger.info(
        f"Limpieza de notificaciones: {results['deleted_read']} leídas, "
        f"{results['deleted_archived']} archivadas eliminadas"
    )

    return results


@shared_task(name='notifications.tasks.cleanup_expired_attachments')
def cleanup_expired_attachments():
    """
    Limpia archivos adjuntos del chat mayores al tiempo de retención configurado.
    Esta tarea se ejecuta diariamente a las 4:00 AM.

    La retención se configura con MESSAGE_ATTACHMENTS_RETENTION_DAYS (default: 180 días = 6 meses)

    - Busca attachments con created_at > tiempo de retención
    - Elimina el archivo físico de la NAS
    - Elimina el registro de la base de datos
    - Registra en auditoría

    Returns:
        dict con estadísticas de limpieza
    """
    from notifications.models import MessageAttachment, MESSAGE_ATTACHMENTS_RETENTION_DAYS
    from audit.models import AuditLog
    import os

    # Usar tiempo de retención desde variable de entorno
    retention_days = MESSAGE_ATTACHMENTS_RETENTION_DAYS

    logger.info(f"Iniciando limpieza de archivos adjuntos expirados (>{retention_days} días)...")

    now = timezone.now()
    expiry_date = now - timedelta(days=retention_days)

    results = {
        'deleted_count': 0,
        'deleted_size': 0,
        'errors': []
    }

    try:
        # Buscar attachments mayores al tiempo de retención
        expired_attachments = MessageAttachment.objects.filter(
            created_at__lt=expiry_date
        )

        total_to_delete = expired_attachments.count()
        logger.info(f"Encontrados {total_to_delete} archivos adjuntos para eliminar")

        for attachment in expired_attachments:
            try:
                # Guardar info para log
                file_path = attachment.file.path if attachment.file else None
                file_size = attachment.file_size
                original_name = attachment.original_filename

                # Intentar eliminar el archivo físico
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)
                    logger.debug(f"Archivo físico eliminado: {file_path}")

                    # Intentar eliminar directorios vacíos
                    try:
                        parent_dir = os.path.dirname(file_path)
                        if parent_dir and os.path.isdir(parent_dir) and not os.listdir(parent_dir):
                            os.rmdir(parent_dir)
                    except OSError:
                        pass  # Ignorar si no se puede eliminar directorio

                # Eliminar registro de BD
                attachment.delete()

                results['deleted_count'] += 1
                results['deleted_size'] += file_size

                logger.debug(f"Attachment eliminado: {original_name} ({file_size} bytes)")

            except Exception as e:
                error_msg = f"Error eliminando attachment {attachment.id}: {str(e)}"
                logger.error(error_msg)
                results['errors'].append(error_msg)

        # Formatear tamaño para log
        size_mb = results['deleted_size'] / (1024 * 1024)
        results['deleted_size_formatted'] = f"{size_mb:.2f} MB"

        # Registrar en auditoría si se limpiaron archivos
        if results['deleted_count'] > 0:
            AuditLog.objects.create(
                action='attachments_auto_cleanup',
                details={
                    'deleted_count': results['deleted_count'],
                    'deleted_size_bytes': results['deleted_size'],
                    'deleted_size_formatted': results['deleted_size_formatted'],
                    'retention_days': retention_days,
                    'errors': results['errors'][:10]  # Max 10 errores en log
                },
                success=True
            )

        logger.info(
            f"Limpieza de attachments completada: {results['deleted_count']} archivos eliminados, "
            f"{results['deleted_size_formatted']} liberados, {len(results['errors'])} errores"
        )

        return {
            'success': True,
            **results
        }

    except Exception as e:
        logger.exception(f"Excepción en cleanup_expired_attachments: {e}")
        return {
            'success': False,
            'error': str(e)
        }
