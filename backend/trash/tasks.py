"""
Tareas Celery para la Papelera de Reciclaje
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name='trash.cleanup_expired')
def cleanup_expired_trash():
    """
    Tarea programada para limpiar items expirados de la papelera.
    Diseñada para ejecutarse diariamente (ej: 3:00 AM).

    - Busca items con expires_at < now() y status='stored'
    - Elimina el archivo físico de la papelera
    - Marca el registro como 'expired'
    - Registra la auditoría

    Returns:
        dict con estadísticas de limpieza
    """
    from .services import TrashService
    from audit.models import AuditLog

    logger.info("Iniciando limpieza de papelera expirada...")

    try:
        trash_service = TrashService()
        result = trash_service.cleanup_expired()

        if result['success']:
            logger.info(
                f"Limpieza completada: {result['cleaned_count']} items eliminados, "
                f"{result['cleaned_size_formatted']} liberados"
            )

            # Registrar en auditoría si se limpiaron items
            if result['cleaned_count'] > 0:
                AuditLog.objects.create(
                    action='trash_auto_cleanup',
                    details={
                        'cleaned_count': result['cleaned_count'],
                        'cleaned_size_bytes': result['cleaned_size'],
                        'cleaned_size_formatted': result['cleaned_size_formatted'],
                        'errors': result.get('errors', [])
                    },
                    success=True
                )
        else:
            logger.error(f"Error en limpieza de papelera: {result.get('error')}")

        return result

    except Exception as e:
        logger.exception(f"Excepción en cleanup_expired_trash: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(name='trash.check_expiring_soon')
def check_expiring_soon():
    """
    Tarea para verificar items que expiran pronto.
    Puede usarse para enviar notificaciones o generar reportes.

    Returns:
        dict con items que expiran en los próximos 7 días
    """
    from .models import TrashItem
    from datetime import timedelta

    try:
        now = timezone.now()
        expiring_soon = TrashItem.objects.filter(
            status='stored',
            expires_at__lte=now + timedelta(days=7),
            expires_at__gt=now
        ).values('trash_id', 'original_name', 'original_path', 'expires_at', 'deleted_by__username')

        items = list(expiring_soon)

        logger.info(f"Items por expirar en 7 días: {len(items)}")

        return {
            'success': True,
            'count': len(items),
            'items': items
        }

    except Exception as e:
        logger.exception(f"Error en check_expiring_soon: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(name='trash.send_expiration_notifications')
def send_trash_expiration_notifications():
    """
    Envía notificaciones a usuarios cuyos archivos en papelera están por expirar.
    - 7 días antes: notificación normal in-app
    - 3 días antes: notificación urgente (in-app + email)

    Diseñada para ejecutarse diariamente (ej: 8:00 AM).
    """
    from .models import TrashItem
    from notifications.services import NotificationService
    from datetime import timedelta

    try:
        now = timezone.now()
        notifications_sent = {'7_days': 0, '3_days': 0}

        # === Notificaciones de 7 días ===
        seven_days_from_now = now + timedelta(days=7)
        items_7d = TrashItem.objects.filter(
            status='stored',
            expires_at__date=seven_days_from_now.date(),
            notified_7days=False,
            deleted_by__isnull=False
        ).select_related('deleted_by')

        for item in items_7d:
            if item.deleted_by and item.deleted_by.is_active:
                NotificationService.create(
                    recipient=item.deleted_by,
                    notification_type='trash_expiry',
                    priority='normal',
                    title=f'Archivo por expirar: {item.original_name}',
                    message=(
                        f'El archivo "{item.original_name}" será eliminado permanentemente '
                        f'en 7 días (el {item.expires_at.strftime("%d/%m/%Y")}).\n\n'
                        f'Ruta original: {item.original_path}\n\n'
                        f'Si deseas conservarlo, puedes restaurarlo desde la papelera.'
                    ),
                    related_path=item.original_path,
                    related_object_type='trash_item',
                    related_object_id=str(item.trash_id),
                    action_url='/trash'
                )
                item.notified_7days = True
                item.save(update_fields=['notified_7days'])
                notifications_sent['7_days'] += 1

        # === Notificaciones de 3 días (urgentes) ===
        three_days_from_now = now + timedelta(days=3)
        items_3d = TrashItem.objects.filter(
            status='stored',
            expires_at__date=three_days_from_now.date(),
            notified_3days=False,
            deleted_by__isnull=False
        ).select_related('deleted_by')

        for item in items_3d:
            if item.deleted_by and item.deleted_by.is_active:
                NotificationService.create(
                    recipient=item.deleted_by,
                    notification_type='trash_expiry',
                    priority='urgent',  # Urgente = también envía email
                    title=f'ÚLTIMO AVISO: {item.original_name}',
                    message=(
                        f'El archivo "{item.original_name}" será ELIMINADO PERMANENTEMENTE '
                        f'en 3 días (el {item.expires_at.strftime("%d/%m/%Y")}).\n\n'
                        f'Ruta original: {item.original_path}\n\n'
                        f'Esta es tu última oportunidad para restaurarlo desde la papelera.'
                    ),
                    related_path=item.original_path,
                    related_object_type='trash_item',
                    related_object_id=str(item.trash_id),
                    action_url='/trash'
                )
                item.notified_3days = True
                item.save(update_fields=['notified_3days'])
                notifications_sent['3_days'] += 1

        total = notifications_sent['7_days'] + notifications_sent['3_days']
        logger.info(
            f"Notificaciones de expiración enviadas: "
            f"{notifications_sent['7_days']} (7 días), "
            f"{notifications_sent['3_days']} (3 días)"
        )

        return {
            'success': True,
            'notifications_sent': notifications_sent,
            'total': total
        }

    except Exception as e:
        logger.exception(f"Error en send_trash_expiration_notifications: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(name='trash.get_stats')
def get_trash_stats():
    """
    Tarea para obtener estadísticas de la papelera.
    Útil para monitoreo y dashboards.
    """
    from .services import TrashService

    try:
        trash_service = TrashService()
        stats = trash_service.get_trash_stats()

        logger.info(
            f"Stats papelera: {stats.get('total_items', 0)} items, "
            f"{stats.get('total_size_formatted', '0 B')}"
        )

        return stats

    except Exception as e:
        logger.exception(f"Error en get_trash_stats: {e}")
        return {
            'success': False,
            'error': str(e)
        }
