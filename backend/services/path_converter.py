"""
Utilidad para convertir rutas entre formatos Windows UNC y Linux
Usado para migración de Windows a Linux
"""
import os
import re
from pathlib import Path
from typing import Union, Optional


class PathConverter:
    r"""
    Convierte rutas entre formatos Windows UNC y rutas Linux montadas

    Windows: \\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\Folder\file.txt
    Linux:   /mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/Folder/file.txt

    IMPORTANTE: El punto de montaje en Linux corresponde a la ruta completa del share Windows.
    """

    # Configuración de mapeo de rutas
    # La ruta Windows completa hasta Sub_Proy
    WINDOWS_SHARE_PREFIX = r'\\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy'
    # El punto de montaje Linux que corresponde a esa ruta Windows
    LINUX_MOUNT_POINT = '/mnt/repositorio'

    @classmethod
    def windows_to_linux(cls, windows_path: str) -> str:
        r"""
        Convierte ruta UNC de Windows a ruta Linux

        Args:
            windows_path: Ruta en formato Windows UNC
                Ejemplos:
                - \\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\Folder
                - \\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\Folder

        Returns:
            Ruta en formato Linux
            Ejemplo: /mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/Folder
        """
        if not windows_path:
            return ''

        # Normalizar ruta (convertir \\ a \)
        normalized = windows_path.replace('\\\\', '\\')

        # Remover el prefijo de Windows si existe (ruta completa hasta Sub_Proy)
        # Soporta formatos con \\ o \ al inicio
        patterns = [
            r'^\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\',
            r'^\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy\\',
            r'^\\\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy$',
            r'^\\repositorio\\DirGesCat\\2510SP\\H_Informacion_Consulta\\Sub_Proy$',
            # Fallback para rutas más cortas (compatibilidad)
            r'^\\\\repositorio\\DirGesCat\\',
            r'^\\repositorio\\DirGesCat\\',
        ]

        for pattern in patterns:
            if re.match(pattern, normalized, re.IGNORECASE):
                normalized = re.sub(pattern, '', normalized, flags=re.IGNORECASE)
                break

        # Si la ruta ya está vacía (era solo el prefijo), retornar mount point
        if not normalized or normalized == '\\':
            return cls.LINUX_MOUNT_POINT

        # Convertir backslashes a forward slashes
        linux_path = normalized.replace('\\', '/')

        # Remover leading slash si existe
        linux_path = linux_path.lstrip('/')

        # Combinar con mount point
        if linux_path:
            full_path = os.path.join(cls.LINUX_MOUNT_POINT, linux_path)
        else:
            full_path = cls.LINUX_MOUNT_POINT

        # Normalizar ruta (remover .., //, etc.)
        return os.path.normpath(full_path)

    @classmethod
    def linux_to_windows(cls, linux_path: str) -> str:
        r"""
        Convierte ruta Linux a ruta UNC de Windows

        Args:
            linux_path: Ruta en formato Linux
                Ejemplo: /mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/Folder

        Returns:
            Ruta en formato Windows UNC
            Ejemplo: \\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\Folder
        """
        if not linux_path:
            return ''

        # Normalizar ruta
        normalized = os.path.normpath(linux_path)

        # Remover mount point si existe
        if normalized.startswith(cls.LINUX_MOUNT_POINT):
            relative_path = normalized[len(cls.LINUX_MOUNT_POINT):]
            relative_path = relative_path.lstrip('/')
        else:
            # Si la ruta no empieza con el mount point completo,
            # verificar si empieza solo con /mnt/repositorio (para compatibilidad)
            base_mount = '/mnt/repositorio'
            if normalized.startswith(base_mount):
                relative_path = normalized[len(base_mount):]
                relative_path = relative_path.lstrip('/')
            else:
                relative_path = normalized.lstrip('/')

        # Convertir forward slashes a backslashes
        windows_relative = relative_path.replace('/', '\\')

        # Combinar con prefijo Windows
        if windows_relative:
            full_path = cls.WINDOWS_SHARE_PREFIX + '\\' + windows_relative
        else:
            full_path = cls.WINDOWS_SHARE_PREFIX

        return full_path

    @classmethod
    def normalize_path(cls, path: str) -> str:
        """
        Normaliza una ruta detectando automáticamente el formato
        y convirtiéndola a formato Linux

        Args:
            path: Ruta en cualquier formato

        Returns:
            Ruta normalizada en formato Linux
        """
        if not path:
            return ''

        # Detectar si es ruta Windows (contiene backslashes)
        if '\\' in path:
            return cls.windows_to_linux(path)

        # Ya es ruta Linux o relativa
        return os.path.normpath(path)

    @classmethod
    def is_windows_path(cls, path: str) -> bool:
        """
        Detecta si una ruta es formato Windows UNC

        Args:
            path: Ruta a verificar

        Returns:
            True si es ruta Windows, False en caso contrario
        """
        if not path:
            return False

        # Verificar si contiene backslashes
        if '\\' not in path:
            return False

        # Verificar si comienza con \\ o contiene formato Windows
        return bool(re.match(r'^\\\\?[\w\-]+', path))

    @classmethod
    def convert_batch(cls, paths: list[str], to_linux: bool = True) -> list[str]:
        """
        Convierte múltiples rutas en batch

        Args:
            paths: Lista de rutas a convertir
            to_linux: Si True convierte a Linux, si False a Windows

        Returns:
            Lista de rutas convertidas
        """
        if to_linux:
            return [cls.windows_to_linux(p) for p in paths]
        else:
            return [cls.linux_to_windows(p) for p in paths]

    @classmethod
    def validate_linux_path(cls, path: str) -> bool:
        """
        Valida que una ruta Linux esté dentro del mount point permitido

        Args:
            path: Ruta Linux a validar

        Returns:
            True si la ruta es válida y segura
        """
        if not path:
            return False

        # Normalizar ruta
        normalized = os.path.normpath(path)

        # Verificar que comience con el mount point
        if not normalized.startswith(cls.LINUX_MOUNT_POINT):
            return False

        # Verificar que no intente salir del mount point con ../
        resolved = os.path.abspath(normalized)
        return resolved.startswith(cls.LINUX_MOUNT_POINT)


# Funciones de conveniencia para importar directamente
def windows_to_linux(path: str) -> str:
    """Convierte ruta Windows a Linux"""
    return PathConverter.windows_to_linux(path)


def linux_to_windows(path: str) -> str:
    """Convierte ruta Linux a Windows"""
    return PathConverter.linux_to_windows(path)


def normalize_path(path: str) -> str:
    """Normaliza ruta automáticamente a formato Linux"""
    return PathConverter.normalize_path(path)


# Ejemplo de uso
if __name__ == '__main__':
    # Pruebas
    test_paths_windows = [
        r'\\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy',
        r'\\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\01_actualiz_catas\54\810',
        r'\\repositorio\DirGesCat\2510SP\H_Informacion_Consulta\Sub_Proy\05_grup_trab\11_gest_info',
    ]

    print("=== Conversión Windows -> Linux ===")
    for wp in test_paths_windows:
        lp = PathConverter.windows_to_linux(wp)
        print(f"{wp}")
        print(f"  -> {lp}\n")

    print("\n=== Conversión Linux -> Windows ===")
    test_paths_linux = [
        '/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy',
        '/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/01_actualiz_catas/54/810',
        '/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/05_grup_trab/11_gest_info',
    ]

    for lp in test_paths_linux:
        wp = PathConverter.linux_to_windows(lp)
        print(f"{lp}")
        print(f"  -> {wp}\n")

    print("\n=== Validación de rutas ===")
    test_validate = [
        '/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/01_actualiz_catas',  # Válida
        '/mnt/repositorio/../etc/passwd',  # Inválida (path traversal)
        '/home/user/file.txt',  # Inválida (fuera del mount point)
    ]

    for path in test_validate:
        valid = PathConverter.validate_linux_path(path)
        print(f"{path}: {'✓ Válida' if valid else '✗ Inválida'}")
