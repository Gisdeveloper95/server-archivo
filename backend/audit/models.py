"""
Modelo para auditoría transaccional del sistema
"""
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """
    Registro de auditoría para todas las acciones críticas del sistema

    Registra: upload, download, delete, rename, create_folder, move, copy
    """

    ACTION_CHOICES = (
        ('upload', 'Subir Archivo'),
        ('upload_batch', 'Subida Masiva'),
        ('download', 'Descargar'),
        ('delete', 'Eliminar'),
        ('rename', 'Renombrar'),
        ('create_folder', 'Crear Carpeta'),
        ('move', 'Mover'),
        ('copy', 'Copiar'),
        ('login', 'Inicio de sesión'),
        ('logout', 'Cierre de sesión'),
        ('update_exemptions', 'Actualizar Exenciones'),
    )

    # Usuario que realizó la acción
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
        verbose_name='Usuario'
    )
    username = models.CharField('Nombre de usuario', max_length=150, db_index=True)
    user_role = models.CharField('Rol del usuario', max_length=20)

    # Acción realizada
    action = models.CharField('Acción', max_length=50, choices=ACTION_CHOICES, db_index=True)
    target_path = models.TextField('Ruta objetivo')
    target_name = models.TextField('Nombre del archivo/directorio', blank=True, null=True)

    # Detalles adicionales (JSON)
    file_size = models.BigIntegerField('Tamaño del archivo', null=True, blank=True)
    details = models.JSONField('Detalles adicionales', default=dict, blank=True)

    # Información de la petición HTTP
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)
    user_agent = models.TextField('User Agent', blank=True, null=True)

    # Resultado de la acción
    success = models.BooleanField('Éxito', default=True)
    error_message = models.TextField('Mensaje de error', blank=True, null=True)

    # Timestamp
    timestamp = models.DateTimeField('Fecha y hora', auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Registro de auditoría'
        verbose_name_plural = 'Registros de auditoría'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['username']),
            models.Index(fields=['success']),
        ]

    def __str__(self):
        return f"{self.username} - {self.action} - {self.target_name or self.target_path} ({self.timestamp})"

    def get_details_display(self):
        """Retorna los detalles en formato legible"""
        if not self.details:
            return 'Sin detalles'

        items = []
        for key, value in self.details.items():
            items.append(f"{key}: {value}")
        return ', '.join(items)


class ZipAnalysis(models.Model):
    """
    Análisis bajo demanda de archivos ZIP
    Se crea solo cuando un administrador solicita analizar un archivo .zip
    """
    zip_path = models.TextField('Ruta del archivo ZIP', db_index=True)
    zip_name = models.CharField('Nombre del ZIP', max_length=500)

    # Usuario que solicitó el análisis
    analyzed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='zip_analyses',
        verbose_name='Analizado por'
    )
    analyzed_at = models.DateTimeField('Fecha de análisis', auto_now_add=True, db_index=True)

    # Resultados del análisis
    contained_files = models.JSONField('Archivos contenidos', default=list)
    total_files = models.IntegerField('Total de archivos', default=0)
    total_size = models.BigIntegerField('Tamaño total (bytes)', default=0)

    # Información adicional
    zip_size = models.BigIntegerField('Tamaño del ZIP (bytes)', null=True, blank=True)
    compression_ratio = models.FloatField('Ratio de compresión', null=True, blank=True)

    class Meta:
        verbose_name = 'Análisis de ZIP'
        verbose_name_plural = 'Análisis de ZIPs'
        ordering = ['-analyzed_at']
        indexes = [
            models.Index(fields=['zip_path', 'analyzed_at']),
        ]

    def __str__(self):
        return f"{self.zip_name} - {self.analyzed_at}"


class PermissionAudit(models.Model):
    """
    Registro de cambios en permisos de usuarios
    Complementa a UserPermission para mantener historial
    """

    ACTION_CHOICES = (
        ('granted', 'Permiso Otorgado'),
        ('revoked', 'Permiso Revocado'),
        ('modified', 'Permiso Modificado'),
    )

    PERMISSION_TYPE_CHOICES = (
        ('read', 'Lectura'),
        ('write', 'Escritura'),
        ('delete', 'Eliminación'),
        ('create_directories', 'Crear Directorios'),
    )

    # Usuario afectado
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='permission_audits',
        verbose_name='Usuario afectado'
    )

    # Ruta afectada
    base_path = models.TextField('Ruta base')

    # Acción realizada
    action = models.CharField('Acción', max_length=50, choices=ACTION_CHOICES, db_index=True)
    permission_type = models.CharField(
        'Tipo de permiso',
        max_length=30,
        choices=PERMISSION_TYPE_CHOICES,
        blank=True,
        null=True
    )

    # Usuario que realizó el cambio
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='permission_changes_made',
        verbose_name='Modificado por'
    )
    changed_at = models.DateTimeField('Fecha de cambio', auto_now_add=True, db_index=True)

    # Detalles adicionales
    details = models.JSONField('Detalles adicionales', default=dict, blank=True)

    # IP y User Agent
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)

    class Meta:
        verbose_name = 'Auditoría de permisos'
        verbose_name_plural = 'Auditorías de permisos'
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['user', 'changed_at']),
            models.Index(fields=['action', 'changed_at']),
            models.Index(fields=['changed_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.base_path} ({self.changed_at})"
