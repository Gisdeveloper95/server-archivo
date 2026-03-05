from django.contrib import admin
from .models import ShareLink, ShareLinkAccess


@admin.register(ShareLink)
class ShareLinkAdmin(admin.ModelAdmin):
    """Admin para gestión de links compartidos"""
    list_display = [
        'token', 'path', 'permission', 'created_by', 'created_at',
        'expires_at', 'is_active', 'access_count', 'download_count'
    ]
    list_filter = ['is_active', 'permission', 'created_at', 'expires_at']
    search_fields = ['token', 'path', 'description', 'created_by__username']
    readonly_fields = [
        'token', 'created_at', 'access_count', 'download_count',
        'last_accessed_at', 'deactivated_at', 'deactivated_by'
    ]
    fieldsets = (
        ('Información básica', {
            'fields': ('token', 'path', 'is_directory', 'description')
        }),
        ('Permisos y seguridad', {
            'fields': ('permission', 'password', 'require_email', 'allowed_domain')
        }),
        ('Limitaciones', {
            'fields': ('expires_at', 'max_downloads')
        }),
        ('Estado', {
            'fields': ('is_active', 'deactivated_at', 'deactivated_by')
        }),
        ('Auditoría', {
            'fields': ('created_by', 'created_at', 'access_count', 'download_count', 'last_accessed_at')
        }),
    )

    def has_add_permission(self, request):
        # Solo superadmin puede crear links desde admin
        return request.user.role == 'superadmin'

    def has_change_permission(self, request, obj=None):
        # Solo superadmin puede modificar links
        return request.user.role == 'superadmin'

    def has_delete_permission(self, request, obj=None):
        # Solo superadmin puede eliminar links
        return request.user.role == 'superadmin'


@admin.register(ShareLinkAccess)
class ShareLinkAccessAdmin(admin.ModelAdmin):
    """Admin para auditoría de accesos a links compartidos"""
    list_display = [
        'share_link', 'accessed_at', 'ip_address', 'action',
        'success', 'email_provided'
    ]
    list_filter = ['success', 'action', 'accessed_at']
    search_fields = ['ip_address', 'email_provided', 'share_link__token']
    readonly_fields = [
        'share_link', 'accessed_at', 'ip_address', 'user_agent',
        'email_provided', 'action', 'success', 'error_message'
    ]

    def has_add_permission(self, request):
        # No se pueden crear registros manualmente
        return False

    def has_change_permission(self, request, obj=None):
        # Los registros de auditoría no se pueden modificar
        return False

    def has_delete_permission(self, request, obj=None):
        # Solo superadmin puede eliminar registros de auditoría
        return request.user.role == 'superadmin'
