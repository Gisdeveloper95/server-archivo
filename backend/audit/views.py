"""
Views para la app audit
"""
import os
import csv
import zipfile
from datetime import datetime, timedelta
from django.db.models import Q, Count, Sum
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError

from audit.models import AuditLog, ZipAnalysis, PermissionAudit
from audit.serializers import AuditLogSerializer, ZipAnalysisSerializer, PermissionAuditSerializer
from users.models import UserPermission
from services.audit_report_service import AuditReportService


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para logs de auditoría (solo lectura)"""
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['user', 'username', 'action', 'success']
    search_fields = ['username', 'target_path', 'target_name']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        """Filtra logs según el rol del usuario y parámetros de búsqueda"""
        user = self.request.user

        # Queryset base según rol
        if user.role == 'superadmin':
            queryset = AuditLog.objects.all()
        elif user.role == 'admin':
            from users.models import User
            managed_users = User.objects.filter(created_by=user)
            queryset = AuditLog.objects.filter(
                user__in=list(managed_users) + [user]
            )
        else:
            queryset = AuditLog.objects.filter(user=user)

        # Aplicar filtros dinámicos
        username = self.request.query_params.get('username')
        action = self.request.query_params.get('action')
        success = self.request.query_params.get('success')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if username:
            queryset = queryset.filter(username__icontains=username)
        if action:
            queryset = queryset.filter(action=action)
        if success is not None:
            # Convertir string a boolean
            success_bool = success.lower() in ('true', '1', 'yes')
            queryset = queryset.filter(success=success_bool)
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)

        return queryset.order_by('-timestamp')

    def list(self, request, *args, **kwargs):
        """Override list to handle limit/offset pagination manually"""
        queryset = self.get_queryset()

        # Get pagination parameters
        limit = request.query_params.get('limit')
        offset = request.query_params.get('offset')

        # Get total count before slicing
        total_count = queryset.count()

        # Apply pagination if limit and offset are provided
        if limit is not None and offset is not None:
            try:
                limit = int(limit)
                offset = int(offset)
                queryset = queryset[offset:offset + limit]
            except (ValueError, TypeError):
                pass

        # Serialize the data
        serializer = self.get_serializer(queryset, many=True)

        # Return paginated response
        return Response({
            'count': total_count,
            'results': serializer.data
        })

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Exportar logs filtrados a CSV"""
        # Aplicar los mismos filtros que get_queryset
        queryset = self.get_queryset()

        # Crear respuesta HTTP con CSV
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="auditoria_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        # BOM para Excel con UTF-8
        response.write('\ufeff')

        writer = csv.writer(response)

        # Encabezados en español - ampliados para soportar detalles de eliminación
        writer.writerow([
            'ID',
            'Usuario',
            'Rol',
            'Acción',
            'Tipo',
            'Ruta',
            'Ruta Windows',
            'Nombre Archivo',
            'Tamaño (bytes)',
            'Extensión',
            'Dirección IP',
            'Éxito',
            'Mensaje Error',
            'Fecha y Hora',
            'ID Operación Padre',
            'Es Contenido Eliminado'
        ])

        # Base path para construir rutas Windows
        WINDOWS_BASE = r'\\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy'

        def to_windows_path(linux_path):
            """Convierte ruta Linux/relativa a formato Windows UNC"""
            if not linux_path:
                return ''
            clean_path = linux_path.replace('/', '\\').lstrip('\\')
            return f"{WINDOWS_BASE}\\{clean_path}"

        # Escribir datos
        for log in queryset:
            # Determinar si es archivo o directorio
            is_dir = log.action in ['create_folder', 'delete_folder'] or (
                log.details and log.details.get('is_directory', False)
            )
            tipo = 'Directorio' if is_dir else 'Archivo' if log.target_name else 'N/A'

            # Obtener extensión si es archivo
            extension = ''
            if log.target_name and '.' in log.target_name:
                extension = '.' + log.target_name.rsplit('.', 1)[-1].lower()

            # Fila principal del log
            writer.writerow([
                log.id,
                log.username,
                log.user_role,
                log.get_action_display() if hasattr(log, 'get_action_display') else log.action,
                tipo,
                log.target_path or '',
                to_windows_path(log.target_path),
                log.target_name or '',
                log.file_size or '',
                extension,
                log.ip_address or '',
                'Sí' if log.success else 'No',
                log.error_message or '',
                log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if log.timestamp else '',
                '',  # ID Operación Padre (vacío para operación principal)
                'No'  # Es Contenido Eliminado
            ])

            # Si es una eliminación de directorio con contenido, expandir cada archivo eliminado
            if log.action == 'delete' and log.success and log.details:
                deleted_items = log.details.get('deleted_items', [])
                if deleted_items:
                    base_path = log.target_path or ''

                    for item in deleted_items:
                        item_path = item.get('path', '')
                        # Construir ruta completa combinando base + path relativo del item
                        full_path = f"{base_path}/{item_path}" if base_path else item_path

                        item_type = 'Directorio' if item.get('is_directory', False) else 'Archivo'
                        item_ext = item.get('extension', '') or ''

                        writer.writerow([
                            '',  # ID vacío (es sub-item)
                            log.username,
                            log.user_role,
                            'Eliminado (contenido)',
                            item_type,
                            full_path,
                            to_windows_path(full_path),
                            item.get('name', ''),
                            item.get('size', '') or '',
                            item_ext,
                            log.ip_address or '',
                            'Sí',  # Si el padre tuvo éxito, los hijos también
                            '',
                            log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if log.timestamp else '',
                            log.id,  # ID de la operación padre
                            'Sí'  # Es contenido de eliminación
                        ])

        return response

    @action(detail=False, methods=['get'], url_path='export-report-package')
    def export_report_package(self, request):
        """
        Exportar paquete completo de reportes (ZIP)
        GET /api/audit/export-report-package/
        Incluye: CSV, TXT árbol, Excel, HTML timeline, README
        """
        # Aplicar los mismos filtros que get_queryset
        queryset = self.get_queryset()

        # Obtener filtros aplicados para incluir en el reporte
        filters = {
            'date_from': request.query_params.get('start_date'),
            'date_to': request.query_params.get('end_date'),
            'username': request.query_params.get('username'),
            'action': request.query_params.get('action'),
        }

        # Generar paquete de reportes
        report_service = AuditReportService(
            logs=queryset,
            report_type='general',
            filters=filters,
            generated_by=request.user.username
        )

        zip_content = report_service.generate_zip_package()

        # Crear respuesta HTTP con ZIP
        response = HttpResponse(zip_content, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="reportes_auditoria_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip"'
        response['Content-Length'] = len(zip_content)

        return response

    @action(detail=False, methods=['get'], url_path='available-filters')
    def available_filters(self, request):
        """Retorna filtros disponibles basados en los datos existentes"""
        queryset = self.get_queryset()

        # Obtener usuarios únicos
        usernames = list(queryset.values_list('username', flat=True).distinct().order_by('username'))

        # Obtener acciones únicas
        actions = list(queryset.values_list('action', flat=True).distinct())

        return Response({
            'usernames': usernames,
            'actions': actions,
            'total_logs': queryset.count(),
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas de auditoría"""
        queryset = self.get_queryset()

        stats = {
            'total_logs': queryset.count(),
            'by_action': {},
            'by_success': {
                'successful': queryset.filter(success=True).count(),
                'failed': queryset.filter(success=False).count()
            }
        }

        # Contar por tipo de acción
        for action_key, action_label in AuditLog.ACTION_CHOICES:
            stats['by_action'][action_key] = queryset.filter(action=action_key).count()

        return Response(stats)

    @action(detail=False, methods=['get'], url_path='directory-audit')
    def directory_audit(self, request):
        """
        Auditoría por directorio
        GET /api/audit/directory-audit/?path=/ruta&date_from=2025-01-01&date_to=2025-01-31&username=pepito&action=upload
        """
        # Solo administradores
        if request.user.role not in ['admin', 'superadmin']:
            raise PermissionDenied("Solo administradores pueden acceder a esta función")

        path = request.query_params.get('path', '')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        username_filter = request.query_params.get('username')
        action_filter = request.query_params.get('action')

        if not path:
            raise ValidationError({"path": "Este campo es requerido"})

        # Normalizar path - extraer la parte relativa si viene con \\repositorio\...
        path_cleaned = path.strip()

        # Si viene con \\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\
        # extraemos solo la parte después de Sub_Proy\
        if '\\repositorio\\' in path_cleaned or '\\\\repositorio\\\\' in path_cleaned:
            # Remover \\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\
            parts = path_cleaned.replace('\\\\', '\\').split('\\')
            # Buscar 'Sub_Proy' y tomar todo después
            if 'Sub_Proy' in parts:
                idx = parts.index('Sub_Proy')
                path_cleaned = '/'.join(parts[idx+1:])
            else:
                # Si no tiene Sub_Proy, intentar encontrar la parte relativa
                path_cleaned = '/'.join(parts[-5:]) if len(parts) > 5 else '/'.join(parts)

        # Normalizar slashes
        path_cleaned = path_cleaned.replace('\\', '/')

        # Buscar por coincidencia parcial en target_path (más permisivo)
        queryset = self.get_queryset().filter(
            Q(target_path__icontains=path_cleaned)
        )

        # Filtrar por rango de fechas
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)

        # Filtrar por usuario
        if username_filter:
            queryset = queryset.filter(username__icontains=username_filter)

        # Filtrar por acción
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        # Obtener usuarios con permisos actuales
        permissions = UserPermission.objects.filter(
            Q(base_path__startswith=path) | Q(base_path=path),
            is_active=True
        ).select_related('user', 'granted_by')

        # Obtener historial de permisos
        permission_history = PermissionAudit.objects.filter(
            Q(base_path__startswith=path) | Q(base_path=path)
        ).select_related('user', 'changed_by')

        # Estadísticas
        stats = {
            'total_operations': queryset.count(),
            'uploads': queryset.filter(action='upload').count(),
            'downloads': queryset.filter(action='download').count(),
            'deletes': queryset.filter(action='delete').count(),
            'renames': queryset.filter(action='rename').count(),
            'creates': queryset.filter(action='create_folder').count(),
        }

        # Top usuarios más activos
        top_users = queryset.values('username').annotate(
            total=Count('id')
        ).order_by('-total')[:10]

        return Response({
            'path': path,
            'date_range': {'from': date_from, 'to': date_to},
            'statistics': stats,
            'top_users': list(top_users),
            'recent_operations': AuditLogSerializer(queryset[:50], many=True).data,
            'current_permissions': [
                {
                    'username': p.user.username,
                    'permissions': {
                        'read': p.can_read,
                        'write': p.can_write,
                        'delete': p.can_delete,
                        'create_directories': p.can_create_directories,
                    },
                    'granted_by': p.granted_by.username if p.granted_by else None,
                    'granted_at': p.granted_at,
                } for p in permissions
            ],
            'permission_history': PermissionAuditSerializer(permission_history[:50], many=True).data,
        })

    @action(detail=False, methods=['get'], url_path='directory-audit-report-package')
    def directory_audit_report_package(self, request):
        """
        Exportar paquete completo de reportes para auditoría de directorio
        GET /api/audit/directory-audit-report-package/?path=/ruta
        """
        if request.user.role not in ['admin', 'superadmin']:
            raise PermissionDenied("Solo administradores pueden acceder a esta función")

        path = request.query_params.get('path', '')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        username_filter = request.query_params.get('username')
        action_filter = request.query_params.get('action')

        if not path:
            raise ValidationError({"path": "Este campo es requerido"})

        # Normalizar path
        path_cleaned = path.strip()
        if '\\repositorio\\' in path_cleaned or '\\\\repositorio\\\\' in path_cleaned:
            parts = path_cleaned.replace('\\\\', '\\').split('\\')
            if 'Sub_Proy' in parts:
                idx = parts.index('Sub_Proy')
                path_cleaned = '/'.join(parts[idx+1:])
            else:
                path_cleaned = '/'.join(parts[-5:]) if len(parts) > 5 else '/'.join(parts)
        path_cleaned = path_cleaned.replace('\\', '/')

        # Filtrar logs
        queryset = self.get_queryset().filter(Q(target_path__icontains=path_cleaned))

        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        if username_filter:
            queryset = queryset.filter(username__icontains=username_filter)
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        # Generar paquete
        filters = {
            'path': path,
            'date_from': date_from,
            'date_to': date_to,
            'username': username_filter,
            'action': action_filter,
        }

        report_service = AuditReportService(
            logs=queryset,
            report_type='directory',
            filters=filters,
            generated_by=request.user.username
        )

        zip_content = report_service.generate_zip_package()

        # Nombre del archivo basado en el directorio
        safe_path = path_cleaned.replace('/', '_').replace('\\', '_')[:30]
        response = HttpResponse(zip_content, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="reportes_directorio_{safe_path}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip"'
        response['Content-Length'] = len(zip_content)

        return response

    @action(detail=False, methods=['get'], url_path='directory-audit-csv')
    def directory_audit_csv(self, request):
        """Exportar auditoría de directorio a CSV"""
        if request.user.role not in ['admin', 'superadmin']:
            raise PermissionDenied("Solo administradores pueden acceder a esta función")

        path = request.query_params.get('path', '')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        username_filter = request.query_params.get('username')
        action_filter = request.query_params.get('action')

        if not path:
            raise ValidationError({"path": "Este campo es requerido"})

        # Normalizar path (igual lógica que directory_audit)
        path_cleaned = path.strip()
        if '\\repositorio\\' in path_cleaned or '\\\\repositorio\\\\' in path_cleaned:
            parts = path_cleaned.replace('\\\\', '\\').split('\\')
            if 'Sub_Proy' in parts:
                idx = parts.index('Sub_Proy')
                path_cleaned = '/'.join(parts[idx+1:])
            else:
                path_cleaned = '/'.join(parts[-5:]) if len(parts) > 5 else '/'.join(parts)
        path_cleaned = path_cleaned.replace('\\', '/')

        # Filtrar logs
        queryset = self.get_queryset().filter(Q(target_path__icontains=path_cleaned))

        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        if username_filter:
            queryset = queryset.filter(username__icontains=username_filter)
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        # Crear CSV
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="auditoria_directorio_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        response.write('\ufeff')

        writer = csv.writer(response)
        writer.writerow(['Usuario', 'Acción', 'Tipo', 'Archivo', 'Ruta', 'Tamaño (bytes)', 'Éxito', 'Fecha y Hora'])

        for log in queryset:
            # Determinar si es archivo o directorio
            tipo = 'Directorio' if log.action in ['create_folder', 'delete_folder'] or (not log.target_name and log.action not in ['login', 'logout']) else 'Archivo' if log.target_name else 'N/A'

            writer.writerow([
                log.username,
                log.get_action_display() if hasattr(log, 'get_action_display') else log.action,
                tipo,
                log.target_name or '',
                log.target_path or '',
                log.file_size or '',
                'Sí' if log.success else 'No',
                log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if log.timestamp else ''
            ])

        return response

    @action(detail=False, methods=['get'], url_path='file-tracking')
    def file_tracking(self, request):
        """
        Seguimiento de archivo específico
        GET /api/audit/file-tracking/?filename=documento.pdf&date_from=2025-01-01&username=pepito&action=upload
        """
        # Solo administradores
        if request.user.role not in ['admin', 'superadmin']:
            raise PermissionDenied("Solo administradores pueden acceder a esta función")

        filename = request.query_params.get('filename', '')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        username_filter = request.query_params.get('username')
        action_filter = request.query_params.get('action')

        if not filename:
            raise ValidationError({"filename": "Este campo es requerido"})

        # Normalizar filename - extraer solo el nombre si viene con ruta completa
        filename_cleaned = filename.strip()
        if '\\repositorio\\' in filename_cleaned or '\\\\repositorio\\\\' in filename_cleaned:
            # Extraer la parte después de Sub_Proy\
            parts = filename_cleaned.replace('\\\\', '\\').split('\\')
            if 'Sub_Proy' in parts:
                idx = parts.index('Sub_Proy')
                filename_cleaned = '/'.join(parts[idx+1:])
            else:
                filename_cleaned = '/'.join(parts[-5:]) if len(parts) > 5 else '/'.join(parts)
        filename_cleaned = filename_cleaned.replace('\\', '/')

        # Buscar por:
        # 1. Nombre actual (target_name)
        # 2. Ruta (target_path)
        # 3. Nombre antiguo en details (para renombres: details contiene 'old_name' y 'new_name')
        queryset = self.get_queryset().filter(
            Q(target_name__icontains=filename_cleaned) |
            Q(target_path__icontains=filename_cleaned) |
            Q(details__icontains=filename_cleaned)  # Buscar en detalles JSON también
        )

        # Filtrar por fechas
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)

        # Filtrar por usuario
        if username_filter:
            queryset = queryset.filter(username__icontains=username_filter)

        # Filtrar por acción
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        # Agrupar por tipo de operación
        operations_by_type = {}
        for action_key, action_label in AuditLog.ACTION_CHOICES:
            ops = queryset.filter(action=action_key)
            if ops.exists():
                operations_by_type[action_label] = AuditLogSerializer(ops, many=True).data

        # Timeline de ubicaciones
        locations = queryset.values('target_path', 'timestamp', 'action', 'username').order_by('timestamp')

        return Response({
            'filename': filename,
            'total_operations': queryset.count(),
            'operations_by_type': operations_by_type,
            'timeline': list(locations),
            'first_seen': queryset.order_by('timestamp').first().timestamp if queryset.exists() else None,
            'last_seen': queryset.order_by('-timestamp').first().timestamp if queryset.exists() else None,
        })

    @action(detail=False, methods=['get'], url_path='file-tracking-report-package')
    def file_tracking_report_package(self, request):
        """
        Exportar paquete completo de reportes para seguimiento de archivo
        GET /api/audit/file-tracking-report-package/?filename=documento.pdf
        """
        if request.user.role not in ['admin', 'superadmin']:
            raise PermissionDenied("Solo administradores pueden acceder a esta función")

        filename = request.query_params.get('filename', '')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        username_filter = request.query_params.get('username')
        action_filter = request.query_params.get('action')

        if not filename:
            raise ValidationError({"filename": "Este campo es requerido"})

        # Normalizar filename
        filename_cleaned = filename.strip()
        if '\\repositorio\\' in filename_cleaned or '\\\\repositorio\\\\' in filename_cleaned:
            parts = filename_cleaned.replace('\\\\', '\\').split('\\')
            if 'Sub_Proy' in parts:
                idx = parts.index('Sub_Proy')
                filename_cleaned = '/'.join(parts[idx+1:])
            else:
                filename_cleaned = '/'.join(parts[-5:]) if len(parts) > 5 else '/'.join(parts)
        filename_cleaned = filename_cleaned.replace('\\', '/')

        # Buscar operaciones
        queryset = self.get_queryset().filter(
            Q(target_name__icontains=filename_cleaned) |
            Q(target_path__icontains=filename_cleaned) |
            Q(details__icontains=filename_cleaned)
        )

        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        if username_filter:
            queryset = queryset.filter(username__icontains=username_filter)
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        # Generar paquete
        filters = {
            'filename': filename,
            'date_from': date_from,
            'date_to': date_to,
            'username': username_filter,
            'action': action_filter,
        }

        report_service = AuditReportService(
            logs=queryset,
            report_type='file',
            filters=filters,
            generated_by=request.user.username
        )

        zip_content = report_service.generate_zip_package()

        # Nombre del archivo
        safe_filename = filename.replace('\\', '_').replace('/', '_')[:30]
        response = HttpResponse(zip_content, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="reportes_archivo_{safe_filename}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip"'
        response['Content-Length'] = len(zip_content)

        return response

    @action(detail=False, methods=['get'], url_path='file-tracking-csv')
    def file_tracking_csv(self, request):
        """Exportar seguimiento de archivo a CSV"""
        if request.user.role not in ['admin', 'superadmin']:
            raise PermissionDenied("Solo administradores pueden acceder a esta función")

        filename = request.query_params.get('filename', '')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        username_filter = request.query_params.get('username')
        action_filter = request.query_params.get('action')

        if not filename:
            raise ValidationError({"filename": "Este campo es requerido"})

        # Normalizar filename (igual lógica que file_tracking)
        filename_cleaned = filename.strip()
        if '\\repositorio\\' in filename_cleaned or '\\\\repositorio\\\\' in filename_cleaned:
            parts = filename_cleaned.replace('\\\\', '\\').split('\\')
            if 'Sub_Proy' in parts:
                idx = parts.index('Sub_Proy')
                filename_cleaned = '/'.join(parts[idx+1:])
            else:
                filename_cleaned = '/'.join(parts[-5:]) if len(parts) > 5 else '/'.join(parts)
        filename_cleaned = filename_cleaned.replace('\\', '/')

        # Buscar operaciones (nombre actual, ruta, y detalles)
        queryset = self.get_queryset().filter(
            Q(target_name__icontains=filename_cleaned) |
            Q(target_path__icontains=filename_cleaned) |
            Q(details__icontains=filename_cleaned)
        )

        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        if username_filter:
            queryset = queryset.filter(username__icontains=username_filter)
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        # Crear CSV
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        safe_filename = filename.replace('\\', '_').replace('/', '_')[:50]
        response['Content-Disposition'] = f'attachment; filename="seguimiento_{safe_filename}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        response.write('\ufeff')

        writer = csv.writer(response)
        writer.writerow(['Usuario', 'Acción', 'Tipo', 'Ruta', 'Tamaño (bytes)', 'Éxito', 'Fecha y Hora'])

        for log in queryset.order_by('timestamp'):
            # Determinar si es archivo o directorio
            tipo = 'Directorio' if log.action in ['create_folder', 'delete_folder'] or (not log.target_name and log.action not in ['login', 'logout']) else 'Archivo' if log.target_name else 'N/A'

            writer.writerow([
                log.username,
                log.get_action_display() if hasattr(log, 'get_action_display') else log.action,
                tipo,
                log.target_path or '',
                log.file_size or '',
                'Sí' if log.success else 'No',
                log.timestamp.strftime('%Y-%m-%d %H:%M:%S') if log.timestamp else ''
            ])

        return response

    @action(detail=False, methods=['post'], url_path='analyze-zip')
    def analyze_zip(self, request):
        """
        Analizar contenido de archivo ZIP
        POST /api/audit/analyze-zip/
        Body: {"zip_path": "/ruta/archivo.zip"}
        """
        # Solo administradores
        if request.user.role not in ['admin', 'superadmin']:
            raise PermissionDenied("Solo administradores pueden acceder a esta función")

        zip_path = request.data.get('zip_path', '')

        if not zip_path:
            raise ValidationError({"zip_path": "Este campo es requerido"})

        # Verificar si ya existe análisis reciente (últimas 24 horas)
        recent_analysis = ZipAnalysis.objects.filter(
            zip_path=zip_path,
            analyzed_at__gte=timezone.now() - timedelta(hours=24)
        ).first()

        if recent_analysis:
            return Response({
                'cached': True,
                'analysis': ZipAnalysisSerializer(recent_analysis).data
            })

        # Intentar analizar el ZIP
        if not os.path.exists(zip_path):
            raise ValidationError({"zip_path": "El archivo no existe"})

        if not zipfile.is_zipfile(zip_path):
            raise ValidationError({"zip_path": "El archivo no es un ZIP válido"})

        try:
            contained_files = []
            total_size = 0

            with zipfile.ZipFile(zip_path, 'r') as zip_file:
                for info in zip_file.infolist():
                    if not info.is_dir():
                        contained_files.append({
                            'filename': info.filename,
                            'size': info.file_size,
                            'compressed_size': info.compress_size,
                            'date_time': datetime(*info.date_time).isoformat(),
                        })
                        total_size += info.file_size

            # Crear registro de análisis
            zip_size = os.path.getsize(zip_path)
            compression_ratio = (1 - (zip_size / total_size)) * 100 if total_size > 0 else 0

            analysis = ZipAnalysis.objects.create(
                zip_path=zip_path,
                zip_name=os.path.basename(zip_path),
                analyzed_by=request.user,
                contained_files=contained_files,
                total_files=len(contained_files),
                total_size=total_size,
                zip_size=zip_size,
                compression_ratio=round(compression_ratio, 2)
            )

            return Response({
                'cached': False,
                'analysis': ZipAnalysisSerializer(analysis).data
            })

        except Exception as e:
            raise ValidationError({"error": f"Error al analizar ZIP: {str(e)}"})

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """
        Dashboard de auditoría
        GET /api/audit/dashboard/?period=7d
        """
        # Solo administradores
        if request.user.role not in ['admin', 'superadmin']:
            raise PermissionDenied("Solo administradores pueden acceder a esta función")

        period = request.query_params.get('period', '7d')

        # Calcular rango de fechas
        now = timezone.now()
        if period == '24h':
            date_from = now - timedelta(hours=24)
        elif period == '7d':
            date_from = now - timedelta(days=7)
        elif period == '30d':
            date_from = now - timedelta(days=30)
        else:
            date_from = request.query_params.get('date_from')
            if date_from:
                date_from = datetime.fromisoformat(date_from)
            else:
                date_from = now - timedelta(days=7)

        queryset = self.get_queryset().filter(timestamp__gte=date_from)

        # Actividad por día
        activity_by_day = queryset.extra(
            select={'day': 'DATE(timestamp)'}
        ).values('day').annotate(
            count=Count('id')
        ).order_by('day')

        # Top usuarios
        top_users = queryset.values('username').annotate(
            total=Count('id')
        ).order_by('-total')[:10]

        # Top directorios (extraer directorio base de target_path)
        top_dirs = queryset.values('target_path').annotate(
            total=Count('id')
        ).order_by('-total')[:10]

        # Operaciones recientes
        recent_ops = queryset.order_by('-timestamp')[:20]

        return Response({
            'period': period,
            'total_operations': queryset.count(),
            'activity_by_day': list(activity_by_day),
            'top_users': list(top_users),
            'top_directories': list(top_dirs),
            'recent_operations': AuditLogSerializer(recent_ops, many=True).data,
            'statistics': {
                'uploads': queryset.filter(action='upload').count(),
                'downloads': queryset.filter(action='download').count(),
                'deletes': queryset.filter(action='delete').count(),
                'renames': queryset.filter(action='rename').count(),
                'creates': queryset.filter(action='create_folder').count(),
            }
        })


class PermissionAuditViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para auditoría de permisos (solo lectura)"""
    queryset = PermissionAudit.objects.all()
    serializer_class = PermissionAuditSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-changed_at']

    def get_queryset(self):
        """Solo administradores pueden ver auditoría de permisos"""
        if self.request.user.role not in ['admin', 'superadmin']:
            raise PermissionDenied("Solo administradores pueden acceder a esta función")
        return PermissionAudit.objects.all()
