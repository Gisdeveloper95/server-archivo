from rest_framework import serializers
from .models import ShareLink, ShareLinkAccess
from django.contrib.auth.hashers import make_password


class ShareLinkSerializer(serializers.ModelSerializer):
    """Serializer para listar y obtener detalles de links compartidos"""
    full_url = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    is_valid = serializers.ReadOnlyField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = ShareLink
        fields = [
            'id', 'token', 'path', 'is_directory', 'permission',
            'require_email', 'allowed_domain', 'created_by', 'created_by_username',
            'created_at', 'expires_at', 'max_downloads', 'is_active',
            'deactivated_at', 'deactivated_by', 'access_count', 'download_count',
            'last_accessed_at', 'description', 'full_url', 'is_expired', 'is_valid'
        ]
        read_only_fields = [
            'id', 'token', 'created_by', 'created_at', 'deactivated_at',
            'deactivated_by', 'access_count', 'download_count', 'last_accessed_at'
        ]


class ShareLinkCreateSerializer(serializers.Serializer):
    """Serializer para crear un nuevo link compartido"""
    path = serializers.CharField(max_length=1000)
    permission = serializers.ChoiceField(
        choices=['view', 'download'],
        default='view'
    )
    password = serializers.CharField(
        max_length=128,
        required=False,
        allow_blank=True,
        help_text="Contraseña opcional para proteger el link"
    )
    require_email = serializers.BooleanField(default=False)
    allowed_domain = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text="Ej: igac.gov.co"
    )
    expires_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
        help_text="Fecha de expiración (YYYY-MM-DD HH:MM:SS)"
    )
    max_downloads = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True
    )


class ShareLinkAccessSerializer(serializers.ModelSerializer):
    """Serializer para registros de acceso"""
    share_link_path = serializers.CharField(source='share_link.path', read_only=True)
    
    class Meta:
        model = ShareLinkAccess
        fields = [
            'id', 'share_link', 'share_link_path', 'accessed_at',
            'ip_address', 'user_agent', 'email_provided',
            'action', 'success', 'error_message'
        ]
        read_only_fields = ['id', 'accessed_at']
