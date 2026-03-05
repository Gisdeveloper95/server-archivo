"""
Serializers para la app audit
"""
from rest_framework import serializers
from audit.models import AuditLog, ZipAnalysis, PermissionAudit
from users.serializers import UserSerializer


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer para logs de auditoría"""
    user_id = serializers.IntegerField(source='user.id', read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_id', 'username', 'user_role',
            'action', 'target_path', 'target_name', 'file_size',
            'details', 'ip_address', 'user_agent',
            'success', 'error_message', 'timestamp'
        ]


class AuditLogCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear logs de auditoría"""

    class Meta:
        model = AuditLog
        fields = [
            'user', 'username', 'user_role', 'action',
            'target_path', 'target_name', 'file_size', 'details',
            'ip_address', 'user_agent', 'success', 'error_message'
        ]

    def create(self, validated_data):
        """Crea un log de auditoría"""
        return AuditLog.objects.create(**validated_data)


class ZipAnalysisSerializer(serializers.ModelSerializer):
    """Serializer para análisis de archivos ZIP"""
    analyzed_by_username = serializers.CharField(source='analyzed_by.username', read_only=True)

    class Meta:
        model = ZipAnalysis
        fields = [
            'id', 'zip_path', 'zip_name', 'analyzed_by', 'analyzed_by_username',
            'analyzed_at', 'contained_files', 'total_files', 'total_size',
            'zip_size', 'compression_ratio'
        ]
        read_only_fields = ['id', 'analyzed_at', 'analyzed_by_username']


class PermissionAuditSerializer(serializers.ModelSerializer):
    """Serializer para auditoría de permisos"""
    user_username = serializers.CharField(source='user.username', read_only=True)
    changed_by_username = serializers.CharField(source='changed_by.username', read_only=True)

    class Meta:
        model = PermissionAudit
        fields = [
            'id', 'user', 'user_username', 'base_path', 'action',
            'permission_type', 'changed_by', 'changed_by_username',
            'changed_at', 'details', 'ip_address'
        ]
        read_only_fields = ['id', 'changed_at', 'user_username', 'changed_by_username']
