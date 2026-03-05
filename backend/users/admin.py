"""
Admin para la app users
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from users.models import User, UserPermission, UserFavorite


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin personalizado para el modelo User"""

    list_display = ('username', 'email', 'role', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Información Personal', {'fields': ('first_name', 'last_name', 'email', 'microsoft_email')}),
        ('Roles y Permisos', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Relaciones', {'fields': ('created_by',)}),
        ('Fechas', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'created_by'),
        }),
    )

    readonly_fields = ('last_login', 'date_joined')


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    """Admin para permisos de usuario"""

    list_display = ('user', 'can_read', 'can_write', 'can_delete', 'is_active')
    list_filter = ('can_read', 'can_write', 'can_delete', 'is_active', 'exempt_from_dictionary')
    search_fields = ('user__username', 'user__email')
    ordering = ('user',)


@admin.register(UserFavorite)
class UserFavoriteAdmin(admin.ModelAdmin):
    """Admin para favoritos de usuario"""

    list_display = ('user', 'name', 'path', 'order', 'access_count')
    list_filter = ('last_accessed',)
    search_fields = ('user__username', 'name', 'path')
    ordering = ('user', 'order')

    readonly_fields = ('access_count', 'last_accessed')
