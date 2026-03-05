"""
Serializers para la app files
"""
from rest_framework import serializers
from files.models import File, Stats


class FileSerializer(serializers.ModelSerializer):
    """Serializer para archivos"""
    size_display = serializers.CharField(source='get_size_display', read_only=True)
    parent_path = serializers.CharField(source='get_parent_path', read_only=True)

    class Meta:
        model = File
        fields = [
            'id', 'path', 'name', 'extension', 'size', 'size_display',
            'is_directory', 'modified_date', 'created_date',
            'md5_hash', 'indexed_at', 'parent_path'
        ]
        read_only_fields = ['id', 'indexed_at']


class StatsSerializer(serializers.ModelSerializer):
    """Serializer para estadísticas"""
    total_size_display = serializers.CharField(source='get_total_size_display', read_only=True)

    class Meta:
        model = Stats
        fields = [
            'id', 'total_files', 'total_directories', 'total_size',
            'total_size_display', 'last_updated'
        ]
        read_only_fields = '__all__'


class BrowseSerializer(serializers.Serializer):
    """Serializer para navegación de directorios"""
    path = serializers.CharField(required=False, allow_blank=True, default='')


class CreateFolderSerializer(serializers.Serializer):
    """Serializer para creación de carpetas"""
    path = serializers.CharField(required=True, help_text='Ruta donde crear la carpeta')
    name = serializers.CharField(required=True, help_text='Nombre de la nueva carpeta')


class UploadFileSerializer(serializers.Serializer):
    """Serializer para subida de archivos"""
    path = serializers.CharField(required=True, help_text='Ruta donde subir el archivo')
    file = serializers.FileField(required=True, help_text='Archivo a subir')
    filename = serializers.CharField(required=False, allow_blank=True, help_text='Nombre personalizado para el archivo (opcional, si no se envía usa el nombre original)')


class RenameSerializer(serializers.Serializer):
    """Serializer para renombrar archivos/carpetas"""
    old_path = serializers.CharField(required=True)
    new_name = serializers.CharField(required=True)


class DeleteSerializer(serializers.Serializer):
    """Serializer para eliminación"""
    path = serializers.CharField(required=True)
    confirm = serializers.BooleanField(required=True)


class DownloadSerializer(serializers.Serializer):
    """Serializer para descarga"""
    path = serializers.CharField(required=True)


class UploadBatchItemSerializer(serializers.Serializer):
    """Serializer para un item dentro de un upload batch"""
    original_name = serializers.CharField(required=True, help_text='Nombre original del archivo')
    target_name = serializers.CharField(required=True, help_text='Nombre final (ya validado/renombrado)')
    relative_path = serializers.CharField(required=False, allow_blank=True, default='', help_text='Ruta relativa dentro de la carpeta subida')
    is_directory = serializers.BooleanField(default=False, help_text='Si es directorio')
    size = serializers.IntegerField(default=0, help_text='Tamaño en bytes')


class UploadBatchSerializer(serializers.Serializer):
    """Serializer para subida batch con auditoría consolidada"""
    destination_path = serializers.CharField(required=True, help_text='Ruta destino donde subir')
    conflict_strategy = serializers.ChoiceField(
        choices=['skip', 'replace', 'keep_both'],
        default='skip',
        help_text='Estrategia para conflictos: skip=omitir, replace=sobrescribir, keep_both=renombrar con sufijo'
    )
    items = UploadBatchItemSerializer(many=True, required=True, help_text='Lista de items a subir')
    # Los archivos se envían como multipart/form-data
    # files = serializers.ListField(child=serializers.FileField(), required=False)
