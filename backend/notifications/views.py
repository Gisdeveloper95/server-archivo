"""
Views para el Sistema de Notificaciones
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Notification, MessageThread, NotificationTemplate, MessageAttachment
from .serializers import (
    NotificationSerializer,
    MessageThreadSerializer,
    MessageThreadDetailSerializer,
    SendNotificationSerializer,
    ReplySerializer,
    NotificationTemplateSerializer,
    MessageAttachmentSerializer,
    MessageAttachmentUploadSerializer,
)
from .services import NotificationService


class NotificationViewSet(viewsets.ViewSet):
    """
    ViewSet para gestión de notificaciones.

    Endpoints:
    - GET /api/notifications/ - Listar notificaciones del usuario
    - GET /api/notifications/unread-count/ - Contador de no leídas
    - POST /api/notifications/{id}/mark-read/ - Marcar como leída
    - POST /api/notifications/mark-all-read/ - Marcar todas como leídas
    - DELETE /api/notifications/{id}/ - Archivar notificación
    - GET /api/notifications/threads/ - Mis conversaciones
    - GET /api/notifications/threads/{id}/ - Detalle de conversación
    - POST /api/notifications/threads/{id}/reply/ - Responder
    - POST /api/notifications/threads/{id}/close/ - Cerrar hilo
    - POST /api/notifications/send/ - Enviar mensaje (solo admin)
    - GET /api/notifications/admin/threads/ - Hilos del admin
    - GET /api/notifications/templates/ - Plantillas disponibles
    """

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        Lista las notificaciones del usuario.

        Query params:
        - is_read: filtrar por estado de lectura (true/false)
        - type: filtrar por tipo
        - sender_username: filtrar por username del remitente
        - date_from: filtrar desde fecha (YYYY-MM-DD)
        - date_to: filtrar hasta fecha (YYYY-MM-DD)
        - page: página (default 1)
        - per_page: items por página (default 20, max 100)
        """
        from django.db.models import Q
        from datetime import datetime, timedelta
        from users.models import User

        user = request.user
        queryset = Notification.objects.filter(
            recipient=user,
            is_archived=False
        )

        # Filtros
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        notification_type = request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)

        # Filtro por remitente (solo para superadmin)
        sender_username = request.query_params.get('sender_username')
        if sender_username and user.role == 'superadmin':
            try:
                sender = User.objects.get(username=sender_username)
                queryset = queryset.filter(sender=sender)
            except User.DoesNotExist:
                pass

        # Filtro por rango de fechas
        date_from = request.query_params.get('date_from')
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                queryset = queryset.filter(created_at__gte=from_date)
            except ValueError:
                pass

        date_to = request.query_params.get('date_to')
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                # Incluir todo el día hasta las 23:59:59
                to_date = to_date + timedelta(days=1)
                queryset = queryset.filter(created_at__lt=to_date)
            except ValueError:
                pass

        # Paginación
        page = int(request.query_params.get('page', 1))
        per_page = min(int(request.query_params.get('per_page', 20)), 100)
        start = (page - 1) * per_page
        end = start + per_page

        total = queryset.count()
        notifications = queryset[start:end]

        serializer = NotificationSerializer(notifications, many=True)

        return Response({
            'count': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
            'results': serializer.data
        })

    def destroy(self, request, pk=None):
        """Archiva una notificación"""
        try:
            notification = Notification.objects.get(
                id=pk,
                recipient=request.user
            )
            notification.is_archived = True
            notification.save()
            return Response({'success': True})
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notificación no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Obtiene el número de notificaciones no leídas"""
        count = NotificationService.get_unread_count(request.user)
        return Response({'count': count})

    @action(detail=False, methods=['get'], url_path='threads-unread-count')
    def threads_unread_count(self, request):
        """Obtiene el número de hilos de mensajes con mensajes no leídos"""
        from django.db.models import Q

        user = request.user

        # Contar hilos donde el usuario tiene mensajes no leídos
        count = MessageThread.objects.filter(
            Q(participant_1=user, participant_1_unread__gt=0) |
            Q(participant_2=user, participant_2_unread__gt=0) |
            Q(admin=user, admin_unread_count__gt=0) |
            Q(user=user, user_unread_count__gt=0)
        ).distinct().count()

        return Response({'count': count})

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Marca una notificación como leída"""
        success = NotificationService.mark_as_read(pk, request.user)
        if success:
            return Response({'success': True})
        return Response(
            {'error': 'Notificación no encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """Marca todas las notificaciones como leídas"""
        count = NotificationService.mark_all_as_read(request.user)
        return Response({'success': True, 'count': count})

    # ==================== HILOS DE CONVERSACIÓN ====================

    @action(detail=False, methods=['get'])
    def threads(self, request):
        """
        Lista los hilos de conversación del usuario.
        Ahora todos los usuarios ven TODAS sus conversaciones donde participan.
        """
        user = request.user
        from django.db.models import Q

        # El usuario ve todos los hilos donde es participante (campos nuevos Y legacy)
        queryset = MessageThread.objects.filter(
            Q(participant_1=user) | Q(participant_2=user) |
            Q(admin=user) | Q(user=user)
        ).distinct()

        # Filtros
        is_closed = request.query_params.get('is_closed')
        if is_closed is not None:
            queryset = queryset.filter(is_closed=is_closed.lower() == 'true')

        thread_type = request.query_params.get('type')
        if thread_type:
            queryset = queryset.filter(thread_type=thread_type)

        serializer = MessageThreadSerializer(queryset, many=True, context={'request': request})
        return Response({'results': serializer.data})

    @action(detail=True, methods=['get'], url_path='thread')
    def thread_detail(self, request, pk=None):
        """Obtiene detalle de un hilo con todos sus mensajes"""
        user = request.user

        try:
            thread = MessageThread.objects.get(id=pk)

            # Verificar acceso (usando ambos: nuevos campos y legacy)
            participants = [thread.participant_1, thread.participant_2, thread.admin, thread.user]
            participants = [p for p in participants if p is not None]
            if user not in participants:
                return Response(
                    {'error': 'No tienes acceso a esta conversación'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Marcar mensajes como leídos
            thread.messages.filter(is_read=False).exclude(sender=user).update(
                is_read=True
            )

            # Resetear contador para este usuario (verificando ambos campos)
            if user == thread.participant_1 or user == thread.admin:
                thread.participant_1_unread = 0
                thread.admin_unread_count = 0
            if user == thread.participant_2 or user == thread.user:
                thread.participant_2_unread = 0
                thread.user_unread_count = 0
            thread.save()

            serializer = MessageThreadDetailSerializer(thread, context={'request': request})
            return Response(serializer.data)

        except MessageThread.DoesNotExist:
            return Response(
                {'error': 'Conversación no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='reply')
    def reply(self, request, pk=None):
        """Responde en un hilo de conversación"""
        serializer = ReplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        notification = NotificationService.reply_to_thread(
            thread_id=pk,
            sender=request.user,
            message=serializer.validated_data['message']
        )

        if notification:
            return Response({
                'success': True,
                'notification': NotificationSerializer(notification).data
            })

        return Response(
            {'error': 'No se pudo enviar la respuesta'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'], url_path='close')
    def close_thread(self, request, pk=None):
        """Cierra un hilo de conversación (solo admin o participantes)"""
        try:
            thread = MessageThread.objects.get(id=pk)
            # Verificar que el usuario puede cerrar (ambos campos)
            participants = [thread.participant_1, thread.participant_2, thread.admin, thread.user]
            participants = [p for p in participants if p is not None]
            if request.user not in participants:
                return Response(
                    {'error': 'No tienes permiso para cerrar esta conversación'},
                    status=status.HTTP_403_FORBIDDEN
                )
            thread.close(request.user)
            return Response({'success': True})
        except MessageThread.DoesNotExist:
            return Response(
                {'error': 'Conversación no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='reopen')
    def reopen_thread(self, request, pk=None):
        """Reabre un hilo de conversación cerrado (solo admin/superadmin)"""
        try:
            thread = MessageThread.objects.get(id=pk)

            # Solo el admin del hilo o superadmin puede reabrir
            is_admin = request.user == thread.admin or request.user == thread.participant_1
            is_superadmin = request.user.role == 'superadmin'

            if not (is_admin or is_superadmin):
                return Response(
                    {'error': 'Solo el administrador puede reabrir conversaciones'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if not thread.is_closed:
                return Response(
                    {'error': 'Esta conversación ya está abierta'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Reabrir el hilo
            thread.is_closed = False
            thread.closed_at = None
            thread.closed_by = None
            thread.save()

            return Response({
                'success': True,
                'message': 'Conversación reabierta exitosamente'
            })
        except MessageThread.DoesNotExist:
            return Response(
                {'error': 'Conversación no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

    # ==================== MENSAJERÍA ENTRE USUARIOS ====================

    @action(detail=False, methods=['post'], url_path='new-message')
    def new_message(self, request):
        """
        Crea un nuevo mensaje directo a otro usuario.
        Cualquier usuario autenticado puede usarlo.
        """
        from users.models import User

        recipient_id = request.data.get('recipient_id')
        subject = request.data.get('subject', 'Mensaje')
        message = request.data.get('message', '')

        if not recipient_id:
            return Response(
                {'error': 'Debes especificar un destinatario'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not message.strip():
            return Response(
                {'error': 'El mensaje no puede estar vacío'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            recipient = User.objects.get(id=recipient_id, is_active=True)

            # No puedes enviarte mensajes a ti mismo
            if recipient == request.user:
                return Response(
                    {'error': 'No puedes enviarte mensajes a ti mismo'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Obtener o crear hilo de conversación directa
            thread, created = MessageThread.get_or_create_direct_thread(
                user1=request.user,
                user2=recipient,
                subject=subject
            )

            # Si el hilo ya existía pero estaba cerrado, reabrirlo
            if not created and thread.is_closed:
                thread.is_closed = False
                thread.closed_at = None
                thread.closed_by = None
                thread.save()

            # Agregar el mensaje
            notification = thread.add_message(
                sender=request.user,
                message=message
            )

            return Response({
                'success': True,
                'thread_id': thread.id,
                'created': created,
                'notification_id': notification.id
            }, status=status.HTTP_201_CREATED)

        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'], url_path='support-ticket')
    def create_support_ticket(self, request):
        """
        Crea un ticket de soporte/ayuda.
        Cualquier usuario autenticado puede usarlo.
        """
        subject = request.data.get('subject', '')
        message = request.data.get('message', '')

        if not subject.strip():
            return Response(
                {'error': 'El asunto es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not message.strip():
            return Response(
                {'error': 'El mensaje no puede estar vacío'},
                status=status.HTTP_400_BAD_REQUEST
            )

        thread = MessageThread.create_support_ticket(
            user=request.user,
            subject=subject,
            initial_message=message
        )

        return Response({
            'success': True,
            'thread_id': thread.id,
            'message': 'Ticket de soporte creado exitosamente'
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='users-search')
    def search_users(self, request):
        """
        Busca usuarios para enviarles mensajes.
        Devuelve usuarios activos que coincidan con la búsqueda.
        """
        from users.models import User
        from django.db.models import Q

        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 10))

        if not query or len(query) < 2:
            return Response({'results': []})

        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query),
            is_active=True
        ).exclude(id=request.user.id)[:limit]

        results = [
            {
                'id': u.id,
                'username': u.username,
                'full_name': f"{u.first_name} {u.last_name}".strip() or u.username,
                'email': u.email,
                'role': u.role
            }
            for u in users
        ]

        return Response({'results': results})

    # ==================== FUNCIONES DE ADMIN ====================

    @action(detail=False, methods=['post'])
    def send(self, request):
        """
        Envía una notificación/mensaje a usuario(s).
        Solo superadmin puede usar este endpoint.
        """
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede enviar mensajes'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SendNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        recipient_type = data['recipient_type']

        from users.models import User

        try:
            if recipient_type == 'user':
                # Un solo usuario
                recipient = User.objects.get(id=data['recipient_id'], is_active=True)
                notifications = NotificationService.send_to_users(
                    recipients=[recipient],
                    notification_type='admin_message',
                    title=data['subject'],
                    message=data['message'],
                    sender=request.user,
                    priority=data['priority'],
                    allow_reply=data['allow_reply'],
                    thread_type=data['thread_type'],
                    send_email=data.get('send_email')
                )

            elif recipient_type == 'role':
                # Por rol
                notifications = NotificationService.send_to_role(
                    role=data['recipient_role'],
                    notification_type='admin_message',
                    title=data['subject'],
                    message=data['message'],
                    sender=request.user,
                    priority=data['priority'],
                    allow_reply=data['allow_reply'],
                    thread_type=data['thread_type'],
                    send_email=data.get('send_email')
                )

            elif recipient_type == 'users':
                # Múltiples usuarios
                recipients = User.objects.filter(
                    id__in=data['recipient_ids'],
                    is_active=True
                )
                notifications = NotificationService.send_to_users(
                    recipients=list(recipients),
                    notification_type='admin_message',
                    title=data['subject'],
                    message=data['message'],
                    sender=request.user,
                    priority=data['priority'],
                    allow_reply=data['allow_reply'],
                    thread_type=data['thread_type'],
                    send_email=data.get('send_email')
                )

            elif recipient_type == 'all':
                # Todos los usuarios
                notifications = NotificationService.send_to_all(
                    notification_type='admin_message',
                    title=data['subject'],
                    message=data['message'],
                    sender=request.user,
                    priority=data['priority'],
                    allow_reply=data['allow_reply'],
                    thread_type=data['thread_type'],
                    send_email=data.get('send_email')
                )

            return Response({
                'success': True,
                'sent_count': len(notifications),
                'message': f'Mensaje enviado a {len(notifications)} usuario(s)'
            })

        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], url_path='admin/threads')
    def admin_threads(self, request):
        """Lista todos los hilos del admin"""
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede ver todos los hilos'},
                status=status.HTTP_403_FORBIDDEN
            )

        from django.db.models import Q

        # Buscar hilos donde el admin es participante
        queryset = MessageThread.objects.filter(
            Q(participant_1=request.user) | Q(admin=request.user)
        ).distinct()

        # Filtros
        is_closed = request.query_params.get('is_closed')
        if is_closed is not None:
            queryset = queryset.filter(is_closed=is_closed.lower() == 'true')

        has_unread = request.query_params.get('has_unread')
        if has_unread == 'true':
            queryset = queryset.filter(
                Q(admin_unread_count__gt=0) | Q(participant_1_unread__gt=0)
            )

        serializer = MessageThreadSerializer(queryset, many=True, context={'request': request})
        return Response({'count': queryset.count(), 'results': serializer.data})

    @action(detail=False, methods=['get'], url_path='admin/sent')
    def admin_sent(self, request):
        """Historial de notificaciones enviadas por el admin"""
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede ver el historial'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Filtrar mensajes enviados por este admin
        queryset = Notification.objects.filter(
            sender=request.user,
            notification_type='admin_message'
        ).order_by('-created_at')

        # Paginación
        page = int(request.query_params.get('page', 1))
        per_page = min(int(request.query_params.get('per_page', 50)), 100)
        start = (page - 1) * per_page
        end = start + per_page

        total = queryset.count()
        notifications = queryset[start:end]

        serializer = NotificationSerializer(notifications, many=True)

        return Response({
            'count': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Lista las plantillas de notificación disponibles"""
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede ver las plantillas'},
                status=status.HTTP_403_FORBIDDEN
            )

        templates = NotificationTemplate.objects.filter(is_active=True)
        serializer = NotificationTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    # ==================== ARCHIVOS ADJUNTOS ====================

    @action(detail=False, methods=['post'], url_path='upload-attachment',
            parser_classes=[MultiPartParser, FormParser])
    def upload_attachment(self, request):
        """
        Sube un archivo adjunto para un mensaje.

        Puede subirse:
        1. Para una notificación existente (notification_id)
        2. Para un hilo (thread_id) - se adjuntará al próximo mensaje
        3. Sin asociar (se guarda temporalmente y se asocia después)

        Request:
        - file: Archivo a subir
        - notification_id: ID de la notificación (opcional)
        - thread_id: ID del hilo (opcional)
        """
        serializer = MessageAttachmentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = serializer.validated_data['file']
        notification_id = serializer.validated_data.get('notification_id')
        thread_id = serializer.validated_data.get('thread_id')

        notification = None

        # Verificar acceso si se especificó notification_id
        if notification_id:
            try:
                notification = Notification.objects.get(id=notification_id)
                # Verificar que el usuario puede adjuntar a esta notificación
                if notification.sender != request.user and notification.recipient != request.user:
                    return Response(
                        {'error': 'No tienes permiso para adjuntar archivos a esta notificación'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Notification.DoesNotExist:
                return Response(
                    {'error': 'Notificación no encontrada'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Si se especifica thread_id pero no notification_id, verificar acceso al hilo
        if thread_id and not notification:
            try:
                thread = MessageThread.objects.get(id=thread_id)
                participants = [thread.participant_1, thread.participant_2, thread.admin, thread.user]
                participants = [p for p in participants if p is not None]
                if request.user not in participants:
                    return Response(
                        {'error': 'No tienes acceso a este hilo'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                # Crear una notificación temporal para asociar el adjunto
                # (se actualizará cuando se envíe el mensaje real)
            except MessageThread.DoesNotExist:
                return Response(
                    {'error': 'Hilo no encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Determinar el tipo de archivo
        mime_type = uploaded_file.content_type
        file_type = MessageAttachment.get_file_type_from_mime(mime_type)

        # Crear el adjunto
        attachment = MessageAttachment(
            notification=notification,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            file_type=file_type,
            mime_type=mime_type,
            file_size=uploaded_file.size,
            uploaded_by=request.user
        )

        # Para imágenes, obtener dimensiones
        if file_type == 'image':
            try:
                from PIL import Image
                img = Image.open(uploaded_file)
                attachment.width = img.width
                attachment.height = img.height
                uploaded_file.seek(0)  # Reset file pointer
            except Exception:
                pass

        attachment.save()

        return Response({
            'success': True,
            'attachment': MessageAttachmentSerializer(attachment).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='reply-with-attachments',
            parser_classes=[MultiPartParser, FormParser])
    def reply_with_attachments(self, request, pk=None):
        """
        Responde en un hilo de conversación con archivos adjuntos.

        Request (multipart/form-data):
        - message: Texto del mensaje
        - files: Uno o más archivos adjuntos
        - attachment_ids: IDs de adjuntos ya subidos (opcional, JSON array)
        """
        import json

        message = request.data.get('message', '').strip()
        files = request.FILES.getlist('files')
        attachment_ids_str = request.data.get('attachment_ids', '[]')

        # El mensaje puede estar vacío si hay adjuntos
        try:
            attachment_ids = json.loads(attachment_ids_str) if attachment_ids_str else []
        except json.JSONDecodeError:
            attachment_ids = []

        if not message and not files and not attachment_ids:
            return Response(
                {'error': 'Debes proporcionar un mensaje o archivos adjuntos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear la respuesta en el hilo
        notification = NotificationService.reply_to_thread(
            thread_id=pk,
            sender=request.user,
            message=message or '[Archivo adjunto]'
        )

        if not notification:
            return Response(
                {'error': 'No se pudo enviar la respuesta'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Procesar archivos subidos
        attachments_created = []

        for uploaded_file in files:
            # Validar archivo
            max_size = 50 * 1024 * 1024  # 50MB
            if uploaded_file.size > max_size:
                continue  # Skip files too large

            mime_type = uploaded_file.content_type
            file_type = MessageAttachment.get_file_type_from_mime(mime_type)

            attachment = MessageAttachment(
                notification=notification,
                file=uploaded_file,
                original_filename=uploaded_file.name,
                file_type=file_type,
                mime_type=mime_type,
                file_size=uploaded_file.size,
                uploaded_by=request.user
            )

            # Para imágenes, obtener dimensiones
            if file_type == 'image':
                try:
                    from PIL import Image
                    img = Image.open(uploaded_file)
                    attachment.width = img.width
                    attachment.height = img.height
                    uploaded_file.seek(0)
                except Exception:
                    pass

            attachment.save()
            attachments_created.append(attachment)

        # Asociar adjuntos previamente subidos
        if attachment_ids:
            pending_attachments = MessageAttachment.objects.filter(
                id__in=attachment_ids,
                notification__isnull=True,
                uploaded_by=request.user
            )
            for attachment in pending_attachments:
                attachment.notification = notification
                attachment.save()
                attachments_created.append(attachment)

        return Response({
            'success': True,
            'notification': NotificationSerializer(notification).data,
            'attachments_count': len(attachments_created)
        })

    @action(detail=False, methods=['delete'], url_path='attachment/(?P<attachment_id>[0-9]+)')
    def delete_attachment(self, request, attachment_id=None):
        """Elimina un archivo adjunto"""
        try:
            attachment = MessageAttachment.objects.get(id=attachment_id)

            # Solo el uploader puede eliminar
            if attachment.uploaded_by != request.user:
                return Response(
                    {'error': 'No tienes permiso para eliminar este archivo'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Eliminar archivo físico
            if attachment.file:
                attachment.file.delete(save=False)
            if attachment.thumbnail:
                attachment.thumbnail.delete(save=False)

            attachment.delete()

            return Response({'success': True})
        except MessageAttachment.DoesNotExist:
            return Response(
                {'error': 'Archivo no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )


# Vista para servir archivos adjuntos con nombre original
from django.http import FileResponse, Http404
from rest_framework.decorators import api_view, permission_classes

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def serve_attachment(request, attachment_id):
    """
    Sirve un archivo adjunto con su nombre original.
    Verifica que el usuario tenga acceso al hilo del mensaje.
    """
    try:
        attachment = MessageAttachment.objects.select_related(
            'notification__thread'
        ).get(id=attachment_id)

        # Verificar acceso: el usuario debe ser participante del hilo
        thread = attachment.notification.thread if attachment.notification else None
        if thread:
            participants = [
                thread.participant_1, thread.participant_2,
                thread.admin, thread.user
            ]
            participants = [p for p in participants if p is not None]
            if request.user not in participants:
                return Response(
                    {'error': 'No tienes acceso a este archivo'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Servir el archivo
        if not attachment.file:
            raise Http404("Archivo no encontrado")

        # Abrir el archivo
        file_handle = attachment.file.open('rb')
        response = FileResponse(
            file_handle,
            content_type=attachment.mime_type or 'application/octet-stream'
        )

        # Nombre original para descarga
        import urllib.parse
        filename = attachment.original_filename
        # Codificar para headers HTTP (RFC 5987)
        encoded_filename = urllib.parse.quote(filename)
        response['Content-Disposition'] = f"attachment; filename*=UTF-8''{encoded_filename}"

        return response

    except MessageAttachment.DoesNotExist:
        raise Http404("Archivo no encontrado")
