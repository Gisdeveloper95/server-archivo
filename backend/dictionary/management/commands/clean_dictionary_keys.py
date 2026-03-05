"""
Comando para limpiar espacios en blanco de las keys del diccionario
"""
from django.core.management.base import BaseCommand
from dictionary.models import DictionaryEntry


class Command(BaseCommand):
    help = 'Limpia espacios en blanco al inicio y final de todas las keys del diccionario'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra los cambios sin aplicarlos',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        self.stdout.write(self.style.WARNING('=' * 80))
        self.stdout.write(self.style.WARNING('LIMPIEZA DE KEYS DEL DICCIONARIO'))
        self.stdout.write(self.style.WARNING('=' * 80))

        if dry_run:
            self.stdout.write(self.style.NOTICE('\n[DRY-RUN] MODO DRY-RUN: No se aplicaran cambios\n'))
        else:
            self.stdout.write(self.style.NOTICE('\n[EJECUCION] MODO EJECUCION: Se aplicaran cambios a la base de datos\n'))

        # Obtener todas las entradas
        all_entries = DictionaryEntry.objects.all()
        total_entries = all_entries.count()

        self.stdout.write(f'Total de entradas en diccionario: {total_entries}\n')

        # Estadísticas
        entries_with_spaces = 0
        entries_cleaned = 0
        errors = 0
        changes_log = []

        # Procesar cada entrada
        for entry in all_entries:
            original_key = entry.key
            cleaned_key = original_key.strip()

            # Verificar si tiene espacios
            if original_key != cleaned_key:
                entries_with_spaces += 1

                change_info = {
                    'id': entry.id,
                    'original': original_key,
                    'cleaned': cleaned_key,
                    'value': entry.value[:50] + '...' if len(entry.value) > 50 else entry.value
                }
                changes_log.append(change_info)

                # Mostrar el cambio
                self.stdout.write(
                    f'  [CAMBIO] ID {entry.id}: "{original_key}" -> "{cleaned_key}"'
                )
                self.stdout.write(
                    f'      Descripcion: {change_info["value"]}'
                )

                # Aplicar cambio si no es dry-run
                if not dry_run:
                    try:
                        entry.key = cleaned_key
                        entry.save()
                        entries_cleaned += 1
                        self.stdout.write(self.style.SUCCESS(f'      [OK] Actualizado\n'))
                    except Exception as e:
                        errors += 1
                        self.stdout.write(self.style.ERROR(f'      [ERROR] Error: {str(e)}\n'))
                else:
                    self.stdout.write(self.style.NOTICE(f'      [DRY-RUN] No se aplicó el cambio\n'))

        # Resumen final
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.WARNING('RESUMEN DE LIMPIEZA'))
        self.stdout.write('=' * 80 + '\n')

        self.stdout.write(f'Total de entradas procesadas: {total_entries}')
        self.stdout.write(f'Entradas con espacios detectadas: {entries_with_spaces}')

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f'[OK] Entradas limpiadas exitosamente: {entries_cleaned}'))
            if errors > 0:
                self.stdout.write(self.style.ERROR(f'[ERROR] Errores encontrados: {errors}'))
        else:
            self.stdout.write(self.style.NOTICE(f'[DRY-RUN] Se limpiarian {entries_with_spaces} entradas'))

        # Verificación de duplicados potenciales
        if entries_with_spaces > 0:
            self.stdout.write('\n' + '=' * 80)
            self.stdout.write(self.style.WARNING('VERIFICACIÓN DE DUPLICADOS POTENCIALES'))
            self.stdout.write('=' * 80 + '\n')

            cleaned_keys = [change['cleaned'].lower() for change in changes_log]
            existing_keys = set(DictionaryEntry.objects.exclude(
                id__in=[change['id'] for change in changes_log]
            ).values_list('key', flat=True))

            duplicates_found = []
            for change in changes_log:
                if change['cleaned'].lower() in [k.lower() for k in existing_keys]:
                    duplicates_found.append(change)
                    self.stdout.write(
                        self.style.ERROR(
                            f'[ADVERTENCIA] DUPLICADO: "{change["cleaned"]}" (ID {change["id"]}) '
                            f'ya existe en la base de datos'
                        )
                    )

            if duplicates_found:
                self.stdout.write(
                    self.style.ERROR(
                        f'\n[ADVERTENCIA] Se encontraron {len(duplicates_found)} posibles duplicados. '
                        'Debes revisar manualmente estos casos antes de limpiar.'
                    )
                )
            else:
                self.stdout.write(self.style.SUCCESS('\n[OK] No se encontraron duplicados potenciales'))

        # Mensaje final
        self.stdout.write('\n' + '=' * 80)
        if dry_run:
            self.stdout.write(
                self.style.NOTICE(
                    '\n[INFO] Para aplicar los cambios, ejecuta el comando sin --dry-run:\n'
                    '   python manage.py clean_dictionary_keys'
                )
            )
        else:
            if entries_cleaned > 0:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n[EXITO] Limpieza completada exitosamente! {entries_cleaned} entradas actualizadas.'
                    )
                )
                self.stdout.write(
                    self.style.NOTICE(
                        '\n[INFO] Recuerda invalidar el cache del validador si esta en uso.'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        '\n[EXITO] No se encontraron entradas que requieran limpieza. '
                        'El diccionario esta limpio!'
                    )
                )

        self.stdout.write('=' * 80 + '\n')
