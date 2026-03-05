"""
Serializers para el diccionario de datos
"""
from rest_framework import serializers
from dictionary.models import DictionaryEntry, AIGeneratedAbbreviation
from users.serializers import UserSerializer


class DictionaryEntrySerializer(serializers.ModelSerializer):
    """Serializer completo para entradas del diccionario"""
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    updated_by_detail = UserSerializer(source='updated_by', read_only=True)

    class Meta:
        model = DictionaryEntry
        fields = [
            'id', 'key', 'value', 'is_active',
            'created_by', 'created_by_detail', 'created_at',
            'updated_by', 'updated_by_detail', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_by', 'updated_at']

    def validate_key(self, value):
        """Validar que el key no esté vacío y sea único"""
        value = value.lower().strip()

        if not value:
            raise serializers.ValidationError('El término no puede estar vacío')

        # Verificar unicidad (excluyendo el objeto actual en caso de edición)
        instance = self.instance
        if DictionaryEntry.objects.filter(key=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError(f'El término "{value}" ya existe en el diccionario')

        return value

    def validate_value(self, value):
        """Validar que la descripción no esté vacía"""
        if not value or not value.strip():
            raise serializers.ValidationError('La descripción no puede estar vacía')
        return value.strip()


class DictionaryEntryListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listar entradas (sin detalles de usuarios)"""

    class Meta:
        model = DictionaryEntry
        fields = ['id', 'key', 'value', 'is_active', 'created_at', 'updated_at']


class AIGeneratedAbbreviationSerializer(serializers.ModelSerializer):
    """Serializer para abreviaciones generadas por IA"""
    reviewed_by_detail = UserSerializer(source='reviewed_by', read_only=True)

    class Meta:
        model = AIGeneratedAbbreviation
        fields = [
            'id', 'original_word', 'abbreviation', 'times_used',
            'status', 'original_ai_abbreviation',
            'created_at', 'last_used_at',
            'reviewed_by', 'reviewed_by_detail', 'reviewed_at'
        ]
        read_only_fields = [
            'id', 'original_word', 'times_used', 'original_ai_abbreviation',
            'created_at', 'last_used_at', 'reviewed_by', 'reviewed_at'
        ]


class AIGeneratedAbbreviationListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listar sugerencias de IA"""

    class Meta:
        model = AIGeneratedAbbreviation
        fields = [
            'id', 'original_word', 'abbreviation', 'times_used',
            'status', 'created_at', 'last_used_at'
        ]
