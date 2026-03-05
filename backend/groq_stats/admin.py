from django.contrib import admin
from .models import GroqAPIKeyUsage


@admin.register(GroqAPIKeyUsage)
class GroqAPIKeyUsageAdmin(admin.ModelAdmin):
    """
    Admin interface para visualizar y gestionar el uso de API keys de Groq
    """
    list_display = [
        'key_identifier',
        'key_name',
        'is_active',
        'total_calls',
        'successful_calls',
        'failed_calls',
        'get_success_rate',
        'rate_limit_errors',
        'last_used_at',
    ]

    list_filter = [
        'is_active',
        'created_at',
        'last_used_at',
    ]

    search_fields = [
        'key_identifier',
        'key_name',
    ]

    readonly_fields = [
        'total_calls',
        'successful_calls',
        'failed_calls',
        'rate_limit_errors',
        'total_tokens_used',
        'last_used_at',
        'last_error_at',
        'last_rate_limit_at',
        'created_at',
        'updated_at',
        'get_success_rate',
        'get_rate_limited_status',
    ]

    fieldsets = (
        ('Identificación', {
            'fields': ('key_identifier', 'key_name', 'is_active')
        }),
        ('Estadísticas de Uso', {
            'fields': (
                'total_calls',
                'successful_calls',
                'failed_calls',
                'get_success_rate',
                'rate_limit_errors',
                'total_tokens_used',
            )
        }),
        ('Timestamps', {
            'fields': (
                'last_used_at',
                'last_error_at',
                'last_rate_limit_at',
                'get_rate_limited_status',
                'created_at',
                'updated_at',
            )
        }),
    )

    actions = ['reset_statistics', 'activate_keys', 'deactivate_keys']

    def get_success_rate(self, obj):
        """Muestra la tasa de éxito como porcentaje"""
        return f"{obj.success_rate:.2f}%"
    get_success_rate.short_description = 'Success Rate'

    def get_rate_limited_status(self, obj):
        """Indica si la key está actualmente rate-limited"""
        return "🔴 Rate Limited" if obj.is_rate_limited_recently else "✅ Available"
    get_rate_limited_status.short_description = 'Status'

    def reset_statistics(self, request, queryset):
        """Acción para resetear estadísticas de las keys seleccionadas"""
        count = 0
        for key_usage in queryset:
            key_usage.reset_stats()
            count += 1
        self.message_user(request, f"Estadísticas reseteadas para {count} API key(s).")
    reset_statistics.short_description = "Reset statistics"

    def activate_keys(self, request, queryset):
        """Acción para activar keys seleccionadas"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} API key(s) activada(s).")
    activate_keys.short_description = "Activate selected keys"

    def deactivate_keys(self, request, queryset):
        """Acción para desactivar keys seleccionadas"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} API key(s) desactivada(s).")
    deactivate_keys.short_description = "Deactivate selected keys"
