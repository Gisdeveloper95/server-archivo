"""
Admin para la app files
"""
from django.contrib import admin
from files.models import File, Directory, Stats


@admin.register(Directory)
class DirectoryAdmin(admin.ModelAdmin):
    """Admin para el modelo Directory"""

    list_display = ('name', 'path', 'depth', 'file_count', 'subdir_count', 'total_size_display')
    list_filter = ('depth', 'is_active')
    search_fields = ('name', 'path')
    ordering = ('path',)
    readonly_fields = ('file_count', 'subdir_count', 'total_size')

    def total_size_display(self, obj):
        """Muestra el tamaño en formato legible"""
        if obj.total_size is None or obj.total_size == 0:
            return '-'
        size = obj.total_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.2f} KB"
        elif size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.2f} MB"
        else:
            return f"{size / (1024 * 1024 * 1024):.2f} GB"

    total_size_display.short_description = 'Tamaño Total'


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    """Admin para el modelo File - Simplificado"""

    list_display = ('name', 'directory', 'extension', 'size_display')
    list_filter = ('extension', 'directory')
    search_fields = ('name', 'path')
    ordering = ('path', 'name')

    def size_display(self, obj):
        """Muestra el tamaño en formato legible"""
        if obj.size is None:
            return '-'
        if obj.size < 1024:
            return f"{obj.size} B"
        elif obj.size < 1024 * 1024:
            return f"{obj.size / 1024:.2f} KB"
        elif obj.size < 1024 * 1024 * 1024:
            return f"{obj.size / (1024 * 1024):.2f} MB"
        else:
            return f"{obj.size / (1024 * 1024 * 1024):.2f} GB"

    size_display.short_description = 'Tamaño'


@admin.register(Stats)
class StatsAdmin(admin.ModelAdmin):
    """Admin para estadísticas globales - Simplificado"""

    list_display = ('total_files', 'total_directories', 'total_size_display', 'last_updated')
    readonly_fields = ('total_files', 'total_directories', 'total_size', 'last_updated')

    def total_size_display(self, obj):
        """Muestra el tamaño total en formato legible"""
        if obj.total_size is None:
            return '-'
        size = obj.total_size
        if size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.2f} MB"
        elif size < 1024 * 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024 * 1024):.2f} GB"
        else:
            return f"{size / (1024 * 1024 * 1024 * 1024):.2f} TB"

    total_size_display.short_description = 'Tamaño Total'

    def has_add_permission(self, request):
        """Solo puede haber un registro de estadísticas"""
        return not Stats.objects.exists()

    def has_delete_permission(self, request, obj=None):
        """No permitir eliminar estadísticas"""
        return False
