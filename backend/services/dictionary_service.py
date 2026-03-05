"""
Servicio para validación de nombres contra el diccionario de abreviaturas

NOTA: Este servicio usa el diccionario JSON como fallback.
Para nuevas funcionalidades, se recomienda usar SmartNamingService
que integra el diccionario PostgreSQL + cache de abreviaciones.
"""
import json
import re
import unicodedata
import requests
from pathlib import Path
from django.conf import settings
from django.core.cache import cache


class DictionaryService:
    """
    Servicio para validar nombres de archivos y carpetas contra el diccionario

    Funcionalidades:
    - Validar nombres completos
    - Sugerir abreviaturas
    - Autocompletar
    - Buscar en diccionario
    """

    def __init__(self):
        self.dictionary = self._load_dictionary()
        # Configuración de Ollama
        self.ollama_enabled = getattr(settings, 'OLLAMA_ENABLED', True)
        self.ollama_base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.ollama_model = getattr(settings, 'OLLAMA_MODEL', 'llama3.2:3b')
        self.ollama_timeout = getattr(settings, 'OLLAMA_TIMEOUT', 30)

    def _load_dictionary(self):
        """
        Carga el diccionario desde PostgreSQL (con caché).
        Fallback a JSON si la BD no está disponible.
        """
        cache_key = 'dictionary_data_db'

        try:
            cached = cache.get(cache_key)
            if cached:
                return cached
        except Exception:
            pass

        try:
            # Importar modelo de diccionario
            from dictionary.models import DictionaryEntry

            # Cargar términos activos de PostgreSQL
            entries = DictionaryEntry.objects.filter(is_active=True).values('key', 'value')
            data = {entry['key']: entry['value'] for entry in entries}

            if data:
                # Cachear por 5 minutos
                try:
                    cache.set(cache_key, data, 300)
                except Exception:
                    pass
                return data
        except Exception as e:
            print(f"[DictionaryService] Error cargando de BD: {e}")

        # Fallback a JSON si BD falla
        try:
            dict_path = getattr(settings, 'DICTIONARY_FILE_PATH', '/diccionario_archivo.json')
            with open(dict_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data
        except Exception:
            pass

        return {}

    def validate_name(self, name, user=None):
        """
        Valida un nombre de archivo/carpeta contra el diccionario

        Args:
            name: Nombre a validar
            user: Usuario (para verificar si está exento)

        Returns:
            dict: {
                'valid': bool,
                'errors': list,
                'suggestions': list,
                'parts_validated': list
            }
        """
        # Si el usuario está exento, siempre es válido
        if user and user.is_exempt_from_dictionary():
            return {
                'valid': True,
                'errors': [],
                'suggestions': [],
                'parts_validated': [],
                'exempt': True
            }

        # Normalizar nombre (quitar extensión si la tiene)
        name_without_ext = name
        if '.' in name:
            parts = name.rsplit('.', 1)
            if len(parts) == 2 and len(parts[1]) <= 10:  # Extensión típica
                name_without_ext = parts[0]

        # Dividir por guiones bajos
        parts = name_without_ext.lower().split('_')

        errors = []
        suggestions = []
        parts_validated = []

        for part in parts:
            # Verificar si es un número (permitido)
            if self._is_number(part):
                parts_validated.append({'part': part, 'type': 'number', 'valid': True})
                continue

            # Verificar si es una fecha (permitido)
            if self._is_date(part):
                parts_validated.append({'part': part, 'type': 'date', 'valid': True})
                continue

            # Verificar si es un nombre propio (detectado por heurística)
            if self._is_likely_proper_name(part):
                parts_validated.append({
                    'part': part,
                    'type': 'proper_name',
                    'valid': True
                })
                continue

            # Verificar si está en el diccionario
            if part in self.dictionary:
                parts_validated.append({
                    'part': part,
                    'type': 'abbreviation',
                    'valid': True,
                    'meaning': self.dictionary[part]
                })
            else:
                # No está en el diccionario - VALIDAR LOCALMENTE (rápido y estricto)
                # NO llamamos a Ollama - es lento y no aporta valor real
                local_result = self._validate_locally_fast(part)

                if local_result['valid']:
                    # Validación local exitosa
                    parts_validated.append({
                        'part': part,
                        'type': f"local_{local_result['type']}",
                        'valid': True,
                        'reason': local_result.get('reason', '')
                    })
                else:
                    # Validación local falló - RECHAZAR DIRECTAMENTE
                    # No hay Ollama ni nada más - si no está en las listas, es inválido
                    parts_validated.append({
                        'part': part,
                        'type': 'rejected',
                        'valid': False,
                        'reason': local_result.get('reason', '')
                    })
                    errors.append(f"'{part}' no está en el diccionario ni es una palabra/código reconocido")

                    # Buscar sugerencias similares en el diccionario
                    similar = self._find_similar(part)
                    if similar:
                        suggestions.extend([{
                            'original': part,
                            'suggested': s,
                            'meaning': self.dictionary[s]
                        } for s in similar[:3]])

        is_valid = len(errors) == 0

        return {
            'valid': is_valid,
            'errors': errors,
            'suggestions': suggestions,
            'parts_validated': parts_validated,
            'exempt': False
        }

    def _validate_locally_fast(self, word: str) -> dict:
        """
        Validación LOCAL rápida y ESTRICTA.

        FILOSOFÍA: Validar contra listas conocidas. Si no está en ninguna
        lista, RECHAZAR. No hay "asumir que es válido".

        Esto es rápido (~0ms) porque solo busca en sets/dicts en memoria.
        """
        # Limpiar la palabra de puntos y caracteres especiales
        word_clean = ''.join(c for c in word if c.isalnum())
        word_lower = word_clean.lower()

        # Si después de limpiar queda vacío, es inválido
        if not word_clean:
            return {'valid': False, 'type': 'empty', 'reason': 'Palabra vacía'}

        # 1. NÚMEROS - siempre válidos (fechas, versiones, códigos)
        if word_clean.isdigit():
            return {'valid': True, 'type': 'number', 'reason': 'Número válido'}

        # 2. YA ESTÁ EN EL DICCIONARIO - válido (es una abreviación oficial)
        if word_lower in self.dictionary:
            return {'valid': True, 'type': 'dictionary_key', 'reason': 'Abreviación del diccionario'}

        # 3. PALABRAS COMUNES EN ESPAÑOL - válidas
        if word_lower in self.COMMON_SPANISH_WORDS_VALID:
            return {'valid': True, 'type': 'spanish_word', 'reason': 'Palabra común en español'}

        # 4. EXTENSIONES DE ARCHIVO comunes - válidas
        file_extensions = {
            'py', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'htm', 'xml', 'json',
            'csv', 'txt', 'md', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff', 'svg', 'ico',
            'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'wav',
            'zip', 'rar', '7z', 'gz', 'tar', 'bz2',
            'shp', 'shx', 'dbf', 'prj', 'cpg', 'qpj',  # GIS
            'gpkg', 'gdb', 'kml', 'kmz', 'geojson', 'gml',  # GIS
            'dwg', 'dxf', 'dgn',  # CAD
            'sql', 'db', 'sqlite', 'mdb', 'accdb',  # DB
            'exe', 'dll', 'bat', 'sh', 'ps1',  # Ejecutables
            'cfg', 'ini', 'conf', 'yaml', 'yml', 'toml',  # Config
            'log', 'bak', 'tmp', 'temp',  # Otros
        }
        if word_lower in file_extensions:
            return {'valid': True, 'type': 'extension', 'reason': 'Extensión de archivo'}

        # 5. CÓDIGOS ALFANUMÉRICOS - patrón específico (letras+números mezclados)
        # Ejemplos: v1, r2, id001, shp01, abc123, 01a, 2024a
        if word_clean.isalnum() and not word_clean.isalpha() and not word_clean.isdigit():
            if len(word_clean) <= 15:  # Límite razonable para códigos
                return {'valid': True, 'type': 'code', 'reason': 'Código alfanumérico'}

        # 6. LETRAS SUELTAS comunes en archivos (conectores, versiones)
        single_letters_valid = {'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k',
                                'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
                                'w', 'x', 'y', 'z'}
        if len(word_lower) == 1 and word_lower in single_letters_valid:
            return {'valid': True, 'type': 'single_letter', 'reason': 'Letra individual válida'}

        # 7. ABREVIACIONES TÉCNICAS conocidas (NO en diccionario pero comunes)
        technical_abbreviations = {
            # Programación/IT
            'err', 'error', 'excep', 'exception', 'warn', 'warning',
            'info', 'debug', 'trace', 'fatal',
            'src', 'dst', 'tmp', 'temp', 'bak', 'backup', 'orig', 'original',
            'cfg', 'config', 'conf', 'settings', 'prefs',
            'init', 'setup', 'install', 'uninstall',
            'api', 'sdk', 'cli', 'gui', 'ui', 'ux',
            'db', 'sql', 'nosql', 'orm',
            'http', 'https', 'ftp', 'ssh', 'tcp', 'udp', 'ip',
            'url', 'uri', 'dns', 'ssl', 'tls',
            'auth', 'oauth', 'jwt', 'token',
            'crud', 'rest', 'soap', 'rpc', 'grpc',
            'async', 'sync', 'await',
            'req', 'res', 'resp', 'request', 'response',
            'get', 'set', 'post', 'put', 'patch', 'delete',
            'add', 'edit', 'update', 'remove', 'del',
            'min', 'max', 'avg', 'sum', 'count', 'total',
            'idx', 'index', 'key', 'val', 'value',
            'len', 'size', 'width', 'height',
            'func', 'proc', 'method', 'class', 'obj', 'object',
            'var', 'const', 'let', 'param', 'arg', 'args',
            'null', 'nil', 'none', 'void', 'bool', 'int', 'str', 'float',
            'true', 'false', 'yes', 'no', 'ok', 'fail',
            'start', 'stop', 'begin', 'end', 'run', 'exec',
            'open', 'close', 'read', 'write', 'load', 'save',
            'copy', 'move', 'rename', 'delete',
            'test', 'spec', 'mock', 'stub', 'fixture',
            'dev', 'prod', 'stage', 'staging', 'qa', 'uat',
            'local', 'remote', 'server', 'client',
            'main', 'master', 'develop', 'feature', 'hotfix', 'release',
            # Office/Documentos
            'doc', 'docs', 'document', 'documentation',
            'img', 'image', 'pic', 'photo', 'foto',
            'vid', 'video', 'audio', 'media',
            'tbl', 'table', 'fig', 'figure', 'chart', 'graph',
            'ref', 'reference', 'cite', 'citation',
            'ver', 'version', 'rev', 'revision',
            'draft', 'final', 'approved', 'pending', 'review',
            # GIS/Geografía
            'gis', 'geo', 'map', 'layer', 'feature',
            'point', 'line', 'polygon', 'poly', 'geom', 'geometry',
            'coord', 'lat', 'lon', 'long', 'alt', 'elev',
            'proj', 'projection', 'crs', 'srs', 'epsg', 'wgs', 'utm',
            'raster', 'vector', 'tile', 'grid', 'mesh',
            'dem', 'dtm', 'dsm', 'lidar', 'ortho', 'mosaic',
            'shp', 'shapefile', 'gpkg', 'geopackage',
            'wms', 'wfs', 'wcs', 'wmts', 'ogc',
            # Específicos IGAC/Colombia
            'igac', 'dane', 'snc', 'snr', 'orip',
            'catastro', 'predial', 'predio', 'lote', 'manzana',
            'rural', 'urbano', 'suburbano',
            'municipio', 'vereda', 'corregimiento', 'departamento',
            'resolucion', 'acuerdo', 'decreto', 'circular',
            'formato', 'plantilla', 'anexo', 'soporte',
        }
        if word_lower in technical_abbreviations:
            return {'valid': True, 'type': 'technical', 'reason': 'Abreviación técnica conocida'}

        # ❌ NO ESTÁ EN NINGUNA LISTA - RECHAZAR
        return {
            'valid': False,
            'type': 'unknown',
            'reason': f"'{word}' no está en el diccionario ni es una palabra/código reconocido"
        }

    def _is_number(self, text):
        """Verifica si el texto es un número"""
        return text.isdigit()

    def _is_code_or_identifier(self, word: str) -> bool:
        """
        Detecta si una palabra es un código o identificador válido.

        LÓGICA: Cualquier palabra corta (2-6 caracteres) que NO sea una palabra
        común en español se considera un CÓDIGO válido.

        Esto permite códigos institucionales como:
        - FO, GCO, PC01, GI, PR, SGC, ISO, NTC, etc.
        - Cualquier combinación alfanumérica corta
        """
        word_lower = word.lower()

        # Si es solo números, ya se maneja en otro lugar
        if word.isdigit():
            return False

        # Palabras comunes en español que NO son códigos (2-6 caracteres)
        # Solo las más comunes para no bloquear códigos legítimos
        common_spanish_words = {
            # 2 caracteres
            'de', 'en', 'el', 'la', 'un', 'es', 'al', 'lo', 'se', 'no', 'si',
            'ya', 'su', 'me', 'te', 'mi', 'tu', 'le', 'yo', 'ha', 'va', 'da',
            # 3 caracteres
            'del', 'las', 'los', 'una', 'con', 'por', 'que', 'mas', 'sin',
            'son', 'sus', 'hay', 'fue', 'ser', 'ver', 'dar', 'tan', 'dos',
            'eso', 'esa', 'ese', 'asi', 'bien', 'mal', 'hoy', 'ley', 'mes',
            'ano', 'dia', 'red', 'fin', 'sur', 'mar', 'sol', 'rio', 'oro',
            # 4 caracteres
            'para', 'como', 'este', 'esta', 'todo', 'toda', 'pero', 'cada',
            'hace', 'otra', 'otro', 'solo', 'sido', 'bien', 'debe', 'sino',
            'aqui', 'alla', 'tres', 'tipo', 'base', 'caso', 'area', 'zona',
            'dato', 'plan', 'obra', 'acta', 'nota', 'guia', 'ley',
            # 5 caracteres
            'desde', 'entre', 'sobre', 'hasta', 'donde', 'tiene', 'todos',
            'puede', 'mismo', 'parte', 'nunca', 'nuevo', 'nueva', 'mayor',
            'mejor', 'punto', 'grupo', 'fecha', 'forma', 'medio', 'nivel',
            'orden', 'valor', 'campo', 'texto', 'lista', 'tabla', 'monto',
            # 6 caracteres
            'cuando', 'porque', 'aunque', 'dentro', 'fuera', 'siendo',
            'ciudad', 'estado', 'tiempo', 'manera', 'numero', 'cuenta',
            'modelo', 'codigo', 'precio', 'cuanto', 'accion', 'cambio',
        }

        # Si es una palabra común en español, NO es código
        if word_lower in common_spanish_words:
            return False

        # REGLA 1: Códigos alfanuméricos (mezcla de letras y números) - SIEMPRE válidos
        if word.isalnum() and not word.isalpha() and not word.isdigit():
            if 2 <= len(word) <= 20:
                return True

        # REGLA 2: Palabras cortas (2-6 caracteres) que son solo letras
        # Si NO está en palabras comunes, se considera CÓDIGO
        if word.isalpha() and 2 <= len(word) <= 6:
            return True

        # REGLA 3: Extensiones de archivo comunes
        common_extensions = {
            'shp', 'gdb', 'gpkg', 'tif', 'tiff', 'jpg', 'jpeg', 'png', 'pdf',
            'xlsx', 'xls', 'csv', 'doc', 'docx', 'zip', 'rar', 'gz', 'tar',
            'kml', 'kmz', 'geojson', 'json', 'xml', 'txt', 'dwg', 'dxf'
        }
        if word_lower in common_extensions:
            return True

        return False

    # Palabras comunes en español que SIEMPRE son válidas
    COMMON_SPANISH_WORDS_VALID = {
        # Palabras de uso común en archivos/documentos
        'archivo', 'archivos', 'documento', 'documentos', 'carpeta', 'carpetas',
        'informe', 'informes', 'reporte', 'reportes', 'proyecto', 'proyectos',
        'proceso', 'procesos', 'solicitud', 'solicitudes', 'respuesta', 'respuestas',
        'resultado', 'resultados', 'resumen', 'resumenes', 'analisis', 'revision',
        'version', 'versiones', 'copia', 'copias', 'backup', 'original', 'final',
        'borrador', 'preliminar', 'definitivo', 'definitiva', 'actualizado',
        # Tipos de documentos
        'acta', 'actas', 'carta', 'cartas', 'oficio', 'oficios', 'memorando',
        'circular', 'resolucion', 'decreto', 'contrato', 'convenio', 'acuerdo',
        'certificado', 'constancia', 'concepto', 'formato', 'plantilla', 'manual',
        # Acciones comunes (verbos infinitivo y conjugaciones)
        'crear', 'creacion', 'creando', 'creado', 'creados',
        'editar', 'edicion', 'editando', 'editado',
        'modificar', 'modificacion', 'modificando', 'modificado',
        'actualizar', 'actualizacion', 'actualizando', 'actualizada', 'actualizadas',
        'eliminar', 'eliminacion', 'eliminando', 'eliminado',
        'borrar', 'borrando', 'borrado',
        'enviar', 'enviando', 'enviado', 'envio',
        'recibir', 'recibiendo', 'recibido',
        'aprobar', 'aprobacion', 'aprobando', 'aprobado',
        'rechazar', 'rechazando', 'rechazado',
        'revisar', 'revisando', 'revisado', 'revisados',
        'validar', 'validacion', 'validando', 'validado',
        'verificar', 'verificacion', 'verificando', 'verificado',
        'consultar', 'consultando', 'consultado',
        'buscar', 'buscando', 'buscado',
        'filtrar', 'filtrando', 'filtrado',
        'exportar', 'exportacion', 'exportando', 'exportado',
        'importar', 'importacion', 'importando', 'importado',
        'descargar', 'descargando', 'descargado', 'descarga',
        'subir', 'subiendo', 'subido', 'subida',
        'generar', 'generacion', 'generando', 'generado',
        'procesar', 'procesamiento', 'procesando', 'procesado',
        'convertir', 'conversion', 'convirtiendo', 'convertido',
        'transformar', 'transformacion', 'transformando', 'transformado',
        'migrar', 'migracion', 'migrando', 'migrado',
        'copiar', 'copiando', 'copiado',
        'mover', 'moviendo', 'movido',
        'diligenciar', 'diligenciando', 'diligenciado',
        # Adjetivos comunes (incluidas formas plurales)
        'nuevo', 'nueva', 'nuevos', 'nuevas',
        'antiguo', 'antigua', 'antiguos', 'antiguas',
        'viejo', 'vieja', 'viejos', 'viejas',
        'grande', 'grandes', 'pequeno', 'pequena', 'pequenos', 'pequenas',
        'mayor', 'mayores', 'menor', 'menores',
        'primero', 'primera', 'primeros', 'primeras',
        'segundo', 'segunda', 'segundos', 'segundas',
        'tercero', 'tercera', 'terceros', 'terceras',
        'ultimo', 'ultima', 'ultimos', 'ultimas',
        'general', 'generales', 'especial', 'especiales',
        'especifico', 'especifica', 'especificos', 'especificas',
        'principal', 'principales', 'secundario', 'secundaria', 'secundarios',
        'interno', 'interna', 'internos', 'internas',
        'externo', 'externa', 'externos', 'externas',
        'publico', 'publica', 'publicos', 'publicas',
        'privado', 'privada', 'privados', 'privadas',
        'oficial', 'oficiales', 'temporal', 'temporales',
        'permanente', 'permanentes', 'parcial', 'parciales',
        'total', 'totales', 'necesario', 'necesaria', 'necesarios', 'necesarias',
        'importante', 'importantes', 'disponible', 'disponibles',
        'requerido', 'requerida', 'requeridos', 'requeridas',
        'pendiente', 'pendientes', 'completo', 'completa', 'completos', 'completas',
        # Sustantivos comunes
        'usuario', 'usuarios', 'cliente', 'clientes', 'proveedor', 'proveedores',
        'empleado', 'empleados', 'funcionario', 'funcionarios', 'persona', 'personas',
        'entidad', 'entidades', 'empresa', 'empresas', 'institucion', 'instituciones',
        'departamento', 'departamentos', 'area', 'areas', 'seccion', 'secciones',
        'division', 'divisiones', 'unidad', 'unidades', 'oficina', 'oficinas', 'sede', 'sedes',
        # Palabras técnicas comunes
        'datos', 'dato', 'informacion', 'sistema', 'sistemas', 'base', 'bases',
        'tabla', 'tablas', 'campo', 'campos', 'registro', 'registros', 'codigo', 'codigos',
        'lista', 'listas', 'catalogo', 'catalogos', 'indice', 'indices', 'tipo', 'tipos',
        'estado', 'estados', 'nivel', 'niveles', 'categoria', 'categorias', 'grupo', 'grupos',
        'error', 'errores', 'excepcion', 'excepciones', 'advertencia', 'advertencias',
        # Geografía/GIS/Catastro
        'mapa', 'mapas', 'capa', 'capas', 'punto', 'puntos', 'linea', 'lineas',
        'poligono', 'poligonos', 'area', 'areas', 'zona', 'zonas', 'region', 'regiones',
        'territorio', 'territorios', 'limite', 'limites', 'frontera', 'fronteras',
        'coordenada', 'coordenadas', 'latitud', 'longitud', 'altitud', 'elevacion',
        'escala', 'escalas', 'proyeccion', 'proyecciones', 'datum',
        'georreferenciacion', 'ortofoto', 'ortofotos', 'ortomosaico', 'ortomosaicos',
        'construccion', 'construcciones', 'predio', 'predios', 'terreno', 'terrenos',
        'lote', 'lotes', 'manzana', 'manzanas', 'parcela', 'parcelas',
        'urbano', 'urbana', 'urbanos', 'urbanas',
        'rural', 'rurales', 'catastral', 'catastrales',
        'topografia', 'topografico', 'topografica', 'geodesia', 'geodesico', 'geodesica',
        # Tiempo
        'fecha', 'fechas', 'hora', 'horas', 'dia', 'dias', 'semana', 'semanas',
        'mes', 'meses', 'ano', 'anos', 'periodo', 'periodos', 'trimestre', 'semestre',
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
        'septiembre', 'octubre', 'noviembre', 'diciembre',
        # Otras palabras frecuentes
        'test', 'prueba', 'pruebas', 'ejemplo', 'ejemplos', 'muestra', 'muestras',
        'modelo', 'modelos', 'plantilla', 'plantillas', 'template', 'templates',
        'imagen', 'imagenes', 'foto', 'fotos', 'video', 'videos', 'audio', 'audios',
        'texto', 'textos', 'nota', 'notas', 'comentario', 'comentarios', 'observacion',
        'anexo', 'anexos', 'adjunto', 'adjuntos', 'soporte', 'soportes', 'evidencia',
        # Conectores y preposiciones (para nombres largos)
        'de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas',
        'en', 'con', 'sin', 'por', 'para', 'desde', 'hasta', 'entre', 'sobre',
        'bajo', 'ante', 'tras', 'durante', 'mediante', 'segun', 'hacia',
        # Verbos en infinitivo comunes
        'gestionar', 'administrar', 'controlar', 'supervisar', 'coordinar', 'planificar',
        'ejecutar', 'implementar', 'desarrollar', 'disenar', 'construir', 'mantener',
        'operar', 'monitorear', 'evaluar', 'medir', 'calcular', 'estimar', 'proyectar',
    }

    def _validate_with_ollama(self, word: str) -> dict:
        """
        Valida una palabra desconocida usando Ollama.
        OPTIMIZADO: Primero verifica palabras comunes localmente.

        Ollama determina si la palabra es:
        1. Una palabra válida en español (no necesita abreviarse)
        2. Acrónimo o sigla válida
        3. Término técnico válido
        4. Código o identificador válido
        5. Palabra que necesita abreviarse (no válida como está)

        Returns:
            dict: {
                'valid': bool,  # Si la palabra es válida tal como está
                'type': str,    # Tipo detectado: 'spanish_word', 'acronym', 'technical', 'code', 'needs_abbreviation'
                'suggestion': str,  # Sugerencia de abreviación si no es válida
                'reason': str   # Razón de la decisión
            }
        """
        word_lower = word.lower()

        # PASO 1: Verificar palabras comunes en español (SIN Ollama)
        if word_lower in self.COMMON_SPANISH_WORDS_VALID:
            result = {
                'valid': True,
                'type': 'spanish_word',
                'suggestion': None,
                'reason': 'Palabra común en español'
            }
            print(f"[LOCAL VALIDATION] '{word}' -> palabra común en español")
            return result

        # PASO 2: Detectar códigos/identificadores SIN llamar a Ollama
        if self._is_code_or_identifier(word):
            result = {
                'valid': True,
                'type': 'code',
                'suggestion': None,
                'reason': f'Código o identificador alfanumérico válido'
            }
            print(f"[CODE DETECTION] '{word}' -> código/identificador detectado")
            return result

        # PASO 3: Palabras alfabéticas de 3-15 chars son probablemente válidas
        # Esto evita llamar a Ollama para palabras que parecen legítimas
        if word.isalpha() and 3 <= len(word) <= 15:
            # Si tiene al menos 2 vocales, probablemente es una palabra real
            vowels = sum(1 for c in word_lower if c in 'aeiou')
            if vowels >= 2:
                result = {
                    'valid': True,
                    'type': 'assumed_spanish',
                    'suggestion': None,
                    'reason': 'Palabra alfabética con estructura válida'
                }
                print(f"[LOCAL VALIDATION] '{word}' -> palabra válida por estructura")
                return result

        if not self.ollama_enabled:
            return {'valid': False, 'type': 'unknown', 'suggestion': None, 'reason': 'Ollama no habilitado'}

        # Verificar caché primero
        cache_key = f'ollama_word_validation:{word.lower()}'
        try:
            cached = cache.get(cache_key)
            if cached:
                return cached
        except Exception:
            pass

        prompt = f"""Analiza la palabra "{word}" para un sistema de archivos en español.

RESPONDE SOLO CON UNA LÍNEA en formato: TIPO|VALIDO|RAZON

Donde:
- TIPO: "palabra_espanol" si es palabra común en español (test, documento, prueba, carpeta, etc.), "nombre_propio" si es nombre de persona/lugar, "acronimo" si es sigla/acrónimo (IGAC, PDF, GDB, SHP, etc.), "tecnico" si es término técnico válido, "codigo" si es código alfanumérico (v1, r2, id001, shp01, abc123), "invalido" si no es ninguno
- VALIDO: "si" o "no" (si puede usarse tal cual en un nombre de archivo)
- RAZON: explicación muy breve (máx 10 palabras)

Ejemplos:
- "test" → palabra_espanol|si|Palabra común en español significa prueba
- "pepito" → nombre_propio|si|Nombre propio de persona
- "igac" → acronimo|si|Sigla válida Instituto Geográfico
- "shp01" → codigo|si|Código de formato shapefile versión 01
- "v2" → codigo|si|Indicador de versión 2
- "abc123" → codigo|si|Código alfanumérico válido
- "asdfgh" → invalido|no|No es palabra real ni código válido

Analiza: "{word}"
"""

        try:
            response = requests.post(
                f"{self.ollama_base_url}/api/chat",
                json={
                    "model": self.ollama_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Eres un validador de palabras para un sistema de archivos. Responde SOLO con el formato solicitado, sin explicaciones adicionales."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 50,
                    }
                },
                timeout=self.ollama_timeout
            )

            if response.status_code == 200:
                result_text = response.json().get('message', {}).get('content', '').strip()

                # Parsear respuesta
                parts = result_text.split('|')
                if len(parts) >= 3:
                    tipo = parts[0].strip().lower()
                    valido = parts[1].strip().lower() == 'si'
                    razon = parts[2].strip()

                    # Mapear tipo
                    type_map = {
                        'palabra_espanol': 'spanish_word',
                        'nombre_propio': 'proper_name',
                        'acronimo': 'acronym',
                        'tecnico': 'technical',
                        'codigo': 'code',
                        'invalido': 'invalid'
                    }

                    result = {
                        'valid': valido,
                        'type': type_map.get(tipo, 'unknown'),
                        'suggestion': None,
                        'reason': razon
                    }

                    # Cachear resultado por 24 horas (las palabras no cambian)
                    try:
                        cache.set(cache_key, result, 86400)
                    except Exception:
                        pass

                    print(f"[OLLAMA VALIDATION] '{word}' -> {result}")
                    return result

        except Exception as e:
            print(f"[OLLAMA VALIDATION] Error validando '{word}': {e}")

        # Fallback: asumir válido si es palabra corta y alfanumérica
        if word.isalpha() and 3 <= len(word) <= 12:
            return {'valid': True, 'type': 'assumed_valid', 'suggestion': None, 'reason': 'Fallback: palabra corta alfanumérica'}

        return {'valid': False, 'type': 'unknown', 'suggestion': None, 'reason': 'No se pudo validar'}

    # Lista EXPLÍCITA de nombres propios conocidos (no heurísticas)
    KNOWN_PROPER_NAMES = {
        # Nombres masculinos comunes Colombia
        'andres', 'carlos', 'juan', 'jose', 'luis', 'miguel', 'david', 'daniel', 'pepito',
        'santiago', 'sebastian', 'alejandro', 'felipe', 'nicolas', 'diego',
        'camilo', 'jorge', 'pedro', 'pablo', 'fernando', 'ricardo', 'eduardo',
        'oscar', 'mauricio', 'cesar', 'javier', 'rafael', 'gustavo', 'hector',
        'ivan', 'jaime', 'manuel', 'mario', 'nelson', 'raul', 'sergio', 'victor',
        'william', 'wilson', 'yeison', 'brayan', 'kevin', 'stiven', 'johan',
        'cristian', 'fabian', 'german', 'hernan', 'leonel', 'orlando', 'ramiro',
        'rodrigo', 'ruben', 'andrey', 'arley', 'brahian', 'duvan', 'edinson',
        'fredy', 'giovanny', 'harrison', 'james', 'jhon', 'jhonatan', 'julian',
        'leonardo', 'leandro', 'marlon', 'mateo', 'miller', 'neymar', 'robinson',
        'ronald', 'yeferson', 'yesid', 'alexander', 'alexis', 'alfonso', 'alvaro',
        'antonio', 'armando', 'arturo', 'bernardo', 'bladimir', 'boris', 'byron',
        # Nombres femeninos comunes Colombia
        'maria', 'ana', 'laura', 'carolina', 'andrea', 'paola', 'diana', 'sandra',
        'patricia', 'claudia', 'monica', 'adriana', 'natalia', 'catalina', 'valentina',
        'gabriela', 'daniela', 'camila', 'sofia', 'isabella', 'juliana', 'alejandra',
        'angela', 'liliana', 'viviana', 'gloria', 'martha', 'luz', 'rosa', 'carmen',
        'teresa', 'cecilia', 'clara', 'cristina', 'elena', 'esperanza', 'eugenia',
        'fernanda', 'florencia', 'graciela', 'helena', 'ines', 'irene', 'isabel',
        'jessica', 'johana', 'karen', 'katherine', 'leidy', 'lina', 'lizeth',
        'lorena', 'lucia', 'luisa', 'marcela', 'margarita', 'mayra', 'melissa',
        'milena', 'nancy', 'nathaly', 'nelly', 'olga', 'paula', 'pilar', 'rocio',
        'rosario', 'ruth', 'sara', 'silvia', 'sonia', 'stella', 'susana', 'tatiana',
        'vanessa', 'veronica', 'victoria', 'ximena', 'yenny', 'yolanda', 'yorlady',
        'jenifer', 'jennifer', 'yuliana', 'yuri', 'zoraida', 'zulma', 'amparo',
        # Apellidos comunes colombianos
        'osorio', 'rodriguez', 'martinez', 'lopez', 'gonzalez', 'garcia', 'hernandez',
        'sanchez', 'ramirez', 'torres', 'flores', 'rivera', 'gomez', 'diaz', 'reyes',
        'morales', 'jimenez', 'ruiz', 'alvarez', 'romero', 'vargas', 'castro', 'ortiz',
        'rubio', 'marin', 'soto', 'suarez', 'contreras', 'rojas', 'moreno', 'gutierrez',
        'munoz', 'fernandez', 'perez', 'medina', 'aguilar', 'pena', 'salazar', 'cardenas',
        'espinosa', 'espindola', 'valencia', 'cortes', 'herrera', 'guerrero', 'mendoza',
    }

    def _is_likely_proper_name(self, word: str) -> bool:
        """
        Detecta si una palabra es un nombre propio CONOCIDO.
        SOLO usa lista explícita, NO heurísticas.
        """
        word_lower = word.lower()
        return word_lower in self.KNOWN_PROPER_NAMES

    def _is_date(self, text):
        """
        Verifica si el texto es una fecha en formatos permitidos:
        - YYYY (2024)
        - YYYYMM (202401)
        - YYYYMMDD (20240115)
        - MMDD (1229)
        """
        if len(text) == 4 and text.isdigit():  # YYYY
            year = int(text)
            return 1900 <= year <= 2100

        if len(text) == 6 and text.isdigit():  # YYYYMM
            year = int(text[:4])
            month = int(text[4:6])
            return 1900 <= year <= 2100 and 1 <= month <= 12

        if len(text) == 8 and text.isdigit():  # YYYYMMDD
            year = int(text[:4])
            month = int(text[4:6])
            day = int(text[6:8])
            return (1900 <= year <= 2100 and
                    1 <= month <= 12 and
                    1 <= day <= 31)

        if len(text) == 4 and text.isdigit():  # MMDD
            month = int(text[:2])
            day = int(text[2:4])
            return 1 <= month <= 12 and 1 <= day <= 31

        return False

    def _find_similar(self, word, max_results=5):
        """
        Busca palabras similares en el diccionario usando Levenshtein distance

        Args:
            word: Palabra a buscar
            max_results: Máximo de resultados

        Returns:
            list: Lista de palabras similares
        """
        def levenshtein_distance(s1, s2):
            """Calcula distancia de Levenshtein entre dos strings"""
            if len(s1) < len(s2):
                return levenshtein_distance(s2, s1)

            if len(s2) == 0:
                return len(s1)

            previous_row = range(len(s2) + 1)
            for i, c1 in enumerate(s1):
                current_row = [i + 1]
                for j, c2 in enumerate(s2):
                    insertions = previous_row[j + 1] + 1
                    deletions = current_row[j] + 1
                    substitutions = previous_row[j] + (c1 != c2)
                    current_row.append(min(insertions, deletions, substitutions))
                previous_row = current_row

            return previous_row[-1]

        # Buscar palabras similares
        similarities = []
        for key in self.dictionary.keys():
            distance = levenshtein_distance(word.lower(), key.lower())
            # Solo considerar si la distancia es pequeña
            if distance <= 3:
                similarities.append((key, distance))

        # Ordenar por distancia
        similarities.sort(key=lambda x: x[1])

        return [word for word, _ in similarities[:max_results]]

    def autocomplete(self, prefix, limit=10):
        """
        Autocompletado: busca palabras que empiecen con el prefijo

        Args:
            prefix: Prefijo a buscar
            limit: Límite de resultados

        Returns:
            list: Lista de sugerencias con su significado
        """
        prefix = prefix.lower()
        results = []

        for key, value in self.dictionary.items():
            if key.startswith(prefix):
                results.append({'abbreviation': key, 'meaning': value})

                if len(results) >= limit:
                    break

        return results

    def search(self, query, limit=20):
        """
        Busca en el diccionario por abreviatura o significado

        Args:
            query: Texto a buscar
            limit: Límite de resultados

        Returns:
            list: Lista de coincidencias
        """
        query = query.lower()
        results = []

        for key, value in self.dictionary.items():
            if query in key.lower() or query in value.lower():
                results.append({'abbreviation': key, 'meaning': value})

                if len(results) >= limit:
                    break

        return results

    def get_abbreviation(self, text):
        """Busca la abreviatura para un texto completo"""
        text = text.lower()
        for key, value in self.dictionary.items():
            if value.lower() == text:
                return key
        return None

    def generate_suggestions(self, full_text):
        """
        Genera sugerencias de nombres válidos para un texto completo

        Args:
            full_text: Texto completo (ej: "actualización catastral multipropósito 2024")

        Returns:
            list: Lista de sugerencias válidas
        """
        # Dividir el texto en palabras
        words = re.split(r'[\s\-_]+', full_text.lower())

        suggestions = []
        current = []

        for word in words:
            # Si es número o fecha, agregar tal cual
            if self._is_number(word) or self._is_date(word):
                current.append(word)
                continue

            # Buscar abreviatura exacta
            abbrev = self.get_abbreviation(word)
            if abbrev:
                current.append(abbrev)
            elif word in self.dictionary:
                current.append(word)
            else:
                # Buscar similar
                similar = self._find_similar(word, max_results=1)
                if similar:
                    current.append(similar[0])

        if current:
            # Generar variaciones
            base = '_'.join(current)
            suggestions.append(base)

            # Variaciones con fecha
            from datetime import datetime
            today = datetime.now()
            suggestions.append(f"{base}_{today.strftime('%Y')}")
            suggestions.append(f"{base}_{today.strftime('%Y%m%d')}")
            suggestions.append(f"{today.strftime('%Y%m%d')}_{base}")

        return suggestions[:5]  # Máximo 5 sugerencias

    def suggest_abbreviation(self, word: str) -> str:
        """
        Sugiere una abreviación para una palabra usando:
        1. Diccionario oficial (PostgreSQL)
        2. Cache de abreviaciones generadas
        3. Reglas determinísticas (consonantes + primera vocal)

        Esta función garantiza CONSISTENCIA: la misma palabra siempre
        retorna la misma abreviación.

        Args:
            word: Palabra a abreviar

        Returns:
            str: Abreviación sugerida
        """
        if not word or len(word) <= 4:
            return word.lower() if word else ''

        # Normalizar palabra
        word_normalized = word.lower().strip()
        word_normalized = ''.join(
            c for c in unicodedata.normalize('NFD', word_normalized)
            if unicodedata.category(c) != 'Mn'
        )

        # 1. Buscar en diccionario oficial (PostgreSQL)
        try:
            from utils.dictionary_validator import DictionaryValidator
            validator = DictionaryValidator()
            abbrev = validator.find_abbreviation(word_normalized)
            if abbrev:
                return abbrev
        except Exception:
            pass

        # 2. Buscar en cache de abreviaciones generadas
        try:
            from dictionary.models import AIGeneratedAbbreviation
            cached = AIGeneratedAbbreviation.get_or_none(word_normalized)
            if cached:
                cached.increment_usage()
                return cached.abbreviation
        except Exception:
            pass

        # 3. Generar con reglas determinísticas
        abbrev = self._deterministic_abbreviation(word_normalized)

        # 4. Guardar en cache para futuras consultas
        try:
            from dictionary.models import AIGeneratedAbbreviation
            AIGeneratedAbbreviation.cache_abbreviation(word_normalized, abbrev)
        except Exception:
            pass

        return abbrev

    def _deterministic_abbreviation(self, word: str, max_length: int = 5) -> str:
        """
        Genera una abreviación determinística usando reglas:
        - Consonantes + primera vocal
        - Máximo 5 caracteres

        Args:
            word: Palabra a abreviar (ya normalizada)
            max_length: Longitud máxima

        Returns:
            str: Abreviación
        """
        if len(word) <= 4:
            return word

        vowels = set('aeiou')
        result = []
        found_first_vowel = False

        for char in word:
            if char not in vowels:
                result.append(char)
            elif not found_first_vowel:
                result.append(char)
                found_first_vowel = True

            if len(result) >= max_length:
                break

        abbrev = ''.join(result)

        # Si quedó muy corto, usar primeras letras
        if len(abbrev) < 3:
            abbrev = word[:max_length]

        return abbrev[:max_length]

    def validate_and_suggest(self, name: str, user=None) -> dict:
        """
        Valida un nombre Y genera sugerencia de abreviación si es necesario.

        Integra:
        - Validación contra diccionario
        - Sugerencias usando cache de abreviaciones
        - Reglas determinísticas

        Args:
            name: Nombre a validar
            user: Usuario (para verificar exenciones)

        Returns:
            dict: {
                'valid': bool,
                'errors': list,
                'suggested_name': str,
                'parts_analysis': list
            }
        """
        # Validación básica
        validation = self.validate_name(name, user)

        if validation.get('exempt') or validation['valid']:
            return {
                'valid': True,
                'errors': [],
                'suggested_name': name,
                'parts_analysis': validation.get('parts_validated', []),
                'exempt': validation.get('exempt', False)
            }

        # Generar sugerencia abreviada para partes no válidas
        name_without_ext = name
        extension = ''
        if '.' in name:
            parts = name.rsplit('.', 1)
            if len(parts) == 2 and len(parts[1]) <= 10:
                name_without_ext = parts[0]
                extension = '.' + parts[1].lower()

        # Procesar cada parte
        parts = name_without_ext.lower().split('_')
        suggested_parts = []
        parts_analysis = []

        for part in parts:
            if not part:
                continue

            # Números y fechas: mantener
            if self._is_number(part) or self._is_date(part):
                suggested_parts.append(part)
                parts_analysis.append({
                    'original': part,
                    'suggested': part,
                    'type': 'number' if self._is_number(part) else 'date',
                    'source': 'preserved'
                })
                continue

            # Conectores: eliminar
            connectors = {'a', 'y', 'e', 'o', 'u', 'de', 'del', 'la', 'el', 'los', 'las',
                          'en', 'con', 'para', 'por', 'entre', 'sobre'}
            if part in connectors:
                parts_analysis.append({
                    'original': part,
                    'suggested': None,
                    'type': 'connector',
                    'source': 'removed'
                })
                continue

            # Buscar/generar abreviación
            abbrev = self.suggest_abbreviation(part)
            suggested_parts.append(abbrev)
            parts_analysis.append({
                'original': part,
                'suggested': abbrev,
                'type': 'abbreviated',
                'source': 'dictionary' if part in self.dictionary else 'cache_or_rules'
            })

        suggested_name = '_'.join(suggested_parts) + extension

        return {
            'valid': True,  # Ahora es válido porque está abreviado
            'errors': [],
            'suggested_name': suggested_name,
            'original_name': name,
            'parts_analysis': parts_analysis
        }
