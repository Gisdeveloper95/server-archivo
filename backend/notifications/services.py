"""
NotificationService - Servicio para gestión de notificaciones
"""
import logging
from typing import Optional, List, Dict, Any, Union
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.db import transaction

from .models import Notification, MessageThread, NotificationTemplate

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Servicio principal para crear y gestionar notificaciones.
    """

    @classmethod
    def create(
        cls,
        recipient,
        notification_type: str,
        title: str,
        message: str,
        priority: str = 'normal',
        sender=None,
        thread: MessageThread = None,
        related_path: str = None,
        related_object_type: str = None,
        related_object_id: str = None,
        action_url: str = None,
        send_email: bool = None,  # None = auto (solo si urgente)
        expires_at=None
    ) -> Notification:
        """
        Crea una nueva notificación para un usuario.

        Args:
            recipient: Usuario destinatario
            notification_type: Tipo de notificación
            title: Título de la notificación
            message: Mensaje completo
            priority: Prioridad (low, normal, high, urgent)
            sender: Usuario remitente (para mensajes de admin)
            thread: Hilo de conversación (si aplica)
            related_path: Ruta relacionada
            related_object_type: Tipo de objeto relacionado
            related_object_id: ID del objeto relacionado
            action_url: URL para acción
            send_email: Enviar copia por email (None=auto)
            expires_at: Fecha de expiración

        Returns:
            Notification creada
        """
        notification = Notification.objects.create(
            recipient=recipient,
            sender=sender,
            thread=thread,
            notification_type=notification_type,
            priority=priority,
            title=title,
            message=message,
            related_path=related_path,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            action_url=action_url,
            expires_at=expires_at
        )

        # Determinar si enviar email
        should_send_email = send_email
        if should_send_email is None:
            # Auto: enviar solo si es urgente
            should_send_email = (priority == 'urgent')

        if should_send_email:
            cls._send_email_notification(notification)

        logger.info(
            f"Notificación creada: {title} -> {recipient.username} "
            f"(tipo: {notification_type}, prioridad: {priority})"
        )

        return notification

    @classmethod
    def send_to_users(
        cls,
        recipients: List,
        notification_type: str,
        title: str,
        message: str,
        sender=None,
        priority: str = 'normal',
        allow_reply: bool = True,
        thread_type: str = 'info',
        **kwargs
    ) -> List[Notification]:
        """
        Envía una notificación a múltiples usuarios.
        Crea un hilo de conversación para cada destinatario si allow_reply=True.

        Args:
            recipients: Lista de usuarios destinatarios
            notification_type: Tipo de notificación
            title: Título del mensaje
            message: Contenido del mensaje
            sender: Usuario remitente (admin)
            priority: Prioridad (low, normal, high, urgent)
            allow_reply: Si permitir respuestas (crea hilo de chat)
            thread_type: Tipo de hilo (warning, info, support)

        Returns:
            Lista de notificaciones creadas
        """
        notifications = []

        for recipient in recipients:
            thread = None

            # Crear hilo si permite respuesta y hay remitente superadmin
            if allow_reply and sender and sender.role == 'superadmin':
                thread = MessageThread.objects.create(
                    # Nuevos campos (genéricos)
                    participant_1=sender,
                    participant_2=recipient,
                    participant_1_unread=0,
                    participant_2_unread=1,
                    # Campos legacy (para compatibilidad)
                    admin=sender,
                    user=recipient,
                    admin_unread_count=0,
                    user_unread_count=1,
                    # Metadata
                    subject=title,
                    thread_type=thread_type,
                    last_message_preview=message[:100] if len(message) > 100 else message
                )

            notification = cls.create(
                recipient=recipient,
                notification_type=notification_type,
                title=title,
                message=message,
                priority=priority,
                sender=sender,
                thread=thread,
                **kwargs
            )
            notifications.append(notification)

        logger.info(
            f"Notificación masiva enviada: {title} -> {len(recipients)} usuarios"
        )

        return notifications

    @classmethod
    def send_to_role(
        cls,
        role: str,
        notification_type: str,
        title: str,
        message: str,
        sender=None,
        priority: str = 'normal',
        allow_reply: bool = True,
        thread_type: str = 'info',
        **kwargs
    ) -> List[Notification]:
        """
        Envía notificación a todos los usuarios de un rol.

        Args:
            role: Rol de usuarios (consultation, consultation_edit, admin, superadmin)
        """
        from users.models import User
        recipients = User.objects.filter(role=role, is_active=True)
        return cls.send_to_users(
            recipients=list(recipients),
            notification_type=notification_type,
            title=title,
            message=message,
            sender=sender,
            priority=priority,
            allow_reply=allow_reply,
            thread_type=thread_type,
            **kwargs
        )

    @classmethod
    def send_to_all(
        cls,
        notification_type: str,
        title: str,
        message: str,
        sender=None,
        priority: str = 'normal',
        allow_reply: bool = True,
        thread_type: str = 'info',
        exclude_superadmin: bool = True,
        **kwargs
    ) -> List[Notification]:
        """
        Envía notificación a todos los usuarios activos.
        """
        from users.models import User
        queryset = User.objects.filter(is_active=True)
        if exclude_superadmin:
            queryset = queryset.exclude(role='superadmin')

        return cls.send_to_users(
            recipients=list(queryset),
            notification_type=notification_type,
            title=title,
            message=message,
            sender=sender,
            priority=priority,
            allow_reply=allow_reply,
            thread_type=thread_type,
            **kwargs
        )

    @classmethod
    def mark_as_read(cls, notification_id: int, user) -> bool:
        """
        Marca una notificación como leída.
        """
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=user
            )
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False

    @classmethod
    def mark_all_as_read(cls, user) -> int:
        """
        Marca todas las notificaciones del usuario como leídas.
        Returns: número de notificaciones actualizadas
        """
        count = Notification.objects.filter(
            recipient=user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())

        # Actualizar contadores de hilos
        MessageThread.objects.filter(user=user).update(user_unread_count=0)
        MessageThread.objects.filter(admin=user).update(admin_unread_count=0)

        return count

    @classmethod
    def get_unread_count(cls, user) -> int:
        """
        Obtiene el número de notificaciones no leídas.
        """
        return Notification.get_unread_count(user)

    @classmethod
    def create_from_template(
        cls,
        template_id: str,
        recipient,
        context: dict,
        sender=None,
        **kwargs
    ) -> Optional[Notification]:
        """
        Crea una notificación desde una plantilla.

        Args:
            template_id: ID de la plantilla
            recipient: Usuario destinatario
            context: Diccionario con variables para la plantilla
            sender: Usuario remitente
            **kwargs: Otros argumentos para create()
        """
        try:
            template = NotificationTemplate.objects.get(
                template_id=template_id,
                is_active=True
            )
        except NotificationTemplate.DoesNotExist:
            logger.error(f"Plantilla no encontrada: {template_id}")
            return None

        subject, message = template.render(context)

        return cls.create(
            recipient=recipient,
            notification_type=template.notification_type,
            title=subject,
            message=message,
            sender=sender,
            **kwargs
        )

    @classmethod
    def _send_email_notification(cls, notification: Notification) -> bool:
        """
        Envía una notificación por email.
        """
        try:
            recipient = notification.recipient

            # Verificar que el usuario tenga email
            if not recipient.email:
                logger.warning(
                    f"Usuario {recipient.username} no tiene email configurado"
                )
                return False

            # Construir email
            subject = f"[NetApp Bridge] {notification.title}"

            # Intentar usar template HTML
            try:
                html_message = render_to_string(
                    'notifications/email_notification.html',
                    {
                        'notification': notification,
                        'user': recipient,
                        'frontend_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                    }
                )
            except Exception:
                html_message = None

            # Mensaje de texto plano
            plain_message = f"""
{notification.title}

{notification.message}

---
Esta es una notificación automática de NetApp Bridge IGAC.
Para más detalles, ingresa al sistema.
            """.strip()

            # Enviar email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@igac.gov.co'),
                recipient_list=[recipient.email],
                html_message=html_message,
                fail_silently=False
            )

            # Marcar como enviado
            notification.email_sent = True
            notification.save(update_fields=['email_sent'])

            logger.info(f"Email enviado a {recipient.email}: {notification.title}")
            return True

        except Exception as e:
            logger.error(f"Error enviando email de notificación: {e}")
            return False

    @classmethod
    def reply_to_thread(
        cls,
        thread_id: int,
        sender,
        message: str
    ) -> Optional[Notification]:
        """
        Responde en un hilo de conversación.
        """
        try:
            thread = MessageThread.objects.get(id=thread_id)

            # Verificar que el sender sea participante (usando ambos campos)
            participants = [thread.participant_1, thread.participant_2, thread.admin, thread.user]
            participants = [p for p in participants if p is not None]
            if sender not in participants:
                logger.warning(f"Usuario {sender.username} no es participante del hilo {thread_id}")
                return None

            # Verificar que el hilo no esté cerrado
            if thread.is_closed:
                logger.warning(f"Hilo {thread_id} está cerrado")
                return None

            # Determinar si es participant_1 o participant_2
            is_from_p1 = (sender == thread.participant_1) or (sender == thread.admin and thread.participant_1 is None)

            # Crear notificación/mensaje
            notification = thread.add_message(
                sender=sender,
                message=message,
                is_admin_sender=is_from_p1
            )

            return notification

        except MessageThread.DoesNotExist:
            logger.error(f"Hilo no encontrado: {thread_id}")
            return None

    @classmethod
    def close_thread(cls, thread_id: int, closed_by) -> bool:
        """
        Cierra un hilo de conversación.
        """
        try:
            thread = MessageThread.objects.get(id=thread_id)

            # Solo el admin puede cerrar
            if closed_by != thread.admin and closed_by.role != 'superadmin':
                return False

            thread.close(closed_by)
            return True

        except MessageThread.DoesNotExist:
            return False

    @classmethod
    def cleanup_expired(cls) -> int:
        """
        Elimina notificaciones expiradas.
        """
        deleted_count, _ = Notification.objects.filter(
            expires_at__lt=timezone.now(),
            is_archived=False
        ).delete()

        if deleted_count > 0:
            logger.info(f"Notificaciones expiradas eliminadas: {deleted_count}")

        return deleted_count
