"""
Modelos para el sistema de Diccionario de Datos
"""
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class DictionaryEntry(models.Model):
    """
    Entrada del diccionario de términos permitidos

    Almacena los términos (siglas/palabras) permitidos para nombres de archivos
    junto con su significado completo.
    """

    key = models.CharField(
        'Término/Sigla',
        max_length=100,
        unique=True,
        db_index=True,
        help_text='Término o sigla permitida (ej: "igac", "acm", "netapp")'
    )

    value = models.TextField(
        'Descripción/Significado',
        help_text='Significado completo del término (ej: "instituto geográfico agustín codazzi")'
    )

    is_active = models.BooleanField(
        'Activo',
        default=True,
        help_text='Si está desactivado, el término no se validará'
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='dictionary_entries_created',
        verbose_name='Creado por'
    )

    created_at = models.DateTimeField(
        'Fecha de creación',
        auto_now_add=True
    )

    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dictionary_entries_updated',
        verbose_name='Actualizado por'
    )

    updated_at = models.DateTimeField(
        'Fecha de actualización',
        auto_now=True
    )

    class Meta:
        verbose_name = 'Entrada del Diccionario'
        verbose_name_plural = 'Entradas del Diccionario'
        ordering = ['key']
        indexes = [
            models.Index(fields=['key', 'is_active']),
            models.Index(fields=['is_active', 'created_at']),
        ]

    def __str__(self):
        return f"{self.key} → {self.value[:50]}{'...' if len(self.value) > 50 else ''}"

    def save(self, *args, **kwargs):
        # Normalizar key a minúsculas
        self.key = self.key.lower().strip()
        super().save(*args, **kwargs)


class AIGeneratedAbbreviation(models.Model):
    """
    Caché de abreviaciones generadas por IA.

    Almacena las abreviaciones que la IA ha generado para palabras no encontradas
    en el diccionario oficial. Esto garantiza CONSISTENCIA: una vez que la IA
    abrevia una palabra, todos los usuarios obtienen la misma abreviación.

    Flujo:
    1. Usuario solicita abreviar "prestación"
    2. Buscar en DictionaryEntry (oficial) → NO encontrado
    3. Buscar en AIGeneratedAbbreviation (cache) → NO encontrado
    4. IA genera "prest"
    5. Guardar en AIGeneratedAbbreviation
    6. Futuras consultas de "prestación" → "prest" (sin llamar IA)
    """

    # Palabra original (normalizada: minúsculas, sin tildes)
    original_word = models.CharField(
        'Palabra Original',
        max_length=100,
        unique=True,
        db_index=True,
        help_text='Palabra completa normalizada (ej: "prestacion")'
    )

    # Abreviación generada por IA
    abbreviation = models.CharField(
        'Abreviación',
        max_length=20,
        db_index=True,
        help_text='Abreviación generada (ej: "prest")'
    )

    # Metadatos
    times_used = models.PositiveIntegerField(
        'Veces usado',
        default=1,
        help_text='Número de veces que se ha usado esta abreviación'
    )

    # Estado de revisión (para que admin pueda aprobar/corregir)
    STATUS_CHOICES = (
        ('pending', 'Pendiente de revisión'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
        ('corrected', 'Corregido manualmente'),
    )
    status = models.CharField(
        'Estado',
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )

    # Si fue corregido, guardar la abreviación original de la IA
    original_ai_abbreviation = models.CharField(
        'Abreviación original IA',
        max_length=20,
        blank=True,
        null=True,
        help_text='Si fue corregido, aquí se guarda lo que la IA generó originalmente'
    )

    # Auditoría
    created_at = models.DateTimeField(
        'Fecha de creación',
        auto_now_add=True
    )

    last_used_at = models.DateTimeField(
        'Último uso',
        auto_now=True
    )

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='abbreviations_reviewed',
        verbose_name='Revisado por'
    )

    reviewed_at = models.DateTimeField(
        'Fecha de revisión',
        null=True,
        blank=True
    )

    class Meta:
        verbose_name = 'Abreviación Generada por IA'
        verbose_name_plural = 'Abreviaciones Generadas por IA'
        ordering = ['-times_used', 'original_word']
        indexes = [
            models.Index(fields=['original_word']),
            models.Index(fields=['abbreviation']),
            models.Index(fields=['status', 'times_used']),
        ]

    def __str__(self):
        status_icon = {
            'pending': '⏳',
            'approved': '✓',
            'rejected': '✗',
            'corrected': '✏️'
        }.get(self.status, '')
        return f"{status_icon} {self.original_word} → {self.abbreviation} (usado {self.times_used}x)"

    def increment_usage(self):
        """Incrementa el contador de uso"""
        self.times_used += 1
        self.save(update_fields=['times_used', 'last_used_at'])

    @classmethod
    def get_or_none(cls, word: str):
        """
        Busca una abreviación cacheada para una palabra.
        Retorna None si no existe o está rechazada.
        """
        import unicodedata

        # Normalizar palabra
        normalized = word.lower().strip()
        normalized = ''.join(
            c for c in unicodedata.normalize('NFD', normalized)
            if unicodedata.category(c) != 'Mn'
        )

        try:
            entry = cls.objects.get(original_word=normalized)
            # No usar si está rechazada
            if entry.status == 'rejected':
                return None

            # Auto-limpiar abreviaciones con guiones medios (migración en caliente)
            if '-' in entry.abbreviation:
                cleaned = entry.abbreviation.replace('-', '_')
                cleaned = ''.join(c for c in cleaned if c.isalnum() or c == '_')
                while '__' in cleaned:
                    cleaned = cleaned.replace('__', '_')
                cleaned = cleaned.strip('_')
                entry.abbreviation = cleaned
                entry.save(update_fields=['abbreviation'])

            return entry
        except cls.DoesNotExist:
            return None

    @classmethod
    def cache_abbreviation(cls, word: str, abbreviation: str):
        """
        Guarda una nueva abreviación en el cache.
        Si ya existe, incrementa el contador de uso.
        """
        import unicodedata

        # Normalizar palabra
        normalized = word.lower().strip()
        normalized = ''.join(
            c for c in unicodedata.normalize('NFD', normalized)
            if unicodedata.category(c) != 'Mn'
        )

        # Normalizar abreviación - IMPORTANTE: convertir guiones medios a guiones bajos
        abbrev_clean = abbreviation.lower().strip()
        abbrev_clean = abbrev_clean.replace('-', '_')  # NUNCA guiones medios
        # Remover caracteres no permitidos (solo letras, números y guión bajo)
        abbrev_clean = ''.join(c for c in abbrev_clean if c.isalnum() or c == '_')
        # Remover guiones bajos duplicados
        while '__' in abbrev_clean:
            abbrev_clean = abbrev_clean.replace('__', '_')
        abbrev_clean = abbrev_clean.strip('_')

        entry, created = cls.objects.get_or_create(
            original_word=normalized,
            defaults={'abbreviation': abbrev_clean}
        )

        if not created:
            entry.increment_usage()

        return entry
