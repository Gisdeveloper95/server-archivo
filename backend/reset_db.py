# -*- coding: utf-8 -*-
"""Script para resetear la base de datos usando Django settings"""
import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Obtener configuración de BD de Django
db_settings = settings.DATABASES['default']

# Conectar a PostgreSQL (database 'postgres' para poder eliminar netapp_index)
conn = psycopg2.connect(
    host=db_settings['HOST'],
    port=db_settings['PORT'],
    user=db_settings['USER'],
    password=db_settings['PASSWORD'],
    database='postgres'
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cursor = conn.cursor()

print("Terminando conexiones activas...")
try:
    cursor.execute("""
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = 'netapp_index' AND pid <> pg_backend_pid();
    """)
except Exception as e:
    print(f"   Advertencia: {e}")

print("Eliminando base de datos netapp_index...")
cursor.execute("DROP DATABASE IF EXISTS netapp_index;")

print("Creando base de datos netapp_index...")
cursor.execute("""
    CREATE DATABASE netapp_index
    WITH ENCODING = 'UTF8'
    LC_COLLATE = 'C'
    LC_CTYPE = 'C'
    TEMPLATE = template0;
""")

print("Base de datos reseteada exitosamente!")

cursor.close()
conn.close()
