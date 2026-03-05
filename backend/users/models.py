"""
Modelos para gestión de usuarios y permisos
"""
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.conf import settings
import secrets
from datetime import timedelta
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom user manager para usuario sin 'username' tradicional"""

    def create_user(self, email, password=None, **extra_fields):
        """Crear usuario regular"""
        if not email:
            raise ValueError('El email es obligatorio')

        email = self.normalize_email(email)
        # Extraer username del email (antes del @)
        username = email.split('@')[0]

        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Crear superusuario"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', 'superadmin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser debe tener is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser debe tener is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Modelo de usuario personalizado para el sistema de gestión de archivos

    Roles:
    - consultation: Solo lectura en rutas asignadas
    - consultation_edit: Lectura + Edición con validación de diccionario
    - admin: Administrador sin restricciones de diccionario
    - superadmin: Acceso total al sistema
    """

    ROLE_CHOICES = (
        ('consultation', 'Consulta'),
        ('consultation_edit', 'Consulta + Edición'),
        ('admin', 'Administrador'),
        ('superadmin', 'Super Administrador'),
    )

    # Sobrescribir campos heredados
    email = models.EmailField('Email', unique=True)
    username = models.CharField('Username', max_length=150, unique=True)
    first_name = models.CharField('Nombre', max_length=150)
    last_name = models.CharField('Apellido', max_length=150)

    # Campos personalizados
    role = models.CharField('Rol', max_length=20, choices=ROLE_CHOICES, default='consultation')
    phone = models.CharField('Teléfono', max_length=20, blank=True, null=True)
    department = models.CharField('Dependencia', max_length=200, blank=True, null=True)
    position = models.CharField('Cargo', max_length=200, blank=True, null=True)

    # Permisos especiales
    can_manage_dictionary = models.BooleanField(
        'Puede gestionar diccionario',
        default=False,
        help_text='Si está activado, el usuario puede crear/editar/eliminar términos del diccionario'
    )

    # === EXENCIONES DE VALIDACIÓN DE NOMBRES ===
    exempt_from_naming_rules = models.BooleanField(
        'Exento de reglas de nombrado',
        default=False,
        help_text='Si está activado, el usuario puede nombrar archivos/carpetas sin validación de diccionario ni IA'
    )
    exempt_from_path_limit = models.BooleanField(
        'Exento de límite de ruta',
        default=False,
        help_text='Si está activado, el usuario puede exceder el límite de 260 caracteres en rutas'
    )
    exempt_from_name_length = models.BooleanField(
        'Exento de límite de nombre',
        default=False,
        help_text='Si está activado, el usuario puede exceder el límite de 30 caracteres en nombres'
    )
    exemption_reason = models.TextField(
        'Razón de exención',
        blank=True,
        null=True,
        help_text='Justificación para las exenciones otorgadas'
    )
    exemption_granted_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exemptions_granted',
        verbose_name='Exención otorgada por'
    )
    exemption_granted_at = models.DateTimeField(
        'Fecha de exención',
        null=True,
        blank=True
    )

    # Auditoría
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users_created',
        verbose_name='Creado por'
    )
    last_login_ip = models.GenericIPAddressField('Última IP de login', null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
            models.Index(fields=['role']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"

    def get_full_name(self):
        """Retorna nombre completo del usuario"""
        return f"{self.first_name} {self.last_name}".strip() or self.username

    def has_permission_for_path(self, path, permission_type='read'):
        """
        Verifica si el usuario tiene permiso para una ruta específica
        AHORA USA PermissionService para verificar bloqueos granulares

        Args:
            path: Ruta del archivo/directorio
            permission_type: 'read', 'write', 'delete', 'create_directories'

        Returns:
            bool: True si tiene permiso
        """
        # Usar PermissionService que ya maneja toda la lógica de permisos granulares
        from services.permission_service import PermissionService
        return PermissionService.can_access_path(self, path, action=permission_type)

    def is_exempt_from_dictionary(self):
        """
        Verifica si el usuario está exento de validación de diccionario/IA.
        Exento si:
        - Es admin o superadmin, O
        - Tiene el campo exempt_from_naming_rules activado
        """
        return self.role in ['admin', 'superadmin'] or self.exempt_from_naming_rules

    def can_exceed_path_limit(self):
        """
        Verifica si el usuario puede exceder el límite de 260 caracteres en rutas.
        Exento si:
        - Es admin o superadmin, O
        - Tiene el campo exempt_from_path_limit activado
        """
        return self.role in ['admin', 'superadmin'] or self.exempt_from_path_limit

    def can_exceed_name_limit(self):
        """
        Verifica si el usuario puede exceder el límite de 30 caracteres en nombres.
        Exento si:
        - Es admin o superadmin, O
        - Tiene el campo exempt_from_name_length activado
        """
        return self.role in ['admin', 'superadmin'] or self.exempt_from_name_length

    def get_naming_exemptions(self):
        """
        Retorna un diccionario con todas las exenciones del usuario.
        Útil para el frontend y APIs.
        """
        is_privileged = self.role in ['admin', 'superadmin']
        return {
            'exempt_from_naming_rules': is_privileged or self.exempt_from_naming_rules,
            'exempt_from_path_limit': is_privileged or self.exempt_from_path_limit,
            'exempt_from_name_length': is_privileged or self.exempt_from_name_length,
            'exemption_reason': self.exemption_reason if not is_privileged else 'Rol privilegiado',
            'is_privileged_role': is_privileged
        }


class UserPermission(models.Model):
    """
    Permisos granulares por ruta para cada usuario

    Un usuario puede tener múltiples permisos para diferentes rutas
    con diferentes niveles de acceso (lectura, escritura, eliminación)
    """

    EDIT_PERMISSION_CHOICES = (
        ('upload_only', 'Solo Subir Archivos'),
        ('upload_own', 'Subir + Editar/Eliminar Propios'),
        ('upload_all', 'Subir + Editar/Eliminar Todos'),
    )

    INHERITANCE_MODE_CHOICES = (
        ('total', 'Herencia Total'),
        ('blocked', 'Herencia con Bloqueos'),
        ('limited_depth', 'Rango Limitado de Profundidad'),
        ('partial_write', 'Herencia Parcial con Restricciones de Escritura'),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='permissions',
        verbose_name='Usuario'
    )

    # Relación directa con directorio (NUEVO) - COMENTADO TEMPORALMENTE POR PROBLEMA EN BD
    # directory = models.ForeignKey(
    #     'files.Directory',
    #     on_delete=models.CASCADE,
    #     related_name='permissions',
    #     null=True,
    #     blank=True,
    #     verbose_name='Directorio',
    #     help_text='Directorio al que aplica este permiso'
    # )

    base_path = models.TextField('Ruta base', help_text='Ruta desde la cual aplica el permiso')

    # Identificador de grupo para asignaciones masivas
    group_name = models.CharField(
        'Nombre de grupo',
        max_length=200,
        null=True,
        blank=True,
        help_text='Identificador de grupo para gestionar asignaciones masivas'
    )

    # Permisos
    can_read = models.BooleanField('Puede leer', default=True)
    can_write = models.BooleanField('Puede escribir', default=False)
    can_delete = models.BooleanField('Puede eliminar', default=False)
    can_create_directories = models.BooleanField(
        'Puede crear directorios',
        default=True,
        help_text='Si está en False, solo puede subir archivos pero no crear/renombrar directorios'
    )
    exempt_from_dictionary = models.BooleanField(
        'Exento de diccionario',
        default=False,
        help_text='Si está activado, no valida nombres contra el diccionario'
    )

    # Sub-permisos para rol consultation_edit
    edit_permission_level = models.CharField(
        'Nivel de permiso de edición',
        max_length=20,
        choices=EDIT_PERMISSION_CHOICES,
        null=True,
        blank=True,
        help_text='Solo aplica para usuarios con rol consultation_edit'
    )

    # Control de herencia de permisos
    inheritance_mode = models.CharField(
        'Modo de herencia',
        max_length=20,
        choices=INHERITANCE_MODE_CHOICES,
        default='total',
        help_text='Cómo se heredan permisos a subdirectorios'
    )
    blocked_paths = models.JSONField(
        'Rutas bloqueadas',
        default=list,
        blank=True,
        help_text='Lista de rutas bloqueadas cuando inheritance_mode=blocked'
    )
    max_depth = models.IntegerField(
        'Profundidad máxima',
        null=True,
        blank=True,
        help_text='Niveles de profundidad cuando inheritance_mode=limited_depth'
    )
    read_only_paths = models.JSONField(
        'Rutas de solo lectura',
        default=list,
        blank=True,
        help_text='Lista de rutas donde solo puede leer/descargar cuando inheritance_mode=partial_write'
    )

    # Metadatos
    is_active = models.BooleanField('Activo', default=True)
    granted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='permissions_granted',
        verbose_name='Otorgado por'
    )
    granted_at = models.DateTimeField('Fecha de otorgamiento', auto_now_add=True)
    revoked_at = models.DateTimeField('Fecha de revocación', null=True, blank=True)

    # Fechas de vigencia del permiso
    expires_at = models.DateTimeField(
        'Fecha de vencimiento',
        null=True,
        blank=True,
        help_text='Fecha hasta la cual el permiso es válido. Si no se especifica, se asigna hasta el 31 de diciembre del año actual.'
    )
    expiration_notified_7days = models.BooleanField(
        'Notificado 7 días antes',
        default=False,
        help_text='Indica si se envió la notificación 7 días antes del vencimiento'
    )
    expiration_notified_3days = models.BooleanField(
        'Notificado 3 días antes',
        default=False,
        help_text='Indica si se envió la notificación 3 días antes del vencimiento'
    )

    # Información de quien autorizó el permiso (líder del grupo)
    authorized_by_email = models.EmailField(
        'Email de quien autoriza',
        null=True,
        blank=True,
        help_text='Correo electrónico del líder que autorizó este permiso'
    )
    authorized_by_name = models.CharField(
        'Nombre de quien autoriza',
        max_length=300,
        null=True,
        blank=True,
        help_text='Nombre completo del líder que autorizó este permiso'
    )

    notes = models.TextField('Notas', blank=True, null=True)

    class Meta:
        verbose_name = 'Permiso de usuario'
        verbose_name_plural = 'Permisos de usuario'
        ordering = ['-granted_at']
        unique_together = ['user', 'base_path']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['base_path']),
            models.Index(fields=['expires_at', 'is_active']),  # Para búsquedas de vencimiento
            models.Index(fields=['group_name']),  # Para gestión de grupos
        ]

    def __str__(self):
        perms = []
        if self.can_read:
            perms.append('R')
        if self.can_write:
            perms.append('W')
        if self.can_delete:
            perms.append('D')
        return f"{self.user.username} - {self.base_path} [{'/'.join(perms)}]"

    def is_expired(self):
        """
        Verifica si el permiso ha vencido.
        Si está vencido y aún está activo, lo desactiva automáticamente.
        """
        if not self.expires_at:
            return False

        now = timezone.now()
        expired = now > self.expires_at

        # Si está vencido pero sigue activo, desactivarlo automáticamente
        if expired and self.is_active:
            self.is_active = False
            self.revoked_at = now
            self.save(update_fields=['is_active', 'revoked_at'])

        return expired

    def days_until_expiration(self):
        """Retorna los días que faltan para el vencimiento (negativo si ya venció)"""
        if not self.expires_at:
            return None
        delta = self.expires_at - timezone.now()
        return delta.days


class UserFavorite(models.Model):
    """
    Accesos directos / Favoritos de usuarios

    Permite a los usuarios marcar rutas frecuentes para acceso rápido
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorites',
        verbose_name='Usuario'
    )
    path = models.TextField('Ruta', help_text='Ruta del directorio favorito')
    name = models.CharField('Nombre personalizado', max_length=255, help_text='Nombre para mostrar')
    description = models.TextField('Descripción', blank=True, null=True)
    color = models.CharField('Color', max_length=20, default='blue', help_text='Color para identificación visual')
    order = models.IntegerField('Orden', default=0, help_text='Orden de visualización')

    # Metadatos
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    access_count = models.IntegerField('Contador de accesos', default=0)
    last_accessed = models.DateTimeField('Último acceso', null=True, blank=True)

    class Meta:
        verbose_name = 'Favorito'
        verbose_name_plural = 'Favoritos'
        ordering = ['order', '-access_count', 'name']
        unique_together = ['user', 'path']
        indexes = [
            models.Index(fields=['user', 'order']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.name}"

    def increment_access(self):
        """Incrementa el contador de accesos y actualiza la fecha"""
        from django.utils import timezone
        self.access_count += 1
        self.last_accessed = timezone.now()
        self.save(update_fields=['access_count', 'last_accessed'])


class PasswordResetToken(models.Model):
    """
    Token para recuperación de contraseña

    Cada token es válido por 1 hora y solo puede usarse una vez
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name='Usuario'
    )
    token = models.CharField('Token', max_length=100, unique=True, db_index=True)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    expires_at = models.DateTimeField('Fecha de expiración')
    used = models.BooleanField('Usado', default=False)
    used_at = models.DateTimeField('Fecha de uso', null=True, blank=True)

    class Meta:
        verbose_name = 'Token de recuperación de contraseña'
        verbose_name_plural = 'Tokens de recuperación de contraseña'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', 'used']),
        ]

    def __str__(self):
        return f"Token para {self.user.username} - {'Usado' if self.used else 'Activo'}"

    @classmethod
    def create_token(cls, user):
        """Crea un nuevo token para el usuario"""
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=1)

        return cls.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )

    def is_valid(self):
        """Verifica si el token es válido (no usado y no expirado)"""
        return not self.used and timezone.now() < self.expires_at

    def mark_as_used(self):
        """Marca el token como usado"""
        self.used = True
        self.used_at = timezone.now()
        self.save(update_fields=['used', 'used_at'])
