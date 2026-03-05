#!/usr/bin/env python
"""
Test script para verificar que el sistema de permisos funciona con rutas Linux
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from services.permission_service import PermissionService
from users.models import User, UserPermission

def test_normalize_path():
    """Prueba que normalize_path convierte correctamente rutas Windows a Linux"""
    print("\n=== Test normalize_path() ===")

    test_cases = [
        # Windows paths → Linux paths
        (r'\\repositorio\DirGesCat\2510SP\Folder', '//repositorio/DirGesCat/2510SP/Folder'),
        (r'2510SP\Folder\file.txt', '2510SP/Folder/file.txt'),
        ('2510SP/Folder/file.txt', '2510SP/Folder/file.txt'),  # Ya Linux
        ('/mnt/repositorio/2510SP/Folder', '/mnt/repositorio/2510SP/Folder'),  # Ya Linux
    ]

    for input_path, expected in test_cases:
        result = PermissionService.normalize_path(input_path)
        status = "✓" if result == expected else "✗"
        print(f"{status} Input: '{input_path}'")
        print(f"  Expected: '{expected}'")
        print(f"  Got:      '{result}'")
        if result != expected:
            print(f"  ERROR: No coincide!")
        print()

def test_path_blocking():
    """Prueba que el bloqueo de rutas funciona con rutas Linux"""
    print("\n=== Test is_path_blocked() ===")

    # Crear un permiso de prueba simulado
    class MockPermission:
        def __init__(self, base_path, blocked_paths):
            self.base_path = base_path
            self.blocked_paths = blocked_paths
            self.max_depth = None
            self.inheritance_mode = 'all'

    # Caso 1: Ruta bloqueada exacta
    perm = MockPermission(
        base_path='01_actualiz_catas/19/075/SGR',
        blocked_paths=['01_actualiz_catas/19/075/SGR/04_transv']
    )

    test_cases = [
        ('01_actualiz_catas/19/075/SGR/04_transv', True),  # Bloqueada
        ('01_actualiz_catas/19/075/SGR/04_transv/subfolder', True),  # Hija de bloqueada
        ('01_actualiz_catas/19/075/SGR/03_post', False),  # No bloqueada
        ('01_actualiz_catas/19/075/SGR', False),  # Padre no bloqueado
    ]

    for path, expected_blocked in test_cases:
        result = PermissionService.is_path_blocked(perm, path)
        status = "✓" if result == expected_blocked else "✗"
        print(f"{status} Path: '{path}'")
        print(f"  Expected blocked: {expected_blocked}")
        print(f"  Got blocked:      {result}")
        if result != expected_blocked:
            print(f"  ERROR: No coincide!")
        print()

def test_read_only():
    """Prueba que las rutas de solo lectura funcionan con rutas Linux"""
    print("\n=== Test is_path_read_only() ===")

    class MockPermission:
        def __init__(self, base_path, read_only_paths):
            self.base_path = base_path
            self.read_only_paths = read_only_paths
            self.max_depth = None
            self.inheritance_mode = 'all'

    perm = MockPermission(
        base_path='01_actualiz_catas/19/075/SGR',
        read_only_paths=['01_actualiz_catas/19/075/SGR/03_post']
    )

    test_cases = [
        ('01_actualiz_catas/19/075/SGR/03_post', True),  # Solo lectura
        ('01_actualiz_catas/19/075/SGR/03_post/subfolder', True),  # Hija de solo lectura
        ('01_actualiz_catas/19/075/SGR/04_transv', False),  # No es solo lectura
        ('01_actualiz_catas/19/075/SGR', False),  # Padre no es solo lectura
    ]

    for path, expected_readonly in test_cases:
        result = PermissionService.is_path_read_only(perm, path)
        status = "✓" if result == expected_readonly else "✗"
        print(f"{status} Path: '{path}'")
        print(f"  Expected read-only: {expected_readonly}")
        print(f"  Got read-only:      {result}")
        if result != expected_readonly:
            print(f"  ERROR: No coincide!")
        print()

def test_get_parent_paths():
    """Prueba que get_parent_paths funciona con rutas Linux"""
    print("\n=== Test get_parent_paths() ===")

    test_cases = [
        (
            '/mnt/repositorio/2510SP/Folder/file.txt',
            ['/mnt', '/mnt/repositorio', '/mnt/repositorio/2510SP', '/mnt/repositorio/2510SP/Folder', '/mnt/repositorio/2510SP/Folder/file.txt']
        ),
        (
            '01_actualiz_catas/19/075',
            ['01_actualiz_catas/19', '01_actualiz_catas/19/075']
        ),
    ]

    for path, expected in test_cases:
        result = PermissionService.get_parent_paths(path)
        status = "✓" if result == expected else "✗"
        print(f"{status} Path: '{path}'")
        print(f"  Expected: {expected}")
        print(f"  Got:      {result}")
        if result != expected:
            print(f"  ERROR: No coincide!")
        print()

if __name__ == '__main__':
    print("=" * 70)
    print("PRUEBAS DEL SISTEMA DE PERMISOS - COMPATIBILIDAD LINUX")
    print("=" * 70)

    try:
        test_normalize_path()
        test_path_blocking()
        test_read_only()
        test_get_parent_paths()

        print("\n" + "=" * 70)
        print("PRUEBAS COMPLETADAS")
        print("=" * 70)

    except Exception as e:
        print(f"\n\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
