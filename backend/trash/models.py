"""
Modelos para el sistema de Papelera de Reciclaje
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class TrashItem(models.Model):
    """
    Representa un archivo o directorio en la papelera de reciclaje.
    Los archivos se almacenan con su trash_id como nombre en el directorio .trash
    """

    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('storing', 'Almacenando'),
        ('stored', 'Almacenado'),
        ('restoring', 'Restaurando'),
        ('restored', 'Restaurado'),
        ('expired', 'Expirado'),
        ('error', 'Error'),
    ]

    # Identificación única
    trash_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    # Información del archivo/directorio original
    original_name = models.CharField(
        max_length=255,
        help_text="Nombre original del archivo o directorio"
    )
    original_path = models.TextField(
        help_text="Ruta completa original (relativa al repositorio)"
    )
    is_directory = models.BooleanField(
        default=False,
        help_text="True si era un directorio (se almacena como .tar.gz)"
    )

    # Metadata del contenido
    size_bytes = models.BigIntegerField(
        default=0,
        help_text="Tamaño en bytes del archivo o directorio"
    )
    file_count = models.IntegerField(
        default=1,
        help_text="Cantidad de archivos (1 para archivos, N para directorios)"
    )
    dir_count = models.IntegerField(
        default=0,
        help_text="Cantidad de subdirectorios (solo para directorios)"
    )
    file_hash = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        help_text="Hash SHA256 del contenido para verificar integridad"
    )
    mime_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Tipo MIME del archivo"
    )
    extension = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Extensión del archivo original"
    )

    # Auditoría
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='trash_items',
        help_text="Usuario que eliminó el archivo"
    )
    deleted_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Fecha y hora de eliminación"
    )
    expires_at = models.DateTimeField(
        help_text="Fecha y hora de expiración automática"
    )

    # Estado del item
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Mensaje de error si status='error'"
    )

    # Metadata adicional en JSON
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Información adicional (permisos, propietario original, etc.)"
    )

    # Restauración
    restored_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Fecha de restauración (si fue restaurado)"
    )
    restored_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='restored_trash_items',
        help_text="Usuario que restauró el archivo"
    )
    restored_path = models.TextField(
        null=True,
        blank=True,
        help_text="Ruta donde se restauró (si difiere de la original)"
    )

    # Campos para notificaciones de expiración
    notified_7days = models.BooleanField(
        default=False,
        help_text="Si ya se notificó al usuario 7 días antes de expirar"
    )
    notified_3days = models.BooleanField(
        default=False,
        help_text="Si ya se notificó al usuario 3 días antes de expirar"
    )

    class Meta:
        db_table = 'trash_items'
        ordering = ['-deleted_at']
        verbose_name = 'Item de Papelera'
        verbose_name_plural = 'Items de Papelera'
        indexes = [
            models.Index(fields=['original_path']),
            models.Index(fields=['original_name']),
            models.Index(fields=['deleted_by']),
            models.Index(fields=['deleted_at']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['status']),
            models.Index(fields=['is_directory']),
        ]

    def __str__(self):
        return f"{self.original_name} (eliminado: {self.deleted_at.strftime('%Y-%m-%d %H:%M')})"

    def save(self, *args, **kwargs):
        # Calcular fecha de expiración si no está definida
        if not self.expires_at:
            retention_days = getattr(settings, 'TRASH_RETENTION_DAYS', 30)
            self.expires_at = timezone.now() + timedelta(days=retention_days)

        # Extraer extensión si no está definida
        if not self.extension and self.original_name and '.' in self.original_name:
            self.extension = '.' + self.original_name.rsplit('.', 1)[-1].lower()

        super().save(*args, **kwargs)

    @property
    def days_until_expiry(self):
        """Días restantes hasta la expiración"""
        if self.expires_at:
            delta = self.expires_at - timezone.now()
            return max(0, delta.days)
        return 0

    @property
    def is_expired(self):
        """Verifica si el item ha expirado"""
        return timezone.now() >= self.expires_at

    @property
    def size_formatted(self):
        """Tamaño formateado en unidades legibles"""
        size = self.size_bytes
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} PB"

    @property
    def trash_filename(self):
        """Nombre del archivo en el directorio .trash"""
        if self.is_directory:
            return f"{self.trash_id}.tar.gz"
        else:
            return f"{self.trash_id}.data"

    def get_trash_file_path(self):
        """Ruta completa al archivo en la papelera"""
        from django.conf import settings
        import os

        # Usar NETAPP_PATH (raíz del repositorio) no NETAPP_BASE_PATH
        netapp_path = getattr(settings, 'NETAPP_PATH', '/mnt/repositorio')
        trash_path = getattr(settings, 'TRASH_PATH', '.trash')

        return os.path.join(netapp_path, trash_path, self.trash_filename)



class TrashConfig(models.Model):
    """
    Configuración global de la papelera de reciclaje.
    Solo debe existir un registro (singleton).
    Solo el superadmin puede modificar estos valores.
    """

    # Límites de la papelera
    max_size_gb = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=2048.0,  # 2TB por defecto
        help_text="Tamaño máximo total de la papelera en GB"
    )
    max_item_size_gb = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=5.0,  # 5GB por defecto por archivo
        help_text="Tamaño máximo por archivo/directorio individual en GB (archivos mayores se eliminan sin respaldo)"
    )
    retention_days = models.IntegerField(
        default=30,
        help_text="Días de retención de archivos en papelera"
    )

    # Configuración de limpieza automática
    auto_cleanup_enabled = models.BooleanField(
        default=True,
        help_text="Habilitar limpieza automática de archivos expirados"
    )

    # Auditoría
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='trash_config_updates',
        help_text="Último usuario que modificó la configuración"
    )

    class Meta:
        db_table = 'trash_config'
        verbose_name = 'Configuración de Papelera'
        verbose_name_plural = 'Configuración de Papelera'

    def __str__(self):
        return f"Papelera: {self.max_size_gb}GB, {self.retention_days} días"

    @classmethod
    def get_config(cls):
        """Obtener la configuración (singleton). Crea una por defecto si no existe."""
        config, created = cls.objects.get_or_create(pk=1)
        return config

    @property
    def max_size_bytes(self):
        """Tamaño máximo total en bytes"""
        return int(float(self.max_size_gb) * 1024 * 1024 * 1024)

    @property
    def max_item_size_bytes(self):
        """Tamaño máximo por item individual en bytes"""
        return int(float(self.max_item_size_gb) * 1024 * 1024 * 1024)

    def apply_retention_change(self, old_retention_days):
        """
        Aplica cambios cuando se reduce el tiempo de retención.
        Elimina archivos que exceden el nuevo límite.
        Retorna la cantidad de archivos eliminados.
        """
        import os
        from django.utils import timezone
        from datetime import timedelta

        if self.retention_days >= old_retention_days:
            # No se redujo el tiempo, no hay nada que hacer
            return 0

        # Calcular nueva fecha límite
        new_cutoff = timezone.now() + timedelta(days=self.retention_days)

        # Buscar items que ahora exceden el nuevo límite
        # (su fecha de eliminación + nuevos días de retención < ahora)
        items_to_delete = TrashItem.objects.filter(
            status='stored',
            deleted_at__lt=timezone.now() - timedelta(days=self.retention_days)
        )

        deleted_count = 0
        for item in items_to_delete:
            try:
                # Eliminar archivo físico
                trash_file = item.get_trash_file_path()
                if os.path.exists(trash_file):
                    os.remove(trash_file)

                # Marcar como expirado y eliminar registro
                item.status = 'expired'
                item.save()
                item.delete()
                deleted_count += 1
            except Exception as e:
                print(f"Error eliminando {item.trash_id}: {e}")

        return deleted_count


# NOTA: TrashShareLink fue eliminado.
# Ahora se usa sharing.ShareLink con el campo trash_item para compartir items de papelera.
