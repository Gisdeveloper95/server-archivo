"""
Views para la app files
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse, HttpResponse, StreamingHttpResponse
from django.db.models import Q
import os
import zipfile
import tempfile
import mimetypes

from files.models import File, Stats, Directory, DirectoryColor
from files.serializers import (
    FileSerializer, StatsSerializer, BrowseSerializer,
    CreateFolderSerializer, UploadFileSerializer, RenameSerializer,
    DeleteSerializer
)
from services.smb_service import SMBService
from services.permission_service import PermissionService
from services.path_validation_service import PathValidationService
from audit.models import AuditLog


class FileViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para gestión de archivos (solo lectura en BD)"""
    queryset = File.objects.all()
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_directory', 'extension']
    search_fields = ['name', 'path']

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def browse(self, request):
        """
        Navega por el sistema de archivos en vivo (no usa BD)

        Query params:
        - path: Ruta a explorar (default: '')
        """
        serializer = BrowseSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        path = serializer.validated_data.get('path', '')
        user = request.user

        # Verificar permisos
        if not PermissionService.can_access_path(user, path, 'read'):
            return Response(
                {'error': 'No tienes permiso para acceder a esta ruta'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Listar directorio usando SMB Service
        smb = SMBService()
        result = smb.list_directory(path)

        if not result['success']:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Filtrar items según permisos del usuario
        items = PermissionService.filter_accessible_items(
            user,
            result['items'],
            path
        )

        # Enriquecer items con datos de la BD (propietario, estadísticas)
        items = self._enrich_items_with_db_data(items)

        # Generar breadcrumbs
        breadcrumbs = []
        if path:
            parts = path.split('/')
            current_path = ''
            for part in parts:
                if part:  # Ignorar strings vacíos
                    current_path = f"{current_path}/{part}" if current_path else part
                    breadcrumbs.append({
                        'name': part,
                        'path': current_path
                    })

        return Response({
            'path': path,
            'items': items,
            'total': len(items),
            'breadcrumbs': breadcrumbs
        })

    def _enrich_items_with_db_data(self, items):
        """
        Enriquece los items del filesystem con datos de la BD y auditoría
        (propietario, conteo de elementos para carpetas)
        """
        from datetime import datetime
        import os

        if not items:
            return items

        # Separar archivos y directorios
        file_items = [item for item in items if not item['is_directory']]
        dir_items = [item for item in items if item['is_directory']]

        # Buscar en BD - Archivos
        files_db = {}
        if file_items:
            file_paths = [item['path'] for item in file_items]
            for f in File.objects.filter(path__in=file_paths).select_related('uploaded_by'):
                files_db[f.path] = f

        # Buscar en BD - Directorios
        dirs_db = {}
        if dir_items:
            dir_paths = [item['path'] for item in dir_items]
            for d in Directory.objects.filter(path__in=dir_paths).select_related('created_by'):
                dirs_db[d.path] = d

        # Buscar en Auditoría - Para items sin propietario en BD
        # Carpetas: buscar create_folder donde target_path contiene la ruta
        # Archivos: buscar upload donde folder+name coinciden
        audit_owners = {}

        # Para carpetas sin owner en BD, buscar en auditoría
        dirs_without_owner = [item['path'] for item in dir_items if item['path'] not in dirs_db]
        if dirs_without_owner:
            # En create_folder: target_path = carpeta padre, target_name = nombre de la carpeta
            for dir_path in dirs_without_owner:
                parent_path = os.path.dirname(dir_path)
                folder_name = os.path.basename(dir_path)
                log = AuditLog.objects.filter(
                    target_path=parent_path,
                    target_name=folder_name,
                    action='create_folder',
                    success=True
                ).order_by('-timestamp').first()
                if log:
                    audit_owners[dir_path] = log.username

        # Para archivos sin owner en BD, buscar en auditoría
        files_without_owner = [item for item in file_items if item['path'] not in files_db]
        if files_without_owner:
            for item in files_without_owner:
                folder_path = os.path.dirname(item['path'])
                file_name = os.path.basename(item['path'])
                log = AuditLog.objects.filter(
                    target_path=folder_path,
                    target_name=file_name,
                    action='upload',
                    success=True
                ).order_by('-timestamp').first()
                if log:
                    audit_owners[item['path']] = log.username

        # Enriquecer cada item
        enriched_items = []
        for item in items:
            path = item['path']

            # Formatear tamaño
            if item['is_directory']:
                # Buscar en BD para obtener propietario y conteo
                db_dir = dirs_db.get(path)
                if db_dir and db_dir.created_by:
                    item['owner_username'] = db_dir.created_by.username
                    item['owner_name'] = f"{db_dir.created_by.first_name} {db_dir.created_by.last_name}".strip()
                    item_count = (db_dir.file_count or 0) + (db_dir.subdir_count or 0)
                    item['size_formatted'] = f'{item_count} elementos' if item_count > 0 else 'Vacío'
                    item['item_count'] = item_count
                elif path in audit_owners:
                    # Fallback a auditoría
                    item['owner_username'] = audit_owners[path]
                    item['owner_name'] = None  # Solo tenemos username en auditoría
                    # Usar item_count del SMB service si está disponible
                    smb_count = item.get('item_count')
                    if smb_count is not None:
                        item['size_formatted'] = f'{smb_count} elementos' if smb_count > 0 else 'Vacío'
                        item['item_count'] = smb_count
                    else:
                        item['size_formatted'] = '-'
                        item['item_count'] = 0
                else:
                    item['owner_username'] = None
                    item['owner_name'] = None
                    # Usar item_count del SMB service si está disponible
                    smb_count = item.get('item_count')
                    if smb_count is not None:
                        item['size_formatted'] = f'{smb_count} elementos' if smb_count > 0 else 'Vacío'
                        item['item_count'] = smb_count
                    else:
                        item['size_formatted'] = '-'
                        item['item_count'] = 0
            else:
                # Buscar en BD para obtener propietario
                db_file = files_db.get(path)
                if db_file and db_file.uploaded_by:
                    item['owner_username'] = db_file.uploaded_by.username
                    item['owner_name'] = f"{db_file.uploaded_by.first_name} {db_file.uploaded_by.last_name}".strip()
                elif path in audit_owners:
                    # Fallback a auditoría
                    item['owner_username'] = audit_owners[path]
                    item['owner_name'] = None
                else:
                    item['owner_username'] = None
                    item['owner_name'] = None

                # Formatear tamaño del archivo
                size = item.get('size', 0)
                if size < 1024:
                    item['size_formatted'] = f'{size} B'
                elif size < 1024 * 1024:
                    item['size_formatted'] = f'{size / 1024:.1f} KB'
                elif size < 1024 * 1024 * 1024:
                    item['size_formatted'] = f'{size / (1024 * 1024):.1f} MB'
                else:
                    item['size_formatted'] = f'{size / (1024 * 1024 * 1024):.2f} GB'

            # Formatear fecha de modificación (viene como timestamp)
            mod_date = item.get('modified_date')
            if mod_date:
                try:
                    if isinstance(mod_date, (int, float)):
                        dt = datetime.fromtimestamp(mod_date)
                        item['modified_date'] = dt.isoformat()
                except Exception:
                    pass

            enriched_items.append(item)

        return enriched_items

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='path_info')
    def path_info(self, request):
        """
        Obtener información de caracteres disponibles para una ruta.
        Simula la estructura de Windows para el cálculo de caracteres.

        Query params:
        - path: Ruta actual (relativa al repositorio)
        - extension: Extensión del archivo (opcional)

        Returns:
        {
            "path": str,
            "extension": str,
            "available_chars": int,  # Caracteres disponibles para el nombre
            "max_name_length": int,  # Máximo permitido para el nombre
            "path_length": int       # Longitud actual de la ruta completa
        }
        """
        path = request.query_params.get('path', '')
        extension = request.query_params.get('extension', '')

        # Ruta base de Windows simulada (como si fuera \\servidor\share\ruta)
        # Esto simula: \\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\
        WINDOWS_BASE_PATH = "\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy"
        MAX_PATH_LENGTH = 260  # Límite de Windows

        # Calcular longitud de la ruta completa
        if path:
            # Convertir separadores / a \\ para simular Windows
            windows_path = path.replace('/', '\\')
            full_path = f"{WINDOWS_BASE_PATH}\\{windows_path}"
        else:
            full_path = WINDOWS_BASE_PATH

        # Longitud actual (incluyendo el separador final para el nuevo nombre)
        current_length = len(full_path) + 1  # +1 por el \ antes del nombre

        # Si hay extensión, restarla del espacio disponible
        extension_length = len(extension) if extension else 0

        # Caracteres disponibles para el nombre (sin extensión)
        available_chars = MAX_PATH_LENGTH - current_length - extension_length

        # Máximo permitido para nombre de archivo/carpeta en Windows
        max_name_length = min(255, available_chars)  # Windows limita nombres a 255 chars

        return Response({
            'path': path,
            'extension': extension,
            'available_chars': max(0, available_chars),
            'max_name_length': max(0, max_name_length),
            'path_length': current_length,
            'full_path_preview': full_path,  # Para debug
            'base_path_length': len(WINDOWS_BASE_PATH)
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def create_folder(self, request):
        """Crea una nueva carpeta"""
        serializer = CreateFolderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        path = serializer.validated_data['path']
        name = serializer.validated_data['name']
        user = request.user

        # Verificar permisos de escritura
        if not PermissionService.can_access_path(user, path, 'write'):
            return Response(
                {'error': 'No tienes permiso de escritura en esta ruta'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validar nombre y ruta
        validation = PathValidationService.validate_full_creation(path, name, user)

        if not validation['valid']:
            # Registrar intento fallido
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='create_folder',
                target_path=path,
                target_name=name,
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=False,
                error_message='; '.join(validation['errors'])
            )

            return Response(
                {
                    'error': 'Validación fallida',
                    'errors': validation['errors'],
                    'warnings': validation.get('warnings', []),
                    'validations': validation['validations']
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear carpeta
        smb = SMBService()
        full_path = os.path.join(path, name) if path else name
        result = smb.create_directory(full_path)

        # Registrar en auditoría
        AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role,
            action='create_folder',
            target_path=path,
            target_name=name,
            details={'full_path': full_path},
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=result['success'],
            error_message=result.get('error')
        )

        if not result['success']:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'message': 'Carpeta creada exitosamente',
            'path': result['path']
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def upload(self, request):
        """Sube un archivo con nombre personalizado opcional"""
        serializer = UploadFileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        path = serializer.validated_data['path']
        file_obj = serializer.validated_data['file']
        # Usar nombre personalizado si se envía, sino el nombre original
        custom_filename = serializer.validated_data.get('filename', '').strip()
        final_filename = custom_filename if custom_filename else file_obj.name
        user = request.user

        # Verificar permisos
        if not PermissionService.can_access_path(user, path, 'write'):
            return Response(
                {'error': 'No tienes permiso de escritura en esta ruta'},
                status=status.HTTP_403_FORBIDDEN
            )

        # =====================================================
        # VALIDACIÓN SIMPLIFICADA - Consistente con validate_batch
        # Solo bloquea por errores críticos de seguridad y formato
        # Las reglas IGAC son validadas en el frontend con validate_batch
        # =====================================================
        errors = []

        # 1. Seguridad: extensiones peligrosas
        dangerous_validation = PathValidationService.validate_dangerous_extension(final_filename)
        if not dangerous_validation['valid']:
            errors.append(dangerous_validation['error'])

        # 2. Caracteres inválidos para Windows
        char_validation = PathValidationService.validate_name_chars(final_filename)
        if not char_validation['valid']:
            errors.append(char_validation['error'])

        # 3. Mayúsculas (excepto superadmin)
        uppercase_validation = PathValidationService.validate_uppercase(final_filename, user)
        if not uppercase_validation['valid']:
            errors.append(uppercase_validation['error'])

        # 4. Archivos .gdb deben estar comprimidos
        gdb_validation = PathValidationService.validate_gdb_extension(final_filename)
        if not gdb_validation['valid']:
            errors.append(gdb_validation['error'])

        # 5. Longitud de ruta
        full_path_for_length = PathValidationService.build_full_path(path, final_filename)
        length_validation = PathValidationService.validate_path_length(full_path_for_length, user)
        if not length_validation['valid']:
            errors.append(length_validation['error'])

        if errors:
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='upload',
                target_path=path,
                target_name=final_filename,
                file_size=file_obj.size,
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=False,
                error_message='; '.join(errors),
                details={'original_name': file_obj.name, 'custom_name': custom_filename}
            )

            return Response(
                {
                    'error': 'Validación fallida',
                    'errors': errors,
                    'validations': {
                        'dangerous_extension': dangerous_validation,
                        'characters': char_validation,
                        'uppercase': uppercase_validation,
                        'gdb': gdb_validation,
                        'length': length_validation
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Subir archivo con el nombre final
        smb = SMBService()
        full_path = os.path.join(path, final_filename) if path else final_filename
        result = smb.upload_file(full_path, file_obj)

        # Registrar auditoría
        AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role,
            action='upload',
            target_path=path,
            target_name=final_filename,
            file_size=file_obj.size,
            details={
                'full_path': full_path,
                'original_name': file_obj.name,
                'renamed': custom_filename != '' and custom_filename != file_obj.name
            },
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=result['success'],
            error_message=result.get('error')
        )

        if not result['success']:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'message': 'Archivo subido exitosamente',
            'path': result['path'],
            'size': result['size'],
            'filename': final_filename
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='upload-batch')
    def upload_batch(self, request):
        """
        Subida masiva de archivos/carpetas con auditoría consolidada.
        OPTIMIZADO: Usa paralelismo para operaciones SMB.

        Características:
        - Un único registro de auditoría padre con JSON de detalles
        - Soporte para estrategias de conflicto: skip, replace, keep_both
        - Preserva estructura de carpetas anidadas
        - Reporta progreso de cada item individual
        - OPTIMIZACIÓN: Paralelismo con ThreadPoolExecutor
        - OPTIMIZACIÓN: Cache de directorios existentes

        Request (multipart/form-data):
        - destination_path: Ruta destino
        - conflict_strategy: 'skip' | 'replace' | 'keep_both'
        - items: JSON array con metadata de cada item
        - file_0, file_1, ...: Archivos binarios indexados

        Response:
        - summary: Resumen de la operación
        - results: Detalle de cada item procesado
        - audit_id: ID del registro de auditoría creado
        """
        import json
        from datetime import datetime
        from concurrent.futures import ThreadPoolExecutor, as_completed
        import threading

        user = request.user

        # Parsear parámetros
        destination_path = request.data.get('destination_path', '')
        conflict_strategy = request.data.get('conflict_strategy', 'skip')
        items_json = request.data.get('items', '[]')

        try:
            items = json.loads(items_json) if isinstance(items_json, str) else items_json
        except json.JSONDecodeError:
            return Response(
                {'error': 'items debe ser un JSON válido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not items:
            return Response(
                {'error': 'No hay items para subir'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar permisos de escritura en destino
        if not PermissionService.can_access_path(user, destination_path, 'write'):
            return Response(
                {'error': 'No tienes permiso de escritura en esta ruta'},
                status=status.HTTP_403_FORBIDDEN
            )

        start_time = datetime.now()

        # Estadísticas thread-safe
        stats_lock = threading.Lock()
        stats = {
            'total': len(items),
            'uploaded': 0,
            'created_dirs': 0,
            'skipped': 0,
            'replaced': 0,
            'renamed': 0,
            'failed': 0,
            'total_size': 0
        }

        # Cache de directorios existentes/creados (thread-safe)
        dirs_cache_lock = threading.Lock()
        existing_dirs_cache = set()  # Directorios que ya existen o fueron creados

        # Recopilar archivos subidos
        files_map = {}
        for key in request.FILES:
            if key.startswith('file_'):
                idx = key.replace('file_', '')
                files_map[idx] = request.FILES[key]

        # Separar directorios de archivos
        directories = []
        files = []

        for idx, item in enumerate(items):
            item['_original_idx'] = idx
            if item.get('is_directory', False):
                directories.append(item)
            else:
                files.append(item)

        # Ordenar directorios por profundidad (padres primero)
        directories.sort(key=lambda x: (x.get('relative_path', '') or '').count('/'))

        results = [None] * len(items)  # Pre-alocar para mantener orden

        # FASE 1: Crear directorios (secuencial por dependencias, pero con cache)
        # Los directorios deben crearse en orden de profundidad
        smb_dirs = SMBService()
        for item in directories:
            original_idx = item['_original_idx']
            original_name = item.get('original_name', '')
            target_name = item.get('target_name', original_name)
            relative_path = item.get('relative_path', '')

            if relative_path:
                full_path = os.path.join(destination_path, relative_path, target_name)
            else:
                full_path = os.path.join(destination_path, target_name)

            # Normalizar path para cache
            norm_path = full_path.replace('\\', '/').lower()

            item_result = {
                'index': original_idx,
                'original_name': original_name,
                'target_name': target_name,
                'path': full_path,
                'is_directory': True,
                'status': 'pending',
                'error': None,
                'action_taken': None
            }

            try:
                # Verificar cache primero
                if norm_path in existing_dirs_cache:
                    item_result['status'] = 'uploaded'
                    item_result['action_taken'] = 'cached_exists'
                    with stats_lock:
                        stats['created_dirs'] += 1
                else:
                    # Intentar crear (si ya existe, no es error)
                    result = smb_dirs.create_directory(full_path)
                    if result['success']:
                        item_result['status'] = 'uploaded'
                        item_result['action_taken'] = 'created'
                        with stats_lock:
                            stats['created_dirs'] += 1
                        existing_dirs_cache.add(norm_path)
                    elif 'ya existe' in result.get('error', '').lower() or 'already exists' in result.get('error', '').lower():
                        item_result['status'] = 'uploaded'
                        item_result['action_taken'] = 'exists'
                        with stats_lock:
                            stats['created_dirs'] += 1
                        existing_dirs_cache.add(norm_path)
                    else:
                        item_result['status'] = 'failed'
                        item_result['error'] = result.get('error', 'Error creando directorio')
                        with stats_lock:
                            stats['failed'] += 1

            except Exception as e:
                item_result['status'] = 'failed'
                item_result['error'] = str(e)
                with stats_lock:
                    stats['failed'] += 1

            results[original_idx] = item_result

        # FASE 2: Subir archivos EN PARALELO
        def upload_single_file(item):
            """Función para subir un archivo individual (ejecutada en thread)"""
            # Cada thread necesita su propia instancia de SMBService
            smb = SMBService()

            original_idx = item['_original_idx']
            original_name = item.get('original_name', '')
            target_name = item.get('target_name', original_name)
            relative_path = item.get('relative_path', '')
            size = item.get('size', 0)

            if relative_path:
                full_path = os.path.join(destination_path, relative_path, target_name)
                parent_path = os.path.join(destination_path, relative_path)
            else:
                full_path = os.path.join(destination_path, target_name)
                parent_path = destination_path

            item_result = {
                'index': original_idx,
                'original_name': original_name,
                'target_name': target_name,
                'path': full_path,
                'is_directory': False,
                'status': 'pending',
                'error': None,
                'action_taken': None,
                'size': size
            }

            try:
                # Verificar si ya existe
                exists_info = smb.get_file_info(full_path)
                item_exists = exists_info.get('success', False)

                if item_exists:
                    if conflict_strategy == 'skip':
                        item_result['status'] = 'skipped'
                        item_result['action_taken'] = 'skipped_existing'
                        return item_result, 'skipped', 0

                    elif conflict_strategy == 'replace':
                        if exists_info.get('is_directory'):
                            smb.delete_directory(full_path)
                        else:
                            smb.delete_file(full_path)
                        item_result['action_taken'] = 'replaced'

                    elif conflict_strategy == 'keep_both':
                        base, ext = os.path.splitext(target_name)
                        counter = 1
                        new_name = f"{base}_{counter}{ext}"
                        new_path = os.path.join(parent_path, new_name)

                        while smb.get_file_info(new_path).get('success', False):
                            counter += 1
                            new_name = f"{base}_{counter}{ext}"
                            new_path = os.path.join(parent_path, new_name)

                        target_name = new_name
                        full_path = new_path
                        item_result['target_name'] = new_name
                        item_result['path'] = new_path
                        item_result['action_taken'] = 'renamed'

                # Obtener archivo
                file_index = item.get('file_index')
                if file_index is not None:
                    file_obj = files_map.get(str(file_index))
                else:
                    file_obj = files_map.get(str(original_idx))

                if not file_obj:
                    item_result['status'] = 'failed'
                    item_result['error'] = f'Archivo no encontrado (file_index={file_index})'
                    return item_result, 'failed', 0

                # Subir archivo
                result = smb.upload_file(full_path, file_obj)
                if result['success']:
                    item_result['status'] = 'uploaded'
                    if not item_result['action_taken']:
                        item_result['action_taken'] = 'uploaded'

                    # Determinar tipo de stat
                    if item_result['action_taken'] == 'replaced':
                        return item_result, 'replaced', size
                    elif item_result['action_taken'] == 'renamed':
                        return item_result, 'renamed', size
                    else:
                        return item_result, 'uploaded', size
                else:
                    item_result['status'] = 'failed'
                    item_result['error'] = result.get('error', 'Error subiendo archivo')
                    return item_result, 'failed', 0

            except Exception as e:
                item_result['status'] = 'failed'
                item_result['error'] = str(e)
                return item_result, 'failed', 0

        # Ejecutar uploads en paralelo
        # Usar min(8, num_files) workers para no sobrecargar
        max_workers = min(8, len(files)) if files else 1

        if files:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Enviar todos los archivos al pool
                future_to_item = {
                    executor.submit(upload_single_file, item): item
                    for item in files
                }

                # Procesar resultados conforme terminan
                for future in as_completed(future_to_item):
                    item = future_to_item[future]
                    original_idx = item['_original_idx']

                    try:
                        item_result, stat_type, size = future.result()
                        results[original_idx] = item_result

                        # Actualizar estadísticas (thread-safe)
                        with stats_lock:
                            if stat_type == 'uploaded':
                                stats['uploaded'] += 1
                                stats['total_size'] += size
                            elif stat_type == 'replaced':
                                stats['replaced'] += 1
                                stats['total_size'] += size
                            elif stat_type == 'renamed':
                                stats['renamed'] += 1
                                stats['total_size'] += size
                            elif stat_type == 'skipped':
                                stats['skipped'] += 1
                            elif stat_type == 'failed':
                                stats['failed'] += 1

                    except Exception as e:
                        # Error inesperado en el future
                        results[original_idx] = {
                            'index': original_idx,
                            'original_name': item.get('original_name', ''),
                            'target_name': item.get('target_name', ''),
                            'path': '',
                            'is_directory': False,
                            'status': 'failed',
                            'error': f'Error interno: {str(e)}',
                            'action_taken': None
                        }
                        with stats_lock:
                            stats['failed'] += 1

        # Calcular tiempo de ejecución
        end_time = datetime.now()
        duration_seconds = (end_time - start_time).total_seconds()

        # Formatear tamaño total
        def format_size(size_bytes):
            if size_bytes < 1024:
                return f"{size_bytes} B"
            elif size_bytes < 1024 * 1024:
                return f"{size_bytes / 1024:.1f} KB"
            elif size_bytes < 1024 * 1024 * 1024:
                return f"{size_bytes / (1024 * 1024):.1f} MB"
            else:
                return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

        # Crear registro de auditoría consolidado (patrón similar a delete de directorios)
        audit_details = {
            'operation': 'upload_batch',
            'destination_path': destination_path,
            'conflict_strategy': conflict_strategy,
            'duration_seconds': duration_seconds,
            'stats': stats,
            'total_size_formatted': format_size(stats['total_size']),
            'uploaded_items': [
                {
                    'name': r['target_name'],
                    'original_name': r['original_name'],
                    'path': r['path'],
                    'is_directory': r['is_directory'],
                    'status': r['status'],
                    'action_taken': r['action_taken'],
                    'error': r['error']
                }
                for r in results
            ]
        }

        overall_success = stats['failed'] == 0

        audit_log = AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role,
            action='upload_batch',
            target_path=destination_path,
            target_name=f"Subida masiva ({stats['total']} items)",
            file_size=stats['total_size'],
            details=audit_details,
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=overall_success,
            error_message=f"{stats['failed']} items fallaron" if stats['failed'] > 0 else None
        )

        return Response({
            'message': 'Subida masiva completada',
            'audit_id': audit_log.id,
            'summary': {
                **stats,
                'total_size_formatted': format_size(stats['total_size']),
                'duration_seconds': round(duration_seconds, 2),
                'success': overall_success
            },
            'results': sorted(results, key=lambda x: x['index'])
        })

    @action(detail=False, methods=['get'], permission_classes=[])
    def download(self, request):
        """Descarga un archivo o carpeta (como ZIP con streaming)"""
        from rest_framework_simplejwt.tokens import AccessToken
        from users.models import User

        path = request.query_params.get('path')

        if not path:
            return Response(
                {'error': 'path requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Autenticación: primero intentar header, luego query param
        user = request.user if request.user.is_authenticated else None

        if not user:
            # Intentar autenticar con token en query param (para descargas directas)
            token_str = request.query_params.get('token')
            if token_str:
                try:
                    token = AccessToken(token_str)
                    user_id = token.get('user_id')
                    user = User.objects.get(id=user_id)
                except Exception:
                    return Response(
                        {'error': 'Token inválido o expirado'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
            else:
                return Response(
                    {'error': 'Autenticación requerida'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # Verificar permisos
        if not PermissionService.can_access_path(user, path, 'read'):
            return Response(
                {'error': 'No tienes permiso para descargar desde esta ruta'},
                status=status.HTTP_403_FORBIDDEN
            )

        smb = SMBService()
        full_path = smb.build_full_path(path)

        if not os.path.exists(full_path):
            return Response(
                {'error': 'Archivo o directorio no existe'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Si es archivo, descarga directa con FileResponse (más eficiente)
        if os.path.isfile(full_path):
            file_size = os.path.getsize(full_path)

            # Registrar descarga
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='download',
                target_path=path,
                target_name=os.path.basename(path),
                file_size=file_size,
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=True
            )

            # FileResponse es más eficiente que StreamingHttpResponse para archivos
            # Django usa sendfile() del kernel cuando está disponible
            response = FileResponse(
                open(full_path, 'rb'),
                content_type='application/octet-stream'
            )
            response['Content-Disposition'] = f'attachment; filename="{os.path.basename(path)}"'
            response['Content-Length'] = file_size
            return response

        # Si es directorio, crear ZIP con STREAMING (sin comprimir para velocidad)
        else:
            zip_filename = f"{os.path.basename(path)}.zip"

            # Calcular tamaño total para auditoría
            total_size = 0
            file_count = 0
            for root, dirs, files in os.walk(full_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        total_size += os.path.getsize(file_path)
                        file_count += 1
                    except:
                        pass

            # Registrar descarga ANTES de iniciar (el streaming no permite después)
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='download',
                target_path=path,
                target_name=os.path.basename(path),
                file_size=total_size,
                details={
                    'type': 'directory_as_zip',
                    'file_count': file_count,
                    'original_size': total_size,
                    'streaming': True
                },
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=True
            )

            # Generador de streaming ZIP (sin compresión para máxima velocidad)
            def zip_stream_generator():
                """Genera ZIP en streaming usando ZIP_STORED (sin compresión)"""
                import struct
                import time

                # Para cada archivo, enviamos: local header + data + (al final) central directory
                central_directory = []
                offset = 0

                for root, dirs, files in os.walk(full_path):
                    for filename in files:
                        file_path = os.path.join(root, filename)
                        arcname = os.path.relpath(file_path, full_path)

                        try:
                            file_stat = os.stat(file_path)
                            file_size = file_stat.st_size
                            mod_time = time.localtime(file_stat.st_mtime)
                        except:
                            continue

                        # DOS time/date format
                        dos_time = (mod_time.tm_hour << 11) | (mod_time.tm_min << 5) | (mod_time.tm_sec // 2)
                        dos_date = ((mod_time.tm_year - 1980) << 9) | (mod_time.tm_mon << 5) | mod_time.tm_mday

                        # Calcular CRC32 mientras leemos
                        import zlib
                        crc = 0

                        # Local file header
                        arcname_bytes = arcname.encode('utf-8')
                        local_header = struct.pack(
                            '<4sHHHHHIIIHH',
                            b'PK\x03\x04',  # signature
                            20,             # version needed (2.0)
                            0x0808,         # flags: UTF-8 + data descriptor
                            0,              # compression (STORED)
                            dos_time,
                            dos_date,
                            0,              # CRC (in data descriptor)
                            0,              # compressed size (in data descriptor)
                            0,              # uncompressed size (in data descriptor)
                            len(arcname_bytes),
                            0               # extra field length
                        )

                        yield local_header + arcname_bytes
                        header_size = len(local_header) + len(arcname_bytes)

                        # Stream file content
                        bytes_written = 0
                        try:
                            with open(file_path, 'rb') as f:
                                while True:
                                    chunk = f.read(65536)  # 64KB chunks
                                    if not chunk:
                                        break
                                    crc = zlib.crc32(chunk, crc) & 0xffffffff
                                    bytes_written += len(chunk)
                                    yield chunk
                        except Exception as e:
                            print(f"Error reading {file_path}: {e}")
                            continue

                        # Data descriptor (después del contenido)
                        data_descriptor = struct.pack(
                            '<4sIII',
                            b'PK\x07\x08',  # signature
                            crc,
                            bytes_written,  # compressed size
                            bytes_written   # uncompressed size
                        )
                        yield data_descriptor

                        # Guardar info para central directory
                        central_directory.append({
                            'arcname': arcname_bytes,
                            'dos_time': dos_time,
                            'dos_date': dos_date,
                            'crc': crc,
                            'size': bytes_written,
                            'offset': offset
                        })

                        offset += header_size + bytes_written + len(data_descriptor)

                # Central directory
                cd_offset = offset
                cd_size = 0

                for entry in central_directory:
                    cd_header = struct.pack(
                        '<4sHHHHHHIIIHHHHHII',
                        b'PK\x01\x02',      # signature
                        20,                 # version made by
                        20,                 # version needed
                        0x0808,             # flags
                        0,                  # compression
                        entry['dos_time'],
                        entry['dos_date'],
                        entry['crc'],
                        entry['size'],      # compressed
                        entry['size'],      # uncompressed
                        len(entry['arcname']),
                        0,                  # extra length
                        0,                  # comment length
                        0,                  # disk number
                        0,                  # internal attr
                        0,                  # external attr
                        entry['offset']
                    )
                    yield cd_header + entry['arcname']
                    cd_size += len(cd_header) + len(entry['arcname'])

                # End of central directory
                eocd = struct.pack(
                    '<4sHHHHIIH',
                    b'PK\x05\x06',  # signature
                    0,              # disk number
                    0,              # disk with cd
                    len(central_directory),  # entries on disk
                    len(central_directory),  # total entries
                    cd_size,        # cd size
                    cd_offset,      # cd offset
                    0               # comment length
                )
                yield eocd

            response = StreamingHttpResponse(
                zip_stream_generator(),
                content_type='application/zip'
            )
            response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
            # No ponemos Content-Length porque es streaming
            return response

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def view(self, request):
        """Visualiza un archivo en el navegador (PDFs, imágenes, etc.)"""
        path = request.query_params.get('path')

        if not path:
            return Response(
                {'error': 'path requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        # Verificar permisos
        if not PermissionService.can_access_path(user, path, 'read'):
            return Response(
                {'error': 'No tienes permiso para visualizar este archivo'},
                status=status.HTTP_403_FORBIDDEN
            )

        smb = SMBService()
        full_path = smb.build_full_path(path)

        if not os.path.exists(full_path):
            return Response(
                {'error': 'Archivo no existe'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not os.path.isfile(full_path):
            return Response(
                {'error': 'Solo se pueden visualizar archivos, no directorios'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener tipo MIME
        content_type, _ = mimetypes.guess_type(full_path)
        if not content_type:
            content_type = 'application/octet-stream'

        # Lista de tipos MIME que se pueden visualizar en el navegador
        viewable_types = [
            'application/pdf',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'text/plain', 'text/html', 'text/css', 'text/javascript',
            'application/json', 'application/xml',
            'video/mp4', 'video/webm',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
        ]

        file_size = os.path.getsize(full_path)
        filename = os.path.basename(path)

        # Registrar visualización
        AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role,
            action='view',
            target_path=path,
            target_name=filename,
            file_size=file_size,
            details={'content_type': content_type},
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=True
        )

        # Abrir archivo y crear respuesta
        response = FileResponse(open(full_path, 'rb'), content_type=content_type)

        # Usar 'inline' para que el navegador muestre el archivo, no lo descargue
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        response['Content-Length'] = file_size

        # Headers de cache para mejor rendimiento
        response['Cache-Control'] = 'private, max-age=3600'

        return response

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def file_details(self, request):
        """Obtiene información detallada de un archivo incluyendo metadata y auditoría"""
        path = request.query_params.get('path')

        if not path:
            return Response(
                {'error': 'path requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        # Verificar permisos
        if not PermissionService.can_access_path(user, path, 'read'):
            return Response(
                {'error': 'No tienes permiso para ver este archivo'},
                status=status.HTTP_403_FORBIDDEN
            )

        smb = SMBService()
        full_path = smb.build_full_path(path)

        if not os.path.exists(full_path):
            return Response(
                {'error': 'Archivo no existe'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not os.path.isfile(full_path):
            return Response(
                {'error': 'Esta acción solo aplica para archivos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Información básica del sistema de archivos
        stat_info = os.stat(full_path)
        filename = os.path.basename(path)
        extension = os.path.splitext(filename)[1].lower().lstrip('.')
        content_type, _ = mimetypes.guess_type(full_path)

        # Construir ruta tipo Windows (usando la ruta completa del share)
        path_windows = path.replace('/', '\\')
        windows_path = f"\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\{path_windows}"

        # Buscar información de auditoría (quién subió el archivo)
        upload_info = None
        try:
            # En upload: target_path = carpeta, target_name = nombre archivo
            folder_path = os.path.dirname(path)
            file_name = os.path.basename(path)

            # Buscar primero con target_path=carpeta y target_name=archivo (formato actual)
            upload_log = AuditLog.objects.filter(
                target_path=folder_path,
                target_name=file_name,
                action='upload',
                success=True
            ).order_by('-timestamp').first()

            # Si no encuentra, buscar con path completo (formato antiguo o inconsistente)
            if not upload_log:
                upload_log = AuditLog.objects.filter(
                    target_path=path,
                    action='upload',
                    success=True
                ).order_by('-timestamp').first()

            if upload_log:
                upload_info = {
                    'uploaded_by': upload_log.username,
                    'uploaded_at': upload_log.timestamp.isoformat(),
                    'ip_address': upload_log.ip_address,
                }
        except Exception:
            pass

        # Buscar en el modelo File si existe
        file_record = None
        try:
            file_record = File.objects.filter(path=path).first()
            if file_record and file_record.uploaded_by:
                upload_info = upload_info or {}
                upload_info['uploaded_by'] = file_record.uploaded_by.username
                upload_info['uploaded_by_full_name'] = f"{file_record.uploaded_by.first_name} {file_record.uploaded_by.last_name}"
        except Exception:
            pass

        # Historial de accesos recientes
        access_history = []
        try:
            recent_logs = AuditLog.objects.filter(
                target_path=path,
                action__in=['download', 'view'],
                success=True
            ).order_by('-created_at')[:10]

            for log in recent_logs:
                access_history.append({
                    'action': 'Descarga' if log.action == 'download' else 'Visualización',
                    'user': log.username,
                    'date': log.created_at.isoformat(),
                    'ip': log.ip_address,
                })
        except Exception:
            pass

        # Estadísticas de acceso
        stats = {
            'total_downloads': 0,
            'total_views': 0,
        }
        try:
            stats['total_downloads'] = AuditLog.objects.filter(
                target_path=path,
                action='download',
                success=True
            ).count()
            stats['total_views'] = AuditLog.objects.filter(
                target_path=path,
                action='view',
                success=True
            ).count()
        except Exception:
            pass

        return Response({
            'success': True,
            'file': {
                'name': filename,
                'path': path,
                'windows_path': windows_path,
                'extension': extension,
                'mime_type': content_type or 'application/octet-stream',
                'size': stat_info.st_size,
                'size_formatted': self._format_size(stat_info.st_size),
                'created_at': stat_info.st_ctime,
                'modified_at': stat_info.st_mtime,
                'accessed_at': stat_info.st_atime,
            },
            'upload_info': upload_info,
            'access_history': access_history,
            'stats': stats,
        })

    def _format_size(self, size):
        """Formatea el tamaño en bytes a formato legible"""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024:
                return f"{size:.2f} {unit}"
            size /= 1024
        return f"{size:.2f} PB"

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='folder-details')
    def folder_details(self, request):
        """
        Obtiene información detallada de un directorio incluyendo:
        - Propietario (quién lo creó)
        - Fechas de creación y modificación
        - Número de archivos y subdirectorios
        - Tamaño total (si no es muy grande)
        - Historial de actividad reciente
        """
        path = request.query_params.get('path')

        if not path:
            return Response(
                {'error': 'path requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        # Verificar permisos
        if not PermissionService.can_access_path(user, path, 'read'):
            return Response(
                {'error': 'No tienes permiso para ver esta carpeta'},
                status=status.HTTP_403_FORBIDDEN
            )

        smb = SMBService()
        full_path = smb.build_full_path(path)

        if not os.path.exists(full_path):
            return Response(
                {'error': 'Directorio no existe'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not os.path.isdir(full_path):
            return Response(
                {'error': 'Esta acción solo aplica para directorios'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Información básica del sistema de archivos
        stat_info = os.stat(full_path)
        folder_name = os.path.basename(path) or path

        # Construir ruta tipo Windows (usando la ruta completa del share)
        path_windows = path.replace('/', '\\')
        windows_path = f"\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\{path_windows}"

        # Contar archivos y subdirectorios (solo nivel actual)
        total_files = 0
        total_subdirs = 0
        total_size = 0
        try:
            for entry in os.scandir(full_path):
                if entry.is_file(follow_symlinks=False):
                    total_files += 1
                    try:
                        total_size += entry.stat(follow_symlinks=False).st_size
                    except Exception:
                        pass
                elif entry.is_dir(follow_symlinks=False):
                    total_subdirs += 1
        except PermissionError:
            pass

        # Buscar información de auditoría (quién creó el directorio)
        creator_info = None
        try:
            # En create_folder: target_path = carpeta padre, target_name = nombre de la carpeta creada
            # Ejemplo: crear "prue_enero2" en "05_grup_trab/.../andres_osorio_5"
            #   target_path = "05_grup_trab/.../andres_osorio_5"
            #   target_name = "prue_enero2"
            parent_path = os.path.dirname(path)

            create_log = AuditLog.objects.filter(
                target_path=parent_path,
                target_name=folder_name,
                action='create_folder',
                success=True
            ).order_by('-timestamp').first()

            if create_log:
                creator_info = {
                    'created_by': create_log.username,
                    'created_at': create_log.timestamp.isoformat(),
                    'ip_address': create_log.ip_address,
                }
        except Exception:
            pass

        # Buscar en el modelo Directory si existe
        dir_record = None
        try:
            dir_record = Directory.objects.filter(
                Q(path=path) | Q(path__endswith=f'/{folder_name}')
            ).first()
            if dir_record and dir_record.created_by:
                creator_info = creator_info or {}
                creator_info['created_by'] = dir_record.created_by.username
                creator_info['created_by_full_name'] = f"{dir_record.created_by.first_name} {dir_record.created_by.last_name}"
        except Exception:
            pass

        # Historial de actividad reciente en este directorio
        activity_history = []
        try:
            recent_logs = AuditLog.objects.filter(
                Q(target_path=path) | Q(target_path__startswith=f'{path}/'),
                success=True
            ).exclude(action='browse').order_by('-timestamp')[:15]

            action_labels = {
                'upload': 'Archivo subido',
                'create_folder': 'Carpeta creada',
                'delete': 'Eliminado',
                'rename': 'Renombrado',
                'download': 'Descargado',
                'copy': 'Copiado',
                'move': 'Movido',
            }

            for log in recent_logs:
                activity_history.append({
                    'action': action_labels.get(log.action, log.action),
                    'user': log.username,
                    'date': log.timestamp.isoformat(),
                    'target': log.target_name or os.path.basename(log.target_path),
                    'ip': log.ip_address,
                })
        except Exception:
            pass

        # Estadísticas de actividad
        stats = {
            'total_uploads': 0,
            'total_downloads': 0,
            'total_deletions': 0,
        }
        try:
            stats['total_uploads'] = AuditLog.objects.filter(
                Q(target_path=path) | Q(target_path__startswith=f'{path}/'),
                action='upload',
                success=True
            ).count()
            stats['total_downloads'] = AuditLog.objects.filter(
                Q(target_path=path) | Q(target_path__startswith=f'{path}/'),
                action='download',
                success=True
            ).count()
            stats['total_deletions'] = AuditLog.objects.filter(
                Q(target_path=path) | Q(target_path__startswith=f'{path}/'),
                action='delete',
                success=True
            ).count()
        except Exception:
            pass

        return Response({
            'success': True,
            'folder': {
                'name': folder_name,
                'path': path,
                'windows_path': windows_path,
                'total_files': total_files,
                'total_subdirs': total_subdirs,
                'total_size': total_size,
                'total_size_formatted': self._format_size(total_size),
                'created_at': stat_info.st_ctime,
                'modified_at': stat_info.st_mtime,
                'accessed_at': stat_info.st_atime,
            },
            'creator_info': creator_info,
            'activity_history': activity_history,
            'stats': stats,
            # Datos simplificados para compatibilidad con frontend existente
            'owner': creator_info['created_by'] if creator_info else 'Desconocido',
            'created_date': stat_info.st_ctime,
            'modified_date': stat_info.st_mtime,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='preview-delete')
    def preview_delete(self, request):
        """
        Escanea un directorio y retorna lista detallada de lo que se eliminará.
        Agrupa formatos geoespaciales (GDB, Shapefile) para no inflar el reporte.

        Body:
        - path: Ruta del directorio a escanear

        Returns:
        - summary: Resumen con items agrupados (para mostrar al usuario)
        - can_delete: Si el usuario tiene permisos para eliminar
        """
        from services.directory_scanner_service import DirectoryScannerService

        path = request.data.get('path', '')
        user = request.user

        if not path:
            return Response(
                {'error': 'Se requiere la ruta'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar permisos
        if not PermissionService.can_access_path(user, path, 'delete'):
            return Response(
                {'error': 'No tienes permiso para eliminar en esta ruta'},
                status=status.HTTP_403_FORBIDDEN
            )

        smb = SMBService()
        info = smb.get_file_info(path)

        if not info['success']:
            return Response(
                {'error': info['error']},
                status=status.HTTP_404_NOT_FOUND
            )

        # Obtener configuración de papelera para determinar si irá a papelera o se eliminará permanentemente
        from trash.models import TrashConfig
        from django.conf import settings

        trash_enabled = getattr(settings, 'TRASH_ENABLED', True)
        trash_config = None
        max_item_size_bytes = 5 * 1024 * 1024 * 1024  # Default 5GB

        if trash_enabled:
            try:
                trash_config = TrashConfig.objects.first()
                if trash_config:
                    max_item_size_bytes = trash_config.max_item_size_bytes
            except Exception:
                pass

        # Si es un archivo, retornar info simple
        if not info['is_directory']:
            file_size = info.get('size', 0)
            will_go_to_trash = trash_enabled and file_size <= max_item_size_bytes

            return Response({
                'is_directory': False,
                'item': {
                    'name': info['name'],
                    'path': path,
                    'size': file_size,
                    'size_formatted': self._format_size(file_size) if file_size else '-',
                },
                'summary': {
                    'total_items_display': 1,
                    'total_files_display': 1,
                    'total_directories_display': 0,
                    'total_size_formatted': self._format_size(file_size) if file_size else '-',
                    'total_size_bytes': file_size,
                },
                'can_delete': True,
                'trash_info': {
                    'enabled': trash_enabled,
                    'will_go_to_trash': will_go_to_trash,
                    'max_item_size_bytes': max_item_size_bytes,
                    'max_item_size_formatted': self._format_size(max_item_size_bytes),
                    'reason': None if will_go_to_trash else f'El archivo excede el límite de {self._format_size(max_item_size_bytes)} para papelera'
                }
            })

        # Es un directorio - escanear contenido
        scanner = DirectoryScannerService()

        try:
            result = scanner.scan_directory(path)

            if result.errors:
                return Response(
                    {'error': '; '.join(result.errors)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            summary = scanner.generate_summary(result)

            # Calcular si irá a papelera basado en tamaño total
            total_size_bytes = summary.get('total_size_bytes', 0)
            will_go_to_trash = trash_enabled and total_size_bytes <= max_item_size_bytes

            return Response({
                'is_directory': True,
                'directory_name': info['name'],
                'directory_path': path,
                'summary': summary,
                'can_delete': True,
                'scan_time_seconds': result.scan_time_seconds,
                'trash_info': {
                    'enabled': trash_enabled,
                    'will_go_to_trash': will_go_to_trash,
                    'max_item_size_bytes': max_item_size_bytes,
                    'max_item_size_formatted': self._format_size(max_item_size_bytes),
                    'total_size_bytes': total_size_bytes,
                    'total_size_formatted': summary.get('total_size_formatted', '-'),
                    'reason': None if will_go_to_trash else f'El directorio ({summary.get("total_size_formatted", "-")}) excede el límite de {self._format_size(max_item_size_bytes)} para papelera'
                }
            })

        except Exception as e:
            return Response(
                {'error': f'Error escaneando directorio: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def delete(self, request):
        """Elimina un archivo o directorio"""
        serializer = DeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        path = serializer.validated_data['path']
        confirm = serializer.validated_data['confirm']
        user = request.user

        if not confirm:
            return Response(
                {'error': 'Debes confirmar la eliminación'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar permisos básicos
        if not PermissionService.can_access_path(user, path, 'delete'):
            return Response(
                {'error': 'No tienes permiso para eliminar en esta ruta'},
                status=status.HTTP_403_FORBIDDEN
            )

        smb = SMBService()
        info = smb.get_file_info(path)

        if not info['success']:
            return Response(
                {'error': info['error']},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar propiedad del archivo (solo para roles con edit_permission_level)
        if user.role == 'consultation_edit':
            from files.models import Directory

            owner_user = None
            print(f"[DEBUG DELETE] Usuario {user.username} (rol: {user.role}) intentando eliminar: {path}")
            print(f"[DEBUG DELETE] Es directorio: {info['is_directory']}")

            try:
                # Normalizar la ruta para buscar en la base de datos
                # Remover el prefijo de NetApp para obtener la ruta relativa
                normalized_path = path.replace('\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\', '').replace('\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy', '').replace('\\', '/')
                print(f"[DEBUG DELETE] Ruta normalizada para DB: '{normalized_path}'")

                if info['is_directory']:
                    # Buscar directorio
                    directory = Directory.objects.filter(path=normalized_path).first()
                    print(f"[DEBUG DELETE] Directorio encontrado en DB: {directory}")
                    if directory:
                        owner_user = directory.created_by
                        print(f"[DEBUG DELETE] Propietario del directorio: {owner_user.username if owner_user else 'None'}")
                else:
                    # Buscar archivo
                    file_obj = File.objects.filter(path=normalized_path).first()
                    print(f"[DEBUG DELETE] Archivo encontrado en DB: {file_obj}")
                    if file_obj:
                        owner_user = file_obj.uploaded_by
                        print(f"[DEBUG DELETE] Propietario del archivo: {owner_user.username if owner_user else 'None'}")

            except Exception as e:
                print(f"[ERROR DELETE] Error al buscar propietario del archivo {path}: {e}")
                import traceback
                traceback.print_exc()

            # Verificar si puede eliminar según edit_permission_level
            print(f"[DEBUG DELETE] Llamando a can_modify_or_delete_item con owner_user: {owner_user}")
            permission_check = PermissionService.can_modify_or_delete_item(user, path, owner_user, action='delete')
            print(f"[DEBUG DELETE] Resultado de can_modify_or_delete_item: {permission_check}")

            if not permission_check['allowed']:
                print(f"[DEBUG DELETE] ACCESO DENEGADO: {permission_check['reason']}")
                return Response(
                    {'error': permission_check['reason']},
                    status=status.HTTP_403_FORBIDDEN
                )
            else:
                print(f"[DEBUG DELETE] ACCESO PERMITIDO: {permission_check['reason']}")

        # Para directorios, escanear ANTES de eliminar para auditoría completa
        audit_details = {'is_directory': info['is_directory']}
        total_deleted_items = 0

        if info['is_directory']:
            from services.directory_scanner_service import DirectoryScannerService

            try:
                scanner = DirectoryScannerService()
                print(f"[DELETE AUDIT] Escaneando '{path}' con base_path='{scanner.base_path}'")
                scan_result = scanner.scan_directory(path)
                print(f"[DELETE AUDIT] Scan result: {scan_result.total_files} archivos, {scan_result.total_directories} dirs, {len(scan_result.all_items)} items totales, errores={scan_result.errors}")
                audit_details = scanner.generate_audit_details(scan_result, path)
                total_deleted_items = len(scan_result.all_items)
                print(f"[DELETE AUDIT] deleted_items en audit_details: {len(audit_details.get('deleted_items', []))}")
            except Exception as e:
                print(f"[WARNING DELETE] Error escaneando directorio para auditoría: {e}")
                import traceback
                traceback.print_exc()
                # Continuar con la eliminación aunque falle el escaneo
                audit_details['scan_error'] = str(e)

        # ==================== PAPELERA DE RECICLAJE ====================
        # Intentar mover a papelera antes de eliminar
        from trash.services import TrashService
        from django.conf import settings

        trash_service = TrashService()
        trash_result = None
        used_trash = False

        if getattr(settings, 'TRASH_ENABLED', True):
            try:
                trash_result = trash_service.move_to_trash(
                    path=path,
                    user=user,
                    is_directory=info['is_directory'],
                    metadata={
                        'audit_details': audit_details,
                        'file_count': total_deleted_items if info['is_directory'] else 1,
                        'original_size': info.get('size') or audit_details.get('total_size_bytes', 0)
                    }
                )

                if trash_result['success'] and not trash_result.get('skipped', False):
                    used_trash = True
                    audit_details['trash_id'] = trash_result.get('trash_id')
                    audit_details['trash_expires_at'] = trash_result.get('expires_at')
                    print(f"[TRASH] Item respaldado en papelera: {trash_result.get('trash_id')}")
                elif trash_result.get('skipped'):
                    print(f"[TRASH] Item muy grande, no se respaldó: {path}")
                    audit_details['trash_skipped'] = True
                    audit_details['trash_skip_reason'] = trash_result.get('message')
                else:
                    print(f"[TRASH] Error moviendo a papelera: {trash_result.get('error')}")
                    audit_details['trash_error'] = trash_result.get('error')

            except Exception as e:
                print(f"[TRASH] Excepción al mover a papelera: {e}")
                audit_details['trash_exception'] = str(e)
                # Continuar con eliminación normal si falla la papelera

        # ==================== FIN PAPELERA ====================

        # Eliminar el archivo/directorio original
        if info['is_directory']:
            result = smb.delete_directory(path)
        else:
            result = smb.delete_file(path)

        # Registrar auditoría con detalles completos
        AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role,
            action='delete',
            target_path=path,
            target_name=info['name'],
            file_size=info.get('size') or audit_details.get('total_size_bytes', 0),
            details=audit_details,
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=result['success'],
            error_message=result.get('error')
        )

        if not result['success']:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Preparar respuesta
        response_data = {'message': 'Eliminado exitosamente'}

        if info['is_directory'] and total_deleted_items > 0:
            response_data['deleted_items_count'] = total_deleted_items
            response_data['total_size_formatted'] = audit_details.get('total_size_formatted', '-')

        # Agregar info de papelera si se usó
        if used_trash:
            response_data['trash'] = {
                'backed_up': True,
                'trash_id': trash_result.get('trash_id'),
                'expires_at': trash_result.get('expires_at'),
                'message': trash_result.get('message')
            }
        elif trash_result and trash_result.get('skipped'):
            response_data['trash'] = {
                'backed_up': False,
                'reason': 'Archivo muy grande para respaldar en papelera'
            }

        return Response(response_data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='delete-batch')
    def delete_batch(self, request):
        """
        Elimina múltiples archivos/directorios de forma masiva.
        Cada item se elimina individualmente y se registra en auditoría.

        Payload:
        {
            "paths": ["path1", "path2", ...],
            "confirm": true
        }
        """
        paths = request.data.get('paths', [])
        confirm = request.data.get('confirm', False)
        user = request.user

        if not paths:
            return Response(
                {'error': 'No se especificaron elementos a eliminar'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not confirm:
            return Response(
                {'error': 'Debes confirmar la eliminación masiva'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Limitar a 50 items por solicitud
        if len(paths) > 50:
            return Response(
                {'error': 'Máximo 50 elementos por solicitud'},
                status=status.HTTP_400_BAD_REQUEST
            )

        smb = SMBService()
        results = {
            'success': [],
            'failed': [],
            'total_requested': len(paths),
            'total_deleted': 0,
            'total_failed': 0
        }

        from trash.services import TrashService
        from django.conf import settings
        trash_service = TrashService()

        for path in paths:
            try:
                # Verificar permisos
                if not PermissionService.can_access_path(user, path, 'delete'):
                    results['failed'].append({
                        'path': path,
                        'error': 'Sin permiso de eliminación'
                    })
                    results['total_failed'] += 1
                    continue

                # Obtener info del archivo
                info = smb.get_file_info(path)
                if not info['success']:
                    results['failed'].append({
                        'path': path,
                        'error': info['error']
                    })
                    results['total_failed'] += 1
                    continue

                # Verificar propiedad para consultation_edit
                if user.role == 'consultation_edit':
                    from files.models import Directory

                    owner_user = None
                    normalized_path = path.replace('\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\', '').replace('\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy', '').replace('\\', '/')

                    try:
                        if info['is_directory']:
                            directory = Directory.objects.filter(path=normalized_path).first()
                            if directory:
                                owner_user = directory.created_by
                        else:
                            file_obj = File.objects.filter(path=normalized_path).first()
                            if file_obj:
                                owner_user = file_obj.uploaded_by
                    except Exception:
                        pass

                    permission_check = PermissionService.can_modify_or_delete_item(user, path, owner_user, action='delete')
                    if not permission_check['allowed']:
                        results['failed'].append({
                            'path': path,
                            'name': info.get('name', path.split('/')[-1]),
                            'error': permission_check['reason']
                        })
                        results['total_failed'] += 1
                        continue

                # Para directorios, escanear ANTES de eliminar para auditoría completa
                audit_details = {'is_directory': info['is_directory'], 'batch_delete': True}

                if info['is_directory']:
                    from services.directory_scanner_service import DirectoryScannerService
                    try:
                        scanner = DirectoryScannerService()
                        print(f"[DELETE_BATCH AUDIT] Escaneando '{path}' con base_path='{scanner.base_path}'")
                        scan_result = scanner.scan_directory(path)
                        print(f"[DELETE_BATCH AUDIT] Scan result: {scan_result.total_files} archivos, {scan_result.total_directories} dirs, {len(scan_result.all_items)} items totales, errores={scan_result.errors}")
                        audit_details = scanner.generate_audit_details(scan_result, path)
                        audit_details['batch_delete'] = True
                        audit_details['is_directory'] = True
                        print(f"[DELETE_BATCH AUDIT] deleted_items en audit_details: {len(audit_details.get('deleted_items', []))}")
                    except Exception as e:
                        print(f"[WARNING DELETE_BATCH] Error escaneando directorio para auditoría: {e}")
                        import traceback
                        traceback.print_exc()
                        audit_details['scan_error'] = str(e)

                # Intentar mover a papelera
                used_trash = False

                if getattr(settings, 'TRASH_ENABLED', True):
                    try:
                        trash_result = trash_service.move_to_trash(
                            path=path,
                            user=user,
                            is_directory=info['is_directory'],
                            metadata={
                                'audit_details': audit_details,
                                'file_count': audit_details.get('total_files', 1) if info['is_directory'] else 1,
                                'original_size': info.get('size', 0) or audit_details.get('total_size_bytes', 0)
                            }
                        )
                        if trash_result['success'] and not trash_result.get('skipped', False):
                            used_trash = True
                            audit_details['trash_id'] = trash_result.get('trash_id')
                    except Exception as e:
                        audit_details['trash_error'] = str(e)

                # Eliminar
                if info['is_directory']:
                    result = smb.delete_directory(path)
                else:
                    result = smb.delete_file(path)

                # Registrar auditoría
                AuditLog.objects.create(
                    user=user,
                    username=user.username,
                    user_role=user.role,
                    action='delete',
                    target_path=path,
                    target_name=info.get('name', path.split('/')[-1]),
                    file_size=info.get('size', 0),
                    details=audit_details,
                    ip_address=getattr(request, 'client_ip', None),
                    user_agent=getattr(request, 'user_agent', None),
                    success=result['success'],
                    error_message=result.get('error')
                )

                if result['success']:
                    results['success'].append({
                        'path': path,
                        'name': info.get('name', path.split('/')[-1]),
                        'is_directory': info['is_directory'],
                        'backed_up': used_trash
                    })
                    results['total_deleted'] += 1
                else:
                    results['failed'].append({
                        'path': path,
                        'name': info.get('name', path.split('/')[-1]),
                        'error': result['error']
                    })
                    results['total_failed'] += 1

            except Exception as e:
                results['failed'].append({
                    'path': path,
                    'error': str(e)
                })
                results['total_failed'] += 1

        # Determinar status de respuesta
        if results['total_deleted'] == len(paths):
            response_status = status.HTTP_200_OK
            results['message'] = f'{results["total_deleted"]} elemento(s) eliminado(s) correctamente'
        elif results['total_deleted'] > 0:
            response_status = status.HTTP_207_MULTI_STATUS
            results['message'] = f'{results["total_deleted"]} eliminado(s), {results["total_failed"]} fallido(s)'
        else:
            response_status = status.HTTP_400_BAD_REQUEST
            results['message'] = 'No se pudo eliminar ningún elemento'

        return Response(results, status=response_status)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def search(self, request):
        """
        Busca archivos y directorios EN LA BASE DE DATOS

        Query params:
        - q: término de búsqueda (LIKE search - contiene). Puede incluir extensión (ej: archivo.pdf o archivo.gdb.zip)
        - extension: filtro opcional de extensión (deprecado, se extrae del query automáticamente)
        - page: número de página (default: 1)
        - per_page: resultados por página (default: 100, máximo: 100)

        Filtrado por permisos:
        - Superadmins: ven TODOS los resultados
        - Usuarios normales: SOLO ven resultados en rutas permitidas
        """
        from files.models import Directory
        from django.conf import settings
        import os

        # Parámetros de búsqueda
        query = request.query_params.get('q', '').strip()
        extension_param = request.query_params.get('extension', '').strip()

        # Auto-detectar extensión del query (ej: archivo.pdf -> query="archivo", extension=".pdf")
        # Soporta extensiones múltiples como .gdb.zip
        search_name = query
        detected_extension = None

        if '.' in query:
            # Buscar si termina con una extensión conocida
            parts = query.split('.')
            if len(parts) >= 2:
                # Probar con última parte (ej: .pdf en archivo.pdf)
                last_ext = '.' + parts[-1]
                # Probar con dos últimas partes (ej: .gdb.zip en archivo.gdb.zip)
                double_ext = '.' + '.'.join(parts[-2:]) if len(parts) >= 3 else None

                # Verificar si la extensión es válida (letras/números, máximo 10 caracteres)
                if len(parts[-1]) <= 10 and parts[-1].replace('_', '').isalnum():
                    detected_extension = last_ext
                    search_name = '.'.join(parts[:-1])

                    # Si hay doble extensión válida, usarla
                    if double_ext and len(parts[-2]) <= 10 and parts[-2].replace('_', '').isalnum():
                        # Casos como .gdb.zip, .tar.gz, etc.
                        if parts[-2].lower() in ['gdb', 'tar', 'backup']:
                            detected_extension = double_ext
                            search_name = '.'.join(parts[:-2])

        # Usar extensión detectada o parámetro manual (prioridad a parámetro)
        extension = extension_param if extension_param else detected_extension

        # Paginación
        try:
            page = int(request.query_params.get('page', 1))
            per_page = min(int(request.query_params.get('per_page', 100)), 100)
        except ValueError:
            return Response(
                {'success': False, 'message': 'page y per_page deben ser números'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar query mínimo
        if len(search_name) < 3:
            return Response(
                {'success': False, 'message': 'El término de búsqueda debe tener al menos 3 caracteres'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        is_superadmin = user.role == 'superadmin'

        try:
            # Buscar archivos por nombre (sin extensión si fue detectada)
            file_query = File.objects.filter(name__icontains=search_name)
            if extension:
                # Normalizar extensión (asegurar que empiece con punto)
                if not extension.startswith('.'):
                    extension = '.' + extension
                file_query = file_query.filter(extension__iexact=extension)

            # Buscar directorios
            dir_query = Directory.objects.filter(name__icontains=search_name, is_active=True)

            # Filtrar por permisos si NO es superadmin
            if not is_superadmin:
                # Obtener NETAPP_BASE_PATH de settings
                netapp_base_path = getattr(settings, 'NETAPP_BASE_PATH', '/mnt/repositorio/DirGesCat/2510SP/H_Informacion_Consulta/Sub_Proy')

                # Obtener rutas permitidas y construir paths completos
                user_permissions = user.permissions.filter(can_read=True, is_active=True)
                allowed_paths = []

                for perm in user_permissions:
                    # Construir path completo: NETAPP_BASE_PATH + base_path
                    full_path = os.path.join(netapp_base_path, perm.base_path)
                    allowed_paths.append(full_path)

                if allowed_paths:
                    # Filtrar archivos y directorios por rutas permitidas
                    path_filter = Q()
                    for path in allowed_paths:
                        path_filter |= Q(path__startswith=path)

                    file_query = file_query.filter(path_filter)
                    dir_query = dir_query.filter(path_filter)
                else:
                    # Sin permisos - no devolver nada
                    file_query = File.objects.none()
                    dir_query = Directory.objects.none()

            # Combinar resultados
            results = []

            # Función helper para convertir ruta completa a relativa
            def get_relative_path(absolute_path):
                """Convierte ruta completa a relativa removiendo NETAPP_BASE_PATH"""
                if not absolute_path:
                    return ''
                # Normalizar barras
                abs_normalized = absolute_path.replace('\\', '/')
                base_normalized = netapp_base_path.replace('\\', '/')
                # Remover prefijo base
                if abs_normalized.startswith(base_normalized):
                    relative = abs_normalized[len(base_normalized):]
                    # Remover barra inicial si existe
                    return relative.lstrip('/')
                return absolute_path

            # Agregar archivos
            for file in file_query:
                # Datos del propietario/creador
                owner_username = file.uploaded_by.username if file.uploaded_by else None
                owner_name = f"{file.uploaded_by.first_name} {file.uploaded_by.last_name}".strip() if file.uploaded_by else None

                results.append({
                    'id': file.id,
                    'name': file.name,
                    'path': get_relative_path(file.path),  # Convertir a ruta relativa
                    'is_directory': False,
                    'size': file.size or 0,
                    'size_formatted': file.get_size_display() if hasattr(file, 'get_size_display') else str(file.size),
                    'extension': file.extension,
                    'modified_date': file.modified_date.isoformat() if file.modified_date else None,
                    'created_date': file.created_date.isoformat() if file.created_date else None,
                    'md5_hash': file.md5_hash,
                    'indexed_at': file.indexed_at.isoformat() if file.indexed_at else None,
                    'owner_username': owner_username,
                    'owner_name': owner_name if owner_name else None,
                    'created_at': file.uploaded_at.isoformat() if file.uploaded_at else None,
                })

            # Agregar directorios
            for directory in dir_query:
                # Datos del creador del directorio
                dir_owner_username = directory.created_by.username if directory.created_by else None
                dir_owner_name = f"{directory.created_by.first_name} {directory.created_by.last_name}".strip() if directory.created_by else None

                # Conteo de elementos (archivos + subdirectorios)
                item_count = (directory.file_count or 0) + (directory.subdir_count or 0)

                results.append({
                    'id': directory.id,
                    'name': directory.name,
                    'path': get_relative_path(directory.path),  # Convertir a ruta relativa
                    'is_directory': True,
                    'size': 0,
                    'size_formatted': f'{item_count} elementos' if item_count > 0 else 'Vacío',
                    'extension': None,
                    'modified_date': directory.modified_date.isoformat() if directory.modified_date else None,
                    'created_date': directory.created_date.isoformat() if directory.created_date else None,
                    'md5_hash': None,
                    'indexed_at': directory.indexed_at.isoformat() if directory.indexed_at else None,
                    'owner_username': dir_owner_username,
                    'owner_name': dir_owner_name if dir_owner_name else None,
                    'created_at': directory.created_at.isoformat() if directory.created_at else None,
                    'item_count': item_count,
                })

            # Paginación
            total = len(results)
            total_pages = (total + per_page - 1) // per_page if total > 0 else 1

            if page < 1:
                page = 1
            if page > total_pages and total_pages > 0:
                page = total_pages

            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            paginated_results = results[start_idx:end_idx]

            return Response({
                'success': True,
                'data': {
                    'files': paginated_results,
                    'total': total,
                    'page': page,
                    'pages': total_pages,
                    'current_path': '',
                    'breadcrumbs': [],
                    'available_filters': {
                        'extensions': [],
                        'years': [],
                        'months': []
                    }
                },
                'message': f'{total} resultados encontrados'
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'success': False, 'message': f'Error al buscar: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def download_folder(self, request):
        """
        Descargar carpeta como ZIP
        Alias para compatibilidad - usa el endpoint download existente
        """
        return self.download(request)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='download-batch')
    def download_batch(self, request):
        """
        Descarga múltiples archivos/carpetas como un único ZIP.
        GET /api/file-ops/download-batch?paths=path1&paths=path2&zip_name=seleccion&token=xxx
        """
        import io
        import zipfile as zipfile_module
        from rest_framework_simplejwt.tokens import AccessToken
        from users.models import User

        paths = request.query_params.getlist('paths')
        zip_name = request.query_params.get('zip_name', 'seleccion_archivos')

        if not paths:
            return Response(
                {'error': 'Se requiere al menos una ruta (paths)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(paths) > 50:
            return Response(
                {'error': 'Máximo 50 elementos por descarga masiva'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Autenticación: header o token en query param
        user = request.user if request.user.is_authenticated else None
        if not user:
            token_str = request.query_params.get('token')
            if token_str:
                try:
                    token = AccessToken(token_str)
                    user_id = token.get('user_id')
                    user = User.objects.get(id=user_id)
                except Exception:
                    return Response(
                        {'error': 'Token inválido o expirado'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
            else:
                return Response(
                    {'error': 'Autenticación requerida'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        smb = SMBService()
        items_to_zip = []
        total_size = 0
        file_count = 0

        for path in paths:
            # Verificar permisos de lectura
            if not PermissionService.can_access_path(user, path, 'read'):
                continue

            full_path = smb.build_full_path(path)
            if not os.path.exists(full_path):
                continue

            base_name = os.path.basename(full_path) or os.path.basename(path)
            is_file = os.path.isfile(full_path)
            items_to_zip.append((full_path, base_name, is_file))

            if is_file:
                try:
                    total_size += os.path.getsize(full_path)
                    file_count += 1
                except Exception:
                    pass
            else:
                for root, dirs, files in os.walk(full_path):
                    for f in files:
                        fp = os.path.join(root, f)
                        try:
                            total_size += os.path.getsize(fp)
                            file_count += 1
                        except Exception:
                            pass

        if not items_to_zip:
            return Response(
                {'error': 'No se encontraron elementos válidos o sin permisos'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Registrar descarga en auditoría
        AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role,
            action='download',
            target_path=paths[0] if paths else '',
            target_name=f'{zip_name}.zip',
            file_size=total_size,
            details={
                'type': 'batch_download',
                'items_count': len(items_to_zip),
                'file_count': file_count,
                'total_size_bytes': total_size,
                'paths': paths[:10],
            },
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=True
        )

        # Crear ZIP en memoria
        buffer = io.BytesIO()
        with zipfile_module.ZipFile(buffer, 'w', zipfile_module.ZIP_STORED) as zf:
            for full_path, base_name, is_file in items_to_zip:
                if is_file:
                    try:
                        zf.write(full_path, base_name)
                    except Exception as e:
                        print(f"[DOWNLOAD_BATCH] Error agregando archivo {full_path}: {e}")
                else:
                    for root, dirs, files in os.walk(full_path):
                        for filename in files:
                            fp = os.path.join(root, filename)
                            arcname = os.path.join(base_name, os.path.relpath(fp, full_path))
                            try:
                                zf.write(fp, arcname)
                            except Exception as e:
                                print(f"[DOWNLOAD_BATCH] Error agregando {fp}: {e}")

        buffer.seek(0)
        safe_name = zip_name.replace('..', '').replace('/', '_').replace('\\', '_')
        response = HttpResponse(buffer.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{safe_name}.zip"'
        return response

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def folder_permissions(self, request):
        """
        Obtener permisos detallados de un directorio
        Retorna todos los usuarios que tienen acceso a la ruta especificada
        """
        path = request.query_params.get('path', '')
        user = request.user

        try:
            from users.models import UserPermission

            # Obtener todos los permisos activos
            all_permissions = UserPermission.objects.filter(is_active=True).select_related('user', 'granted_by')
            users_with_access = []

            for perm in all_permissions:
                # Normalizar rutas
                normalized_path = PermissionService.normalize_path(path)
                normalized_base = PermissionService.normalize_path(perm.base_path)

                # Determinar tipo de acceso (directo o heredado)
                has_access = False

                if normalized_base == normalized_path:
                    # Acceso directo
                    has_access = True
                elif normalized_path.startswith(normalized_base + '/') or normalized_base == '':
                    # Acceso potencialmente heredado
                    if not PermissionService.is_path_blocked(perm, normalized_path):
                        # Verificar profundidad
                        if perm.max_depth is not None:
                            depth = PermissionService.get_path_depth(normalized_base, normalized_path)
                            if depth <= perm.max_depth:
                                has_access = True
                        else:
                            has_access = True

                if has_access:
                    # Calcular permisos efectivos para esta ruta específica
                    is_read_only = PermissionService.is_path_read_only(perm, normalized_path)

                    # Estructura que espera el modal frontend (FolderPermissionsModal)
                    users_with_access.append({
                        'user': {
                            'id': perm.user.id,
                            'username': perm.user.username,
                            'email': perm.user.email,
                            'full_name': f"{perm.user.first_name} {perm.user.last_name}",
                            'first_name': perm.user.first_name,
                            'last_name': perm.user.last_name,
                            'role': perm.user.role,
                        },
                        'permissions': {
                            'can_read': perm.can_read,
                            'can_write': perm.can_write and not is_read_only,
                            'can_delete': perm.can_delete and not is_read_only,
                        },
                        'base_path': perm.base_path,
                        'granted_by': perm.granted_by.username if perm.granted_by else 'Sistema'
                    })

            return Response({
                'path': path,
                'permissions': users_with_access,
                'total_users': len(users_with_access)
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error obteniendo permisos: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def validate_name(self, request):
        """
        Validar nombre de archivo/directorio antes de crear/renombrar
        """
        name = request.data.get('name')
        current_path = request.data.get('current_path', '')
        extension = request.data.get('extension', '')

        if not name:
            return Response(
                {'error': 'El nombre es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        try:
            # Usar el servicio de validación
            validation = PathValidationService.validate_full_creation(current_path, name, user)

            return Response({
                'valid': validation['valid'],
                'errors': validation['errors'],
                'warnings': validation.get('warnings', []),
                'name': name
            })
        except Exception as e:
            return Response(
                {'error': f'Error en validación: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def check_permissions(self, request):
        """
        Obtener los permisos del usuario actual para una ruta específica.
        Retorna un objeto con los permisos detallados del usuario autenticado.

        Query params:
        - path: Ruta a verificar

        Returns:
        {
            'path': str,
            'can_read': bool,
            'can_write': bool,
            'can_delete': bool,
            'can_create_directories': bool,
            'can_rename': bool,
            'can_download': bool,
            'can_copy': bool,
            'can_cut': bool,
            'is_exempt_from_dictionary': bool,
            'read_only_mode': bool
        }
        """
        path = request.query_params.get('path', '')
        user = request.user

        try:
            # Obtener permisos detallados del usuario actual para esta ruta
            permissions = PermissionService.get_path_permissions_detail(user, path)

            # Verificar si el usuario está exento de diccionario
            is_exempt = user.is_exempt_from_dictionary() if hasattr(user, 'is_exempt_from_dictionary') else False

            return Response({
                'path': path,
                'can_read': permissions.get('can_read', False),
                'can_write': permissions.get('can_write', False),
                'can_delete': permissions.get('can_delete', False),
                'can_create_directories': permissions.get('can_create_directories', False),
                'can_rename': permissions.get('can_write', False),  # Renombrar requiere permiso de escritura
                'can_download': permissions.get('can_read', False),  # Descargar requiere permiso de lectura
                'can_copy': permissions.get('can_read', False),  # Copiar requiere permiso de lectura
                'can_cut': permissions.get('can_delete', False),  # Cortar requiere permiso de eliminación
                'is_exempt_from_dictionary': is_exempt,
                'read_only_mode': permissions.get('read_only_mode', False)
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error verificando permisos: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='smart-validate')
    def smart_validate(self, request):
        """
        Validación inteligente de nombre usando SmartNamingService.
        Aplica las 12 reglas IGAC y clasifica cada parte del nombre.

        POST body:
        {
            "name": "Nombre a validar",
            "current_path": "/ruta/actual"  (opcional)
        }

        Returns:
        {
            "valid": bool,
            "errors": [...],
            "warnings": [...],
            "formatted_name": "nombre_formateado",
            "parts_analysis": [...],
            "needs_ai": bool
        }
        """
        from services.smart_naming_service import SmartNamingService

        name = request.data.get('name')
        current_path = request.data.get('current_path', '')
        user = request.user

        if not name:
            return Response(
                {'error': 'El nombre es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service = SmartNamingService()
            validation = service.validate_name(name, user, current_path)

            return Response({
                'success': True,
                'valid': validation['valid'],
                'errors': validation['errors'],
                'warnings': validation['warnings'],
                'original_name': validation['original_name'],
                'formatted_name': validation['formatted_name'],
                'formatted_base': validation['formatted_base'],
                'extension': validation['extension'],
                'format_changes': validation['format_changes'],
                'parts_analysis': validation['parts_analysis'],
                'unknown_parts': validation['unknown_parts'],
                'needs_ai': validation['needs_ai'],
                'detected_date': validation['detected_date'],
                'user_exemptions': validation['user_exemptions']
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error en validación: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='suggest_name')
    def suggest_name(self, request):
        """
        Endpoint para sugerir nombre de archivo/carpeta.
        Compatible con el formato del frontend (original_name, current_path, extension, use_dictionary).

        POST body:
        {
            "original_name": "Nombre a sugerir",
            "current_path": "/ruta/actual",
            "extension": ".pdf" (opcional),
            "use_dictionary": true/false (opcional)
        }

        Returns:
        {
            "suggested_name": "nombre_sugerido.ext",
            "suggested_base": "nombre_sugerido",
            "valid": bool,
            "errors": [...],
            "warnings": [...],
            "metadata": {...}
        }
        """
        from services.smart_naming_service import SmartNamingService

        # Aceptar tanto 'name' como 'original_name' para compatibilidad
        name = request.data.get('original_name') or request.data.get('name')
        current_path = request.data.get('current_path', '')
        extension = request.data.get('extension', '')
        use_dictionary = request.data.get('use_dictionary', True)
        user = request.user

        if not name:
            return Response(
                {'error': 'El nombre es requerido (original_name o name)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service = SmartNamingService()

            # Añadir extensión si se proporcionó y no está en el nombre
            full_name = name
            if extension and not name.lower().endswith(extension.lower()):
                full_name = name + extension

            print(f"[suggest_name] INPUT: name='{name}', extension='{extension}', full_name='{full_name}'")
            result = service.suggest_name(full_name, current_path, user)
            print(f"[suggest_name] OUTPUT: suggested_base='{result.get('suggested_base')}', detected_date='{result.get('detected_date')}'")
            print(f"[suggest_name] WARNINGS: {result.get('warnings')}")

            # NO registrar en auditoría - suggest_name solo SUGIERE nombres
            # La auditoría se registra cuando el usuario REALMENTE renombra (endpoint rename)

            # Formatear respuesta para el frontend
            return Response({
                'suggested_name': result.get('suggested_name', name),
                'suggested_base': result.get('suggested_base', name),
                'valid': result.get('valid', True),
                'errors': result.get('errors', []),
                'warnings': result.get('warnings', []),
                'metadata': {
                    'original_name': name,
                    'original_length': len(name),
                    'suggested_length': len(result.get('suggested_name', name)),
                    'path_length': len(current_path),
                    'available_chars': 260 - len(current_path) - 1,
                    'ai_model': 'smart_naming_service',
                    'used_fallback': result.get('used_ai', False),
                    'dictionary_warnings': bool(result.get('warnings'))
                }
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error generando sugerencia: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='smart-rename')
    def smart_rename(self, request):
        """
        Genera sugerencia de nombre inteligente usando SmartNamingService.
        Aplica reglas IGAC, diccionario y IA cuando es necesario.

        POST body:
        {
            "name": "Nombre original a renombrar",
            "current_path": "/ruta/actual"  (opcional)
        }

        Returns:
        {
            "success": bool,
            "original_name": "...",
            "suggested_name": "nombre_sugerido.ext",
            "suggested_base": "nombre_sugerido",
            "valid": bool,
            "errors": [...],
            "warnings": [...],
            "used_ai": bool,
            "parts_analysis": [...]
        }
        """
        from services.smart_naming_service import SmartNamingService

        name = request.data.get('name')
        current_path = request.data.get('current_path', '')
        user = request.user

        if not name:
            return Response(
                {'error': 'El nombre es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service = SmartNamingService()
            result = service.suggest_name(name, current_path, user)

            # NO registrar en auditoría - smart_rename solo SUGIERE nombres
            # La auditoría se registra cuando el usuario REALMENTE renombra (endpoint rename)

            return Response(result)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error generando sugerencia: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='smart-rename-batch')
    def smart_rename_batch(self, request):
        """
        Genera sugerencias de nombres para múltiples archivos.
        Optimizado para usar una sola llamada a IA.

        POST body:
        {
            "files": [
                {"original_name": "archivo1.pdf"},
                {"original_name": "archivo2.xlsx"}
            ],
            "current_path": "/ruta/actual"  (opcional)
        }

        Returns:
        {
            "success": bool,
            "results": [
                {
                    "original_name": "...",
                    "suggested_name": "...",
                    "valid": bool,
                    ...
                }
            ]
        }
        """
        from services.smart_naming_service import SmartNamingService

        files = request.data.get('files', [])
        current_path = request.data.get('current_path', '')
        user = request.user

        if not files:
            return Response(
                {'error': 'La lista de archivos es requerida'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service = SmartNamingService()
            results = service.suggest_batch(files, current_path, user)

            # NO registrar en auditoría - smart_rename_batch solo SUGIERE nombres
            # La auditoría se registra cuando el usuario REALMENTE renombra (endpoint rename)

            return Response({
                'success': True,
                'results': results,
                'total': len(results)
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error generando sugerencias: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='suggest_batch')
    def suggest_batch(self, request):
        """
        Sugerir nombres con IA en lote para múltiples archivos.
        Compatible con el formato del frontend.

        POST body:
        {
            "files": [
                {"original_name": "archivo1.pdf", "extension": ".pdf"},
                {"original_name": "archivo2.xlsx", "extension": ".xlsx"}
            ],
            "current_path": "/ruta/actual",
            "use_dictionary": true/false
        }

        Returns:
        {
            "success": bool,
            "results": [...]
        }
        """
        from services.smart_naming_service import SmartNamingService

        files = request.data.get('files', [])
        current_path = request.data.get('current_path', '')
        use_dictionary = request.data.get('use_dictionary', True)
        user = request.user

        if not files:
            return Response(
                {'error': 'La lista de archivos es requerida'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service = SmartNamingService()
            print(f"[suggest_batch] INPUT files: {files}")
            results = service.suggest_batch(files, current_path, user)
            for r in results:
                print(f"[suggest_batch] RESULT: {r.get('original_name')} -> {r.get('suggested_name')} (base: {r.get('suggested_base')})")

            # Contar exitosos y fallidos
            successful = sum(1 for r in results if r.get('suggested_name') and not r.get('error'))
            failed = sum(1 for r in results if r.get('error') or not r.get('suggested_name'))

            return Response({
                'success': True,
                'results': results,
                'total': len(results),
                'successful': successful,
                'failed': failed
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error generando sugerencias batch: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='validate-batch')
    def validate_batch(self, request):
        """
        Validar múltiples archivos en lote antes de subir.
        APLICA TODAS LAS 12 REGLAS IGAC DE RENOMBRAMIENTO.

        POST body:
        {
            "path": "/ruta/destino",
            "files": [
                {"name": "archivo1.pdf", "path": "subcarpeta/archivo1.pdf"},
                {"name": "archivo2.xlsx", "path": "archivo2.xlsx"}
            ]
        }

        Returns:
        {
            "results": [
                {"name": "...", "valid": bool, "errors": [...], "warnings": [...]}
            ]
        }

        REGLAS IGAC APLICADAS:
        1. Todo en minúsculas
        2. Sin tildes/acentos
        3. Sin conectores (a, y, de, entre, etc.)
        4. Espacios → guiones bajos
        5. Sin paréntesis, guiones medios → guiones bajos
        6. Sin caracteres especiales
        7. Sin caracteres duplicados consecutivos (aa → a)
        8. Fecha al INICIO en formato YYYYMMDD
        9. Sin palabras genéricas (archivo, final, etc.)
        10. Máximo 50 caracteres en nombre
        11. Sin prefijos como "nuevo_", "copia_"
        12. Ceros iniciales en secuencias numéricas
        """
        from services.smart_naming_service import SmartNamingService
        from concurrent.futures import ThreadPoolExecutor, as_completed
        import time
        import re
        import unicodedata

        start_time = time.time()
        base_path = request.data.get('path', '')
        files = request.data.get('files', [])
        user = request.user

        if not files:
            return Response(
                {'error': 'La lista de archivos es requerida'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Crear instancia del servicio (usa cache internamente)
            smart_service = SmartNamingService()

            # Verificar exenciones del usuario
            user_exemptions = {}
            if user:
                user_exemptions = user.get_naming_exemptions()

            def validate_single_file(file_info, idx):
                """
                Valida un solo archivo aplicando TODAS las reglas IGAC.
                Retorna errores específicos para cada regla violada.
                """
                name = file_info.get('name', '')
                file_path = file_info.get('path', name)
                errors = []
                warnings = []

                # Separar extensión para validar solo el nombre base
                extension = ''
                name_base = name
                if '.' in name:
                    parts = name.rsplit('.', 1)
                    if len(parts[1]) <= 10:  # Extensión típica
                        name_base = parts[0]
                        extension = '.' + parts[1]

                # =====================================================
                # REGLA 1: TODO EN MINÚSCULAS
                # =====================================================
                if not user_exemptions.get('exempt_from_naming_rules', False):
                    if name_base != name_base.lower():
                        errors.append("MAYÚSCULAS: El nombre debe estar en minúsculas")

                # =====================================================
                # REGLA 2: SIN TILDES/ACENTOS
                # =====================================================
                normalized = unicodedata.normalize('NFD', name_base)
                has_accents = any(unicodedata.category(c) == 'Mn' for c in normalized)
                if has_accents:
                    errors.append("TILDES: El nombre no debe contener tildes ni acentos")

                # =====================================================
                # REGLA 4: SIN ESPACIOS (deben ser guiones bajos)
                # =====================================================
                if ' ' in name_base:
                    errors.append("ESPACIOS: No se permiten espacios, use guiones bajos (_)")

                # =====================================================
                # REGLA 5: SIN GUIONES MEDIOS NI PARÉNTESIS
                # =====================================================
                if '-' in name_base:
                    errors.append("GUIÓN MEDIO: No se permiten guiones medios (-), use guiones bajos (_)")

                if '(' in name_base or ')' in name_base:
                    errors.append("PARÉNTESIS: No se permiten paréntesis en el nombre")

                # =====================================================
                # REGLA 6: SIN CARACTERES ESPECIALES
                # =====================================================
                # Caracteres permitidos: letras, números, guiones bajos, puntos
                special_chars = re.findall(r'[^a-zA-Z0-9_.\s\-áéíóúÁÉÍÓÚñÑüÜ()]', name_base)
                if special_chars:
                    unique_chars = list(set(special_chars))
                    errors.append(f"CARACTERES ESPECIALES: No se permiten: {', '.join(unique_chars)}")

                # =====================================================
                # REGLA 7: REVISAR VOCALES DUPLICADAS CONSECUTIVAS
                # =====================================================
                # NOTA: Algunas palabras válidas tienen vocales dobles (coordenada, cooperación, leer)
                # Por eso se marca como WARNING, no como ERROR bloqueante
                # Las consonantes dobles como "rr", "ll", "cc" son normales en español
                name_lower = name_base.lower()
                vowels = 'aeiou'
                for i in range(len(name_lower) - 1):
                    if name_lower[i] in vowels and name_lower[i] == name_lower[i + 1]:
                        warnings.append(f"VOCALES DUPLICADAS: Revisar vocales duplicadas ('{name_lower[i]}{name_lower[i+1]}')")
                        break

                # =====================================================
                # REGLA 3: SIN CONECTORES
                # =====================================================
                # Los conectores deben eliminarse del nombre
                connectors = {'a', 'y', 'e', 'o', 'u', 'de', 'del', 'la', 'el', 'los', 'las',
                              'en', 'con', 'para', 'por', 'entre', 'sobre', 'bajo', 'ante',
                              'desde', 'hasta', 'hacia', 'sin', 'segun', 'durante', 'mediante'}
                parts = name_lower.replace('-', '_').replace(' ', '_').split('_')
                found_connectors = [p for p in parts if p in connectors]
                if found_connectors:
                    warnings.append(f"CONECTORES: Evite conectores en el nombre: {', '.join(found_connectors)}")

                # =====================================================
                # REGLA 8: FECHA AL INICIO DEL NOMBRE
                # =====================================================
                # TODAS las extensiones encontradas en producción requieren fecha YYYYMMDD al inicio
                # Basado en análisis de 1.18M archivos de gestion_dato_db
                extensions_requiring_date = {
                    # Documentos de oficina
                    'docx', 'doc', 'txt', 'pptx', 'xlsx', 'xls', 'xlsb', 'xlsm', 'csv', 'pdf',
                    'rtf', 'odt', 'ods', 'odp',
                    # Multimedia - audio
                    'mp3', 'ogg', 'wav', 'm4a', 'aac', 'wma', 'flac',
                    # Multimedia - video
                    'mp4', 'mpeg', 'mpg', 'mov', 'avi', 'wmv', 'mkv', 'flv', 'webm', 'mpe',
                    # Imágenes
                    'jpg', 'jpeg', 'png', 'jfif', 'jpe', 'cr3', 'heic', 'gif', 'bmp',
                    'tif', 'tiff', 'webp', 'svg', 'ico', 'raw', 'psd', 'ai', 'eps',
                    # Datos geoespaciales (del análisis)
                    'geojson', 'mpk', 'ili', 'rrd', 'img', 'shp', 'kml', 'kmz', 'gpx', 'gpkg',
                    'dbf', 'prj', 'shx', 'mxd', 'lyr', 'gdb', 'xtf', 'dwg', 'dxf',
                    # Archivos comprimidos
                    'zip', 'rar', '7z', 'gz', 'tar', 'tgz', 'bz2', 'xz', 'lzma',
                    # Datos y configuración
                    'db', 'ini', 'conf', 'cfg', 'mdb', 'accdb', 'sqlite', 'sql',
                    # Web y datos estructurados
                    'html', 'htm', 'xml', 'json', 'yaml', 'yml',
                    # Correo y comunicación
                    'eml', 'msg', 'lnk',
                    # Del análisis de producción - extensiones encontradas
                    'rw5', 'unknown', 'mpp', 'crdownload', 'qmd', 'alm',
                    '23h', '23l', '23o', '23c', '23g', '23n'  # Formatos específicos encontrados
                }

                # Detectar si hay una fecha en alguna parte del nombre y si NO está al inicio
                # Buscar en las partes separadas por guiones bajos
                date_found_full = None  # YYYYMMDD (8 dígitos)
                date_found_year = None  # YYYY (4 dígitos)
                date_at_start = False
                ext_lower = extension[1:].lower() if extension else ''

                for i, part in enumerate(parts):
                    # Detectar YYYYMMDD (8 dígitos, año válido) - formato completo
                    if len(part) == 8 and part.isdigit():
                        year = int(part[:4])
                        if 1900 <= year <= 2100:
                            date_found_full = part
                            if i == 0:
                                date_at_start = True
                            break
                    # Detectar YYYY (4 dígitos, año válido) - solo año
                    elif len(part) == 4 and part.isdigit():
                        year = int(part)
                        if 1900 <= year <= 2100:
                            if not date_found_year:  # Solo guardar el primero
                                date_found_year = part
                                # Solo cuenta como "al inicio" si es formato completo

                # Verificar si la extensión requiere fecha obligatoria
                requires_date = ext_lower in extensions_requiring_date

                if requires_date:
                    # Para estas extensiones, se requiere fecha COMPLETA (YYYYMMDD) al inicio
                    if not date_at_start:
                        if date_found_full:
                            # Tiene fecha completa pero no al inicio
                            errors.append(f"FECHA REQUERIDA: Para archivos .{ext_lower}, la fecha '{date_found_full}' DEBE estar al INICIO (ej: {date_found_full}_{name_base})")
                        elif date_found_year:
                            # Solo tiene año, necesita fecha completa
                            errors.append(f"FECHA REQUERIDA: Los archivos .{ext_lower} DEBEN iniciar con fecha completa YYYYMMDD_ (ej: 20260106_{name_base}), no solo el año")
                        else:
                            # No tiene ninguna fecha
                            errors.append(f"FECHA REQUERIDA: Los archivos .{ext_lower} DEBEN iniciar con fecha YYYYMMDD_ (ej: 20260106_{name_base})")
                else:
                    # Para otras extensiones, es solo una recomendación
                    date_found = date_found_full or date_found_year
                    if date_found and not date_at_start:
                        warnings.append(f"FECHA: Se recomienda colocar la fecha '{date_found}' al INICIO del nombre")

                # =====================================================
                # REGLA 9: SIN PALABRAS GENÉRICAS
                # =====================================================
                generic_words = {'archivo', 'final', 'nuevo', 'viejo', 'copia', 'backup',
                                 'temp', 'temporal', 'borrador', 'draft', 'version',
                                 'documento', 'doc', 'file', 'data', 'datos'}
                found_generic = [p for p in parts if p in generic_words]
                if found_generic:
                    warnings.append(f"GENÉRICAS: Evite palabras genéricas: {', '.join(found_generic)}")

                # =====================================================
                # REGLA 10: MÁXIMO 50 CARACTERES
                # =====================================================
                if not user_exemptions.get('exempt_from_name_length', False):
                    if len(name_base) > 50:
                        errors.append(f"LONGITUD: El nombre excede 50 caracteres (actual: {len(name_base)})")

                # =====================================================
                # REGLA 12: CEROS INICIALES EN SECUENCIAS NUMÉRICAS
                # =====================================================
                # Detectar números de 1 dígito que deberían tener cero inicial
                # Ej: archivo_1.pdf → archivo_01.pdf
                for i, part in enumerate(parts):
                    # Solo verificar si es un número puro de 1 dígito (no fechas ni códigos)
                    if part.isdigit() and len(part) == 1:
                        # No aplicar a números que parecen ser parte de una fecha
                        # o que están al inicio (podrían ser versiones válidas)
                        if i > 0:  # No es el primer segmento
                            warnings.append(f"CEROS INICIALES: Se recomienda usar ceros iniciales en números ('{part}' → '0{part}')")

                # =====================================================
                # REGLA 11: SIN PREFIJOS PROHIBIDOS
                # =====================================================
                forbidden_prefixes = ('nuevo_', 'copia_', 'backup_', 'temp_', 'old_',
                                      'copy_', 'new_', 'final_', 'v_')
                for prefix in forbidden_prefixes:
                    if name_lower.startswith(prefix):
                        errors.append(f"PREFIJO: No se permite el prefijo '{prefix}'")
                        break

                # =====================================================
                # VALIDACIÓN DE CARACTERES WINDOWS (crítico para el sistema)
                # =====================================================
                invalid_windows_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
                found_invalid = [char for char in invalid_windows_chars if char in name]
                if found_invalid:
                    errors.append(f"WINDOWS: Caracteres no permitidos: {', '.join(found_invalid)}")

                # =====================================================
                # VALIDACIÓN DE EXTENSIONES PELIGROSAS (seguridad)
                # =====================================================
                if extension:
                    dangerous_extensions = {
                        'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'vbe',
                        'js', 'jse', 'ws', 'wsf', 'wsc', 'wsh', 'ps1', 'ps1xml',
                        'ps2', 'ps2xml', 'psc1', 'psc2', 'msh', 'msh1', 'msh2',
                        'inf', 'reg', 'scf', 'msi', 'msp', 'mst', 'jar', 'hta',
                        'cpl', 'msc', 'dll', 'ocx', 'sys', 'drv'
                    }
                    ext_lower = extension[1:].lower()  # Quitar el punto
                    if ext_lower in dangerous_extensions:
                        errors.append(f"SEGURIDAD: Extensión .{ext_lower} no permitida por seguridad")

                # =====================================================
                # VALIDACIÓN CONTRA DICCIONARIO (solo si no hay errores de formato graves)
                # El diccionario es REFERENCIA, no bloquea pero sí advierte
                # =====================================================
                if not errors:  # Solo si el formato es correcto
                    try:
                        dict_validation = smart_service.dictionary.validate_name(name, allow_numbers=True)
                        if not dict_validation.get('valid', True):
                            # Agregar como advertencias, no como errores bloqueantes
                            dict_errors = dict_validation.get('errors', [])
                            for err in dict_errors:
                                warnings.append(f"DICCIONARIO: {err}")
                    except Exception as e:
                        # Si falla la validación de diccionario, no bloquear
                        print(f"[validate_batch] Error en diccionario: {e}")

                return {
                    'idx': idx,
                    'name': name,
                    'path': file_path,
                    'valid': len(errors) == 0,
                    'errors': errors,
                    'warnings': warnings
                }

            # Preparar resultados con el orden original
            results = [None] * len(files)

            # Usar paralelismo para archivos múltiples
            max_workers = min(8, len(files)) if len(files) > 1 else 1

            if len(files) == 1:
                # Para un solo archivo, no usar ThreadPool (overhead)
                result = validate_single_file(files[0], 0)
                results[0] = result
            else:
                # Ejecutar validaciones en paralelo
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    future_to_idx = {
                        executor.submit(validate_single_file, file_info, idx): idx
                        for idx, file_info in enumerate(files)
                    }

                    for future in as_completed(future_to_idx):
                        try:
                            result = future.result()
                            results[result['idx']] = result
                        except Exception as e:
                            idx = future_to_idx[future]
                            results[idx] = {
                                'idx': idx,
                                'name': files[idx].get('name', ''),
                                'path': files[idx].get('path', ''),
                                'valid': False,
                                'errors': [f'Error de validación: {str(e)}'],
                                'warnings': []
                            }

            # Limpiar el campo 'idx' de los resultados
            for r in results:
                if r and 'idx' in r:
                    del r['idx']

            elapsed_time = time.time() - start_time

            return Response({
                'success': True,
                'results': results,
                'total_valid': sum(1 for r in results if r and r['valid']),
                'total_invalid': sum(1 for r in results if r and not r['valid']),
                'validation_time_seconds': round(elapsed_time, 2)
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error validando archivos: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='dictionary-search')
    def dictionary_search(self, request):
        """
        Busca términos en el diccionario oficial.

        Query params:
        - q: Término a buscar
        - limit: Máximo de resultados (default: 20)

        Returns:
        {
            "results": [{"key": "abrev", "value": "significado completo"}, ...]
        }
        """
        from services.smart_naming_service import SmartNamingService

        query = request.query_params.get('q', '')
        limit = int(request.query_params.get('limit', 20))

        if len(query) < 2:
            return Response(
                {'error': 'El término debe tener al menos 2 caracteres'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service = SmartNamingService()
            results = service.search_dictionary(query, limit)

            return Response({
                'success': True,
                'results': results,
                'query': query
            })

        except Exception as e:
            return Response(
                {'error': f'Error en búsqueda: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='naming-exemptions')
    def naming_exemptions(self, request):
        """
        Retorna las exenciones de nombrado del usuario actual.

        Returns:
        {
            "exempt_from_naming_rules": bool,
            "exempt_from_path_limit": bool,
            "exempt_from_name_length": bool,
            "exemption_reason": str | null
        }
        """
        user = request.user
        exemptions = user.get_naming_exemptions()

        return Response({
            'success': True,
            'exemptions': exemptions,
            'user': {
                'username': user.username,
                'role': user.role
            }
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def rename(self, request):
        """
        Renombrar archivo o directorio.
        Si es un directorio, también actualiza automáticamente los permisos afectados
        y notifica a los usuarios cuyas rutas de acceso fueron modificadas.
        """
        old_path = request.data.get('old_path')
        new_name = request.data.get('new_name')
        user = request.user

        if not old_path or not new_name:
            return Response(
                {'error': 'old_path y new_name requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar permisos de escritura
        parent_path = os.path.dirname(old_path) if '/' in old_path or '\\' in old_path else ''
        if not PermissionService.can_access_path(user, parent_path if parent_path else old_path, 'write'):
            return Response(
                {'error': 'No tienes permiso para renombrar en esta ubicación'},
                status=status.HTTP_403_FORBIDDEN
            )

        smb = SMBService()
        old_full_path = smb.build_full_path(old_path)

        # Construir nuevo path
        if parent_path:
            new_path = f"{parent_path}/{new_name}"
        else:
            new_path = new_name

        new_full_path = smb.build_full_path(new_path)

        if not os.path.exists(old_full_path):
            return Response(
                {'error': 'Archivo o directorio no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        if os.path.exists(new_full_path):
            return Response(
                {'error': 'Ya existe un archivo o directorio con ese nombre'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar si es un directorio para actualizar permisos después
        is_directory = os.path.isdir(old_full_path)

        try:
            os.rename(old_full_path, new_full_path)

            # === ACTUALIZAR PERMISOS SI ES DIRECTORIO ===
            permission_update_result = None
            if is_directory:
                try:
                    from services.permission_path_service import PermissionPathService
                    permission_update_result = PermissionPathService.handle_path_rename(
                        old_path=old_path,
                        new_path=new_path,
                        renamed_by=user
                    )
                    logger.info(
                        f"Permisos actualizados por renombrado: "
                        f"{permission_update_result.get('permissions_updated', 0)} permisos, "
                        f"{len(permission_update_result.get('users_notified', []))} usuarios notificados"
                    )
                except Exception as perm_error:
                    logger.error(f"Error actualizando permisos por renombrado: {perm_error}")
                    # No fallar la operación de renombrado por este error
                    permission_update_result = {'error': str(perm_error)}

            # Registrar en auditoría con nombre original y nuevo
            old_name = os.path.basename(old_path)
            audit_details = {
                'old_name': old_name,
                'new_name': new_name,
                'old_path': old_path,
                'new_path': new_path
            }
            if permission_update_result:
                audit_details['permission_updates'] = permission_update_result

            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='rename',
                target_path=old_path,
                target_name=old_name,
                details=audit_details,
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=True
            )

            # Preparar respuesta
            response_data = {
                'message': 'Renombrado exitosamente',
                'old_path': old_path,
                'new_path': new_path
            }

            # Agregar información de permisos actualizados si aplica
            if permission_update_result and not permission_update_result.get('error'):
                permissions_updated = permission_update_result.get('permissions_updated', 0)
                users_notified = permission_update_result.get('users_notified', [])
                if permissions_updated > 0:
                    response_data['permissions_updated'] = permissions_updated
                    response_data['users_notified'] = len(users_notified)

            return Response(response_data)
        except Exception as e:
            # Registrar error
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='rename',
                target_path=old_path,
                target_name=os.path.basename(old_path),
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=False,
                error_message=str(e)
            )

            return Response(
                {'error': f'Error al renombrar: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def copy_item(self, request):
        """
        Copiar archivo o directorio
        Body: {
            "source_path": "/ruta/origen/archivo.pdf",
            "dest_path": "/ruta/destino/archivo.pdf",
            "overwrite": false,  # opcional
            "rename_if_exists": false  # opcional
        }
        """
        source_path = request.data.get('source_path')
        dest_path = request.data.get('dest_path')
        overwrite = request.data.get('overwrite', False)
        rename_if_exists = request.data.get('rename_if_exists', False)
        user = request.user

        if not source_path or not dest_path:
            return Response(
                {'error': 'source_path y dest_path requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar permiso de lectura en origen
        if not PermissionService.can_access_path(user, source_path, 'read'):
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='copy',
                target_path=source_path,
                target_name=os.path.basename(source_path),
                details={
                    'dest_path': dest_path,
                    'error': 'Sin permiso de lectura en origen'
                },
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=False,
                error_message='No tienes permiso de lectura en la ruta origen'
            )
            return Response(
                {'error': 'No tienes permiso de lectura en la ruta origen'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar permiso de escritura en destino
        dest_parent = os.path.dirname(dest_path)
        if not PermissionService.can_access_path(user, dest_parent, 'write'):
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='copy',
                target_path=source_path,
                target_name=os.path.basename(source_path),
                details={
                    'dest_path': dest_path,
                    'error': 'Sin permiso de escritura en destino'
                },
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=False,
                error_message='No tienes permiso de escritura en la ruta destino'
            )
            return Response(
                {'error': 'No tienes permiso de escritura en la ruta destino'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Copiar el item
        try:
            smb = SMBService()

            # Si hay conflicto y se debe renombrar automáticamente
            if rename_if_exists and smb.file_exists(dest_path):
                dest_name = smb.get_unique_name(dest_path)
                dest_parent_dir = os.path.dirname(dest_path)
                dest_path = os.path.join(dest_parent_dir, dest_name) if dest_parent_dir else dest_name

            result = smb.copy_item(source_path, dest_path)

            if not result['success']:
                # Si hay conflicto de nombres
                if result.get('conflict'):
                    return Response(
                        {
                            'error': result['error'],
                            'conflict': True,
                            'source_path': source_path,
                            'dest_path': dest_path
                        },
                        status=status.HTTP_409_CONFLICT
                    )
                else:
                    # Registrar error
                    AuditLog.objects.create(
                        user=user,
                        username=user.username,
                        user_role=user.role,
                        action='copy',
                        target_path=source_path,
                        target_name=os.path.basename(source_path),
                        details={
                            'dest_path': dest_path,
                            'error': result['error']
                        },
                        ip_address=getattr(request, 'client_ip', None),
                        user_agent=getattr(request, 'user_agent', None),
                        success=False,
                        error_message=result['error']
                    )
                    return Response(
                        {'error': result['error']},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Registrar en auditoría (solo si se completó exitosamente)
            copy_audit_details = {
                'source_path': result['source_path'],
                'dest_path': result['dest_path'],
                'is_directory': result['is_directory'],
                'file_count': result.get('file_count', 1)
            }
            if result['is_directory']:
                try:
                    from services.directory_scanner_service import DirectoryScannerService
                    scanner = DirectoryScannerService()
                    scan_result = scanner.scan_directory(result['dest_path'])
                    if not scan_result.errors:
                        scan_details = scanner.generate_audit_details(scan_result, result['dest_path'])
                        copy_audit_details['copied_items'] = scan_details.get('deleted_items', [])
                        copy_audit_details['total_files'] = scan_details.get('total_files', 0)
                        copy_audit_details['total_directories'] = scan_details.get('total_directories', 0)
                        copy_audit_details['total_size_bytes'] = scan_details.get('total_size_bytes', 0)
                        copy_audit_details['total_size_formatted'] = scan_details.get('total_size_formatted', '-')
                        copy_audit_details['stats_by_extension'] = scan_details.get('stats_by_extension', {})
                except Exception as scan_err:
                    print(f"[WARNING COPY] Error escaneando directorio para auditoría: {scan_err}")
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='copy',
                target_path=source_path,
                target_name=os.path.basename(source_path),
                file_size=result.get('size'),
                details=copy_audit_details,
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=True
            )

            return Response({
                'message': 'Item copiado exitosamente',
                'source_path': result['source_path'],
                'dest_path': result['dest_path'],
                'is_directory': result['is_directory'],
                'size': result['size'],
                'file_count': result.get('file_count', 1)
            })

        except Exception as e:
            # Registrar error
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='copy',
                target_path=source_path,
                target_name=os.path.basename(source_path),
                details={
                    'dest_path': dest_path,
                    'error': str(e)
                },
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=False,
                error_message=str(e)
            )
            return Response(
                {'error': f'Error al copiar: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def move_item(self, request):
        """
        Mover archivo o directorio
        Body: {
            "source_path": "/ruta/origen/archivo.pdf",
            "dest_path": "/ruta/destino/archivo.pdf",
            "overwrite": false,  # opcional
            "rename_if_exists": false  # opcional
        }
        """
        source_path = request.data.get('source_path')
        dest_path = request.data.get('dest_path')
        overwrite = request.data.get('overwrite', False)
        rename_if_exists = request.data.get('rename_if_exists', False)
        user = request.user

        if not source_path or not dest_path:
            return Response(
                {'error': 'source_path y dest_path requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar permiso de eliminación en origen (requerido para mover)
        if not PermissionService.can_access_path(user, source_path, 'delete'):
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='move',
                target_path=source_path,
                target_name=os.path.basename(source_path),
                details={
                    'dest_path': dest_path,
                    'error': 'Sin permiso de eliminación en origen'
                },
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=False,
                error_message='No tienes permiso de eliminación en la ruta origen (requerido para mover)'
            )
            return Response(
                {'error': 'No tienes permiso de eliminación en la ruta origen (requerido para mover)'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar permiso de escritura en destino
        dest_parent = os.path.dirname(dest_path)
        if not PermissionService.can_access_path(user, dest_parent, 'write'):
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='move',
                target_path=source_path,
                target_name=os.path.basename(source_path),
                details={
                    'dest_path': dest_path,
                    'error': 'Sin permiso de escritura en destino'
                },
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=False,
                error_message='No tienes permiso de escritura en la ruta destino'
            )
            return Response(
                {'error': 'No tienes permiso de escritura en la ruta destino'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Mover el item
        try:
            smb = SMBService()

            # Si hay conflicto y se debe renombrar automáticamente
            if rename_if_exists and smb.file_exists(dest_path):
                dest_name = smb.get_unique_name(dest_path)
                dest_parent_dir = os.path.dirname(dest_path)
                dest_path = os.path.join(dest_parent_dir, dest_name) if dest_parent_dir else dest_name

            result = smb.move_item(source_path, dest_path)

            if not result['success']:
                # Si hay conflicto de nombres
                if result.get('conflict'):
                    return Response(
                        {
                            'error': result['error'],
                            'conflict': True,
                            'source_path': source_path,
                            'dest_path': dest_path
                        },
                        status=status.HTTP_409_CONFLICT
                    )
                else:
                    # Registrar error
                    AuditLog.objects.create(
                        user=user,
                        username=user.username,
                        user_role=user.role,
                        action='move',
                        target_path=source_path,
                        target_name=os.path.basename(source_path),
                        details={
                            'dest_path': dest_path,
                            'error': result['error']
                        },
                        ip_address=getattr(request, 'client_ip', None),
                        user_agent=getattr(request, 'user_agent', None),
                        success=False,
                        error_message=result['error']
                    )
                    return Response(
                        {'error': result['error']},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Registrar en auditoría (solo si se completó exitosamente)
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='move',
                target_path=source_path,
                target_name=os.path.basename(source_path),
                file_size=result.get('size'),
                details={
                    'source_path': result['source_path'],
                    'dest_path': result['dest_path'],
                    'is_directory': result['is_directory'],
                    'file_count': result.get('file_count', 1)
                },
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=True
            )

            return Response({
                'message': 'Item movido exitosamente',
                'source_path': result['source_path'],
                'dest_path': result['dest_path'],
                'is_directory': result['is_directory'],
                'size': result['size'],
                'file_count': result.get('file_count', 1)
            })

        except Exception as e:
            # Registrar error
            AuditLog.objects.create(
                user=user,
                username=user.username,
                user_role=user.role,
                action='move',
                target_path=source_path,
                target_name=os.path.basename(source_path),
                details={
                    'dest_path': dest_path,
                    'error': str(e)
                },
                ip_address=getattr(request, 'client_ip', None),
                user_agent=getattr(request, 'user_agent', None),
                success=False,
                error_message=str(e)
            )
            return Response(
                {'error': f'Error al mover: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # =====================================================
    # ENDPOINTS DE COLORES DE DIRECTORIOS
    # =====================================================

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='directory-colors')
    def directory_colors(self, request):
        """
        Obtener todos los colores de directorios del usuario actual.

        Query params:
        - paths: Lista de rutas separadas por coma (opcional, para filtrar)

        Returns:
        {
            "colors": {
                "/ruta1": "#FF0000",
                "/ruta2": "#00FF00",
                ...
            }
        }
        """
        user = request.user
        paths_param = request.query_params.get('paths', '')

        try:
            queryset = DirectoryColor.objects.filter(user=user)

            # Si se especifican rutas, filtrar por ellas
            if paths_param:
                paths = [p.strip() for p in paths_param.split(',') if p.strip()]
                if paths:
                    queryset = queryset.filter(directory_path__in=paths)

            # Convertir a diccionario path -> color
            colors = {dc.directory_path: dc.color for dc in queryset}

            return Response({
                'success': True,
                'colors': colors,
                'count': len(colors)
            })

        except Exception as e:
            return Response(
                {'error': f'Error al obtener colores: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='set-directory-color')
    def set_directory_color(self, request):
        """
        Establecer o actualizar el color de un directorio para el usuario actual.

        POST body:
        {
            "path": "/ruta/del/directorio",
            "color": "#FF5733"
        }

        Returns:
        {
            "success": true,
            "path": "/ruta/del/directorio",
            "color": "#FF5733"
        }
        """
        user = request.user
        path = request.data.get('path', '').strip()
        color = request.data.get('color', '').strip()

        if not path:
            return Response(
                {'error': 'La ruta es requerida'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not color:
            return Response(
                {'error': 'El color es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar formato de color hex
        import re
        if not re.match(r'^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$', color):
            return Response(
                {'error': 'El color debe estar en formato hex (#RRGGBB o #RRGGBBAA)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Crear o actualizar el color
            directory_color, created = DirectoryColor.objects.update_or_create(
                user=user,
                directory_path=path,
                defaults={'color': color}
            )

            return Response({
                'success': True,
                'path': directory_color.directory_path,
                'color': directory_color.color,
                'created': created
            })

        except Exception as e:
            return Response(
                {'error': f'Error al guardar color: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='remove-directory-color')
    def remove_directory_color(self, request):
        """
        Eliminar el color de un directorio para el usuario actual.

        POST body:
        {
            "path": "/ruta/del/directorio"
        }

        Returns:
        {
            "success": true,
            "path": "/ruta/del/directorio"
        }
        """
        user = request.user
        path = request.data.get('path', '').strip()

        if not path:
            return Response(
                {'error': 'La ruta es requerida'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            deleted_count, _ = DirectoryColor.objects.filter(
                user=user,
                directory_path=path
            ).delete()

            return Response({
                'success': True,
                'path': path,
                'deleted': deleted_count > 0
            })

        except Exception as e:
            return Response(
                {'error': f'Error al eliminar color: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='set-directory-colors-batch')
    def set_directory_colors_batch(self, request):
        """
        Establecer colores para múltiples directorios a la vez.

        POST body:
        {
            "colors": {
                "/ruta1": "#FF0000",
                "/ruta2": "#00FF00"
            }
        }

        Returns:
        {
            "success": true,
            "updated": 2
        }
        """
        user = request.user
        colors = request.data.get('colors', {})

        if not colors or not isinstance(colors, dict):
            return Response(
                {'error': 'Se requiere un objeto colors con path -> color'},
                status=status.HTTP_400_BAD_REQUEST
            )

        import re
        updated = 0
        errors = []

        for path, color in colors.items():
            path = path.strip()
            color = color.strip()

            if not path or not color:
                continue

            if not re.match(r'^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$', color):
                errors.append(f'{path}: formato de color inválido')
                continue

            try:
                DirectoryColor.objects.update_or_create(
                    user=user,
                    directory_path=path,
                    defaults={'color': color}
                )
                updated += 1
            except Exception as e:
                errors.append(f'{path}: {str(e)}')

        return Response({
            'success': len(errors) == 0,
            'updated': updated,
            'errors': errors if errors else None
        })


class StatsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para estadísticas (solo lectura)"""
    queryset = Stats.objects.all()
    serializer_class = StatsSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Retorna las estadísticas actuales"""
        stats = Stats.objects.first()

        if not stats:
            return Response({
                'total_files': 0,
                'total_directories': 0,
                'total_size': 0
            })

        return Response(StatsSerializer(stats).data)

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Retorna resumen general de estadísticas del sistema"""
        from django.utils import timezone
        from django.db.models import Count, Sum
        from datetime import timedelta

        # Estadísticas básicas
        stats = Stats.objects.first()

        # Descargas de hoy
        today = timezone.now().date()
        downloads_today = AuditLog.objects.filter(
            action='download',
            success=True,
            timestamp__date=today
        ).count()

        # Búsquedas de hoy
        searches_today = AuditLog.objects.filter(
            action='search',
            success=True,
            timestamp__date=today
        ).count()

        # Actividad de los últimos 7 días
        week_ago = timezone.now() - timedelta(days=7)
        activity_week = AuditLog.objects.filter(
            timestamp__gte=week_ago
        ).count()

        # Formatear tamaño total
        total_size_formatted = '0 B'
        if stats and stats.total_size:
            size = stats.total_size
            for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
                if size < 1024.0:
                    total_size_formatted = f"{size:.2f} {unit}"
                    break
                size /= 1024.0

        return Response({
            'success': True,
            'data': {
                'total_files': stats.total_files if stats else 0,
                'total_directories': stats.total_directories if stats else 0,
                'total_size': stats.total_size if stats else 0,
                'total_size_formatted': total_size_formatted,
                'total_downloads_today': downloads_today,
                'total_searches_today': searches_today,
                'activity_last_week': activity_week
            }
        })

    @action(detail=False, methods=['get'])
    def downloads(self, request):
        """Estadísticas de descargas"""
        from django.utils import timezone
        from datetime import timedelta

        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        downloads = AuditLog.objects.filter(
            action='download',
            success=True,
            timestamp__gte=start_date
        ).values('timestamp__date', 'target_name', 'file_size').order_by('-timestamp')

        return Response({
            'success': True,
            'data': {
                'downloads': list(downloads[:100]),
                'total': downloads.count()
            }
        })

    @action(detail=False, methods=['get'])
    def searches(self, request):
        """Estadísticas de búsquedas"""
        from django.utils import timezone
        from datetime import timedelta

        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        searches = AuditLog.objects.filter(
            action='search',
            success=True,
            timestamp__gte=start_date
        ).values('timestamp__date', 'details').order_by('-timestamp')

        return Response({
            'success': True,
            'data': {
                'searches': list(searches[:100]),
                'total': searches.count()
            }
        })

    @action(detail=False, methods=['get'])
    def top_users(self, request):
        """Usuarios más activos"""
        from django.db.models import Count

        limit = int(request.query_params.get('limit', 10))

        top_users = AuditLog.objects.filter(
            success=True
        ).values('username', 'user_role').annotate(
            action_count=Count('id')
        ).order_by('-action_count')[:limit]

        return Response({
            'success': True,
            'data': {
                'users': list(top_users),
                'total': top_users.count()
            }
        })

    @action(detail=False, methods=['get'])
    def top_files(self, request):
        """Archivos más descargados"""
        from django.db.models import Count

        limit = int(request.query_params.get('limit', 10))

        top_files = AuditLog.objects.filter(
            action='download',
            success=True
        ).values('target_name', 'target_path').annotate(
            download_count=Count('id')
        ).order_by('-download_count')[:limit]

        return Response({
            'success': True,
            'data': {
                'files': list(top_files),
                'total': top_files.count()
            }
        })


# ==============================================================================
# OFFICE ONLINE INTEGRATION VIEWS
# ==============================================================================

from rest_framework.decorators import api_view, permission_classes
from services.microsoft_service import MicrosoftGraphService
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def open_in_office_online(request):
    """
    Abre un archivo en Office Online para edición colaborativa

    POST body:
    {
        "path": "ruta/al/archivo.docx"
    }

    Returns:
    {
        "success": true,
        "edit_url": "https://...",
        "item_id": "...",
        "file_name": "archivo.docx"
    }
    """
    try:
        path = request.data.get('path')

        if not path:
            return Response(
                {'success': False, 'error': 'path requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        user_email = user.email

        if not user_email or not user_email.endswith('@igac.gov.co'):
            return Response(
                {
                    'success': False,
                    'error': 'Necesitas un correo corporativo @igac.gov.co para usar Office Online'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar permisos de lectura
        if not PermissionService.can_access_path(user, path, 'read'):
            return Response(
                {'success': False, 'error': 'No tienes permiso para acceder a este archivo'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validar que sea un archivo Office
        file_name = os.path.basename(path)
        office_extensions = ['.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt']

        if not any(file_name.lower().endswith(ext) for ext in office_extensions):
            return Response(
                {
                    'success': False,
                    'error': 'Solo se pueden editar archivos de Office (Word, Excel, PowerPoint)'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener archivo de NetApp
        smb = SMBService()
        file_info = smb.get_file_info(path)

        if not file_info['success']:
            return Response(
                {'success': False, 'error': file_info['error']},
                status=status.HTTP_404_NOT_FOUND
            )

        if file_info['is_directory']:
            return Response(
                {'success': False, 'error': 'No se puede editar un directorio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Leer contenido del archivo
        full_path = smb.build_full_path(path)
        with open(full_path, 'rb') as f:
            file_content = f.read()

        # Subir a OneDrive
        ms_service = MicrosoftGraphService()
        temp_folder = getattr(settings, 'ONEDRIVE_TEMP_FOLDER', 'NetApp_Temp')
        onedrive_path = f"{temp_folder}/{file_name}"

        logger.info(f"Uploading {file_name} to OneDrive for user {user_email}")

        upload_result = ms_service.upload_to_onedrive(
            file_path=onedrive_path,
            file_content=file_content,
            user_email=user_email
        )

        # Obtener URL de edición
        item_id = upload_result['id']
        edit_url = ms_service.get_edit_url(item_id, user_email)

        # Guardar referencia en cache para sincronizar después
        cache_key = f'office_online_{user.id}_{item_id}'
        timeout = getattr(settings, 'OFFICE_EDIT_SESSION_TIMEOUT', 3600)

        cache.set(cache_key, {
            'item_id': item_id,
            'user_email': user_email,
            'original_path': path,
            'file_name': file_name,
            'file_size': file_info.get('size', 0)
        }, timeout=timeout)

        # Registrar auditoría
        AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role,
            action='open_office_online',
            target_path=path,
            target_name=file_name,
            file_size=file_info.get('size', 0),
            details={
                'item_id': item_id,
                'onedrive_path': onedrive_path
            },
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=True
        )

        logger.info(f"File opened in Office Online: {file_name} (item_id: {item_id})")

        return Response({
            'success': True,
            'edit_url': edit_url,
            'item_id': item_id,
            'file_name': file_name,
            'cache_key': cache_key
        })

    except Exception as e:
        logger.error(f"Error opening file in Office Online: {str(e)}", exc_info=True)

        # Registrar error en auditoría
        AuditLog.objects.create(
            user=request.user,
            username=request.user.username,
            user_role=request.user.role,
            action='open_office_online',
            target_path=request.data.get('path', ''),
            target_name=os.path.basename(request.data.get('path', '')),
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=False,
            error_message=str(e)
        )

        return Response(
            {'success': False, 'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_from_office_online(request):
    """
    Guarda un archivo editado desde Office Online de vuelta a NetApp

    POST body:
    {
        "cache_key": "office_online_123_xxx"
    }

    Returns:
    {
        "success": true,
        "message": "Archivo guardado exitosamente"
    }
    """
    try:
        cache_key = request.data.get('cache_key')

        if not cache_key:
            return Response(
                {'success': False, 'error': 'cache_key requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener información de cache
        session_info = cache.get(cache_key)

        if not session_info:
            return Response(
                {
                    'success': False,
                    'error': 'Sesión expirada o inválida. El archivo debe guardarse manualmente.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        item_id = session_info['item_id']
        user_email = session_info['user_email']
        original_path = session_info['original_path']
        file_name = session_info['file_name']

        # Verificar permisos de escritura
        if not PermissionService.can_access_path(user, original_path, 'write'):
            return Response(
                {'success': False, 'error': 'No tienes permiso de escritura en esta ruta'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Descargar archivo actualizado de OneDrive
        ms_service = MicrosoftGraphService()

        logger.info(f"Downloading updated file from OneDrive: {item_id}")

        file_content = ms_service.download_from_onedrive(
            item_id=item_id,
            user_email=user_email
        )

        # Guardar en NetApp
        smb = SMBService()
        full_path = smb.build_full_path(original_path)

        with open(full_path, 'wb') as f:
            f.write(file_content)

        # Eliminar archivo temporal de OneDrive (opcional)
        ms_service.delete_from_onedrive(item_id, user_email)

        # Limpiar cache
        cache.delete(cache_key)

        # Registrar auditoría
        AuditLog.objects.create(
            user=user,
            username=user.username,
            user_role=user.role,
            action='save_from_office_online',
            target_path=original_path,
            target_name=file_name,
            file_size=len(file_content),
            details={
                'item_id': item_id,
                'bytes_saved': len(file_content)
            },
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=True
        )

        logger.info(f"File saved successfully to NetApp: {original_path}")

        return Response({
            'success': True,
            'message': 'Archivo guardado exitosamente en NetApp',
            'path': original_path,
            'size': len(file_content)
        })

    except Exception as e:
        logger.error(f"Error saving file from Office Online: {str(e)}", exc_info=True)

        # Registrar error
        AuditLog.objects.create(
            user=request.user,
            username=request.user.username,
            user_role=request.user.role,
            action='save_from_office_online',
            target_path=session_info.get('original_path', '') if session_info else '',
            target_name=session_info.get('file_name', '') if session_info else '',
            ip_address=getattr(request, 'client_ip', None),
            user_agent=getattr(request, 'user_agent', None),
            success=False,
            error_message=str(e)
        )

        return Response(
            {'success': False, 'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
