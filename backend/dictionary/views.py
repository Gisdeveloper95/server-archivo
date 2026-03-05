"""
Views para gestión del diccionario de datos
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from dictionary.models import DictionaryEntry, AIGeneratedAbbreviation
from dictionary.serializers import (
    DictionaryEntrySerializer,
    DictionaryEntryListSerializer,
    AIGeneratedAbbreviationSerializer,
    AIGeneratedAbbreviationListSerializer
)
from utils.dictionary_validator import DictionaryValidator
import csv


class DictionaryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD completo del diccionario

    Permisos:
    - Listar/Ver: Cualquier usuario autenticado
    - Crear/Editar/Eliminar: Solo superadmin o usuarios con can_manage_dictionary=True
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DictionaryEntrySerializer
    queryset = DictionaryEntry.objects.all().order_by('key')

    def get_queryset(self):
        """Filtrar entradas según búsqueda"""
        queryset = super().get_queryset()

        # Filtro de búsqueda
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(key__icontains=search) | Q(value__icontains=search)
            )

        # Filtro por activo/inactivo
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_active=is_active_bool)

        return queryset

    def get_serializer_class(self):
        """Usar serializer simplificado para list"""
        if self.action == 'list':
            return DictionaryEntryListSerializer
        return DictionaryEntrySerializer

    def _check_permission_to_modify(self, user):
        """Verificar si el usuario tiene permiso para modificar el diccionario"""
        if user.role == 'superadmin':
            return None

        if user.can_manage_dictionary:
            return None

        return Response(
            {'error': 'No tienes permiso para modificar el diccionario. Contacta a un superadministrador.'},
            status=status.HTTP_403_FORBIDDEN
        )

    def list(self, request):
        """
        GET /api/dictionary/
        Lista todas las entradas del diccionario

        Query params:
        - search: Buscar por término o descripción
        - is_active: Filtrar por estado (true/false)
        - page: Número de página
        - page_size: Tamaño de página
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Paginación
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': queryset.count()
        })

    def retrieve(self, request, pk=None):
        """
        GET /api/dictionary/{id}/
        Obtiene una entrada específica del diccionario
        """
        try:
            entry = self.get_object()
            serializer = DictionaryEntrySerializer(entry)
            return Response(serializer.data)
        except DictionaryEntry.DoesNotExist:
            return Response(
                {'error': 'Entrada no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

    def create(self, request):
        """
        POST /api/dictionary/
        Crea una nueva entrada en el diccionario

        Body:
        {
            "key": "nuevo_termino",
            "value": "Descripción completa del término",
            "is_active": true
        }
        """
        # Verificar permisos
        error = self._check_permission_to_modify(request.user)
        if error:
            return error

        serializer = DictionaryEntrySerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(created_by=request.user)

            # Invalidar cache del validador
            validator = DictionaryValidator()
            validator.invalidate_cache()

            return Response(
                {
                    'message': 'Término creado exitosamente',
                    'entry': serializer.data
                },
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """
        PUT /api/dictionary/{id}/
        Actualiza completamente una entrada del diccionario
        """
        # Verificar permisos
        error = self._check_permission_to_modify(request.user)
        if error:
            return error

        try:
            entry = self.get_object()
        except DictionaryEntry.DoesNotExist:
            return Response(
                {'error': 'Entrada no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DictionaryEntrySerializer(entry, data=request.data)

        if serializer.is_valid():
            serializer.save(updated_by=request.user)

            # Invalidar cache del validador
            validator = DictionaryValidator()
            validator.invalidate_cache()

            return Response({
                'message': 'Término actualizado exitosamente',
                'entry': serializer.data
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        """
        PATCH /api/dictionary/{id}/
        Actualiza parcialmente una entrada del diccionario
        """
        # Verificar permisos
        error = self._check_permission_to_modify(request.user)
        if error:
            return error

        try:
            entry = self.get_object()
        except DictionaryEntry.DoesNotExist:
            return Response(
                {'error': 'Entrada no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DictionaryEntrySerializer(entry, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save(updated_by=request.user)

            # Invalidar cache del validador
            validator = DictionaryValidator()
            validator.invalidate_cache()

            return Response({
                'message': 'Término actualizado exitosamente',
                'entry': serializer.data
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        """
        DELETE /api/dictionary/{id}/
        Elimina una entrada del diccionario
        """
        # Verificar permisos
        error = self._check_permission_to_modify(request.user)
        if error:
            return error

        try:
            entry = self.get_object()
        except DictionaryEntry.DoesNotExist:
            return Response(
                {'error': 'Entrada no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        key = entry.key
        entry.delete()

        # Invalidar cache del validador
        validator = DictionaryValidator()
        validator.invalidate_cache()

        return Response({
            'message': f'Término "{key}" eliminado exitosamente'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        GET /api/dictionary/active/
        Obtiene solo las entradas activas (para validación en tiempo real)
        """
        active_entries = DictionaryEntry.objects.filter(is_active=True).values('key', 'value')
        return Response({
            'entries': list(active_entries),
            'count': active_entries.count()
        })

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        """
        POST /api/dictionary/{id}/toggle-active/
        Activa/desactiva una entrada del diccionario
        """
        # Verificar permisos
        error = self._check_permission_to_modify(request.user)
        if error:
            return error

        try:
            entry = self.get_object()
        except DictionaryEntry.DoesNotExist:
            return Response(
                {'error': 'Entrada no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        entry.is_active = not entry.is_active
        entry.updated_by = request.user
        entry.save()

        # Invalidar cache del validador
        validator = DictionaryValidator()
        validator.invalidate_cache()

        return Response({
            'message': f'Término "{entry.key}" {"activado" if entry.is_active else "desactivado"}',
            'is_active': entry.is_active
        })

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """
        GET /api/dictionary/export-csv/
        Exporta el diccionario completo a CSV (accesible para todos los usuarios)
        """
        # Crear respuesta HTTP con tipo CSV
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="diccionario_igac.csv"'

        # Agregar BOM para Excel
        response.write('\ufeff')

        # Crear writer CSV
        writer = csv.writer(response)

        # Escribir encabezados
        writer.writerow(['Término', 'Descripción', 'Estado', 'Fecha de Creación', 'Última Actualización'])

        # Obtener todas las entradas ordenadas por key
        entries = DictionaryEntry.objects.all().order_by('key')

        # Escribir datos
        for entry in entries:
            writer.writerow([
                entry.key,
                entry.value,
                'Activo' if entry.is_active else 'Inactivo',
                entry.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                entry.updated_at.strftime('%Y-%m-%d %H:%M:%S')
            ])

        return response


class AIGeneratedAbbreviationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar abreviaciones generadas por IA

    Permisos:
    - Listar/Ver: Solo superadmin o usuarios con can_manage_dictionary=True
    - Aprobar/Rechazar/Corregir: Solo superadmin o usuarios con can_manage_dictionary=True
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AIGeneratedAbbreviationSerializer
    queryset = AIGeneratedAbbreviation.objects.all().order_by('-times_used', '-created_at')

    def get_queryset(self):
        """Filtrar abreviaciones según parámetros"""
        queryset = super().get_queryset()

        # Filtro por estado
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filtro de búsqueda
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(original_word__icontains=search) | Q(abbreviation__icontains=search)
            )

        return queryset

    def get_serializer_class(self):
        """Usar serializer simplificado para list"""
        if self.action == 'list':
            return AIGeneratedAbbreviationListSerializer
        return AIGeneratedAbbreviationSerializer

    def _check_permission(self, user):
        """Verificar si el usuario tiene permiso para ver/gestionar sugerencias"""
        if user.role == 'superadmin':
            return None
        if user.can_manage_dictionary:
            return None
        return Response(
            {'error': 'No tienes permiso para gestionar sugerencias de IA.'},
            status=status.HTTP_403_FORBIDDEN
        )

    def list(self, request):
        """
        GET /api/ai-abbreviations/
        Lista todas las abreviaciones generadas por IA

        Query params:
        - status: pending, approved, rejected, corrected
        - search: Buscar por palabra original o abreviación
        """
        error = self._check_permission(request.user)
        if error:
            return error

        queryset = self.filter_queryset(self.get_queryset())

        # Paginación
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': queryset.count()
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        GET /api/ai-abbreviations/summary/
        Obtiene resumen de estadísticas de abreviaciones generadas
        """
        error = self._check_permission(request.user)
        if error:
            return error

        total = AIGeneratedAbbreviation.objects.count()
        pending = AIGeneratedAbbreviation.objects.filter(status='pending').count()
        approved = AIGeneratedAbbreviation.objects.filter(status='approved').count()
        rejected = AIGeneratedAbbreviation.objects.filter(status='rejected').count()
        corrected = AIGeneratedAbbreviation.objects.filter(status='corrected').count()

        # Top 10 más usados
        top_used = AIGeneratedAbbreviation.objects.order_by('-times_used')[:10]

        return Response({
            'total': total,
            'pending': pending,
            'approved': approved,
            'rejected': rejected,
            'corrected': corrected,
            'top_used': AIGeneratedAbbreviationListSerializer(top_used, many=True).data
        })

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        POST /api/ai-abbreviations/{id}/approve/
        Aprueba una abreviación generada por IA
        """
        error = self._check_permission(request.user)
        if error:
            return error

        try:
            abbrev = self.get_object()
        except AIGeneratedAbbreviation.DoesNotExist:
            return Response(
                {'error': 'Abreviación no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        abbrev.status = 'approved'
        abbrev.reviewed_by = request.user
        abbrev.reviewed_at = timezone.now()
        abbrev.save()

        return Response({
            'message': f'Abreviación "{abbrev.original_word}" -> "{abbrev.abbreviation}" aprobada',
            'entry': AIGeneratedAbbreviationSerializer(abbrev).data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        POST /api/ai-abbreviations/{id}/reject/
        Rechaza una abreviación generada por IA
        """
        error = self._check_permission(request.user)
        if error:
            return error

        try:
            abbrev = self.get_object()
        except AIGeneratedAbbreviation.DoesNotExist:
            return Response(
                {'error': 'Abreviación no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        abbrev.status = 'rejected'
        abbrev.reviewed_by = request.user
        abbrev.reviewed_at = timezone.now()
        abbrev.save()

        return Response({
            'message': f'Abreviación "{abbrev.original_word}" -> "{abbrev.abbreviation}" rechazada',
            'entry': AIGeneratedAbbreviationSerializer(abbrev).data
        })

    @action(detail=True, methods=['post'])
    def correct(self, request, pk=None):
        """
        POST /api/ai-abbreviations/{id}/correct/
        Corrige una abreviación generada por IA

        Body:
        {
            "new_abbreviation": "nueva_abrev"
        }
        """
        error = self._check_permission(request.user)
        if error:
            return error

        try:
            abbrev = self.get_object()
        except AIGeneratedAbbreviation.DoesNotExist:
            return Response(
                {'error': 'Abreviación no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        new_abbrev = request.data.get('new_abbreviation', '').strip().lower()
        if not new_abbrev:
            return Response(
                {'error': 'Debe proporcionar la nueva abreviación'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Guardar la abreviación original de la IA
        if not abbrev.original_ai_abbreviation:
            abbrev.original_ai_abbreviation = abbrev.abbreviation

        abbrev.abbreviation = new_abbrev
        abbrev.status = 'corrected'
        abbrev.reviewed_by = request.user
        abbrev.reviewed_at = timezone.now()
        abbrev.save()

        return Response({
            'message': f'Abreviación corregida: "{abbrev.original_word}" -> "{new_abbrev}"',
            'entry': AIGeneratedAbbreviationSerializer(abbrev).data
        })

    @action(detail=True, methods=['post'], url_path='add-to-dictionary')
    def add_to_dictionary(self, request, pk=None):
        """
        POST /api/ai-abbreviations/{id}/add-to-dictionary/
        Agrega la abreviación al diccionario oficial
        """
        error = self._check_permission(request.user)
        if error:
            return error

        try:
            abbrev = self.get_object()
        except AIGeneratedAbbreviation.DoesNotExist:
            return Response(
                {'error': 'Abreviación no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar si ya existe en el diccionario
        if DictionaryEntry.objects.filter(key=abbrev.abbreviation).exists():
            return Response(
                {'error': f'El término "{abbrev.abbreviation}" ya existe en el diccionario'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear entrada en diccionario
        entry = DictionaryEntry.objects.create(
            key=abbrev.abbreviation,
            value=abbrev.original_word,
            is_active=True,
            created_by=request.user
        )

        # Marcar como aprobada
        abbrev.status = 'approved'
        abbrev.reviewed_by = request.user
        abbrev.reviewed_at = timezone.now()
        abbrev.save()

        # Invalidar cache del validador
        validator = DictionaryValidator()
        validator.invalidate_cache()

        return Response({
            'message': f'Término "{abbrev.abbreviation}" agregado al diccionario oficial',
            'dictionary_entry': DictionaryEntrySerializer(entry).data,
            'ai_abbreviation': AIGeneratedAbbreviationSerializer(abbrev).data
        })

    @action(detail=False, methods=['post'], url_path='bulk-approve')
    def bulk_approve(self, request):
        """
        POST /api/ai-abbreviations/bulk-approve/
        Aprueba múltiples abreviaciones de IA

        Body:
        {
            "ids": [1, 2, 3, ...]  // Lista de IDs a aprobar
            "all_pending": true    // O aprobar todas las pendientes
        }
        """
        error = self._check_permission(request.user)
        if error:
            return error

        ids = request.data.get('ids', [])
        all_pending = request.data.get('all_pending', False)

        if all_pending:
            # Aprobar todas las pendientes
            abbrevs = AIGeneratedAbbreviation.objects.filter(status='pending')
        elif ids:
            # Aprobar solo las IDs especificadas
            abbrevs = AIGeneratedAbbreviation.objects.filter(id__in=ids, status='pending')
        else:
            return Response(
                {'error': 'Debe proporcionar IDs o all_pending=true'},
                status=status.HTTP_400_BAD_REQUEST
            )

        count = abbrevs.count()
        if count == 0:
            return Response({
                'message': 'No hay abreviaciones pendientes para aprobar',
                'approved_count': 0
            })

        # Aprobar todas
        now = timezone.now()
        abbrevs.update(
            status='approved',
            reviewed_by=request.user,
            reviewed_at=now
        )

        return Response({
            'message': f'{count} abreviaciones aprobadas exitosamente',
            'approved_count': count
        })

    @action(detail=False, methods=['post'], url_path='bulk-add-to-dictionary')
    def bulk_add_to_dictionary(self, request):
        """
        POST /api/ai-abbreviations/bulk-add-to-dictionary/
        Agrega múltiples abreviaciones aprobadas al diccionario oficial

        Body:
        {
            "ids": [1, 2, 3, ...]  // Lista de IDs a agregar
            "all_approved": true   // O agregar todas las aprobadas/corregidas
        }
        """
        error = self._check_permission(request.user)
        if error:
            return error

        ids = request.data.get('ids', [])
        all_approved = request.data.get('all_approved', False)

        if all_approved:
            # Agregar todas las aprobadas y corregidas
            abbrevs = AIGeneratedAbbreviation.objects.filter(
                status__in=['approved', 'corrected']
            )
        elif ids:
            # Agregar solo las IDs especificadas
            abbrevs = AIGeneratedAbbreviation.objects.filter(
                id__in=ids,
                status__in=['approved', 'corrected']
            )
        else:
            return Response(
                {'error': 'Debe proporcionar IDs o all_approved=true'},
                status=status.HTTP_400_BAD_REQUEST
            )

        added_count = 0
        skipped_count = 0
        errors = []

        for abbrev in abbrevs:
            # Verificar si ya existe en el diccionario
            if DictionaryEntry.objects.filter(key=abbrev.abbreviation).exists():
                skipped_count += 1
                continue

            try:
                DictionaryEntry.objects.create(
                    key=abbrev.abbreviation,
                    value=abbrev.original_word,
                    is_active=True,
                    created_by=request.user
                )
                added_count += 1
            except Exception as e:
                errors.append(f'{abbrev.abbreviation}: {str(e)}')

        # Invalidar cache del validador si se agregaron términos
        if added_count > 0:
            validator = DictionaryValidator()
            validator.invalidate_cache()

        return Response({
            'message': f'{added_count} términos agregados al diccionario',
            'added_count': added_count,
            'skipped_count': skipped_count,
            'errors': errors if errors else None
        })
