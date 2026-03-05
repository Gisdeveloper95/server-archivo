from django.contrib import admin
from .models import TrashItem


@admin.register(TrashItem)
class TrashItemAdmin(admin.ModelAdmin):
    list_display = [
        'original_name',
        'original_path',
        'is_directory',
        'size_formatted',
        'deleted_by',
        'deleted_at',
        'expires_at',
        'status',
    ]
    list_filter = ['status', 'is_directory', 'deleted_at']
    search_fields = ['original_name', 'original_path']
    readonly_fields = [
        'trash_id',
        'deleted_at',
        'size_formatted',
        'days_until_expiry',
    ]
    ordering = ['-deleted_at']

    def size_formatted(self, obj):
        return obj.size_formatted
    size_formatted.short_description = 'Tamaño'


# NOTA: TrashShareLink fue eliminado.
# Ahora se usa sharing.ShareLink con el campo trash_item para compartir items de papelera.
