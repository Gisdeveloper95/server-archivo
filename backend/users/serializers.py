"""
Serializers para la app users
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from users.models import User, UserPermission, UserFavorite


class UserSerializer(serializers.ModelSerializer):
    """Serializer para el modelo User"""
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    # Campos de exención de nombrado (calculados o desde el modelo)
    naming_exemptions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'role', 'phone', 'department', 'position', 'is_active',
            'created_at', 'updated_at', 'last_login', 'password',
            # Campos de exención
            'exempt_from_naming_rules', 'exempt_from_path_limit', 'exempt_from_name_length',
            'naming_exemptions'
        ]
        read_only_fields = ['id', 'username', 'created_at', 'updated_at', 'last_login', 'naming_exemptions']

        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_naming_exemptions(self, obj):
        """Retorna las exenciones calculadas del usuario"""
        return obj.get_naming_exemptions()

    def create(self, validated_data):
        """Crea un nuevo usuario"""
        password = validated_data.pop('password', None)

        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es requerida'})

        user = User.objects.create_user(**validated_data)
        user.set_password(password)

        # Guardar quién creó el usuario
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user.created_by = request.user

        user.save()
        return user

    def update(self, instance, validated_data):
        """Actualiza un usuario"""
        password = validated_data.pop('password', None)

        # Actualizar campos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Actualizar contraseña si se proporcionó
        if password:
            instance.set_password(password)

        instance.save()
        return instance


class UserPermissionSerializer(serializers.ModelSerializer):
    """Serializer para permisos de usuario con campos granulares"""
    user = UserSerializer(read_only=True)
    granted_by = serializers.SerializerMethodField()

    class Meta:
        model = UserPermission
        fields = [
            'id', 'user', 'base_path',
            'can_read', 'can_write', 'can_delete', 'can_create_directories', 'exempt_from_dictionary',
            # Permisos granulares
            'edit_permission_level',
            # Control de herencia
            'inheritance_mode', 'blocked_paths', 'read_only_paths', 'max_depth',
            # Metadatos
            'is_active', 'granted_by',
            'granted_at', 'revoked_at', 'notes',
            # Vencimiento
            'expires_at', 'expiration_notified_7days', 'expiration_notified_3days',
            # Autorización
            'authorized_by_email', 'authorized_by_name'
        ]
        read_only_fields = ['id', 'granted_at', 'granted_by', 'expiration_notified_7days', 'expiration_notified_3days']

    def get_granted_by(self, obj):
        """Retorna el username del usuario que otorgó el permiso"""
        if obj.granted_by:
            return obj.granted_by.username
        return 'Sistema'

    def create(self, validated_data):
        """Crea un nuevo permiso"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['granted_by'] = request.user

        return super().create(validated_data)


class UserFavoriteSerializer(serializers.ModelSerializer):
    """Serializer para favoritos de usuario"""

    class Meta:
        model = UserFavorite
        fields = [
            'id', 'user', 'path', 'name', 'description', 'color', 'order',
            'created_at', 'access_count', 'last_accessed'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'access_count', 'last_accessed']

    def create(self, validated_data):
        """Crea un favorito asignando el usuario del request"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user

        return super().create(validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer para cambio de contraseña"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        """Valida que la contraseña antigua sea correcta"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('La contraseña actual es incorrecta')
        return value


class RouteConfigSerializer(serializers.Serializer):
    """Serializer para configuración de una ruta en asignación masiva"""
    base_path = serializers.CharField(required=True)
    blocked_paths = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    read_only_paths = serializers.ListField(child=serializers.CharField(), required=False, default=list)


class BulkPermissionAssignmentSerializer(serializers.Serializer):
    """Serializer para asignación masiva de permisos"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        help_text='Lista de IDs de usuarios a asignar permisos'
    )
    routes = serializers.ListField(
        child=RouteConfigSerializer(),
        required=True,
        help_text='Lista de rutas con sus configuraciones específicas'
    )

    # Permisos generales que se aplicarán a todas las rutas
    can_read = serializers.BooleanField(default=True)
    can_write = serializers.BooleanField(default=False)
    can_delete = serializers.BooleanField(default=False)
    can_create_directories = serializers.BooleanField(default=True)
    exempt_from_dictionary = serializers.BooleanField(default=False)

    # Permisos granulares
    edit_permission_level = serializers.ChoiceField(
        choices=UserPermission.EDIT_PERMISSION_CHOICES,
        required=False,
        allow_null=True
    )
    inheritance_mode = serializers.ChoiceField(
        choices=UserPermission.INHERITANCE_MODE_CHOICES,
        default='total'
    )
    max_depth = serializers.IntegerField(required=False, allow_null=True)

    # Vencimiento
    expires_at = serializers.DateTimeField(required=False, allow_null=True)

    # Grupo y notas
    group_name = serializers.CharField(
        required=True,
        max_length=200,
        help_text='Nombre del grupo para identificar esta asignación masiva'
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    # Autorización
    authorized_by_email = serializers.EmailField(
        required=False,
        allow_null=True,
        help_text='Email del líder que autoriza el permiso'
    )
    authorized_by_name = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=300,
        help_text='Nombre completo del líder que autoriza el permiso'
    )

    def validate_user_ids(self, value):
        """Valida que los usuarios existan y estén activos"""
        if not value:
            raise serializers.ValidationError('Debe proporcionar al menos un usuario')

        existing_users = User.objects.filter(id__in=value, is_active=True).values_list('id', flat=True)
        existing_users = list(existing_users)

        invalid_ids = set(value) - set(existing_users)
        if invalid_ids:
            raise serializers.ValidationError(
                f'Los siguientes IDs de usuario no existen o están inactivos: {list(invalid_ids)}'
            )

        return value

    def validate_routes(self, value):
        """Valida que se proporcione al menos una ruta"""
        if not value:
            raise serializers.ValidationError('Debe proporcionar al menos una ruta')

        # Validar que no haya rutas duplicadas
        paths = [route['base_path'] for route in value]
        if len(paths) != len(set(paths)):
            raise serializers.ValidationError('No puede haber rutas duplicadas')

        return value


class LoginSerializer(serializers.Serializer):
    """Serializer para login con email o username"""
    email = serializers.CharField(required=True)  # Acepta email o username
    password = serializers.CharField(required=True, write_only=True)
