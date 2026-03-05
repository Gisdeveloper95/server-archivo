# -*- coding: utf-8 -*-
"""Script para ejecutar SQL directamente"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

# Leer SQL
with open('create_tables.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Ejecutar
with connection.cursor() as cursor:
    cursor.execute(sql)

print("Tablas creadas exitosamente!")
