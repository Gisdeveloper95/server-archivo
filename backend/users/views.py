"""
Views para la app users
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Q

from users.models import User, UserPermission, UserFavorite, PasswordResetToken
from users.serializers import (
    UserSerializer, UserPermissionSerializer, UserFavoriteSerializer,
    ChangePasswordSerializer, LoginSerializer
)
from audit.models import AuditLog
from django.core.mail import send_mail
from django.conf import settings


class AuthViewSet(viewsets.GenericViewSet):
    """ViewSet para autenticación"""
    queryset = User.objects.none()  # Dummy queryset para que el router lo reconozca
    permission_classes = [AllowAny]  # Permitir acceso sin autenticación

    def get_queryset(self):
        """Retorna un queryset vacío - no se usa para el login"""
        return User.objects.none()

    @action(detail=False, methods=['post'])
    def login(self, request):
        """Login con email o username y password"""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email_or_username = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Intentar encontrar el usuario por email o username
        user = None
        try:
            # Buscar por email o username
            user_obj = User.objects.get(Q(email=email_or_username) | Q(username=email_or_username))

            # Verificar contraseña manualmente
            if user_obj.check_password(password) and user_obj.is_active:
                user = user_obj
        except User.DoesNotExist:
            pass

        if not user:
            # Registrar intento fallido
            AuditLog.objects.create(
                user=None,
                username=email_or_username,
                user_role='unknown',
                action='login',
                target_path='auth/login',
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=False,
                error_message='Credenciales inválidas'
            )
            return Response(
                {'error': 'Credenciales inválidas'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Usuario inactivo'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)

        # Actualizar última IP y fecha de login
        from django.utils import timezone
        user.last_login = timezone.now()
        user.last_login_ip = getattr(request, 'client_ip', None)
        user.save(update_fields=['last_login', 'last_login_ip'])

        # Registrar login exitoso
        AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role,
            action='login',
            target_path='auth/login',
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=True
        )

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """Logout del usuario"""
        # Registrar logout
        AuditLog.objects.create(
            user=request.user,
            username=request.user.username,
            user_role=request.user.role,
            action='logout',
            target_path='auth/logout',
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=True
        )

        return Response({'message': 'Logout exitoso'})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Retorna información del usuario actual"""
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_access(self, request):
        """Retorna los accesos (permisos) del usuario actual"""
        user = request.user

        # Si es superadmin, no tiene restricciones
        if user.role == 'superadmin':
            return Response({
                'is_superadmin': True,
                'accesses': []
            })

        # Obtener permisos activos del usuario
        permissions = UserPermission.objects.filter(
            user=user,
            is_active=True
        ).select_related('granted_by')

        # Serializar permisos
        serializer = UserPermissionSerializer(permissions, many=True)

        return Response({
            'is_superadmin': False,
            'accesses': serializer.data
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Cambiar contraseña del usuario actual"""
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        # Cambiar contraseña
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'message': 'Contraseña actualizada exitosamente'})

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def refresh(self, request):
        """Refrescar token JWT"""
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'error': 'Refresh token requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                'access': str(refresh.access_token),
            })
        except Exception as e:
            return Response(
                {'error': 'Token inválido o expirado'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def request_password_reset(self, request):
        """
        Solicita un token de recuperación de contraseña
        Body: { "email_or_username": "usuario o correo" }
        """
        email_or_username = request.data.get('email_or_username', '').strip()

        if not email_or_username:
            return Response(
                {'error': 'Usuario o correo requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Buscar usuario por email o username
            user = User.objects.get(
                Q(email=email_or_username) | Q(username=email_or_username),
                is_active=True
            )

            # Crear token
            reset_token = PasswordResetToken.create_token(user)

            # Construir el enlace de recuperación
            reset_url = f"{settings.FRONTEND_URL}/resetear-contrasena?token={reset_token.token}"

            # Enviar correo (requiere configuración de EMAIL en settings)
            try:
                send_mail(
                    subject='Recuperación de contraseña - NetApp Bridge IGAC',
                    message=f'''Hola {user.first_name or user.username},

Has solicitado recuperar tu contraseña para el sistema NetApp Bridge IGAC.

Para restablecer tu contraseña, haz clic en el siguiente enlace (válido por 1 hora):

{reset_url}

Si no solicitaste este cambio, ignora este correo.

Saludos,
Equipo NetApp Bridge IGAC''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                print(f"[INFO] Correo enviado exitosamente a {user.email}")
            except Exception as e:
                print(f"[ERROR] No se pudo enviar correo: {e}")
                import traceback
                traceback.print_exc()
                # En desarrollo, continuar sin enviar correo
                # En producción, podrías querer retornar un error

            # No registrar en auditoría (password reset no requiere auditoría de archivos)
            print(f"[INFO] Solicitud de recuperación de contraseña para usuario: {user.username}")

            return Response({
                'success': True,
                'message': 'Si existe una cuenta asociada, recibirás un correo con instrucciones'
            })

        except User.DoesNotExist:
            # Por seguridad, respondemos lo mismo incluso si el usuario no existe
            return Response({
                'success': True,
                'message': 'Si existe una cuenta asociada, recibirás un correo con instrucciones'
            })
        except Exception as e:
            print(f"[ERROR] Error inesperado en request_password_reset: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Error al procesar la solicitud'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def confirm_password_reset(self, request):
        """
        Confirma el cambio de contraseña con el token
        Body: { "token": "...", "new_password": "..." }
        """
        token_str = request.data.get('token', '').strip()
        new_password = request.data.get('new_password', '').strip()

        if not token_str or not new_password:
            return Response(
                {'error': 'Token y nueva contraseña requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Buscar token
            token = PasswordResetToken.objects.get(token=token_str)

            # Verificar validez
            if not token.is_valid():
                return Response(
                    {'error': 'Token inválido o expirado'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Cambiar contraseña
            user = token.user
            user.set_password(new_password)
            user.save()

            # Marcar token como usado
            token.mark_as_used()

            # No registrar en auditoría (password reset no requiere auditoría de archivos)
            print(f"[INFO] Contraseña restablecida exitosamente para usuario: {user.username}")

            return Response({
                'success': True,
                'message': 'Contraseña actualizada exitosamente'
            })

        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Token inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"[ERROR] Error inesperado en confirm_password_reset: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Error al procesar la solicitud'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de usuarios"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['role', 'is_active', 'department']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'username', 'email']

    def get_queryset(self):
        """Filtra usuarios según el rol del usuario actual"""
        user = self.request.user

        if user.role == 'superadmin':
            return User.objects.all()
        elif user.role == 'admin':
            # Admins pueden ver solo consultation y consultation_edit
            return User.objects.filter(role__in=['consultation', 'consultation_edit'])
        else:
            # Usuarios normales solo pueden verse a sí mismos
            return User.objects.filter(id=user.id)

    def retrieve(self, request, *args, **kwargs):
        """Obtiene un usuario con sus permisos (incluyendo expirados)"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        # Obtener permisos del usuario (activos + expirados recientes)
        # Los permisos expirados se muestran para que el usuario sepa qué tenía
        permissions = UserPermission.objects.filter(
            user=instance,
            is_active=True
        ).select_related('granted_by')

        permissions_serializer = UserPermissionSerializer(permissions, many=True)

        # Combinar datos del usuario con sus permisos
        data = serializer.data
        data['permissions'] = permissions_serializer.data

        return Response(data)

    def perform_create(self, serializer):
        """Registra quién creó el usuario y envía mensaje de bienvenida"""
        user = self.request.user

        # Validar que solo superadmin pueda crear usuarios
        if user.role != 'superadmin':
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError('Solo superadmin puede crear usuarios')

        new_user = serializer.save(created_by=user)

        # Enviar mensaje de bienvenida automático
        try:
            from notifications.services import NotificationService
            NotificationService.create(
                recipient=new_user,
                notification_type='info',
                title='¡Bienvenido a NetApp Bridge IGAC!',
                message=f'''Hola {new_user.first_name or new_user.username},

¡Bienvenido al sistema de gestión de archivos NetApp Bridge IGAC!

Tu cuenta ha sido creada exitosamente. Aquí hay algunos consejos para comenzar:

• Explora tus archivos usando el menú "Explorar Archivos"
• Usa la "Búsqueda Global" para encontrar documentos rápidamente
• Agrega tus carpetas favoritas para acceso rápido
• Si necesitas ayuda, puedes contactar a soporte desde la sección "Mensajes"

Si tienes alguna pregunta, no dudes en escribirnos.

¡Bienvenido al equipo!
Equipo NetApp Bridge IGAC''',
                priority='normal',
                sender=user,
                action_url='/explorar'
            )
        except Exception as e:
            # No fallar la creación del usuario por el mensaje de bienvenida
            print(f"[WARNING] No se pudo enviar mensaje de bienvenida: {e}")

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_status(self, request, pk=None):
        """Activa/desactiva un usuario"""
        user = self.get_object()

        # Solo superadmin puede desactivar usuarios
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'No tienes permiso para esta acción'},
                status=status.HTTP_403_FORBIDDEN
            )

        user.is_active = not user.is_active
        user.save()

        return Response({
            'success': True,
            'message': f"Usuario {'activado' if user.is_active else 'desactivado'}",
            'is_active': user.is_active
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reset_password(self, request, pk=None):
        """Resetea la contraseña de un usuario (solo superadmin)"""
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede resetear contraseñas'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()
        new_password = request.data.get('new_password')

        if not new_password:
            return Response(
                {'error': 'new_password requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        return Response({'message': 'Contraseña reseteada exitosamente'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='update-exemptions')
    def update_exemptions(self, request, pk=None):
        """
        Actualiza las exenciones de nombrado de un usuario.
        Solo superadmin puede modificar exenciones.

        POST body:
        {
            "exempt_from_naming_rules": bool,
            "exempt_from_path_limit": bool,
            "exempt_from_name_length": bool,
            "exemption_reason": "Justificación..."
        }
        """
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede modificar exenciones'},
                status=status.HTTP_403_FORBIDDEN
            )

        target_user = self.get_object()

        # No permitir modificar superadmin (ya tiene todos los permisos por rol)
        if target_user.role in ['admin', 'superadmin']:
            return Response(
                {'error': 'Los usuarios admin/superadmin tienen exenciones automáticas por rol'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Actualizar campos de exención
        from django.utils import timezone

        changed = False

        if 'exempt_from_naming_rules' in request.data:
            target_user.exempt_from_naming_rules = request.data['exempt_from_naming_rules']
            changed = True

        if 'exempt_from_path_limit' in request.data:
            target_user.exempt_from_path_limit = request.data['exempt_from_path_limit']
            changed = True

        if 'exempt_from_name_length' in request.data:
            target_user.exempt_from_name_length = request.data['exempt_from_name_length']
            changed = True

        if 'exemption_reason' in request.data:
            target_user.exemption_reason = request.data['exemption_reason']
            changed = True

        if changed:
            # Registrar quién otorgó la exención y cuándo
            target_user.exemption_granted_by = request.user
            target_user.exemption_granted_at = timezone.now()
            target_user.save()

            # Registrar en auditoría
            AuditLog.objects.create(
                user=request.user,
                username=request.user.username,
                user_role=request.user.role,
                action='update_exemptions',
                target_path=f'users/{target_user.id}',
                target_name=target_user.username,
                details={
                    'exempt_from_naming_rules': target_user.exempt_from_naming_rules,
                    'exempt_from_path_limit': target_user.exempt_from_path_limit,
                    'exempt_from_name_length': target_user.exempt_from_name_length,
                    'exemption_reason': target_user.exemption_reason
                },
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=True
            )

            # Notificar al usuario
            try:
                from notifications.services import NotificationService
                NotificationService.create(
                    recipient=target_user,
                    notification_type='info',
                    title='Exenciones de nombrado actualizadas',
                    message=f'''Tus permisos de exención de nombrado han sido actualizados por {request.user.username}.

Exenciones actuales:
• Exento de reglas de nombrado: {"Sí" if target_user.exempt_from_naming_rules else "No"}
• Exento de límite de ruta: {"Sí" if target_user.exempt_from_path_limit else "No"}
• Exento de límite de nombre: {"Sí" if target_user.exempt_from_name_length else "No"}

Razón: {target_user.exemption_reason or "No especificada"}''',
                    priority='normal',
                    sender=request.user
                )
            except Exception as e:
                print(f"[WARNING] No se pudo enviar notificación: {e}")

        return Response({
            'success': True,
            'message': 'Exenciones actualizadas exitosamente',
            'exemptions': target_user.get_naming_exemptions()
        })

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='get-exemptions')
    def get_exemptions(self, request, pk=None):
        """
        Obtiene las exenciones de nombrado de un usuario específico.
        Solo superadmin puede ver exenciones de otros usuarios.
        """
        target_user = self.get_object()

        # Si no es superadmin y no es el mismo usuario
        if request.user.role != 'superadmin' and request.user.id != target_user.id:
            return Response(
                {'error': 'No tienes permiso para ver esta información'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({
            'success': True,
            'user': {
                'id': target_user.id,
                'username': target_user.username,
                'role': target_user.role,
                'full_name': target_user.full_name
            },
            'exemptions': target_user.get_naming_exemptions(),
            'granted_by': target_user.exemption_granted_by.username if target_user.exemption_granted_by else None,
            'granted_at': target_user.exemption_granted_at.isoformat() if target_user.exemption_granted_at else None
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='users-with-exemptions')
    def users_with_exemptions(self, request):
        """
        Lista todos los usuarios que tienen alguna exención activa.
        Solo superadmin.
        """
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede ver esta información'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Buscar usuarios con al menos una exención activa
        from django.db.models import Q

        users = User.objects.filter(
            Q(exempt_from_naming_rules=True) |
            Q(exempt_from_path_limit=True) |
            Q(exempt_from_name_length=True)
        ).select_related('exemption_granted_by').order_by('-exemption_granted_at')

        results = []
        for user in users:
            results.append({
                'id': user.id,
                'username': user.username,
                'full_name': user.full_name,
                'role': user.role,
                'exemptions': user.get_naming_exemptions(),
                'exemption_reason': user.exemption_reason,
                'granted_by': user.exemption_granted_by.username if user.exemption_granted_by else None,
                'granted_at': user.exemption_granted_at.isoformat() if user.exemption_granted_at else None
            })

        return Response({
            'success': True,
            'count': len(results),
            'users': results
        })

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def audit_logs(self, request, pk=None):
        """Obtiene el historial de auditoría de un usuario (solo superadmin)"""
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede ver auditorías'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()

        # Filtros opcionales
        action = request.query_params.get('action', None)
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)

        logs = AuditLog.objects.filter(user=user)

        if action:
            logs = logs.filter(action=action)
        if start_date:
            logs = logs.filter(timestamp__gte=start_date)
        if end_date:
            logs = logs.filter(timestamp__lte=end_date)

        logs = logs.order_by('-timestamp')[:100]  # Últimos 100 registros

        # Serializar manualmente para evitar referencias circulares
        logs_data = []
        for log in logs:
            logs_data.append({
                'id': log.id,
                'username': log.username,
                'user_role': log.user_role,
                'action': log.action,
                'target_path': log.target_path,
                'target_name': log.target_name,
                'file_size': log.file_size,
                'details': log.details,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent,
                'success': log.success,
                'error_message': log.error_message,
                'timestamp': log.timestamp.isoformat(),
            })

        return Response(logs_data)


class UserPermissionViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de permisos"""
    queryset = UserPermission.objects.all()
    serializer_class = UserPermissionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['user', 'is_active', 'can_read', 'can_write', 'can_delete']

    def get_queryset(self):
        """Filtra permisos según el usuario"""
        user = self.request.user

        if user.role == 'superadmin':
            return UserPermission.objects.all()
        elif user.role == 'admin':
            # Admin puede ver permisos que él otorgó
            return UserPermission.objects.filter(granted_by=user)
        else:
            # Usuarios normales solo ven sus propios permisos
            return UserPermission.objects.filter(user=user)

    def perform_create(self, serializer):
        """Registra quién otorgó el permiso"""
        serializer.save(granted_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def revoke(self, request, pk=None):
        """Revoca un permiso"""
        permission = self.get_object()

        # Solo quien otorgó el permiso o superadmin puede revocarlo
        if request.user.role != 'superadmin' and permission.granted_by != request.user:
            return Response(
                {'error': 'No tienes permiso para revocar este permiso'},
                status=status.HTTP_403_FORBIDDEN
            )

        from django.utils import timezone
        permission.is_active = False
        permission.revoked_at = timezone.now()
        permission.save()

        return Response({'message': 'Permiso revocado exitosamente'})

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def dismiss_expired(self, request, pk=None):
        """
        Permite al usuario eliminar/ocultar un permiso expirado de su lista.
        Solo funciona si el permiso está realmente expirado.
        """
        permission = self.get_object()

        # Verificar que el permiso pertenece al usuario actual
        if permission.user != request.user:
            return Response(
                {'error': 'No puedes eliminar permisos de otros usuarios'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar que el permiso está expirado
        if not permission.is_expired():
            return Response(
                {'error': 'Solo puedes eliminar permisos que ya hayan expirado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Eliminar el permiso
        permission.delete()

        return Response({
            'message': 'Permiso expirado eliminado de tu lista',
            'success': True
        })


class UserFavoriteViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de favoritos"""
    serializer_class = UserFavoriteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Solo retorna favoritos del usuario actual"""
        return UserFavorite.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Asigna automáticamente el usuario actual al favorito"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def access(self, request, pk=None):
        """Registra un acceso al favorito"""
        favorite = self.get_object()
        favorite.increment_access()

        return Response({
            'message': 'Acceso registrado',
            'access_count': favorite.access_count,
            'last_accessed': favorite.last_accessed
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def reorder(self, request):
        """Reordena los favoritos"""
        order_data = request.data.get('order', [])

        for item in order_data:
            try:
                favorite = UserFavorite.objects.get(
                    id=item['id'],
                    user=request.user
                )
                favorite.order = item['order']
                favorite.save(update_fields=['order'])
            except UserFavorite.DoesNotExist:
                continue

        return Response({'message': 'Favoritos reordenados exitosamente'})
