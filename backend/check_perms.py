import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from users.models import UserPermission

User = get_user_model()
user = User.objects.get(username='andres.osorio')

# Ver el permiso exacto
perm = UserPermission.objects.get(id=122)
print(f'Permiso ID: {perm.id}')
print(f'base_path en BD: |{perm.base_path}|')
print(f'can_write: {perm.can_write}')
print(f'can_create_directories: {perm.can_create_directories}')
print(f'inheritance_mode: {perm.inheritance_mode}')

# Verificar la ruta que intentas renombrar
path_to_rename = '05_grup_trab/11_gest_info/2025/06_arch/andres_osorio'
print(f'\nRuta a renombrar: |{path_to_rename}|')

# Ver si el método de permisos funciona
print(f'\nVerificando permisos con slash (/):')
print(f'  has_permission_for_path(write): {user.has_permission_for_path(path_to_rename, "write")}')
print(f'  has_permission_for_path(create_directories): {user.has_permission_for_path(path_to_rename, "create_directories")}')

# Probar con la ruta normalizada (con backslash)
path_normalized = path_to_rename.replace('/', '\\')
print(f'\nRuta normalizada con backslash (\\): |{path_normalized}|')
print(f'  has_permission_for_path(write): {user.has_permission_for_path(path_normalized, "write")}')
print(f'  has_permission_for_path(create_directories): {user.has_permission_for_path(path_normalized, "create_directories")}')

# Mostrar cómo está almacenado el base_path
print(f'\nComparación de rutas:')
print(f'  base_path del permiso: |{perm.base_path}|')
print(f'  Ruta a renombrar (slash): |{path_to_rename}|')
print(f'  Ruta normalizada (backslash): |{path_normalized}|')
print(f'  ¿La ruta normalizada empieza con base_path? {path_normalized.startswith(perm.base_path)}')
