from django.db import models
from django.utils import timezone
from datetime import date


class GroqAPIKeyUsage(models.Model):
    """
    Modelo para tracking del uso de API keys de Groq.
    Permite monitorear el consumo, errores y disponibilidad de cada key en el pool.

    Los contadores se resetean automáticamente cada día (GROQ renueva límites diariamente).
    """

    # Identificación
    key_identifier = models.CharField(
        max_length=50,
        unique=True,
        help_text="Identificador único de la key (ej: key_1, key_2, etc.)"
    )
    key_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Nombre descriptivo opcional (ej: 'Cuenta Gmail Principal')"
    )

    # Estadísticas de uso (se resetean diariamente)
    total_calls = models.PositiveIntegerField(
        default=0,
        help_text="Total de llamadas realizadas con esta key (hoy)"
    )
    successful_calls = models.PositiveIntegerField(
        default=0,
        help_text="Llamadas exitosas (hoy)"
    )
    failed_calls = models.PositiveIntegerField(
        default=0,
        help_text="Llamadas fallidas (hoy)"
    )
    rate_limit_errors = models.PositiveIntegerField(
        default=0,
        help_text="Número de veces que alcanzó el rate limit (hoy)"
    )
    restriction_errors = models.PositiveIntegerField(
        default=0,
        help_text="Errores de restricción de organización (400)"
    )

    # Tokens consumidos (si el API lo devuelve)
    total_tokens_used = models.PositiveIntegerField(
        default=0,
        help_text="Total de tokens consumidos (hoy)"
    )

    # Fecha del último reset (para reset diario)
    last_reset_date = models.DateField(
        null=True,
        blank=True,
        help_text="Fecha del último reset de contadores"
    )

    # Último error conocido
    last_error_message = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Último mensaje de error"
    )

    # Estado y timestamps
    is_active = models.BooleanField(
        default=True,
        help_text="Si la key está activa o deshabilitada manualmente"
    )
    is_restricted = models.BooleanField(
        default=False,
        help_text="Si la organización está restringida por GROQ"
    )
    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Última vez que se usó esta key"
    )
    last_error_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Última vez que ocurrió un error"
    )
    last_rate_limit_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Última vez que alcanzó el rate limit"
    )
    last_success_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Última llamada exitosa"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'groq_api_key_usage'
        verbose_name = 'Groq API Key Usage'
        verbose_name_plural = 'Groq API Keys Usage'
        ordering = ['key_identifier']

    def __str__(self):
        return f"{self.key_identifier} ({self.success_rate:.1f}% success)"

    @property
    def success_rate(self):
        """Calcula la tasa de éxito en porcentaje"""
        if self.total_calls == 0:
            return 0.0
        return (self.successful_calls / self.total_calls) * 100

    @property
    def is_rate_limited_recently(self):
        """
        Verifica si la key fue rate-limited en los últimos 60 segundos.
        Groq generalmente usa ventanas de 1 minuto.
        """
        if not self.last_rate_limit_at:
            return False
        time_since_limit = timezone.now() - self.last_rate_limit_at
        return time_since_limit.total_seconds() < 60

    def check_and_reset_if_new_day(self):
        """
        Verifica si es un nuevo día y resetea las estadísticas.
        GROQ renueva límites diariamente, así que reseteamos al inicio de cada día.
        Retorna True si se reseteó, False si no.
        """
        today = date.today()

        # Si nunca se ha reseteado o es un nuevo día
        if self.last_reset_date is None or self.last_reset_date < today:
            print(f"[GROQ RESET] Reseteando contadores para {self.key_identifier} (último reset: {self.last_reset_date}, hoy: {today})")
            self.total_calls = 0
            self.successful_calls = 0
            self.failed_calls = 0
            self.rate_limit_errors = 0
            self.restriction_errors = 0
            self.total_tokens_used = 0
            self.last_rate_limit_at = None
            self.last_reset_date = today
            # NO reseteamos is_restricted ya que es un estado persistente
            # hasta que se verifique manualmente
            return True

        return False

    def record_success(self, tokens_used=0):
        """Registra una llamada exitosa"""
        # Verificar si es nuevo día
        was_reset = self.check_and_reset_if_new_day()

        self.total_calls += 1
        self.successful_calls += 1
        self.total_tokens_used += tokens_used
        self.last_used_at = timezone.now()
        self.last_success_at = timezone.now()
        self.is_restricted = False  # Si tuvo éxito, no está restringida
        self.last_error_message = None

        update_fields = [
            'total_calls',
            'successful_calls',
            'total_tokens_used',
            'last_used_at',
            'last_success_at',
            'is_restricted',
            'last_error_message',
            'updated_at'
        ]

        if was_reset:
            update_fields.extend([
                'failed_calls',
                'rate_limit_errors',
                'restriction_errors',
                'last_rate_limit_at',
                'last_reset_date'
            ])

        self.save(update_fields=update_fields)

    def record_failure(self, is_rate_limit=False, is_restricted=False, error_message=None):
        """Registra una llamada fallida"""
        # Verificar si es nuevo día
        was_reset = self.check_and_reset_if_new_day()

        self.total_calls += 1
        self.failed_calls += 1
        self.last_error_at = timezone.now()
        self.last_used_at = timezone.now()

        if error_message:
            self.last_error_message = error_message[:500]

        update_fields = [
            'total_calls',
            'failed_calls',
            'last_error_at',
            'last_used_at',
            'last_error_message',
            'updated_at'
        ]

        if is_rate_limit:
            self.rate_limit_errors += 1
            self.last_rate_limit_at = timezone.now()
            update_fields.extend(['rate_limit_errors', 'last_rate_limit_at'])

        if is_restricted:
            self.restriction_errors += 1
            self.is_restricted = True
            update_fields.extend(['restriction_errors', 'is_restricted'])

        if was_reset:
            update_fields.append('last_reset_date')

        self.save(update_fields=update_fields)

    def reset_stats(self):
        """Resetea las estadísticas (útil para testing o limpiar datos)"""
        self.total_calls = 0
        self.successful_calls = 0
        self.failed_calls = 0
        self.rate_limit_errors = 0
        self.restriction_errors = 0
        self.total_tokens_used = 0
        self.last_used_at = None
        self.last_error_at = None
        self.last_rate_limit_at = None
        self.last_success_at = None
        self.last_error_message = None
        self.is_restricted = False
        self.last_reset_date = date.today()
        self.save()
