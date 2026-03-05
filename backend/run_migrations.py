#!/usr/bin/env python
"""
Script para ejecutar migraciones de Django con encoding correcto
"""
import os
import sys

# Forzar encoding UTF-8
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['PGCLIENTENCODING'] = 'UTF8'

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.core.management import call_command

if __name__ == '__main__':
    print("Ejecutando makemigrations...")
    call_command('makemigrations')

    print("\nEjecutando migrate...")
    call_command('migrate')

    print("\nMigraciones completadas!")
