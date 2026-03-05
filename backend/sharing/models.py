from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import secrets

User = get_user_model()


class ShareLink(models.Model):
    """
    Links de compartición - SOLO creados por superadmin
    """
    
    PERMISSION_CHOICES = [
        ('view', 'Solo ver'),
        ('download', 'Ver y descargar'),
    ]
    
    # Identificación
    token = models.CharField(
        max_length=64, 
        unique=True, 
        db_index=True,
        editable=False
    )
    
    # Archivo/directorio compartido
    path = models.CharField(max_length=1000, help_text="Ruta en NetApp")
    is_directory = models.BooleanField(default=False)

    # Referencia opcional a item de papelera
    trash_item = models.ForeignKey(
        'trash.TrashItem',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='share_links',
        help_text="Si es un link a item de papelera"
    )
    
    # Permisos
    permission = models.CharField(
        max_length=20, 
        choices=PERMISSION_CHOICES,
        default='view'
    )
    
    # Protección adicional
    password = models.CharField(
        max_length=128, 
        null=True, 
        blank=True,
        help_text="Contraseña opcional (hasheada)"
    )
    require_email = models.BooleanField(
        default=False,
        help_text="Requiere que el usuario ingrese su email"
    )
    allowed_domain = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Ej: igac.gov.co"
    )
    
    # Auditoría de creación
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='created_share_links'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Expiración
    expires_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Fecha de expiración automática"
    )
    max_downloads = models.IntegerField(
        null=True,
        blank=True,
        help_text="Máximo de descargas permitidas"
    )
    
    # Estado
    is_active = models.BooleanField(default=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    deactivated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deactivated_share_links'
    )
    
    # Estadísticas
    access_count = models.IntegerField(default=0)
    download_count = models.IntegerField(default=0)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    description = models.TextField(
        blank=True,
        help_text="Descripción interna (no visible al público)"
    )
    
    class Meta:
        db_table = 'share_links'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['created_by', 'is_active']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = 'Link Compartido'
        verbose_name_plural = 'Links Compartidos'
    
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.path} ({self.token[:8]}...)"
    
    @property
    def is_expired(self):
        """Verificar si el link expiró"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def is_valid(self):
        """Verificar si el link es válido"""
        if not self.is_active:
            return False
        if self.is_expired:
            return False
        if self.max_downloads and self.download_count >= self.max_downloads:
            return False
        return True
    
    @property
    def full_url(self):
        """URL completa del link - página pública de visualización"""
        return f"https://gestionarchivo.duckdns.org/share/{self.token}"


class ShareLinkAccess(models.Model):
    """
    Registro de cada acceso a un link compartido
    """
    share_link = models.ForeignKey(
        ShareLink,
        on_delete=models.CASCADE,
        related_name='accesses'
    )
    
    # Información del visitante
    accessed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(blank=True)
    email_provided = models.EmailField(null=True, blank=True)
    
    # Acción realizada
    ACTION_CHOICES = [
        ('view', 'Vió el archivo'),
        ('download', 'Descargó el archivo'),
        ('denied', 'Acceso denegado'),
    ]
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    
    # Detalles
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'share_link_accesses'
        ordering = ['-accessed_at']
        verbose_name = 'Acceso a Link Compartido'
        verbose_name_plural = 'Accesos a Links Compartidos'
    
    def __str__(self):
        return f"{self.share_link.token[:8]}... - {self.action} at {self.accessed_at}"
