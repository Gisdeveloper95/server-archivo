"""
Admin para la app audit
"""
from django.contrib import admin
from audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin para logs de auditoría (solo lectura)"""

    list_display = ('timestamp', 'username', 'user_role', 'action', 'target_name', 'success', 'ip_address')
    list_filter = ('action', 'success', 'user_role', 'timestamp')
    search_fields = ('username', 'target_path', 'target_name', 'ip_address')
    ordering = ('-timestamp',)
    date_hierarchy = 'timestamp'

    fieldsets = (
        ('Usuario', {'fields': ('user', 'username', 'user_role')}),
        ('Acción', {'fields': ('action', 'target_path', 'target_name', 'success')}),
        ('Detalles', {'fields': ('file_size', 'details', 'error_message')}),
        ('Información HTTP', {'fields': ('ip_address', 'user_agent')}),
        ('Fecha', {'fields': ('timestamp',)}),
    )

    readonly_fields = (
        'user', 'username', 'user_role', 'action', 'target_path', 'target_name',
        'file_size', 'details', 'ip_address', 'user_agent', 'success',
        'error_message', 'timestamp'
    )

    def has_add_permission(self, request):
        """No permitir crear logs manualmente"""
        return False

    def has_change_permission(self, request, obj=None):
        """No permitir editar logs"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Solo superadmin puede eliminar logs (con precaución)"""
        return request.user.is_superuser
