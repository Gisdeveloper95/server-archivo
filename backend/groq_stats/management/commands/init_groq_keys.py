"""
Comando para inicializar todas las API keys de Groq en la base de datos.

Uso:
    python manage.py init_groq_keys

Este comando:
1. Lee todas las API keys configuradas en settings.GROQ_API_KEYS
2. Crea un registro en la BD para cada key (si no existe)
3. Marca todas las keys como activas
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from groq_stats.models import GroqAPIKeyUsage


class Command(BaseCommand):
    help = 'Inicializa todas las API keys de Groq configuradas en settings en la base de datos'

    def handle(self, *args, **options):
        self.stdout.write('[GROQ INIT] Iniciando inicialización de API keys...')

        # Cargar API keys desde settings
        api_keys_str = getattr(settings, 'GROQ_API_KEYS', None) or getattr(settings, 'GROQ_API_KEY', None)

        if not api_keys_str:
            self.stdout.write(
                self.style.ERROR('[ERROR] No se encontraron API keys en settings.GROQ_API_KEYS o settings.GROQ_API_KEY')
            )
            return

        # Parsear keys (separadas por comas)
        api_keys = [key.strip() for key in api_keys_str.split(',') if key.strip()]

        if not api_keys:
            self.stdout.write(self.style.ERROR('[ERROR] No se encontraron API keys validas'))
            return

        self.stdout.write(f'[GROQ INIT] Encontradas {len(api_keys)} API key(s) en configuración')

        # Crear/verificar cada key
        created_count = 0
        existing_count = 0

        for index, api_key in enumerate(api_keys):
            key_identifier = f"key_{index + 1}"

            # get_or_create: crea si no existe, no hace nada si ya existe
            key_usage, created = GroqAPIKeyUsage.objects.get_or_create(
                key_identifier=key_identifier,
                defaults={
                    'key_name': f'Groq API Key {key_identifier}',
                    'is_active': True
                }
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  [OK] Creada: {key_identifier}')
                )
            else:
                existing_count += 1
                self.stdout.write(
                    self.style.WARNING(f'  [INFO] Ya existe: {key_identifier} (mantiene stats existentes)')
                )

        # Resumen
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('[SUCCESS] Inicializacion completada'))
        self.stdout.write(f'   - Keys creadas: {created_count}')
        self.stdout.write(f'   - Keys existentes: {existing_count}')
        self.stdout.write(f'   - Total en BD: {len(api_keys)}')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        self.stdout.write('Ahora todas las keys apareceran en el dashboard del frontend.')
