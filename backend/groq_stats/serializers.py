from rest_framework import serializers
from .models import GroqAPIKeyUsage


class GroqAPIKeyUsageSerializer(serializers.ModelSerializer):
    """
    Serializer para estadísticas de uso de API keys de Groq
    """
    success_rate = serializers.ReadOnlyField()
    is_rate_limited_recently = serializers.ReadOnlyField()

    class Meta:
        model = GroqAPIKeyUsage
        fields = [
            'id',
            'key_identifier',
            'key_name',
            'is_active',
            'is_restricted',
            'total_calls',
            'successful_calls',
            'failed_calls',
            'success_rate',
            'rate_limit_errors',
            'restriction_errors',
            'total_tokens_used',
            'last_used_at',
            'last_error_at',
            'last_rate_limit_at',
            'last_success_at',
            'last_error_message',
            'last_reset_date',
            'is_rate_limited_recently',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'total_calls',
            'successful_calls',
            'failed_calls',
            'rate_limit_errors',
            'restriction_errors',
            'total_tokens_used',
            'last_used_at',
            'last_error_at',
            'last_rate_limit_at',
            'last_success_at',
            'last_error_message',
            'last_reset_date',
            'created_at',
            'updated_at',
        ]


class GroqPoolStatsSerializer(serializers.Serializer):
    """
    Serializer para estadísticas agregadas del pool completo
    """
    total_keys = serializers.IntegerField()
    active_keys = serializers.IntegerField()
    rate_limited_keys = serializers.IntegerField()
    restricted_keys = serializers.IntegerField()
    total_calls_all_keys = serializers.IntegerField()
    total_successes_all_keys = serializers.IntegerField()
    total_failures_all_keys = serializers.IntegerField()
    total_tokens_all_keys = serializers.IntegerField()
    overall_success_rate = serializers.FloatField()
    last_reset_date = serializers.DateField(allow_null=True)
    keys_details = GroqAPIKeyUsageSerializer(many=True)

    # Límites de GROQ (Free Tier para llama-3.3-70b-versatile)
    daily_request_limit = serializers.IntegerField(default=1000)  # RPD
    daily_token_limit = serializers.IntegerField(default=100000)  # TPD
    requests_remaining = serializers.IntegerField()
    tokens_remaining = serializers.IntegerField()
