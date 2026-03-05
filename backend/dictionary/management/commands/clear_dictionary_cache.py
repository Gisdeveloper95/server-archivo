"""
Comando para invalidar el cache del diccionario
"""
from django.core.management.base import BaseCommand
from utils.dictionary_validator import DictionaryValidator


class Command(BaseCommand):
    help = 'Invalida el cache del diccionario para forzar recarga desde BD'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('=' * 80))
        self.stdout.write(self.style.WARNING('INVALIDACION DE CACHE DEL DICCIONARIO'))
        self.stdout.write(self.style.WARNING('=' * 80 + '\n'))

        try:
            validator = DictionaryValidator()
            validator.invalidate_cache()

            self.stdout.write(self.style.SUCCESS('[EXITO] Cache del diccionario invalidado exitosamente'))
            self.stdout.write(self.style.NOTICE('\nLa proxima consulta cargara los datos frescos desde PostgreSQL.\n'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERROR] Error al invalidar cache: {str(e)}\n'))

        self.stdout.write('=' * 80 + '\n')
