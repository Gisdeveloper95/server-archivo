"""
Modelos para el Sistema de Notificaciones y Mensajería
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.files.storage import FileSystemStorage
import os

# ==============================================================================
# CONFIGURACIÓN DE STORAGE PARA ARCHIVOS ADJUNTOS
# ==============================================================================
# Obtener rutas desde variables de entorno (con fallbacks para compatibilidad)
NETAPP_BASE_PATH = os.environ.get('NETAPP_BASE_PATH', '/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy')
MESSAGE_ATTACHMENTS_PATH = os.environ.get('MESSAGE_ATTACHMENTS_PATH', '04_bk/trans_doc_platform/message_attachments')

# Construir ruta completa
NAS_ATTACHMENTS_PATH = os.path.join(NETAPP_BASE_PATH, MESSAGE_ATTACHMENTS_PATH)
NAS_ATTACHMENTS_URL = '/nas-attachments/'

# Tiempo de retención en días (desde variable de entorno)
MESSAGE_ATTACHMENTS_RETENTION_DAYS = int(os.environ.get('MESSAGE_ATTACHMENTS_RETENTION_DAYS', '180'))

# Crear el directorio si no existe (se hará al iniciar)
try:
    os.makedirs(NAS_ATTACHMENTS_PATH, exist_ok=True)
except Exception:
    pass

nas_attachment_storage = FileSystemStorage(
    location=NAS_ATTACHMENTS_PATH,
    base_url=NAS_ATTACHMENTS_URL
)


class MessageThread(models.Model):
    """
    Hilo de conversación entre dos usuarios.
    Soporta:
    - Admin → Usuario (advertencias, info)
    - Usuario → Admin (respuestas, solicitudes)
    - Usuario → Usuario (mensajes directos)
    - Usuario → Soporte (tickets de ayuda)
    """

    THREAD_TYPE_CHOICES = [
        ('warning', 'Advertencia/Llamado de atención'),
        ('info', 'Información'),
        ('support', 'Soporte/Ayuda'),
        ('direct', 'Mensaje Directo'),
    ]

    # Participantes (genérico: cualquier par de usuarios)
    # participant_1 es quien inicia la conversación
    participant_1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='threads_as_participant1',
        null=True,  # Nullable para compatibilidad con migración
        help_text="Usuario que inició la conversación"
    )
    participant_2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='threads_as_participant2',
        null=True,  # Nullable para compatibilidad con migración
        help_text="Usuario destinatario"
    )

    # Campos legacy para compatibilidad (apuntan a los mismos que participant_1/2)
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_threads',
        null=True,
        blank=True,
        help_text="(Legacy) Admin de la conversación"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_threads',
        null=True,
        blank=True,
        help_text="(Legacy) Usuario de la conversación"
    )

    # Metadata
    subject = models.CharField(max_length=200, verbose_name="Asunto")
    thread_type = models.CharField(
        max_length=20,
        choices=THREAD_TYPE_CHOICES,
        default='direct',
        verbose_name="Tipo"
    )

    # Para tickets de soporte: asignación
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_support_threads',
        help_text="Admin/Soporte asignado al ticket"
    )

    # Estado
    is_closed = models.BooleanField(default=False, verbose_name="Cerrado")
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closed_threads'
    )

    # Contadores para quick view (renombrados para ser genéricos)
    participant_1_unread = models.IntegerField(default=0)
    participant_2_unread = models.IntegerField(default=0)

    # Legacy: mantener compatibilidad
    admin_unread_count = models.IntegerField(default=0)
    user_unread_count = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now=True)

    # Preview del último mensaje
    last_message_preview = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        db_table = 'notification_threads'
        ordering = ['-last_message_at']
        verbose_name = 'Hilo de conversación'
        verbose_name_plural = 'Hilos de conversación'
        indexes = [
            models.Index(fields=['participant_1', 'is_closed']),
            models.Index(fields=['participant_2', 'is_closed']),
            models.Index(fields=['admin', 'is_closed']),
            models.Index(fields=['user', 'is_closed']),
            models.Index(fields=['last_message_at']),
            models.Index(fields=['thread_type']),
            models.Index(fields=['assigned_to']),
        ]

    def __str__(self):
        return f"{self.subject} ({self.participant_1.username} ↔ {self.participant_2.username})"

    def save(self, *args, **kwargs):
        # Sincronizar campos legacy con nuevos
        if not self.admin and self.participant_1:
            self.admin = self.participant_1
        if not self.user and self.participant_2:
            self.user = self.participant_2
        # Sincronizar contadores legacy
        self.admin_unread_count = self.participant_1_unread
        self.user_unread_count = self.participant_2_unread
        super().save(*args, **kwargs)

    def close(self, closed_by):
        """Cierra el hilo de conversación"""
        self.is_closed = True
        self.closed_at = timezone.now()
        self.closed_by = closed_by
        self.save()

    def get_other_participant(self, user):
        """Retorna el otro participante del hilo"""
        # Usar campos nuevos si existen, sino usar legacy
        p1 = self.participant_1 or self.admin
        p2 = self.participant_2 or self.user

        if user == p1:
            return p2
        elif user == p2:
            return p1
        # Fallback con campos legacy
        elif user == self.admin:
            return self.user
        elif user == self.user:
            return self.admin
        return None

    def get_unread_count_for(self, user):
        """Retorna el contador de no leídos para un usuario"""
        # Usar campos nuevos si existen, sino usar legacy
        p1 = self.participant_1 or self.admin
        p2 = self.participant_2 or self.user

        if user == p1 or user == self.admin:
            return self.participant_1_unread or self.admin_unread_count
        elif user == p2 or user == self.user:
            return self.participant_2_unread or self.user_unread_count
        return 0

    def add_message(self, sender, message, is_admin_sender=None):
        """
        Agrega un mensaje al hilo y actualiza contadores.

        Args:
            sender: Usuario que envía el mensaje
            message: Texto del mensaje
            is_admin_sender: (Legacy) Si el remitente es admin.
                            Si es None, se determina automáticamente.
        """
        # Usar campos nuevos si existen, sino usar legacy
        p1 = self.participant_1 or self.admin
        p2 = self.participant_2 or self.user

        # Determinar quién es el receptor
        if sender == p1:
            recipient = p2
            is_from_p1 = True
        elif sender == p2:
            recipient = p1
            is_from_p1 = False
        else:
            # Fallback: usar is_admin_sender si se proporcionó
            if is_admin_sender is not None:
                is_from_p1 = is_admin_sender
                recipient = p2 if is_from_p1 else p1
            else:
                # Último fallback: comparar con admin/user legacy
                is_from_p1 = (sender == self.admin)
                recipient = self.user if is_from_p1 else self.admin

        # Tipo de notificación según el tipo de hilo
        notif_type = 'admin_message' if self.thread_type in ['warning', 'info'] else 'user_message'

        notification = Notification.objects.create(
            recipient=recipient,
            sender=sender,
            thread=self,
            notification_type=notif_type,
            priority='normal',
            title=f"Re: {self.subject}",
            message=message
        )

        # Actualizar contadores (ambos: nuevos y legacy)
        if is_from_p1:
            self.participant_2_unread += 1
            self.user_unread_count += 1  # Legacy
        else:
            self.participant_1_unread += 1
            self.admin_unread_count += 1  # Legacy

        # Actualizar preview
        self.last_message_preview = message[:100] if len(message) > 100 else message
        self.last_message_at = timezone.now()
        self.save()

        return notification

    @classmethod
    def get_or_create_direct_thread(cls, user1, user2, subject="Conversación"):
        """
        Obtiene o crea un hilo de conversación directa entre dos usuarios.
        """
        # Buscar hilo existente entre estos usuarios
        thread = cls.objects.filter(
            models.Q(participant_1=user1, participant_2=user2) |
            models.Q(participant_1=user2, participant_2=user1),
            thread_type='direct',
            is_closed=False
        ).first()

        if thread:
            return thread, False

        # Crear nuevo hilo
        thread = cls.objects.create(
            participant_1=user1,
            participant_2=user2,
            admin=user1,
            user=user2,
            subject=subject,
            thread_type='direct'
        )
        return thread, True

    @classmethod
    def create_support_ticket(cls, user, subject, initial_message):
        """
        Crea un ticket de soporte.
        El participant_2 será None hasta que un admin lo tome.
        """
        from users.models import User

        # Buscar un superadmin para asignar (o el primero disponible)
        support_user = User.objects.filter(
            role='superadmin',
            is_active=True
        ).first()

        if not support_user:
            support_user = User.objects.filter(
                role='admin',
                is_active=True
            ).first()

        thread = cls.objects.create(
            participant_1=user,
            participant_2=support_user,
            admin=support_user,
            user=user,
            subject=subject,
            thread_type='support',
            participant_2_unread=1,
            user_unread_count=1
        )

        # Agregar el mensaje inicial
        Notification.objects.create(
            recipient=support_user,
            sender=user,
            thread=thread,
            notification_type='support_ticket',
            priority='normal',
            title=subject,
            message=initial_message
        )

        thread.last_message_preview = initial_message[:100]
        thread.save()

        return thread


class Notification(models.Model):
    """
    Notificación individual para un usuario.
    Puede ser del sistema (automática) o de un admin (mensaje directo).
    """

    TYPE_CHOICES = [
        ('system', 'Sistema'),
        ('trash_expiry', 'Expiración Papelera'),
        ('permission_expiry', 'Expiración Permiso'),
        ('path_renamed', 'Ruta Renombrada'),
        ('admin_message', 'Mensaje Admin'),
        ('user_message', 'Mensaje de Usuario'),
        ('support_ticket', 'Ticket de Soporte'),
        ('warning', 'Advertencia'),
        ('info', 'Información'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Baja'),
        ('normal', 'Normal'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),  # También se envía por email
    ]

    # Destinatario
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Destinatario"
    )

    # Para hilos de conversación
    thread = models.ForeignKey(
        MessageThread,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='messages'
    )

    # Contenido
    notification_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='info',
        verbose_name="Tipo"
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='normal',
        verbose_name="Prioridad"
    )
    title = models.CharField(max_length=200, verbose_name="Título")
    message = models.TextField(verbose_name="Mensaje")

    # Metadata (para notificaciones relacionadas a objetos)
    related_path = models.TextField(null=True, blank=True, verbose_name="Ruta relacionada")
    related_object_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Tipo de objeto: trash_item, permission, etc."
    )
    related_object_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="ID del objeto relacionado"
    )
    action_url = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text="URL para acción (ej: /trash, /my-permissions)"
    )

    # Remitente (para mensajes de admin)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_notifications',
        verbose_name="Remitente"
    )

    # Estado
    is_read = models.BooleanField(default=False, verbose_name="Leído")
    read_at = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False, verbose_name="Archivado")
    email_sent = models.BooleanField(default=False, verbose_name="Email enviado")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Expira")

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', 'is_archived']),
            models.Index(fields=['recipient', 'created_at']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['thread']),
        ]

    def __str__(self):
        return f"{self.title} -> {self.recipient.username}"

    def mark_as_read(self):
        """Marca la notificación como leída"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()

            # Actualizar contador del hilo si pertenece a uno
            if self.thread:
                if self.recipient == self.thread.participant_1:
                    self.thread.participant_1_unread = max(0, self.thread.participant_1_unread - 1)
                    self.thread.admin_unread_count = self.thread.participant_1_unread
                elif self.recipient == self.thread.participant_2:
                    self.thread.participant_2_unread = max(0, self.thread.participant_2_unread - 1)
                    self.thread.user_unread_count = self.thread.participant_2_unread
                self.thread.save()

    @property
    def is_expired(self):
        """Verifica si la notificación ha expirado"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    @property
    def time_ago(self):
        """Retorna tiempo transcurrido en formato legible"""
        from django.utils.timesince import timesince
        return timesince(self.created_at)

    @classmethod
    def get_unread_count(cls, user):
        """Obtiene el número de notificaciones no leídas para un usuario"""
        return cls.objects.filter(
            recipient=user,
            is_read=False,
            is_archived=False
        ).count()


class NotificationTemplate(models.Model):
    """
    Plantillas predefinidas para mensajes del admin.
    """

    template_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100, verbose_name="Nombre")
    notification_type = models.CharField(
        max_length=20,
        choices=Notification.TYPE_CHOICES,
        default='warning'
    )
    subject = models.CharField(max_length=200, verbose_name="Asunto")
    message = models.TextField(
        verbose_name="Mensaje",
        help_text="Usa {variable} para campos dinámicos"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_templates'
        verbose_name = 'Plantilla de notificación'
        verbose_name_plural = 'Plantillas de notificación'

    def __str__(self):
        return self.name

    def render(self, context: dict) -> tuple:
        """
        Renderiza la plantilla con el contexto dado.
        Returns: (subject, message)
        """
        subject = self.subject
        message = self.message

        for key, value in context.items():
            placeholder = f"{{{key}}}"
            subject = subject.replace(placeholder, str(value))
            message = message.replace(placeholder, str(value))

        return subject, message


def message_attachment_path(instance, filename):
    """
    Genera la ruta para guardar archivos adjuntos de mensajes.
    Estructura: thread_{thread_id}/{YYYY-MM}/{uuid}.ext
    """
    import uuid
    from datetime import datetime

    ext = filename.split('.')[-1] if '.' in filename else 'bin'
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    date_path = datetime.now().strftime('%Y-%m')

    # Obtener thread_id de forma segura
    thread_id = 'unassigned'
    if instance.notification and instance.notification.thread_id:
        thread_id = f"thread_{instance.notification.thread_id}"
    elif instance.notification_id:
        thread_id = f"thread_{instance.notification_id}"

    return f"{thread_id}/{date_path}/{unique_name}"


class MessageAttachment(models.Model):
    """
    Archivo adjunto en un mensaje de notificación.
    Soporta imágenes, videos, documentos y otros archivos.
    """

    FILE_TYPE_CHOICES = [
        ('image', 'Imagen'),
        ('video', 'Video'),
        ('document', 'Documento'),
        ('other', 'Otro'),
    ]

    # Relación con el mensaje (Notification)
    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name="Mensaje"
    )

    # Archivo - se guarda en la NAS
    file = models.FileField(
        upload_to=message_attachment_path,
        storage=nas_attachment_storage,
        verbose_name="Archivo"
    )
    original_filename = models.CharField(
        max_length=255,
        verbose_name="Nombre original"
    )
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        default='other',
        verbose_name="Tipo de archivo"
    )
    mime_type = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="MIME Type"
    )
    file_size = models.BigIntegerField(
        default=0,
        verbose_name="Tamaño (bytes)"
    )

    # Para imágenes: dimensiones
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)

    # Para videos: duración en segundos
    duration = models.FloatField(null=True, blank=True)

    # Thumbnail para imágenes/videos
    thumbnail = models.ImageField(
        upload_to='message_attachments/thumbnails/',
        null=True,
        blank=True,
        verbose_name="Miniatura"
    )

    # Metadata
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_attachments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'message_attachments'
        ordering = ['created_at']
        verbose_name = 'Adjunto de mensaje'
        verbose_name_plural = 'Adjuntos de mensajes'
        indexes = [
            models.Index(fields=['notification']),
            models.Index(fields=['file_type']),
        ]

    def __str__(self):
        return f"{self.original_filename} ({self.get_file_type_display()})"

    @property
    def file_url(self):
        """URL del archivo"""
        if self.file:
            return self.file.url
        return None

    @property
    def thumbnail_url(self):
        """URL de la miniatura"""
        if self.thumbnail:
            return self.thumbnail.url
        return None

    @property
    def file_size_human(self):
        """Tamaño del archivo en formato legible"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"

    @classmethod
    def get_file_type_from_mime(cls, mime_type: str) -> str:
        """Determina el tipo de archivo basado en MIME type"""
        if not mime_type:
            return 'other'

        mime_lower = mime_type.lower()

        if mime_lower.startswith('image/'):
            return 'image'
        elif mime_lower.startswith('video/'):
            return 'video'
        elif mime_lower in [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
        ]:
            return 'document'

        return 'other'

    def save(self, *args, **kwargs):
        # Determinar tipo de archivo si no está definido
        if self.mime_type and self.file_type == 'other':
            self.file_type = self.get_file_type_from_mime(self.mime_type)

        super().save(*args, **kwargs)
