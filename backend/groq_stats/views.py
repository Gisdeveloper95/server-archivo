from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import date
from django.conf import settings
import requests
from .models import GroqAPIKeyUsage
from .serializers import GroqAPIKeyUsageSerializer, GroqPoolStatsSerializer
from dictionary.models import AIGeneratedAbbreviation

# Límites del Free Tier de GROQ para llama-3.3-70b-versatile (por key)
# Con 5 keys: 5 * 1000 = 5000 RPD, 5 * 100000 = 500000 TPD
GROQ_FREE_TIER_RPD_PER_KEY = 1000  # Requests Per Day
GROQ_FREE_TIER_TPD_PER_KEY = 100000  # Tokens Per Day


class GroqStatsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para visualizar estadísticas de uso de API keys de Groq.
    Solo lectura - las estadísticas se actualizan automáticamente por el servicio.

    Endpoints:
    - GET /api/groq-stats/ - Lista todas las keys con sus estadísticas
    - GET /api/groq-stats/{id}/ - Detalle de una key específica
    - GET /api/groq-stats/pool-summary/ - Resumen agregado del pool completo
    """
    queryset = GroqAPIKeyUsage.objects.all()
    serializer_class = GroqAPIKeyUsageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Ordena por key_identifier por defecto.
        Permite filtros adicionales si se necesitan.
        """
        queryset = super().get_queryset()

        # Verificar y resetear estadísticas si es nuevo día
        for key in queryset:
            if key.check_and_reset_if_new_day():
                key.save()

        # Filtro opcional por estado activo
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_active=is_active_bool)

        return queryset.order_by('key_identifier')

    @action(detail=False, methods=['get'], url_path='pool-summary')
    def pool_summary(self, request):
        """
        GET /api/groq-stats/pool-summary/

        Retorna un resumen agregado de todas las API keys del pool:
        - Total de keys
        - Keys activas
        - Keys con rate limit actual
        - Keys restringidas
        - Totales de llamadas, éxitos, fallos
        - Tasa de éxito global
        - Límites diarios y uso restante
        - Detalles de cada key
        """
        all_keys = GroqAPIKeyUsage.objects.all()

        # Verificar y resetear estadísticas si es nuevo día
        for key in all_keys:
            if key.check_and_reset_if_new_day():
                key.save()

        # Recargar las keys después de posibles resets
        all_keys = GroqAPIKeyUsage.objects.all()

        total_keys = all_keys.count()
        active_keys = all_keys.filter(is_active=True).count()

        # Contar keys rate-limited recientemente
        rate_limited_keys = sum(1 for key in all_keys if key.is_rate_limited_recently)

        # Contar keys restringidas
        restricted_keys = all_keys.filter(is_restricted=True).count()

        # Estadísticas agregadas
        total_calls = sum(key.total_calls for key in all_keys)
        total_successes = sum(key.successful_calls for key in all_keys)
        total_failures = sum(key.failed_calls for key in all_keys)
        total_tokens = sum(key.total_tokens_used for key in all_keys)

        # Tasa de éxito global
        if total_calls > 0:
            overall_success_rate = (total_successes / total_calls) * 100
        else:
            overall_success_rate = 0.0

        # Calcular límites totales (suma de todas las keys activas no restringidas)
        usable_keys = all_keys.filter(is_active=True, is_restricted=False).count()
        daily_request_limit = usable_keys * GROQ_FREE_TIER_RPD_PER_KEY
        daily_token_limit = usable_keys * GROQ_FREE_TIER_TPD_PER_KEY

        # Calcular uso restante
        requests_remaining = max(0, daily_request_limit - total_successes)
        tokens_remaining = max(0, daily_token_limit - total_tokens)

        # Obtener la fecha del último reset (debería ser la misma para todas las keys)
        last_reset = None
        for key in all_keys:
            if key.last_reset_date:
                last_reset = key.last_reset_date
                break

        data = {
            'total_keys': total_keys,
            'active_keys': active_keys,
            'rate_limited_keys': rate_limited_keys,
            'restricted_keys': restricted_keys,
            'total_calls_all_keys': total_calls,
            'total_successes_all_keys': total_successes,
            'total_failures_all_keys': total_failures,
            'total_tokens_all_keys': total_tokens,
            'overall_success_rate': round(overall_success_rate, 2),
            'last_reset_date': last_reset,
            'keys_details': all_keys,
            'daily_request_limit': daily_request_limit,
            'daily_token_limit': daily_token_limit,
            'requests_remaining': requests_remaining,
            'tokens_remaining': tokens_remaining,
        }

        serializer = GroqPoolStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reset-stats')
    def reset_stats(self, request, pk=None):
        """
        POST /api/groq-stats/{id}/reset_stats/

        Resetea las estadísticas de una key específica.
        Solo accesible para superadmins.
        """
        # Verificar que el usuario es superadmin
        if not request.user.is_superuser:
            return Response(
                {'error': 'Solo superadmins pueden resetear estadísticas'},
                status=status.HTTP_403_FORBIDDEN
            )

        key_usage = self.get_object()
        key_usage.reset_stats()

        return Response({
            'message': f'Estadísticas reseteadas para {key_usage.key_identifier}',
            'key_identifier': key_usage.key_identifier
        })

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        """
        POST /api/groq-stats/{id}/toggle_active/

        Activa/desactiva una API key manualmente.
        Solo accesible para superadmins.
        """
        # Verificar que el usuario es superadmin
        if not request.user.is_superuser:
            return Response(
                {'error': 'Solo superadmins pueden activar/desactivar keys'},
                status=status.HTTP_403_FORBIDDEN
            )

        key_usage = self.get_object()
        key_usage.is_active = not key_usage.is_active
        key_usage.save()

        status_text = 'activada' if key_usage.is_active else 'desactivada'

        return Response({
            'message': f'Key {key_usage.key_identifier} {status_text}',
            'key_identifier': key_usage.key_identifier,
            'is_active': key_usage.is_active
        })

    @action(detail=False, methods=['get'], url_path='ai-system-status')
    def ai_system_status(self, request):
        """
        GET /api/groq-stats/ai-system-status/

        Retorna el estado completo del sistema híbrido de IA:
        - Estado de Ollama (local)
        - Estado de GROQ (cloud fallback)
        - Estadísticas de caché de abreviaciones
        - Prioridad actual del sistema
        """
        # === 1. Estado de Ollama ===
        ollama_status = {
            'enabled': getattr(settings, 'OLLAMA_ENABLED', False),
            'available': False,
            'model': getattr(settings, 'OLLAMA_MODEL', 'llama3.2:3b'),
            'base_url': getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434'),
            'error': None
        }

        if ollama_status['enabled']:
            try:
                # Verificar si Ollama está disponible
                response = requests.get(
                    f"{ollama_status['base_url']}/api/tags",
                    timeout=5
                )
                if response.status_code == 200:
                    models = response.json().get('models', [])
                    model_names = [m.get('name', '') for m in models]
                    ollama_status['available'] = ollama_status['model'] in model_names or any(
                        ollama_status['model'].split(':')[0] in m for m in model_names
                    )
                    ollama_status['installed_models'] = model_names
                    if not ollama_status['available']:
                        ollama_status['error'] = f"Modelo {ollama_status['model']} no instalado"
            except requests.exceptions.RequestException as e:
                ollama_status['error'] = f"No se puede conectar: {str(e)[:50]}"

        # === 2. Estado de GROQ ===
        all_keys = GroqAPIKeyUsage.objects.all()
        restricted_keys = all_keys.filter(is_restricted=True).count()
        active_keys = all_keys.filter(is_active=True, is_restricted=False).count()
        total_keys = all_keys.count()

        groq_status = {
            'enabled': bool(getattr(settings, 'GROQ_API_KEYS', [])),
            'available': active_keys > 0,
            'total_keys': total_keys,
            'active_keys': active_keys,
            'restricted_keys': restricted_keys,
            'all_restricted': restricted_keys >= total_keys and total_keys > 0,
            'daily_request_limit': active_keys * GROQ_FREE_TIER_RPD_PER_KEY,
            'daily_token_limit': active_keys * GROQ_FREE_TIER_TPD_PER_KEY,
        }

        # === 3. Estado del Caché de Abreviaciones ===
        cache_stats = {
            'total_cached': AIGeneratedAbbreviation.objects.count(),
            'pending_review': AIGeneratedAbbreviation.objects.filter(status='pending').count(),
            'approved': AIGeneratedAbbreviation.objects.filter(status='approved').count(),
            'total_uses': sum(a.times_used for a in AIGeneratedAbbreviation.objects.all()),
        }

        # Top 5 más usadas
        top_cached = AIGeneratedAbbreviation.objects.order_by('-times_used')[:5]
        cache_stats['top_used'] = [
            {'word': a.original_word, 'abbrev': a.abbreviation, 'uses': a.times_used}
            for a in top_cached
        ]

        # === 4. Determinar estado general y prioridad ===
        if ollama_status['available']:
            primary_backend = 'ollama'
            primary_status = 'online'
            fallback_backend = 'groq' if groq_status['available'] else 'algorithmic'
        elif groq_status['available']:
            primary_backend = 'groq'
            primary_status = 'online'
            fallback_backend = 'algorithmic'
        else:
            primary_backend = 'algorithmic'
            primary_status = 'fallback'
            fallback_backend = None

        # Estado general del sistema
        if ollama_status['available']:
            overall_status = 'optimal'  # IA local funcionando
            overall_message = 'Sistema IA local (Ollama) operativo'
        elif groq_status['available']:
            overall_status = 'degraded'  # Solo cloud
            overall_message = 'Usando GROQ cloud (Ollama no disponible)'
        else:
            overall_status = 'fallback'  # Solo algoritmo
            overall_message = 'Modo fallback: solo truncado algorítmico'

        return Response({
            'overall_status': overall_status,
            'overall_message': overall_message,
            'primary_backend': primary_backend,
            'primary_status': primary_status,
            'fallback_backend': fallback_backend,
            'ollama': ollama_status,
            'groq': groq_status,
            'cache': cache_stats,
            'priority_order': ['cache', 'ollama', 'groq', 'algorithmic'],
        })
