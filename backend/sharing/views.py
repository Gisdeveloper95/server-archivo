from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.http import FileResponse
from django.contrib.auth.hashers import make_password, check_password
from django.conf import settings
import os
import tarfile
import tempfile

from .models import ShareLink, ShareLinkAccess
from .serializers import ShareLinkSerializer, ShareLinkCreateSerializer, ShareLinkAccessSerializer
from services.smb_service import SMBService


class ShareLinkViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de links compartidos (SOLO SUPERADMIN)"""
    queryset = ShareLink.objects.all()
    serializer_class = ShareLinkSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Desactivar paginación para este ViewSet
    
    def get_queryset(self):
        if self.request.user.role != 'superadmin':
            return ShareLink.objects.none()
        return ShareLink.objects.all()

    @action(detail=False, methods=['post'])
    def create_share(self, request):
        """Crear nuevo link compartido (SOLO SUPERADMIN)"""
        if request.user.role != 'superadmin':
            return Response({'error': 'Solo superadministradores'}, status=403)
        
        serializer = ShareLinkCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        
        data = serializer.validated_data
        smb = SMBService()
        full_path = smb.build_full_path(data['path'])
        
        if not os.path.exists(full_path):
            return Response({'error': 'Archivo no existe'}, status=404)
        
        share_link = ShareLink.objects.create(
            path=data['path'],
            is_directory=os.path.isdir(full_path),
            permission=data.get('permission', 'view'),
            password=make_password(data['password']) if data.get('password') else None,
            require_email=data.get('require_email', False),
            allowed_domain=data.get('allowed_domain'),
            expires_at=data.get('expires_at'),
            max_downloads=data.get('max_downloads'),
            description=data.get('description', ''),
            created_by=request.user
        )
        
        return Response({
            'success': True,
            'share_link': ShareLinkSerializer(share_link).data,
            'url': share_link.full_url
        }, status=201)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Desactivar link"""
        if request.user.role != 'superadmin':
            return Response({'error': 'Permiso denegado'}, status=403)
        
        share_link = self.get_object()
        share_link.is_active = False
        share_link.deactivated_at = timezone.now()
        share_link.deactivated_by = request.user
        share_link.save()
        
        return Response({'success': True})
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Estadísticas del link"""
        if request.user.role != 'superadmin':
            return Response({'error': 'Permiso denegado'}, status=403)
        
        share_link = self.get_object()
        accesses = ShareLinkAccessSerializer(
            share_link.accesses.all()[:10], many=True
        ).data
        
        return Response({
            'access_count': share_link.access_count,
            'download_count': share_link.download_count,
            'last_accessed': share_link.last_accessed_at,
            'is_valid': share_link.is_valid,
            'is_expired': share_link.is_expired,
            'recent_accesses': accesses
        })
    
    def access(self, request, token=None):
        """Acceso público: retorna metadata del archivo/directorio compartido"""
        password = request.GET.get('password')
        email = request.GET.get('email')
        subpath = request.GET.get('path', '')  # Ruta relativa dentro del compartido

        if not token:
            return Response({'error': 'Token requerido'}, status=400)

        try:
            share_link = ShareLink.objects.get(token=token)
        except ShareLink.DoesNotExist:
            return Response({'error': 'Link inválido'}, status=404)

        if not share_link.is_valid:
            return Response({'error': 'Link expirado o inactivo'}, status=410)

        if share_link.password and not check_password(password or '', share_link.password):
            return Response({'error': 'Contraseña incorrecta'}, status=401)

        if share_link.require_email:
            if not email:
                return Response({'error': 'Email requerido'}, status=400)
            if share_link.allowed_domain and email.split('@')[-1] != share_link.allowed_domain:
                return Response({'error': f'Solo @{share_link.allowed_domain}'}, status=403)

        try:
            # Verificar si es un item de papelera
            if share_link.trash_item:
                return self._access_trash_item(request, share_link, email)

            smb = SMBService()
            base_path = smb.build_full_path(share_link.path)

            # Construir ruta completa con subpath
            if subpath:
                # Validar que no intente salir del directorio compartido
                full_path = os.path.join(base_path, subpath)
                full_path = os.path.abspath(full_path)
                if not full_path.startswith(base_path):
                    return Response({'error': 'Acceso denegado'}, status=403)
            else:
                full_path = base_path

            if not os.path.exists(full_path):
                return Response({'error': 'Ruta no encontrada'}, status=404)

            # Registrar acceso
            share_link.access_count += 1
            share_link.last_accessed_at = timezone.now()
            share_link.save()

            ShareLinkAccess.objects.create(
                share_link=share_link,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                email_provided=email,
                action='view',
                success=True
            )

            # Retornar metadata del contenido
            if os.path.isdir(full_path):
                # Listar archivos del directorio
                items = []
                for item_name in os.listdir(full_path):
                    item_path = os.path.join(full_path, item_name)
                    try:
                        stat = os.stat(item_path)
                        items.append({
                            'name': item_name,
                            'is_directory': os.path.isdir(item_path),
                            'size': stat.st_size if not os.path.isdir(item_path) else None,
                            'modified': timezone.datetime.fromtimestamp(stat.st_mtime).isoformat()
                        })
                    except Exception:
                        continue

                return Response({
                    'success': True,
                    'share_link': {
                        'path': share_link.path,
                        'is_directory': share_link.is_directory,
                        'permission': share_link.permission,
                        'description': share_link.description,
                        'created_at': share_link.created_at,
                    },
                    'current_path': subpath,
                    'items': sorted(items, key=lambda x: (not x['is_directory'], x['name'].lower()))
                })
            else:
                # Metadata de archivo único
                stat = os.stat(full_path)
                return Response({
                    'success': True,
                    'share_link': {
                        'path': share_link.path,
                        'is_directory': False,
                        'permission': share_link.permission,
                        'description': share_link.description,
                        'created_at': share_link.created_at,
                    },
                    'file': {
                        'name': os.path.basename(full_path),
                        'size': stat.st_size,
                        'modified': timezone.datetime.fromtimestamp(stat.st_mtime).isoformat()
                    }
                })

        except Exception as e:
            import traceback
            traceback.print_exc()
            ShareLinkAccess.objects.create(
                share_link=share_link,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                email_provided=email,
                action='denied',
                success=False,
                error_message=str(e)
            )
            return Response({'error': f'Error al acceder: {str(e)}'}, status=500)

    def _access_trash_item(self, request, share_link, email):
        """Acceso a item de papelera"""
        trash_item = share_link.trash_item
        subpath = request.GET.get('path', '')  # Ruta dentro del tar.gz

        # Verificar que el item existe y está almacenado
        if trash_item.status != 'stored':
            return Response({'error': 'Item no disponible'}, status=410)

        # Obtener ruta del archivo en papelera
        trash_file_path = trash_item.get_trash_file_path()

        if not os.path.exists(trash_file_path):
            return Response({'error': 'Archivo no encontrado en papelera'}, status=404)

        # Registrar acceso
        share_link.access_count += 1
        share_link.last_accessed_at = timezone.now()
        share_link.save()

        ShareLinkAccess.objects.create(
            share_link=share_link,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            email_provided=email,
            action='view',
            success=True
        )

        # Si es directorio, listar contenido del tar.gz
        if trash_item.is_directory:
            items = []
            try:
                with tarfile.open(trash_file_path, 'r:gz') as tar:
                    # Obtener el nombre raíz del directorio (primer componente)
                    root_name = None
                    for member in tar.getmembers():
                        if member.isdir():
                            parts = member.name.rstrip('/').split('/')
                            if len(parts) == 1:
                                root_name = parts[0]
                                break

                    # Construir el prefijo para filtrar
                    if subpath:
                        # Si hay subpath, buscar dentro de ese directorio
                        prefix = subpath.rstrip('/') + '/'
                    elif root_name:
                        # Si no hay subpath, mostrar contenido del directorio raíz
                        prefix = root_name + '/'
                    else:
                        prefix = ''

                    seen_names = set()
                    for member in tar.getmembers():
                        member_path = member.name.rstrip('/')

                        # Si tenemos prefijo, filtrar por él
                        if prefix:
                            if not member_path.startswith(prefix):
                                continue
                            # Obtener la parte relativa al prefijo
                            relative = member_path[len(prefix):]
                            if not relative:
                                continue  # Es el directorio actual, skip
                        else:
                            relative = member_path

                        # Solo mostrar primer nivel (sin más /)
                        if '/' in relative:
                            # Es un subdirectorio o archivo dentro de subdirectorio
                            # Mostrar solo el directorio padre
                            first_part = relative.split('/')[0]
                            if first_part not in seen_names:
                                seen_names.add(first_part)
                                items.append({
                                    'name': first_part,
                                    'is_directory': True,
                                    'size': None,
                                    'modified': None
                                })
                        else:
                            # Es un archivo o directorio de primer nivel
                            if relative not in seen_names:
                                seen_names.add(relative)
                                items.append({
                                    'name': relative,
                                    'is_directory': member.isdir(),
                                    'size': member.size if not member.isdir() else None,
                                    'modified': timezone.datetime.fromtimestamp(member.mtime).isoformat() if member.mtime else None
                                })

            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response({'error': f'Error leyendo contenido: {str(e)}'}, status=500)

            return Response({
                'success': True,
                'is_trash_item': True,
                'current_path': subpath,
                'share_link': {
                    'path': trash_item.original_path,
                    'is_directory': True,
                    'permission': share_link.permission,
                    'description': share_link.description or f'Archivo eliminado: {trash_item.original_name}',
                    'created_at': share_link.created_at,
                },
                'trash_info': {
                    'original_name': trash_item.original_name,
                    'deleted_at': trash_item.deleted_at.isoformat(),
                    'expires_at': trash_item.expires_at.isoformat(),
                    'file_count': trash_item.file_count,
                    'dir_count': trash_item.dir_count,
                },
                'items': sorted(items, key=lambda x: (not x['is_directory'], x['name'].lower()))
            })
        else:
            # Archivo individual
            stat = os.stat(trash_file_path)
            return Response({
                'success': True,
                'is_trash_item': True,
                'current_path': '',
                'share_link': {
                    'path': trash_item.original_path,
                    'is_directory': False,
                    'permission': share_link.permission,
                    'description': share_link.description or f'Archivo eliminado: {trash_item.original_name}',
                    'created_at': share_link.created_at,
                },
                'trash_info': {
                    'original_name': trash_item.original_name,
                    'deleted_at': trash_item.deleted_at.isoformat(),
                    'expires_at': trash_item.expires_at.isoformat(),
                },
                'file': {
                    'name': trash_item.original_name,
                    'size': trash_item.size_bytes,
                    'mime_type': trash_item.mime_type,
                }
            })

    def download(self, request, token=None):
        """Descargar archivo individual desde link público"""
        file_path = request.GET.get('file')
        password = request.GET.get('password')
        email = request.GET.get('email')

        if not token:
            return Response({'error': 'Token requerido'}, status=400)

        try:
            share_link = ShareLink.objects.get(token=token)
        except ShareLink.DoesNotExist:
            return Response({'error': 'Link inválido'}, status=404)

        if not share_link.is_valid:
            return Response({'error': 'Link expirado o inactivo'}, status=410)

        if share_link.permission != 'download':
            return Response({'error': 'Descarga no permitida'}, status=403)

        if share_link.password and not check_password(password or '', share_link.password):
            return Response({'error': 'Contraseña incorrecta'}, status=401)

        if share_link.require_email:
            if not email:
                return Response({'error': 'Email requerido'}, status=400)
            if share_link.allowed_domain and email.split('@')[-1] != share_link.allowed_domain:
                return Response({'error': f'Solo @{share_link.allowed_domain}'}, status=403)

        try:
            # Verificar si es un item de papelera
            if share_link.trash_item:
                return self._download_trash_item(request, share_link, email)

            smb = SMBService()
            base_path = smb.build_full_path(share_link.path)

            # Si file_path está especificado, es un archivo dentro del directorio
            if file_path:
                # Validar que el archivo está dentro del directorio compartido
                full_path = os.path.join(base_path, file_path)
                full_path = os.path.abspath(full_path)
                if not full_path.startswith(base_path):
                    return Response({'error': 'Acceso denegado'}, status=403)
            else:
                full_path = base_path

            if not os.path.exists(full_path):
                return Response({'error': 'Archivo no encontrado'}, status=404)

            # Registrar descarga
            share_link.download_count += 1
            share_link.save()

            ShareLinkAccess.objects.create(
                share_link=share_link,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                email_provided=email,
                action='download',
                success=True
            )

            # Si es directorio, crear ZIP
            if os.path.isdir(full_path):
                import zipfile

                temp_file = tempfile.NamedTemporaryFile(delete=True, suffix='.zip')
                with zipfile.ZipFile(temp_file, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    for root, dirs, files in os.walk(full_path):
                        for file in files:
                            file_path_abs = os.path.join(root, file)
                            arcname = os.path.relpath(file_path_abs, full_path)
                            try:
                                zip_file.write(file_path_abs, arcname)
                            except Exception:
                                continue

                temp_file.seek(0)
                response = FileResponse(
                    temp_file,
                    content_type='application/zip',
                    as_attachment=True,
                    filename=f"{os.path.basename(full_path)}.zip"
                )
                return response
            else:
                # Descargar archivo individual
                response = FileResponse(
                    open(full_path, 'rb'),
                    as_attachment=True,
                    filename=os.path.basename(full_path)
                )
                return response

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': f'Error al descargar: {str(e)}'}, status=500)

    def _download_trash_item(self, request, share_link, email):
        """Descargar item de papelera"""
        trash_item = share_link.trash_item

        # Verificar que el item existe y está almacenado
        if trash_item.status != 'stored':
            return Response({'error': 'Item no disponible'}, status=410)

        # Obtener ruta del archivo en papelera
        trash_file_path = trash_item.get_trash_file_path()

        if not os.path.exists(trash_file_path):
            return Response({'error': 'Archivo no encontrado en papelera'}, status=404)

        # Registrar descarga
        share_link.download_count += 1
        share_link.save()

        ShareLinkAccess.objects.create(
            share_link=share_link,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            email_provided=email,
            action='download',
            success=True
        )

        # Para directorios (tar.gz), enviar directamente el tar.gz
        if trash_item.is_directory:
            response = FileResponse(
                open(trash_file_path, 'rb'),
                content_type='application/gzip',
                as_attachment=True,
                filename=f"{trash_item.original_name}.tar.gz"
            )
            return response
        else:
            # Para archivos individuales (.data), enviar con el nombre original
            response = FileResponse(
                open(trash_file_path, 'rb'),
                content_type=trash_item.mime_type or 'application/octet-stream',
                as_attachment=True,
                filename=trash_item.original_name
            )
            return response
