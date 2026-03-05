"""
Comando para auditar y verificar la integridad del diccionario
"""
from django.core.management.base import BaseCommand
from django.db.models import Count
from dictionary.models import DictionaryEntry


class Command(BaseCommand):
    help = 'Audita el diccionario buscando problemas de integridad'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('=' * 80))
        self.stdout.write(self.style.WARNING('AUDITORIA DEL DICCIONARIO'))
        self.stdout.write(self.style.WARNING('=' * 80 + '\n'))

        total_entries = DictionaryEntry.objects.count()
        active_entries = DictionaryEntry.objects.filter(is_active=True).count()
        inactive_entries = DictionaryEntry.objects.filter(is_active=False).count()

        self.stdout.write(f'Total de entradas: {total_entries}')
        self.stdout.write(f'Entradas activas: {active_entries}')
        self.stdout.write(f'Entradas inactivas: {inactive_entries}\n')

        # 1. Verificar duplicados (case-insensitive)
        self.stdout.write(self.style.WARNING('\n[1] VERIFICACION DE DUPLICADOS (case-insensitive)'))
        self.stdout.write('-' * 80)

        # Agrupar por key en minúsculas
        from django.db.models.functions import Lower
        duplicates = (
            DictionaryEntry.objects
            .values(lower_key=Lower('key'))
            .annotate(count=Count('id'))
            .filter(count__gt=1)
        )

        if duplicates:
            self.stdout.write(self.style.ERROR(f'[ADVERTENCIA] Se encontraron {len(duplicates)} grupos de duplicados:\n'))
            for dup in duplicates:
                entries = DictionaryEntry.objects.filter(key__iexact=dup['lower_key'])
                self.stdout.write(f'  Key: "{dup["lower_key"]}" ({dup["count"]} entradas):')
                for entry in entries:
                    self.stdout.write(
                        f'    - ID {entry.id}: "{entry.key}" | '
                        f'Activo: {entry.is_active} | '
                        f'Valor: {entry.value[:40]}...'
                    )
        else:
            self.stdout.write(self.style.SUCCESS('[OK] No se encontraron duplicados\n'))

        # 2. Verificar espacios en blanco
        self.stdout.write(self.style.WARNING('\n[2] VERIFICACION DE ESPACIOS EN BLANCO'))
        self.stdout.write('-' * 80)

        entries_with_leading_spaces = []
        entries_with_trailing_spaces = []
        entries_with_double_spaces = []

        for entry in DictionaryEntry.objects.all():
            if entry.key != entry.key.lstrip():
                entries_with_leading_spaces.append(entry)
            if entry.key != entry.key.rstrip():
                entries_with_trailing_spaces.append(entry)
            if '  ' in entry.key:
                entries_with_double_spaces.append(entry)

        if entries_with_leading_spaces:
            self.stdout.write(self.style.ERROR(f'[ADVERTENCIA] {len(entries_with_leading_spaces)} entradas con espacios al inicio'))
        else:
            self.stdout.write(self.style.SUCCESS('[OK] No hay entradas con espacios al inicio'))

        if entries_with_trailing_spaces:
            self.stdout.write(self.style.ERROR(f'[ADVERTENCIA] {len(entries_with_trailing_spaces)} entradas con espacios al final'))
        else:
            self.stdout.write(self.style.SUCCESS('[OK] No hay entradas con espacios al final'))

        if entries_with_double_spaces:
            self.stdout.write(self.style.ERROR(f'[ADVERTENCIA] {len(entries_with_double_spaces)} entradas con espacios dobles'))
            for entry in entries_with_double_spaces[:5]:
                self.stdout.write(f'    - ID {entry.id}: "{entry.key}"')
        else:
            self.stdout.write(self.style.SUCCESS('[OK] No hay entradas con espacios dobles'))

        # 3. Verificar keys vacías
        self.stdout.write(self.style.WARNING('\n[3] VERIFICACION DE KEYS VACIAS'))
        self.stdout.write('-' * 80)

        empty_keys = DictionaryEntry.objects.filter(key='')
        if empty_keys.exists():
            self.stdout.write(self.style.ERROR(f'[ADVERTENCIA] {empty_keys.count()} entradas con key vacia'))
        else:
            self.stdout.write(self.style.SUCCESS('[OK] No hay keys vacias'))

        # 4. Verificar values vacíos
        self.stdout.write(self.style.WARNING('\n[4] VERIFICACION DE VALUES VACIOS'))
        self.stdout.write('-' * 80)

        empty_values = DictionaryEntry.objects.filter(value='')
        if empty_values.exists():
            self.stdout.write(self.style.ERROR(f'[ADVERTENCIA] {empty_values.count()} entradas con value vacio:'))
            for entry in empty_values[:10]:
                self.stdout.write(f'    - ID {entry.id}: "{entry.key}"')
        else:
            self.stdout.write(self.style.SUCCESS('[OK] No hay values vacios'))

        # 5. Verificar caracteres especiales problemáticos
        self.stdout.write(self.style.WARNING('\n[5] VERIFICACION DE CARACTERES ESPECIALES'))
        self.stdout.write('-' * 80)

        problematic_chars = []
        for entry in DictionaryEntry.objects.all():
            # Verificar tabs, newlines, etc
            if '\t' in entry.key or '\n' in entry.key or '\r' in entry.key:
                problematic_chars.append(entry)

        if problematic_chars:
            self.stdout.write(self.style.ERROR(f'[ADVERTENCIA] {len(problematic_chars)} entradas con caracteres problematicos (tabs, newlines):'))
            for entry in problematic_chars[:5]:
                self.stdout.write(f'    - ID {entry.id}: {repr(entry.key)}')
        else:
            self.stdout.write(self.style.SUCCESS('[OK] No hay caracteres problematicos'))

        # 6. Estadísticas de longitud
        self.stdout.write(self.style.WARNING('\n[6] ESTADISTICAS DE LONGITUD'))
        self.stdout.write('-' * 80)

        longest_key = DictionaryEntry.objects.order_by('-key').first()
        shortest_key = DictionaryEntry.objects.order_by('key').first()

        # Calcular longitudes
        key_lengths = [len(e.key) for e in DictionaryEntry.objects.all()]
        value_lengths = [len(e.value) for e in DictionaryEntry.objects.all()]

        self.stdout.write(f'Longitud promedio de key: {sum(key_lengths)/len(key_lengths):.2f} caracteres')
        self.stdout.write(f'Key mas largo: {max(key_lengths)} caracteres')
        self.stdout.write(f'Key mas corto: {min(key_lengths)} caracteres')
        self.stdout.write(f'Longitud promedio de value: {sum(value_lengths)/len(value_lengths):.2f} caracteres')
        self.stdout.write(f'Value mas largo: {max(value_lengths)} caracteres')

        # RESUMEN FINAL
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.WARNING('RESUMEN DE AUDITORIA'))
        self.stdout.write('=' * 80)

        issues_found = (
            len(duplicates) +
            len(entries_with_leading_spaces) +
            len(entries_with_trailing_spaces) +
            len(entries_with_double_spaces) +
            empty_keys.count() +
            empty_values.count() +
            len(problematic_chars)
        )

        if issues_found == 0:
            self.stdout.write(self.style.SUCCESS('\n[EXITO] El diccionario esta en perfecto estado!'))
            self.stdout.write(self.style.SUCCESS(f'Todas las {total_entries} entradas pasaron la auditoria.\n'))
        else:
            self.stdout.write(self.style.ERROR(f'\n[ADVERTENCIA] Se encontraron {issues_found} problemas.'))
            self.stdout.write(self.style.NOTICE('Revisa los detalles arriba y ejecuta clean_dictionary_keys si es necesario.\n'))

        self.stdout.write('=' * 80 + '\n')
