"""
Comando Django para migrar el diccionario desde JSON a base de datos
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from dictionary.models import DictionaryEntry
import json


class Command(BaseCommand):
    help = 'Migra el diccionario desde diccionario_archivo.json a la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la migracion sin guardar en BD',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Elimina todas las entradas existentes antes de importar',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        clear = options['clear']

        # Ruta al archivo JSON
        json_path = settings.DICTIONARY_FILE_PATH

        if not json_path.exists():
            self.stdout.write(self.style.ERROR(f'[ERROR] No se encontro el archivo: {json_path}'))
            return

        # Leer JSON
        self.stdout.write(f'[INFO] Leyendo diccionario desde: {json_path}')

        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                dictionary_data = json.load(f)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERROR] Error leyendo JSON: {str(e)}'))
            return

        total_entries = len(dictionary_data)
        self.stdout.write(f'[INFO] Total de entradas encontradas: {total_entries}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY-RUN] Modo simulacion (sin guardar cambios)\n'))

        # Limpiar tabla si se solicito
        if clear and not dry_run:
            count = DictionaryEntry.objects.count()
            if count > 0:
                self.stdout.write(f'[INFO] Eliminando {count} entradas existentes...')
                DictionaryEntry.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('[OK] Entradas eliminadas'))

        # Migrar datos
        created_count = 0
        updated_count = 0
        skipped_count = 0

        for key, value in dictionary_data.items():
            key_lower = key.lower().strip()

            if not key_lower or not value:
                self.stdout.write(self.style.WARNING(f'[SKIP] Entrada vacia saltada: "{key}" -> "{value}"'))
                skipped_count += 1
                continue

            if dry_run:
                self.stdout.write(f'   - "{key_lower}" -> "{value[:80]}{"..." if len(value) > 80 else ""}"')
                created_count += 1
            else:
                # Intentar obtener entrada existente
                entry, created = DictionaryEntry.objects.get_or_create(
                    key=key_lower,
                    defaults={
                        'value': value,
                        'is_active': True,
                    }
                )

                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f'[CREATE] "{key_lower}"'))
                else:
                    # Si ya existe, actualizar el valor si cambio
                    if entry.value != value:
                        entry.value = value
                        entry.save()
                        updated_count += 1
                        self.stdout.write(self.style.SUCCESS(f'[UPDATE] "{key_lower}"'))
                    else:
                        skipped_count += 1

        # Resumen
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('\n[RESUMEN DE LA MIGRACION]\n'))
        self.stdout.write(f'   Total en JSON:    {total_entries}')
        self.stdout.write(self.style.SUCCESS(f'   Creados:          {created_count}'))
        if updated_count > 0:
            self.stdout.write(self.style.SUCCESS(f'   Actualizados:     {updated_count}'))
        if skipped_count > 0:
            self.stdout.write(f'   Saltados:         {skipped_count}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY-RUN] No se guardaron cambios en la BD'))
        else:
            self.stdout.write(self.style.SUCCESS('\n[OK] Migracion completada exitosamente'))

            # Verificar total en BD
            total_in_db = DictionaryEntry.objects.count()
            self.stdout.write(f'\n[INFO] Total de entradas activas en BD: {total_in_db}')
