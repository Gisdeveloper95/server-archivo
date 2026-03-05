"""
Servicio para acceso al repositorio NetApp usando acceso directo de Windows
"""
import os
import shutil
from pathlib import Path
from django.conf import settings


class SMBService:
    """
    Servicio para acceder al repositorio NetApp mediante acceso directo de archivos Windows.

    En Windows, accedemos directamente a rutas UNC como \\servidor\share\path
    sin necesidad de librerías SMB especiales.
    """

    def __init__(self):
        # Usar NETAPP_BASE_PATH de Linux (montaje CIFS)
        self.base_path = getattr(settings, 'NETAPP_BASE_PATH', '/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy')

        # Asegurar que existe
        if not os.path.exists(self.base_path):
            raise ValueError(f"NETAPP_BASE_PATH no existe: {self.base_path}")

    def normalize_path(self, path):
        """Normaliza una ruta para Linux"""
        if not path:
            return ""
        # Convertir backslashes a forward slashes para Linux
        return path.replace('\\', '/')

    def build_full_path(self, relative_path=''):
        """
        Construye la ruta completa desde una ruta relativa

        Args:
            relative_path: Ruta relativa

        Returns:
            str: Ruta completa Linux
        """
        if not relative_path:
            return self.base_path

        # Normalizar
        relative_path = self.normalize_path(relative_path)

        # Quitar barras iniciales
        relative_path = relative_path.lstrip('/')

        if not relative_path:
            return self.base_path

        return os.path.join(self.base_path, relative_path)

    def list_directory(self, path=''):
        """
        Lista el contenido de un directorio

        Args:
            path: Ruta relativa

        Returns:
            dict: {'success': bool, 'items': list, 'path': str, 'error': str}
        """
        try:
            full_path = self.build_full_path(path)

            if not os.path.exists(full_path):
                return {'success': False, 'error': 'Ruta no existe', 'items': []}

            if not os.path.isdir(full_path):
                return {'success': False, 'error': 'No es un directorio', 'items': []}

            items = []
            for entry in os.listdir(full_path):
                try:
                    entry_path = os.path.join(full_path, entry)
                    stat_info = os.stat(entry_path)

                    is_dir = os.path.isdir(entry_path)

                    # Construir path relativo
                    if path:
                        path_cleaned = path.rstrip('/')
                        rel_path = f"{path_cleaned}/{entry}"
                    else:
                        rel_path = entry

                    # Contar elementos si es directorio (operación O(1) en memoria)
                    item_count = None
                    if is_dir:
                        try:
                            item_count = len(os.listdir(entry_path))
                        except (PermissionError, OSError):
                            item_count = None  # Sin acceso para contar

                    items.append({
                        'name': entry,
                        'path': rel_path,
                        'is_directory': is_dir,
                        'size': stat_info.st_size if not is_dir else 0,
                        'modified_date': stat_info.st_mtime,
                        'created_date': stat_info.st_ctime,
                        'extension': os.path.splitext(entry)[1].lower() if not is_dir else None,
                        'item_count': item_count  # Cantidad de elementos en directorio
                    })
                except (PermissionError, OSError):
                    # Ignorar archivos sin acceso
                    continue

            return {'success': True, 'items': items, 'path': path}

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos de acceso', 'items': []}
        except Exception as e:
            return {'success': False, 'error': str(e), 'items': []}

    def create_directory(self, path):
        """
        Crea un directorio

        Args:
            path: Ruta del nuevo directorio

        Returns:
            dict: {'success': bool, 'error': str, 'path': str}
        """
        try:
            full_path = self.build_full_path(path)

            if os.path.exists(full_path):
                return {'success': False, 'error': 'El directorio ya existe'}

            os.makedirs(full_path)
            return {'success': True, 'path': path}

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos para crear directorio'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def delete_file(self, path):
        """
        Elimina un archivo

        Args:
            path: Ruta del archivo

        Returns:
            dict: {'success': bool, 'error': str}
        """
        try:
            full_path = self.build_full_path(path)

            if not os.path.exists(full_path):
                return {'success': False, 'error': 'El archivo no existe'}

            if not os.path.isfile(full_path):
                return {'success': False, 'error': 'No es un archivo'}

            os.remove(full_path)
            return {'success': True}

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos para eliminar archivo'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def delete_directory(self, path, recursive=True):
        """
        Elimina un directorio y todo su contenido recursivamente

        Args:
            path: Ruta del directorio
            recursive: Si True, elimina recursivamente (default True)

        Returns:
            dict: {'success': bool, 'error': str}
        """
        try:
            full_path = self.build_full_path(path)

            if not os.path.exists(full_path):
                return {'success': False, 'error': 'El directorio no existe'}

            if not os.path.isdir(full_path):
                return {'success': False, 'error': 'No es un directorio'}

            if recursive:
                # Función para manejar errores de permisos durante rmtree
                def handle_remove_error(func, error_path, exc_info):
                    """
                    Manejador de errores para shutil.rmtree
                    Intenta cambiar permisos y reintentar
                    """
                    import stat
                    # Intentar cambiar permisos y reintentar
                    try:
                        os.chmod(error_path, stat.S_IRWXU | stat.S_IRWXG | stat.S_IRWXO)
                        func(error_path)
                    except Exception as e:
                        print(f"[WARNING] No se pudo eliminar {error_path}: {e}")
                        # Continuar con otros archivos

                # Eliminar todo el contenido recursivamente con manejo de errores
                shutil.rmtree(full_path, onerror=handle_remove_error)
            else:
                # Solo si está vacío
                if os.listdir(full_path):
                    return {'success': False, 'error': 'El directorio no está vacío'}
                os.rmdir(full_path)

            # Verificar si realmente se eliminó
            if os.path.exists(full_path):
                # Intentar con múltiples estrategias para CIFS/NAS
                import subprocess
                import time

                # Estrategia 1: Sync y esperar (CIFS cache issue)
                try:
                    subprocess.run(['sync'], check=False, capture_output=True)
                    time.sleep(0.3)
                except:
                    pass

                # Estrategia 2: Eliminar subdirectorios primero de forma iterativa
                try:
                    for root, dirs, files in os.walk(full_path, topdown=False):
                        for name in files:
                            try:
                                os.remove(os.path.join(root, name))
                            except:
                                pass
                        for name in dirs:
                            try:
                                os.rmdir(os.path.join(root, name))
                            except:
                                pass
                    # Intentar eliminar el directorio raíz
                    os.rmdir(full_path)
                except:
                    pass

                # Estrategia 3: rm -rf como último recurso
                if os.path.exists(full_path):
                    try:
                        subprocess.run(['rm', '-rf', full_path], check=False, capture_output=True, timeout=30)
                    except:
                        pass

                # Verificación final - si aún existe, reportar éxito parcial
                # ya que el backup en papelera se hizo correctamente
                if os.path.exists(full_path):
                    try:
                        contents = os.listdir(full_path)
                        if not contents:
                            # Directorio vacío pero no se puede eliminar - bug de CIFS cache
                            # Reportamos éxito porque los datos están respaldados
                            print(f"[WARNING] Directorio {full_path} vacío pero no eliminable (CIFS cache)")
                            return {'success': True, 'warning': 'Directorio marcado para eliminación (cache NAS)'}
                    except:
                        pass
                    return {'success': False, 'error': 'Error de sistema de archivos NAS. El directorio puede estar bloqueado temporalmente.'}

            return {'success': True}

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos para eliminar directorio'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def upload_file(self, path, file_obj):
        """
        Sube un archivo al repositorio

        Args:
            path: Ruta destino
            file_obj: Objeto de archivo de Django

        Returns:
            dict: {'success': bool, 'error': str, 'size': int, 'path': str}
        """
        try:
            full_path = self.build_full_path(path)

            # Crear directorio padre si no existe
            parent_dir = os.path.dirname(full_path)
            if not os.path.exists(parent_dir):
                os.makedirs(parent_dir)

            # Verificar si el archivo ya existe
            if os.path.exists(full_path):
                return {'success': False, 'error': 'El archivo ya existe'}

            # Escribir archivo
            total_size = 0
            with open(full_path, 'wb') as f:
                for chunk in file_obj.chunks():
                    f.write(chunk)
                    total_size += len(chunk)

            return {'success': True, 'path': path, 'size': total_size}

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos para subir archivo'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def rename(self, old_path, new_name):
        """
        Renombra un archivo o directorio

        Args:
            old_path: Ruta actual
            new_name: Nuevo nombre (solo el nombre, no la ruta completa)

        Returns:
            dict: {'success': bool, 'error': str, 'new_path': str}
        """
        try:
            full_old_path = self.build_full_path(old_path)

            if not os.path.exists(full_old_path):
                return {'success': False, 'error': 'El archivo/directorio no existe'}

            # Construir nueva ruta
            parent = os.path.dirname(full_old_path)
            full_new_path = os.path.join(parent, new_name)

            if os.path.exists(full_new_path):
                return {'success': False, 'error': 'Ya existe un archivo/directorio con ese nombre'}

            os.rename(full_old_path, full_new_path)

            # Construir ruta relativa
            if old_path and '/' in old_path:
                parent_rel = '/'.join(old_path.split('/')[:-1])
                new_relative_path = f"{parent_rel}/{new_name}"
            else:
                new_relative_path = new_name

            return {'success': True, 'new_path': new_relative_path}

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos para renombrar'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_file_info(self, path):
        """
        Obtiene información detallada de un archivo/directorio

        Args:
            path: Ruta del archivo/directorio

        Returns:
            dict: Información del archivo
        """
        try:
            full_path = self.build_full_path(path)

            if not os.path.exists(full_path):
                return {'success': False, 'error': 'No existe'}

            stat_info = os.stat(full_path)
            is_dir = os.path.isdir(full_path)

            name = os.path.basename(path) if path else ''

            return {
                'success': True,
                'name': name,
                'path': path,
                'is_directory': is_dir,
                'size': stat_info.st_size if not is_dir else 0,
                'modified_date': stat_info.st_mtime,
                'created_date': stat_info.st_ctime,
                'extension': os.path.splitext(path)[1].lower() if not is_dir else None
            }

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos de acceso'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def file_exists(self, path):
        """
        Verifica si existe un archivo/directorio

        Args:
            path: Ruta a verificar

        Returns:
            bool: True si existe, False si no
        """
        try:
            full_path = self.build_full_path(path)
            return os.path.exists(full_path)
        except:
            return False

    def copy_item(self, source_path, dest_path):
        """
        Copia un archivo o directorio desde source_path a dest_path

        Args:
            source_path: Ruta origen (relativa)
            dest_path: Ruta destino (relativa)

        Returns:
            dict: {
                'success': bool,
                'source_path': str,
                'dest_path': str,
                'is_directory': bool,
                'size': int (bytes copiados),
                'file_count': int (si es directorio),
                'error': str (si falla)
            }
        """
        try:
            source_full = self.build_full_path(source_path)
            dest_full = self.build_full_path(dest_path)

            if not os.path.exists(source_full):
                return {'success': False, 'error': 'Origen no existe'}

            if os.path.exists(dest_full):
                return {'success': False, 'error': 'Destino ya existe', 'conflict': True}

            is_dir = os.path.isdir(source_full)

            if is_dir:
                # Copiar directorio recursivamente
                shutil.copytree(source_full, dest_full)

                # Calcular tamaño total y cantidad de archivos
                total_size = 0
                file_count = 0
                for root, dirs, files in os.walk(dest_full):
                    for file in files:
                        file_path = os.path.join(root, file)
                        total_size += os.path.getsize(file_path)
                        file_count += 1

                return {
                    'success': True,
                    'source_path': source_path,
                    'dest_path': dest_path,
                    'is_directory': True,
                    'size': total_size,
                    'file_count': file_count
                }
            else:
                # Copiar archivo (preserva metadata)
                shutil.copy2(source_full, dest_full)
                size = os.path.getsize(dest_full)

                return {
                    'success': True,
                    'source_path': source_path,
                    'dest_path': dest_path,
                    'is_directory': False,
                    'size': size,
                    'file_count': 1
                }

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos para copiar'}
        except Exception as e:
            return {'success': False, 'error': f'Error al copiar: {str(e)}'}

    def move_item(self, source_path, dest_path):
        """
        Mueve un archivo o directorio desde source_path a dest_path

        Args:
            source_path: Ruta origen (relativa)
            dest_path: Ruta destino (relativa)

        Returns:
            dict: {
                'success': bool,
                'source_path': str,
                'dest_path': str,
                'is_directory': bool,
                'size': int (bytes movidos),
                'file_count': int (si es directorio),
                'error': str (si falla)
            }
        """
        try:
            source_full = self.build_full_path(source_path)
            dest_full = self.build_full_path(dest_path)

            if not os.path.exists(source_full):
                return {'success': False, 'error': 'Origen no existe'}

            if os.path.exists(dest_full):
                return {'success': False, 'error': 'Destino ya existe', 'conflict': True}

            is_dir = os.path.isdir(source_full)

            # Calcular tamaño ANTES de mover
            if is_dir:
                total_size = 0
                file_count = 0
                for root, dirs, files in os.walk(source_full):
                    for file in files:
                        file_path = os.path.join(root, file)
                        total_size += os.path.getsize(file_path)
                        file_count += 1
            else:
                total_size = os.path.getsize(source_full)
                file_count = 1

            # Mover archivo o directorio
            shutil.move(source_full, dest_full)

            return {
                'success': True,
                'source_path': source_path,
                'dest_path': dest_path,
                'is_directory': is_dir,
                'size': total_size,
                'file_count': file_count
            }

        except PermissionError:
            return {'success': False, 'error': 'Sin permisos para mover'}
        except Exception as e:
            return {'success': False, 'error': f'Error al mover: {str(e)}'}

    def get_unique_name(self, path):
        """
        Genera un nombre único para evitar conflictos agregando _1, _2, etc.

        Args:
            path: Ruta completa del archivo/directorio

        Returns:
            str: Nombre único (solo el nombre, no la ruta completa)
        """
        full_path = self.build_full_path(path)
        directory = os.path.dirname(full_path)
        base_name = os.path.basename(path)

        # Separar nombre y extensión
        name_without_ext, ext = os.path.splitext(base_name)

        counter = 1
        new_name = base_name

        while True:
            test_path = os.path.join(directory, new_name)
            if not os.path.exists(test_path):
                return new_name

            new_name = f"{name_without_ext}_{counter}{ext}"
            counter += 1

            # Evitar bucle infinito
            if counter > 1000:
                raise Exception("No se pudo generar un nombre único")
