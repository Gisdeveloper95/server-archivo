"""
Serializers para la Papelera de Reciclaje
"""
from rest_framework import serializers
from .models import TrashItem, TrashConfig


class TrashItemSerializer(serializers.ModelSerializer):
    """Serializer para items de papelera"""

    deleted_by_username = serializers.CharField(source='deleted_by.username', read_only=True)
    deleted_by_full_name = serializers.SerializerMethodField()
    size_formatted = serializers.CharField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    trash_filename = serializers.CharField(read_only=True)

    class Meta:
        model = TrashItem
        fields = [
            'trash_id',
            'original_name',
            'original_path',
            'is_directory',
            'size_bytes',
            'size_formatted',
            'file_count',
            'dir_count',
            'mime_type',
            'extension',
            'deleted_by',
            'deleted_by_username',
            'deleted_by_full_name',
            'deleted_at',
            'expires_at',
            'days_until_expiry',
            'is_expired',
            'status',
            'restored_at',
            'restored_by',
            'restored_path',
            'trash_filename',
        ]
        read_only_fields = fields

    def get_deleted_by_full_name(self, obj):
        if obj.deleted_by:
            return f"{obj.deleted_by.first_name} {obj.deleted_by.last_name}".strip() or obj.deleted_by.username
        return None


class TrashItemDetailSerializer(TrashItemSerializer):
    """Serializer con más detalles para vista individual"""

    metadata = serializers.JSONField(read_only=True)
    file_hash = serializers.CharField(read_only=True)

    class Meta(TrashItemSerializer.Meta):
        fields = TrashItemSerializer.Meta.fields + [
            'metadata',
            'file_hash',
            'error_message',
        ]


class RestoreSerializer(serializers.Serializer):
    """Serializer para solicitud de restauración"""

    conflict_resolution = serializers.ChoiceField(
        choices=['replace', 'rename', 'fail'],
        default='rename',
        help_text="Qué hacer si existe un archivo con el mismo nombre"
    )
    target_path = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Ruta alternativa para restaurar (opcional)"
    )


class TrashShareSerializer(serializers.Serializer):
    """Serializer para crear link de descarga desde papelera"""

    permission = serializers.ChoiceField(
        choices=['download', 'preview'],
        default='download'
    )
    expires_hours = serializers.IntegerField(
        min_value=1,
        max_value=168,  # 1 semana máximo
        default=24
    )
    max_downloads = serializers.IntegerField(
        min_value=1,
        max_value=100,
        required=False,
        allow_null=True
    )
    password = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True
    )
    require_email = serializers.BooleanField(default=False)


class TrashStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de papelera"""

    total_items = serializers.IntegerField()
    total_size_bytes = serializers.IntegerField()
    total_size_formatted = serializers.CharField()
    expiring_soon = serializers.IntegerField()
    by_status = serializers.DictField()
    retention_days = serializers.IntegerField()
    max_size_gb = serializers.FloatField()
    enabled = serializers.BooleanField()


class TrashConfigSerializer(serializers.ModelSerializer):
    """Serializer para configuración de papelera"""

    updated_by_username = serializers.CharField(source='updated_by.username', read_only=True)

    class Meta:
        model = TrashConfig
        fields = [
            'id',
            'max_size_gb',
            'max_item_size_gb',
            'retention_days',
            'auto_cleanup_enabled',
            'updated_at',
            'updated_by',
            'updated_by_username',
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by', 'updated_by_username']

    def validate_retention_days(self, value):
        if value < 1:
            raise serializers.ValidationError("Los días de retención deben ser al menos 1")
        if value > 365:
            raise serializers.ValidationError("Los días de retención no pueden superar 365")
        return value

    def validate_max_size_gb(self, value):
        if value < 1:
            raise serializers.ValidationError("El tamaño mínimo total es 1 GB")
        if value > 10000:
            raise serializers.ValidationError("El tamaño máximo total es 10000 GB (10 TB)")
        return value

    def validate_max_item_size_gb(self, value):
        if value < 0.1:
            raise serializers.ValidationError("El tamaño mínimo por archivo es 0.1 GB")
        if value > 100:
            raise serializers.ValidationError("El tamaño máximo por archivo es 100 GB")
        return value
