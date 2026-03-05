"""
Tareas asíncronas de Celery para operaciones de archivos

Incluye:
- Actualización de permisos en cascada al renombrar directorios
- Notificaciones por email a usuarios afectados
"""
import logging
from typing import List, Dict
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth import get_user_model

from users.models import UserPermission
from services.directory_cascade_service import DirectoryCascadeService

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def update_permissions_cascade(
    self,
    old_path: str,
    new_path: str,
    new_name: str,
    user_id: int
) -> Dict:
    """
    Tarea asíncrona para actualizar permisos en cascada

    Args:
        old_path: Ruta anterior del directorio
        new_path: Nueva ruta del directorio
        new_name: Nuevo nombre del directorio
        user_id: ID del usuario que realizó el cambio

    Returns:
        Dict con estadísticas de la operación

    Raises:
        Exception: Si hay error y se agotan los reintentos
    """
    try:
        user = User.objects.get(id=user_id)

        logger.info(
            f"[Task {self.request.id}] Iniciando actualización de permisos en cascada: "
            f"{old_path} -> {new_path}"
        )

        # Realizar actualización en cascada
        stats = DirectoryCascadeService.update_directory_cascade(
            old_path=old_path,
            new_path=new_path,
            new_name=new_name,
            user=user
        )

        logger.info(
            f"[Task {self.request.id}] Actualización completada. Stats: {stats}"
        )

        # Si hay usuarios afectados, enviar notificaciones
        if stats['users_affected'] > 0:
            # Obtener permisos afectados para enviar notificaciones
            affected_permissions = DirectoryCascadeService.find_affected_permissions(new_path)

            # Agrupar por usuario para enviar un solo email por usuario
            users_permissions = {}
            for perm in affected_permissions:
                if perm.user.id not in users_permissions:
                    users_permissions[perm.user.id] = {
                        'user': perm.user,
                        'permissions': []
                    }
                users_permissions[perm.user.id]['permissions'].append(perm)

            # Disparar tarea de notificación para cada usuario
            for user_id, data in users_permissions.items():
                send_permission_update_notification.delay(
                    user_id=user_id,
                    old_path=old_path,
                    new_path=new_path,
                    changed_by_user_id=user.id,
                    permissions_count=len(data['permissions'])
                )

            logger.info(
                f"[Task {self.request.id}] Se programaron {len(users_permissions)} "
                f"notificaciones por email"
            )

        return stats

    except User.DoesNotExist:
        logger.error(f"[Task {self.request.id}] Usuario no encontrado: {user_id}")
        raise

    except Exception as e:
        logger.error(
            f"[Task {self.request.id}] Error en actualización de permisos: {str(e)}",
            exc_info=True
        )

        # Reintentar la tarea
        if self.request.retries < self.max_retries:
            logger.info(
                f"[Task {self.request.id}] Reintentando... "
                f"(intento {self.request.retries + 1}/{self.max_retries})"
            )
            raise self.retry(exc=e)
        else:
            logger.error(
                f"[Task {self.request.id}] Se agotaron los reintentos. "
                f"La actualización falló permanentemente."
            )
            raise


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_permission_update_notification(
    self,
    user_id: int,
    old_path: str,
    new_path: str,
    changed_by_user_id: int,
    permissions_count: int
) -> bool:
    """
    Envía notificación por email a un usuario sobre cambio de permisos

    Args:
        user_id: ID del usuario que recibirá la notificación
        old_path: Ruta anterior
        new_path: Nueva ruta
        changed_by_user_id: ID del usuario que realizó el cambio
        permissions_count: Cantidad de permisos afectados

    Returns:
        True si se envió exitosamente, False en caso contrario

    Raises:
        Exception: Si hay error y se agotan los reintentos
    """
    try:
        user = User.objects.get(id=user_id)
        changed_by = User.objects.get(id=changed_by_user_id)

        logger.info(
            f"[Task {self.request.id}] Enviando notificación de actualización de permisos "
            f"a {user.email}"
        )

        # Preparar contexto para el template
        # Extraer solo el nombre de la carpeta modificada para mejor claridad
        old_folder_name = old_path.split('\\')[-1]
        new_folder_name = new_path.split('\\')[-1]

        context = {
            'user_name': user.get_full_name(),
            'old_path': old_path,
            'new_path': new_path,
            'old_folder_name': old_folder_name,
            'new_folder_name': new_folder_name,
            'permissions_count': permissions_count,
            'changed_by_name': changed_by.get_full_name(),
            'changed_by_email': changed_by.email,
            'frontend_url': settings.FRONTEND_URL,
            'base_path_display': f"\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\{new_path}",
        }

        # Renderizar HTML
        html_content = render_to_string(
            'emails/permission_path_updated.html',
            context
        )

        # Texto plano alternativo
        plain_message = (
            f"Hola {user.get_full_name()},\n\n"
            f"Se ha renombrado un directorio que afecta sus permisos de acceso:\n\n"
            f"  Ruta anterior: {old_path}\n"
            f"  Nueva ruta: {new_path}\n\n"
            f"Sus permisos han sido actualizados automáticamente y su acceso se ha restablecido.\n\n"
            f"Total de permisos actualizados: {permissions_count}\n"
            f"Modificado por: {changed_by.get_full_name()} ({changed_by.email})\n\n"
            f"Puede verificar sus permisos en: {settings.FRONTEND_URL}\n\n"
            f"Sistema IGAC - Gestión de Archivos"
        )

        # Enviar email
        send_mail(
            subject=f'✓ Sus permisos de acceso han sido actualizados - Sistema IGAC',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_content,
            fail_silently=False,
        )

        logger.info(
            f"[Task {self.request.id}] ✓ Notificación enviada exitosamente a {user.email}"
        )

        return True

    except User.DoesNotExist as e:
        logger.error(
            f"[Task {self.request.id}] Usuario no encontrado (user_id={user_id} "
            f"o changed_by_user_id={changed_by_user_id})"
        )
        # No reintentar si el usuario no existe
        return False

    except Exception as e:
        logger.error(
            f"[Task {self.request.id}] Error enviando notificación a user_id={user_id}: {str(e)}",
            exc_info=True
        )

        # Reintentar
        if self.request.retries < self.max_retries:
            logger.info(
                f"[Task {self.request.id}] Reintentando envío de email... "
                f"(intento {self.request.retries + 1}/{self.max_retries})"
            )
            raise self.retry(exc=e)
        else:
            logger.error(
                f"[Task {self.request.id}] Se agotaron los reintentos para enviar "
                f"notificación a {user_id}"
            )
            # No lanzar excepción para no detener todo el proceso
            # Solo logueamos el error
            return False


@shared_task
def test_celery_task():
    """
    Tarea simple para verificar que Celery está funcionando correctamente

    Uso:
        from files.tasks import test_celery_task
        result = test_celery_task.delay()
        print(result.get())
    """
    logger.info("Test de Celery: ¡Tarea ejecutada exitosamente!")
    return {
        'status': 'success',
        'message': '¡Celery está funcionando correctamente!'
    }
