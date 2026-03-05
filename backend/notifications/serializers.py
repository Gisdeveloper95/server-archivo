"""
Serializers para el Sistema de Notificaciones
"""
from rest_framework import serializers
from .models import Notification, MessageThread, NotificationTemplate, MessageAttachment


class MessageAttachmentSerializer(serializers.ModelSerializer):
    """Serializer para archivos adjuntos de mensajes"""

    file_url = serializers.CharField(read_only=True)
    thumbnail_url = serializers.CharField(read_only=True)
    file_size_human = serializers.CharField(read_only=True)
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = MessageAttachment
        fields = [
            'id',
            'file',
            'file_url',
            'download_url',
            'original_filename',
            'file_type',
            'file_type_display',
            'mime_type',
            'file_size',
            'file_size_human',
            'width',
            'height',
            'duration',
            'thumbnail',
            'thumbnail_url',
            'created_at',
        ]
        read_only_fields = ['id', 'file_url', 'download_url', 'thumbnail_url', 'file_size_human', 'created_at']

    def get_download_url(self, obj):
        """Retorna la URL para descargar con nombre original"""
        return f'/api/notifications/attachment-download/{obj.id}/'


class MessageAttachmentUploadSerializer(serializers.Serializer):
    """Serializer para subir archivos adjuntos"""

    file = serializers.FileField()
    notification_id = serializers.IntegerField(required=False, allow_null=True)
    thread_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_file(self, value):
        # Limitar tamaño máximo: 50MB
        max_size = 50 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f'El archivo excede el tamaño máximo permitido (50MB). Tamaño actual: {value.size / 1024 / 1024:.1f}MB'
            )

        # Tipos MIME permitidos
        allowed_types = [
            # Imágenes
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
            # Videos
            'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
            # Documentos
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv',
            # Comprimidos
            'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        ]

        content_type = value.content_type
        if content_type not in allowed_types:
            raise serializers.ValidationError(
                f'Tipo de archivo no permitido: {content_type}'
            )

        return value


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer para notificaciones"""

    recipient_username = serializers.CharField(source='recipient.username', read_only=True)
    recipient_full_name = serializers.SerializerMethodField()
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_full_name = serializers.SerializerMethodField()
    time_ago = serializers.CharField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    thread_id = serializers.IntegerField(source='thread.id', read_only=True, allow_null=True)
    can_reply = serializers.SerializerMethodField()
    attachments = MessageAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'recipient_username',
            'recipient_full_name',
            'sender',
            'sender_username',
            'sender_full_name',
            'thread_id',
            'notification_type',
            'priority',
            'title',
            'message',
            'related_path',
            'related_object_type',
            'related_object_id',
            'action_url',
            'is_read',
            'read_at',
            'is_archived',
            'email_sent',
            'created_at',
            'expires_at',
            'time_ago',
            'is_expired',
            'can_reply',
            'attachments',
        ]
        read_only_fields = [
            'id', 'recipient', 'sender', 'created_at', 'read_at',
            'email_sent', 'time_ago', 'is_expired'
        ]

    def get_recipient_full_name(self, obj):
        if obj.recipient:
            return f"{obj.recipient.first_name} {obj.recipient.last_name}".strip() or obj.recipient.username
        return None

    def get_sender_full_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username
        return "Sistema"

    def get_can_reply(self, obj):
        """Determina si se puede responder a esta notificación"""
        return obj.thread is not None and not obj.thread.is_closed


class MessageThreadSerializer(serializers.ModelSerializer):
    """Serializer para hilos de conversación"""

    # Campos legacy para compatibilidad
    admin_username = serializers.CharField(source='admin.username', read_only=True, allow_null=True)
    admin_full_name = serializers.SerializerMethodField()
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    user_full_name = serializers.SerializerMethodField()

    # Nuevos campos genéricos
    other_participant = serializers.SerializerMethodField()
    my_unread_count = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    last_message_preview = serializers.CharField(read_only=True)

    class Meta:
        model = MessageThread
        fields = [
            'id',
            # Legacy
            'admin',
            'admin_username',
            'admin_full_name',
            'user',
            'user_username',
            'user_full_name',
            'admin_unread_count',
            'user_unread_count',
            # Nuevos campos
            'other_participant',
            'my_unread_count',
            # Comunes
            'subject',
            'thread_type',
            'is_closed',
            'closed_at',
            'closed_by',
            'created_at',
            'last_message_at',
            'last_message_preview',
            'message_count',
            'last_message',
        ]
        read_only_fields = [
            'id', 'admin', 'user', 'created_at', 'last_message_at',
            'closed_at', 'closed_by', 'admin_unread_count', 'user_unread_count'
        ]

    def get_admin_full_name(self, obj):
        if obj.admin:
            return f"{obj.admin.first_name} {obj.admin.last_name}".strip() or obj.admin.username
        return None

    def get_user_full_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return None

    def get_other_participant(self, obj):
        """Retorna información del otro participante en la conversación"""
        request = self.context.get('request')
        if not request:
            return None

        current_user = request.user

        # Intentar con los nuevos campos primero
        other = obj.get_other_participant(current_user)

        # Si no se encontró, intentar con campos legacy
        if not other:
            if current_user == obj.admin:
                other = obj.user
            elif current_user == obj.user:
                other = obj.admin

        if other:
            return {
                'id': other.id,
                'username': other.username,
                'full_name': f"{other.first_name} {other.last_name}".strip() or other.username,
                'role': other.role
            }
        return None

    def get_my_unread_count(self, obj):
        """Retorna el contador de no leídos para el usuario actual"""
        request = self.context.get('request')
        if not request:
            return 0

        user = request.user
        # Verificar con nuevos campos primero
        count = obj.get_unread_count_for(user)

        # Si es 0, verificar con campos legacy (en caso de que participant_1/2 estén vacíos)
        if count == 0:
            if user == obj.admin:
                count = obj.admin_unread_count
            elif user == obj.user:
                count = obj.user_unread_count

        return count

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'message': last.message[:100] + '...' if len(last.message) > 100 else last.message,
                'sender': last.sender.username if last.sender else 'Sistema',
                'sender_id': last.sender.id if last.sender else None,
                'created_at': last.created_at.isoformat()
            }
        return None


class MessageThreadDetailSerializer(MessageThreadSerializer):
    """Serializer con todos los mensajes del hilo"""

    messages = serializers.SerializerMethodField()

    class Meta(MessageThreadSerializer.Meta):
        fields = MessageThreadSerializer.Meta.fields + ['messages']

    def get_messages(self, obj):
        messages = obj.messages.order_by('created_at')
        return NotificationSerializer(messages, many=True).data


class SendNotificationSerializer(serializers.Serializer):
    """Serializer para enviar notificaciones (solo admin)"""

    # Destinatarios
    recipient_type = serializers.ChoiceField(
        choices=['user', 'role', 'users', 'all'],
        help_text="Tipo de destinatario"
    )
    recipient_id = serializers.IntegerField(
        required=False,
        help_text="ID del usuario (si recipient_type='user')"
    )
    recipient_role = serializers.ChoiceField(
        choices=['consultation', 'consultation_edit', 'admin'],
        required=False,
        help_text="Rol de usuarios (si recipient_type='role')"
    )
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Lista de IDs (si recipient_type='users')"
    )

    # Contenido
    subject = serializers.CharField(max_length=200)
    message = serializers.CharField()
    thread_type = serializers.ChoiceField(
        choices=['warning', 'info', 'support', 'direct'],
        default='info'
    )
    priority = serializers.ChoiceField(
        choices=['low', 'normal', 'high', 'urgent'],
        default='normal'
    )

    # Opciones
    allow_reply = serializers.BooleanField(default=True)
    send_email = serializers.BooleanField(
        required=False,
        help_text="Enviar copia por email (None=auto según prioridad)"
    )

    def validate(self, data):
        recipient_type = data.get('recipient_type')

        if recipient_type == 'user' and not data.get('recipient_id'):
            raise serializers.ValidationError(
                {'recipient_id': 'Requerido cuando recipient_type es "user"'}
            )

        if recipient_type == 'role' and not data.get('recipient_role'):
            raise serializers.ValidationError(
                {'recipient_role': 'Requerido cuando recipient_type es "role"'}
            )

        if recipient_type == 'users':
            if not data.get('recipient_ids'):
                raise serializers.ValidationError(
                    {'recipient_ids': 'Requerido cuando recipient_type es "users"'}
                )
            if len(data['recipient_ids']) == 0:
                raise serializers.ValidationError(
                    {'recipient_ids': 'Debe incluir al menos un usuario'}
                )

        return data


class ReplySerializer(serializers.Serializer):
    """Serializer para responder en un hilo"""

    message = serializers.CharField(min_length=1, max_length=5000)


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer para plantillas de notificación"""

    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'template_id',
            'name',
            'notification_type',
            'subject',
            'message',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
