"""
Endpoints para copiar y mover archivos/directorios
Agregar estos métodos a la clase FileViewSet en files/views_new.py
"""

    @action(detail=False, methods=['post'])
    def copy_item(self, request):
        """
        POST /api/files/copy_item/
        Body: {
            "source_path": "/ruta/origen/archivo.pdf",
            "dest_path": "/ruta/destino/archivo.pdf",
            "overwrite": false,  # opcional, para forzar sobrescritura
            "rename_if_exists": false  # opcional, renombrar automáticamente si existe
        }

        Copia un archivo o directorio desde origen a destino
        Valida permisos: can_read en origen, can_write en destino
        Registra en auditoría solo si se completa
        """
        error_response = self._check_netapp_connection()
        if error_response:
            return error_response

        source_path = request.data.get('source_path')
        dest_path = request.data.get('dest_path')
        overwrite = request.data.get('overwrite', False)
        rename_if_exists = request.data.get('rename_if_exists', False)
        user = request.user
        client_info = self._get_client_info(request)

        if not source_path or not dest_path:
            return Response(
                {'error': 'source_path y dest_path requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar permiso de lectura en origen
        if not user.has_permission_for_path(source_path, 'read'):
            # Registrar intento fallido
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
                **client_info,
                success=False,
                error_message='No tienes permiso de lectura en la ruta origen'
            )

            return Response(
                {'error': 'No tienes permiso de lectura en la ruta origen'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar permiso de escritura en destino
        dest_parent = os.path.dirname(dest_path)
        if not user.has_permission_for_path(dest_parent, 'write'):
            # Registrar intento fallido
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
                **client_info,
                success=False,
                error_message='No tienes permiso de escritura en la ruta destino'
            )

            return Response(
                {'error': 'No tienes permiso de escritura en la ruta destino'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Copiar el item
        try:
            # Si hay conflicto y se debe renombrar automáticamente
            if rename_if_exists and self.netapp.file_exists(dest_path):
                dest_name = self.netapp.get_unique_name(dest_path)
                dest_parent_dir = os.path.dirname(dest_path)
                dest_path = os.path.join(dest_parent_dir, dest_name) if dest_parent_dir else dest_name

            result = self.netapp.copy_item(source_path, dest_path)

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
                        **client_info,
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
                action='copy',
                target_path=source_path,
                target_name=os.path.basename(source_path),
                file_size=result.get('size'),
                details={
                    'source_path': result['source_path'],
                    'dest_path': result['dest_path'],
                    'is_directory': result['is_directory'],
                    'file_count': result.get('file_count', 1)
                },
                **client_info,
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
                **client_info,
                success=False,
                error_message=str(e)
            )

            return Response(
                {'error': f'Error al copiar: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def move_item(self, request):
        """
        POST /api/files/move_item/
        Body: {
            "source_path": "/ruta/origen/archivo.pdf",
            "dest_path": "/ruta/destino/archivo.pdf",
            "overwrite": false,  # opcional, para forzar sobrescritura
            "rename_if_exists": false  # opcional, renombrar automáticamente si existe
        }

        Mueve un archivo o directorio desde origen a destino
        Valida permisos: can_delete en origen, can_write en destino
        Registra en auditoría solo si se completa
        """
        error_response = self._check_netapp_connection()
        if error_response:
            return error_response

        source_path = request.data.get('source_path')
        dest_path = request.data.get('dest_path')
        overwrite = request.data.get('overwrite', False)
        rename_if_exists = request.data.get('rename_if_exists', False)
        user = request.user
        client_info = self._get_client_info(request)

        if not source_path or not dest_path:
            return Response(
                {'error': 'source_path y dest_path requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar permiso de eliminación en origen (porque se mueve/elimina del origen)
        if not user.has_permission_for_path(source_path, 'delete'):
            # Registrar intento fallido
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
                **client_info,
                success=False,
                error_message='No tienes permiso de eliminación en la ruta origen (requerido para mover)'
            )

            return Response(
                {'error': 'No tienes permiso de eliminación en la ruta origen (requerido para mover)'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar permiso de escritura en destino
        dest_parent = os.path.dirname(dest_path)
        if not user.has_permission_for_path(dest_parent, 'write'):
            # Registrar intento fallido
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
                **client_info,
                success=False,
                error_message='No tienes permiso de escritura en la ruta destino'
            )

            return Response(
                {'error': 'No tienes permiso de escritura en la ruta destino'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Mover el item
        try:
            # Si hay conflicto y se debe renombrar automáticamente
            if rename_if_exists and self.netapp.file_exists(dest_path):
                dest_name = self.netapp.get_unique_name(dest_path)
                dest_parent_dir = os.path.dirname(dest_path)
                dest_path = os.path.join(dest_parent_dir, dest_name) if dest_parent_dir else dest_name

            result = self.netapp.move_item(source_path, dest_path)

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
                        **client_info,
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
                **client_info,
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
                **client_info,
                success=False,
                error_message=str(e)
            )

            return Response(
                {'error': f'Error al mover: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
