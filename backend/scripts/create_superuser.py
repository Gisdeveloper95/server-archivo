"""
Script para crear un superusuario del sistema

Uso:
    python scripts/create_superuser.py

Nota: Este script debe ejecutarse desde la raíz del proyecto Django
"""
import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import IntegrityError

User = get_user_model()


def create_superuser():
    """
    Crea un superusuario de forma interactiva
    """
    print("=" * 60)
    print("CREAR SUPERUSUARIO - SISTEMA DE GESTIÓN DE ARCHIVOS NETAPP")
    print("=" * 60)
    print()

    # Solicitar información
    print("Ingrese los datos del superusuario:")
    print()

    email = input("Email (ej: admin@igac.gov.co): ").strip()
    if not email:
        print("Error: El email es requerido")
        return

    # Extraer username del email
    username = email.split('@')[0]
    print(f"Username: {username}")

    first_name = input("Nombre (opcional): ").strip() or ""
    last_name = input("Apellido (opcional): ").strip() or ""

    # Solicitar contraseña
    import getpass
    while True:
        password = getpass.getpass("Contraseña: ")
        password_confirm = getpass.getpass("Confirmar contraseña: ")

        if password != password_confirm:
            print("Error: Las contraseñas no coinciden. Intente nuevamente.")
            continue

        if len(password) < 8:
            print("Error: La contraseña debe tener al menos 8 caracteres.")
            continue

        break

    # Crear el usuario
    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='superadmin',
            is_staff=True,
            is_superuser=True,
            is_active=True
        )

        print()
        print("=" * 60)
        print("¡SUPERUSUARIO CREADO EXITOSAMENTE!")
        print("=" * 60)
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Rol: {user.role}")
        print(f"ID: {user.id}")
        print()
        print("Puede usar estas credenciales para iniciar sesión en el sistema.")
        print("=" * 60)

    except IntegrityError:
        print()
        print("Error: Ya existe un usuario con ese email o username.")
        print("Use un email diferente o elimine el usuario existente.")
    except Exception as e:
        print()
        print(f"Error al crear el usuario: {e}")


if __name__ == '__main__':
    create_superuser()
