"""
Views para la Papelera de Reciclaje
"""
from datetime import timedelta

from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from audit.models import AuditLog
from sharing.models import ShareLink
from .models import TrashItem, TrashConfig
from .serializers import (
    TrashItemSerializer,
    TrashItemDetailSerializer,
    RestoreSerializer,
    TrashShareSerializer,
    TrashStatsSerializer,
    TrashConfigSerializer,
)
from .services import TrashService


class TrashViewSet(viewsets.ViewSet):
    """
    ViewSet para gestión de la Papelera de Reciclaje.

    Endpoints:
    - GET /api/trash/ - Listar items en papelera
    - GET /api/trash/{trash_id}/ - Detalle de un item
    - POST /api/trash/{trash_id}/restore/ - Restaurar item
    - DELETE /api/trash/{trash_id}/ - Eliminar permanentemente
    - GET /api/trash/stats/ - Estadísticas de papelera
    - DELETE /api/trash/cleanup/ - Limpiar expirados
    - POST /api/trash/{trash_id}/share/ - Generar link de descarga
    - GET /api/trash/by-path/ - Items eliminados de una ruta específica
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtra items según permisos del usuario.
        - Superadmin: ve todo
        - Admin área: ve solo su área
        - Usuario normal: ve solo lo que él eliminó
        """
        user = self.request.user
        queryset = TrashItem.objects.filter(status='stored')

        if user.role == 'superadmin':
            return queryset

        # Para otros roles, filtrar por lo que eliminaron ellos
        # o por sus rutas permitidas
        if user.role in ['admin', 'consultation_edit', 'consultation_only']:
            # Obtener rutas permitidas del usuario
            from users.models import UserPermission
            user_permissions = UserPermission.objects.filter(user=user)
            allowed_paths = [p.path for p in user_permissions]

            if allowed_paths:
                from django.db.models import Q
                path_filter = Q()
                for path in allowed_paths:
                    path_filter |= Q(original_path__startswith=path)

                # Items en sus rutas O que ellos eliminaron
                return queryset.filter(
                    Q(deleted_by=user) | path_filter
                )

        # Default: solo lo que eliminó el usuario
        return queryset.filter(deleted_by=user)

    def list(self, request):
        """
        Lista items en la papelera con filtros opcionales.

        Query params:
        - search: buscar por nombre
        - deleted_by: filtrar por usuario (id)
        - is_directory: filtrar por tipo (true/false)
        - from_date: fecha desde (YYYY-MM-DD)
        - to_date: fecha hasta (YYYY-MM-DD)
        - status: filtrar por estado
        """
        queryset = self.get_queryset()

        # Filtros
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(original_name__icontains=search)

        deleted_by = request.query_params.get('deleted_by')
        if deleted_by:
            queryset = queryset.filter(deleted_by_id=deleted_by)

        is_directory = request.query_params.get('is_directory')
        if is_directory is not None:
            queryset = queryset.filter(is_directory=is_directory.lower() == 'true')

        from_date = request.query_params.get('from_date')
        if from_date:
            queryset = queryset.filter(deleted_at__date__gte=from_date)

        to_date = request.query_params.get('to_date')
        if to_date:
            queryset = queryset.filter(deleted_at__date__lte=to_date)

        # Paginación simple
        page = int(request.query_params.get('page', 1))
        per_page = min(int(request.query_params.get('per_page', 50)), 100)
        start = (page - 1) * per_page
        end = start + per_page

        total = queryset.count()
        items = queryset[start:end]

        serializer = TrashItemSerializer(items, many=True)

        return Response({
            'count': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
            'results': serializer.data
        })

    def retrieve(self, request, pk=None):
        """Obtiene detalle de un item en papelera"""
        try:
            item = self.get_queryset().get(trash_id=pk)
        except TrashItem.DoesNotExist:
            return Response(
                {'error': 'Item no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TrashItemDetailSerializer(item)
        return Response(serializer.data)

    def destroy(self, request, pk=None):
        """Elimina permanentemente un item de la papelera"""
        user = request.user

        # Solo superadmin puede eliminar permanentemente
        if user.role != 'superadmin':
            # O el usuario que lo eliminó
            try:
                item = TrashItem.objects.get(trash_id=pk)
                if item.deleted_by != user:
                    return Response(
                        {'error': 'No tienes permiso para eliminar este item'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except TrashItem.DoesNotExist:
                return Response(
                    {'error': 'Item no encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )

        trash_service = TrashService()
        result = trash_service.delete_permanently(pk, user)

        if result['success']:
            # Auditoría
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='trash_delete_permanent',
                target_path=f"trash:{pk}",
                details={'trash_id': pk},
                ip_address=getattr(request, 'client_ip', None),
                success=True
            )
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restaura un item desde la papelera"""
        user = request.user

        # Verificar permisos
        try:
            item = self.get_queryset().get(trash_id=pk)
        except TrashItem.DoesNotExist:
            return Response(
                {'error': 'Item no encontrado o sin permiso para restaurar'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validar datos de entrada
        serializer = RestoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        trash_service = TrashService()
        result = trash_service.restore_from_trash(
            trash_id=pk,
            user=user,
            target_path=serializer.validated_data.get('target_path'),
            conflict_resolution=serializer.validated_data.get('conflict_resolution', 'rename')
        )

        if result['success']:
            # Auditoría
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='trash_restore',
                target_path=result.get('restored_path', ''),
                target_name=item.original_name,
                details={
                    'trash_id': pk,
                    'original_path': item.original_path,
                    'restored_path': result.get('restored_path')
                },
                ip_address=getattr(request, 'client_ip', None),
                success=True
            )
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Obtiene estadísticas de la papelera"""
        # Solo superadmin puede ver estadísticas globales
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede ver estadísticas'},
                status=status.HTTP_403_FORBIDDEN
            )

        trash_service = TrashService()
        stats = trash_service.get_trash_stats()

        serializer = TrashStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=False, methods=['delete'])
    def cleanup(self, request):
        """Limpia manualmente los items expirados"""
        # Solo superadmin
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede limpiar la papelera'},
                status=status.HTTP_403_FORBIDDEN
            )

        trash_service = TrashService()
        result = trash_service.cleanup_expired()

        if result['success']:
            # Auditoría
            AuditLog.objects.create(
                user=request.user,
                username=request.user.username,
                user_role=request.user.role,
                action='trash_cleanup',
                details=result,
                ip_address=getattr(request, 'client_ip', None),
                success=True
            )

        return Response(result)

    @action(detail=False, methods=['get'], url_path='by-path')
    def by_path(self, request):
        """
        Obtiene items eliminados de una ruta específica.
        Útil para el modal "Versiones anteriores" en un directorio.

        Query params:
        - path: ruta del directorio
        """
        path = request.query_params.get('path', '')
        if not path:
            return Response(
                {'error': 'Se requiere el parámetro path'},
                status=status.HTTP_400_BAD_REQUEST
            )

        trash_service = TrashService()
        items = trash_service.get_items_for_path(path)

        # Filtrar según permisos del usuario
        user = request.user
        if user.role != 'superadmin':
            # Filtrar solo los que el usuario puede ver
            queryset = self.get_queryset()
            allowed_ids = set(queryset.values_list('trash_id', flat=True))
            items = [item for item in items if item.trash_id in allowed_ids]

        serializer = TrashItemSerializer(items, many=True)

        return Response({
            'path': path,
            'count': len(items),
            'results': serializer.data
        })

    @action(detail=True, methods=['get'])
    def contents(self, request, pk=None):
        """
        Obtiene el contenido/árbol de un item en papelera.
        Para directorios, muestra la estructura de archivos.
        """
        user = request.user

        # Verificar que el item existe y el usuario tiene acceso
        try:
            item = self.get_queryset().get(trash_id=pk)
        except TrashItem.DoesNotExist:
            return Response(
                {'error': 'Item no encontrado o sin permiso'},
                status=status.HTTP_404_NOT_FOUND
            )

        trash_service = TrashService()
        result = trash_service.get_item_contents(pk)

        if result.get('success'):
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """
        Genera un link de descarga para un item en papelera.
        Usa el modelo ShareLink existente del módulo sharing.
        """
        user = request.user

        # Verificar que el item existe y el usuario tiene acceso
        try:
            item = self.get_queryset().get(trash_id=pk)
        except TrashItem.DoesNotExist:
            return Response(
                {'error': 'Item no encontrado o sin permiso'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validar datos
        serializer = TrashShareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Crear ShareLink usando el modelo existente
        expires_at = timezone.now() + timedelta(hours=data['expires_hours'])

        # Hash de password si se proporciona
        password_hashed = None
        if data.get('password'):
            password_hashed = make_password(data['password'])

        share_link = ShareLink.objects.create(
            path=item.original_path,
            is_directory=item.is_directory,
            trash_item=item,  # Referencia al item de papelera
            permission=data['permission'],
            password=password_hashed,
            require_email=data.get('require_email', False),
            max_downloads=data.get('max_downloads'),
            expires_at=expires_at,
            description=f'Archivo eliminado: {item.original_name}',
            created_by=user
        )

        # Auditoría
        AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role,
            action='trash_share',
            target_path=item.original_path,
            target_name=item.original_name,
            details={
                'trash_id': str(pk),
                'share_token': share_link.token,
                'expires_at': expires_at.isoformat()
            },
            ip_address=getattr(request, 'client_ip', None),
            success=True
        )

        return Response({
            'success': True,
            'share_url': share_link.full_url,
            'token': share_link.token,
            'expires_at': expires_at.isoformat()
        })

    @action(detail=False, methods=['get'])
    def config(self, request):
        """
        Obtiene la configuración actual de la papelera.
        Solo superadmin puede ver la configuración.
        """
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede ver la configuración'},
                status=status.HTTP_403_FORBIDDEN
            )

        config = TrashConfig.get_config()
        serializer = TrashConfigSerializer(config)

        # Agregar estadísticas de uso actual
        trash_service = TrashService()
        stats = trash_service.get_trash_stats()

        current_size = stats.get('total_size_bytes', 0) or 0
        return Response({
            'config': serializer.data,
            'usage': {
                'current_size_bytes': current_size,
                'current_size_formatted': self._format_size(current_size),
                'max_size_bytes': config.max_size_bytes,
                'max_size_formatted': f"{config.max_size_gb} GB",
                'usage_percent': round((current_size / config.max_size_bytes) * 100, 1) if config.max_size_bytes > 0 else 0,
                'total_items': stats.get('total_items', 0),
                'expiring_soon': stats.get('expiring_soon', 0)
            }
        })

    @action(detail=False, methods=['put', 'patch'])
    def config_update(self, request):
        """
        Actualiza la configuración de la papelera.
        Solo superadmin puede modificar la configuración.

        Si se reduce el tiempo de retención, los archivos que excedan
        el nuevo límite serán eliminados automáticamente.
        """
        if request.user.role != 'superadmin':
            return Response(
                {'error': 'Solo superadmin puede modificar la configuración'},
                status=status.HTTP_403_FORBIDDEN
            )

        config = TrashConfig.get_config()
        old_retention_days = config.retention_days

        serializer = TrashConfigSerializer(config, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Guardar cambios
        config = serializer.save(updated_by=request.user)

        # Si se redujo el tiempo de retención, aplicar limpieza
        deleted_count = 0
        if config.retention_days < old_retention_days:
            deleted_count = config.apply_retention_change(old_retention_days)

        # Auditoría
        AuditLog.objects.create(
            user=request.user,
            username=request.user.username,
            user_role=request.user.role,
            action='trash_config_update',
            details={
                'old_retention_days': old_retention_days,
                'new_retention_days': config.retention_days,
                'max_size_gb': float(config.max_size_gb),
                'auto_cleanup_enabled': config.auto_cleanup_enabled,
                'items_deleted_by_retention_change': deleted_count
            },
            ip_address=getattr(request, 'client_ip', None),
            success=True
        )

        return Response({
            'success': True,
            'config': TrashConfigSerializer(config).data,
            'items_deleted': deleted_count,
            'message': f'Configuración actualizada. {deleted_count} archivos eliminados por cambio de retención.' if deleted_count > 0 else 'Configuración actualizada.'
        })

    def _format_size(self, size_bytes):
        """Formatea bytes a unidades legibles"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"
