"""
Modelos para archivos y directorios indexados de NetApp
"""
from django.db import models


class Directory(models.Model):
    """
    Modelo para directorios del repositorio NetApp con jerarquía

    Representa la estructura de carpetas con relación parent-child
    para facilitar permisos y navegación
    """

    # Identificación
    path = models.TextField('Ruta completa relativa', unique=True, db_index=True)
    name = models.CharField('Nombre del directorio', max_length=500)

    # Jerarquía
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Directorio padre'
    )
    depth = models.IntegerField('Nivel de profundidad', default=0, db_index=True)

    # Metadatos del sistema de archivos
    created_date = models.DateTimeField('Fecha de creación', null=True, blank=True)
    modified_date = models.DateTimeField('Fecha de modificación', null=True, blank=True, db_index=True)

    # Tracking de creación
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_directories',
        verbose_name='Creado por'
    )
    created_at = models.DateTimeField('Creado en sistema', auto_now_add=True)

    # Estadísticas (cache para performance)
    file_count = models.IntegerField('Cantidad de archivos directos', default=0)
    subdir_count = models.IntegerField('Cantidad de subdirectorios directos', default=0)
    total_size = models.BigIntegerField('Tamaño total en bytes', default=0)

    # Control de indexación
    indexed_at = models.DateTimeField('Última indexación', auto_now=True)
    is_active = models.BooleanField('Activo', default=True, help_text='Si el directorio existe en NetApp')

    class Meta:
        verbose_name = 'Directorio'
        verbose_name_plural = 'Directorios'
        ordering = ['path']
        indexes = [
            models.Index(fields=['path']),
            models.Index(fields=['parent']),
            models.Index(fields=['depth']),
            models.Index(fields=['modified_date']),
        ]

    def __str__(self):
        return self.path

    def get_full_path(self, base_path):
        """Retorna la ruta absoluta completa"""
        import os
        return os.path.join(base_path, self.path) if self.path else base_path

    def get_ancestors(self):
        """Retorna lista de directorios ancestros (de raíz a este)"""
        ancestors = []
        current = self
        while current.parent:
            ancestors.insert(0, current.parent)
            current = current.parent
        return ancestors

    def get_descendants(self):
        """Retorna queryset de todos los descendientes (recursivo)"""
        return Directory.objects.filter(path__startswith=f"{self.path}/")

    def update_statistics(self):
        """Actualiza estadísticas de archivos y subdirectorios"""
        self.file_count = self.files.count()
        self.subdir_count = self.children.filter(is_active=True).count()
        self.total_size = self.files.aggregate(models.Sum('size'))['size__sum'] or 0
        self.save(update_fields=['file_count', 'subdir_count', 'total_size'])


class File(models.Model):
    """
    Modelo para archivos (NO directorios) indexados del repositorio NetApp

    Cada archivo pertenece a un directorio (Directory)
    """

    # Relación con directorio padre
    directory = models.ForeignKey(
        Directory,
        on_delete=models.CASCADE,
        related_name='files',
        verbose_name='Directorio padre'
    )

    # Identificación
    path = models.TextField('Ruta completa relativa', unique=True, db_index=True)
    name = models.TextField('Nombre de archivo')
    extension = models.CharField('Extensión', max_length=255, blank=True, null=True, db_index=True)
    size = models.BigIntegerField('Tamaño en bytes', null=True, blank=True, db_index=True)

    # Fechas del archivo/directorio
    modified_date = models.DateTimeField('Fecha de modificación', null=True, blank=True, db_index=True)
    created_date = models.DateTimeField('Fecha de creación', null=True, blank=True)

    # Hash MD5 (opcional, para detectar duplicados)
    md5_hash = models.CharField('Hash MD5', max_length=32, null=True, blank=True)

    # Tracking de propiedad
    uploaded_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_files',
        verbose_name='Subido por'
    )
    uploaded_at = models.DateTimeField('Fecha de subida', null=True, blank=True)
    modified_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='modified_files',
        verbose_name='Modificado por'
    )
    modified_by_at = models.DateTimeField('Fecha modificación por usuario', null=True, blank=True)

    # Metadatos de indexación
    indexed_at = models.DateTimeField('Fecha de indexación', auto_now=True)

    class Meta:
        verbose_name = 'Archivo'
        verbose_name_plural = 'Archivos'
        ordering = ['path']
        indexes = [
            models.Index(fields=['path']),
            models.Index(fields=['name']),
            models.Index(fields=['extension']),
            models.Index(fields=['size']),
            models.Index(fields=['modified_date']),
            models.Index(fields=['directory', 'name']),
        ]

    def __str__(self):
        return self.path

    def get_parent_path(self):
        """Retorna la ruta del directorio padre"""
        import os
        return os.path.dirname(self.path)

    def get_size_display(self):
        """Retorna el tamaño en formato legible"""
        if self.size is None:
            return 'N/A'

        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if self.size < 1024.0:
                return f"{self.size:.2f} {unit}"
            self.size /= 1024.0

        return f"{self.size:.2f} PB"


class Stats(models.Model):
    """
    Estadísticas globales del sistema de archivos
    """

    total_files = models.BigIntegerField('Total de archivos', default=0)
    total_directories = models.BigIntegerField('Total de directorios', default=0)
    total_size = models.BigIntegerField('Tamaño total en bytes', default=0)
    last_updated = models.DateTimeField('Última actualización', auto_now=True)

    class Meta:
        verbose_name = 'Estadística'
        verbose_name_plural = 'Estadísticas'

    def __str__(self):
        return f"Stats - {self.last_updated}"

    def get_total_size_display(self):
        """Retorna el tamaño total en formato legible"""
        size = self.total_size
        for unit in ['B', 'KB', 'MB', 'GB', 'TB', 'PB']:
            if size < 1024.0:
                return f"{size:.2f} {unit}"
            size /= 1024.0
        return f"{size:.2f} EB"


class DirectoryColor(models.Model):
    """
    Colores personalizados de directorios por usuario.

    Cada usuario puede asignar un color a cualquier directorio.
    El color solo es visible para ese usuario específico.
    """

    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='directory_colors',
        verbose_name='Usuario'
    )

    # Guardamos la ruta como texto para flexibilidad
    # (el directorio puede no existir en la BD si es de nivel superior)
    directory_path = models.TextField(
        'Ruta del directorio',
        db_index=True
    )

    # Color en formato hex (incluye #)
    color = models.CharField(
        'Color',
        max_length=9,  # #RRGGBB o #RRGGBBAA
        default='#3B82F6'
    )

    created_at = models.DateTimeField('Creado', auto_now_add=True)
    updated_at = models.DateTimeField('Actualizado', auto_now=True)

    class Meta:
        verbose_name = 'Color de Directorio'
        verbose_name_plural = 'Colores de Directorios'
        # Un usuario solo puede tener un color por directorio
        unique_together = ['user', 'directory_path']
        indexes = [
            models.Index(fields=['user', 'directory_path']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.directory_path} - {self.color}"
