"""
SmartNamingService - Sistema Inteligente de Renombramiento IGAC

Este servicio implementa las 12 reglas oficiales de nombrado del IGAC
con integración de diccionario como REFERENCIA y IA para casos no cubiertos.

Reglas IGAC:
1. Todo en minúsculas
2. Sin tildes/acentos
3. Sin conectores (a, y, de, entre, etc.)
4. Espacios → guiones bajos
5. Sin paréntesis, guiones medios → guiones bajos
6. Sin caracteres especiales
7. Sin caracteres duplicados consecutivos (aa → a)
8. Fecha al INICIO en formato YYYYMMDD
9. Sin palabras genéricas (archivo, final, etc.)
10. Máximo 30 caracteres en nombre
11. Sin prefijos como "nuevo_", "copia_"
12. Ceros iniciales en secuencias numéricas
"""
import re
import unicodedata
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from django.conf import settings
from django.core.cache import cache


class SmartNamingService:
    """
    Servicio inteligente de nombrado que:
    - Implementa las 12 reglas IGAC
    - Usa diccionario como REFERENCIA (no obligatorio)
    - Llama a IA para palabras desconocidas
    - Respeta exenciones de usuario
    """

    # Conectores a eliminar (regla 3)
    CONNECTORS = {'a', 'y', 'e', 'o', 'u', 'de', 'del', 'la', 'el', 'los', 'las',
                  'en', 'con', 'para', 'por', 'entre', 'sobre', 'bajo', 'ante',
                  'desde', 'hasta', 'hacia', 'sin', 'segun', 'durante', 'mediante'}

    # Palabras genéricas a evitar (regla 9)
    GENERIC_WORDS = {'archivo', 'final', 'nuevo', 'viejo', 'copia', 'backup',
                     'temp', 'temporal', 'borrador', 'draft', 'version',
                     'documento', 'doc', 'file', 'data', 'datos'}

    # Prefijos prohibidos (regla 11)
    FORBIDDEN_PREFIXES = ('nuevo_', 'copia_', 'backup_', 'temp_', 'old_',
                          'copy_', 'new_', 'final_', 'v_')

    # Dígrafos del español que NO deben eliminarse (excepción regla 7)
    # rr: carro, barrio, perro
    # ll: calle, pollo, llave
    # cc: acceso, acción, lección
    # nn: perenne, innovar (menos común pero válido)
    SPANISH_DIGRAPHS = {'rr', 'll', 'cc', 'nn'}

    # Palabras en inglés estándar a mantener
    STANDARD_ENGLISH = {'shapefile', 'workflow', 'backup', 'dataset', 'raster',
                        'vector', 'layer', 'feature', 'polygon', 'point', 'line',
                        'grid', 'dem', 'dtm', 'lidar', 'ortho', 'mosaic', 'tile',
                        'geodatabase', 'gdb', 'gpkg', 'geojson', 'kml', 'kmz',
                        'tiff', 'geotiff', 'jpeg', 'png', 'pdf', 'xlsx', 'csv',
                        'zip', 'rar', 'tar', 'gz'}

    # Palabras comunes que NO son nombres propios (para evitar falsos positivos)
    # Estas palabras técnicas/comunes NO deben detectarse como nombres propios
    NOT_PROPER_NAMES = {
        # Palabras técnicas/documentos
        'archivo', 'documento', 'informe', 'reporte', 'analisis', 'resultado',
        'proyecto', 'proceso', 'sistema', 'servicio', 'registro', 'formato',
        'version', 'estado', 'periodo', 'balance', 'resumen', 'detalle',
        'memoria', 'listado', 'catalogo', 'indice', 'anexo', 'adjunto',
        'copia', 'backup', 'temporal', 'borrador', 'prueba', 'ejemplo',
        'tecnico', 'tecnica', 'tecnicas', 'tecnicos', 'publico', 'publica',
        'economico', 'economica', 'politico', 'politica', 'juridico', 'juridica',
        'administrativo', 'administrativa', 'operativo', 'operativa',
        'estrategico', 'estrategica', 'estadistico', 'estadistica',
        'geografico', 'geografica', 'ambiental', 'social', 'cultural',
        # Palabras geográficas/cartografía
        'municipio', 'vereda', 'corregimiento', 'barrio', 'sector', 'zona',
        'region', 'territorio', 'limite', 'lindero', 'predio', 'parcela',
        'terreno', 'lote', 'manzana', 'cuadra', 'esquina', 'calle',
        'carrera', 'avenida', 'diagonal', 'transversal', 'autopista',
        'catastro', 'geodesia', 'topografia', 'cartografia', 'ortofoto',
        # Palabras administrativas
        'resolucion', 'decreto', 'acuerdo', 'circular', 'oficio', 'memorando',
        'certificado', 'constancia', 'acta', 'minuta', 'contrato', 'convenio',
        'solicitud', 'respuesta', 'notificacion', 'comunicado', 'boletin',
        # Acciones/procesos
        'revision', 'actualizacion', 'modificacion', 'correccion', 'ajuste',
        'validacion', 'verificacion', 'aprobacion', 'rechazo', 'tramite',
        'radicado', 'expediente', 'consecutivo', 'folio', 'pagina',
        # Tiempo
        'semestre', 'trimestre', 'bimestre', 'mensual', 'semanal', 'diario',
        'periodo', 'vigencia', 'historico', 'anterior', 'siguiente', 'actual',
        # Técnicos GIS
        'shapefile', 'raster', 'vector', 'feature', 'layer', 'polygon',
        'dataset', 'geodatabase', 'metadata', 'attribute', 'geometry',
        # Otras palabras comunes
        'general', 'especial', 'nacional', 'regional', 'local', 'central',
        'interno', 'interna', 'externo', 'externa', 'inicial', 'final',
        'primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'ultimo',
        'grande', 'pequeno', 'nuevo', 'viejo', 'antiguo', 'moderno',
    }

    # Meses en texto para detección de fechas
    MONTHS_ES = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
        'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
        'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05',
        'jun': '06', 'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10',
        'nov': '11', 'dic': '12'
    }

    # Límites
    MAX_NAME_LENGTH = 65  # Límite para nombres de archivo (incluyendo fecha YYYYMMDD_)
    MAX_PATH_LENGTH = 260

    # Extensiones COMPUESTAS que deben preservarse completas
    # Ordenadas de más larga a más corta para matchear correctamente
    COMPOUND_EXTENSIONS = [
        '.tar.gz', '.tar.bz2', '.tar.xz', '.tar.lzma', '.tar.zst',
        '.gdb.zip', '.gdb.7z', '.gdb.gz', '.gdb.rar',
        '.gpkg.zip', '.gpkg.7z',
        '.shp.zip', '.shp.7z',
    ]

    # Extensiones que REQUIEREN fecha al inicio (YYYYMMDD)
    # Basado en especificación IGAC - actualizado 2026-01-06
    # NOTA: NO incluir formatos geoespaciales profesionales (.ecw, .tiff, .jp2, etc.)
    EXTENSIONS_REQUIRING_DATE = {
        # Documentos de oficina
        'docx', 'doc', 'txt', 'pptx', 'xlsx', 'xls', 'xlsb', 'xlsm', 'csv', 'pdf',
        # Multimedia - audio
        'mp3', 'ogg', 'wav', 'm4a', 'aac',
        # Multimedia - video
        'mp4', 'mpeg', 'mpg', 'mov', 'mpe',
        # Imágenes SOLO básicas (NO profesionales/geoespaciales)
        'jpg', 'jpeg', 'png',
        # Datos geoespaciales livianos
        'geojson', 'mpk', 'ili', 'rrd', 'img',
        # Archivos comprimidos
        'zip', 'rar', '7z', 'gz', 'tar', 'tgz', 'bz2', 'xz', 'lzma',
        # Datos y configuración
        'db', 'ini', 'conf', 'mdb',
        # Correo y otros
        'eml', 'lnk',
    }

    def __init__(self):
        from utils.dictionary_validator import DictionaryValidator
        self.dictionary = DictionaryValidator()
        # Cargar enchant para verificación de diccionario si está disponible
        self._enchant_dict = None
        self._enchant_available = False
        try:
            import enchant
            # Intentar cargar diccionario español - preferir colombiano
            for lang in ['es_CO', 'es_ES', 'es']:
                if enchant.dict_exists(lang):
                    self._enchant_dict = enchant.Dict(lang)
                    self._enchant_available = True
                    print(f"[SmartNaming] Diccionario enchant cargado: {lang}")
                    break
        except ImportError:
            print("[SmartNaming] pyenchant no disponible, usando heurísticas")
        except Exception as e:
            print(f"[SmartNaming] Error cargando enchant: {e}")

    def _extract_extension(self, filename: str) -> Tuple[str, str]:
        """
        Extrae la extensión de un archivo, preservando extensiones compuestas.

        Args:
            filename: Nombre del archivo

        Returns:
            Tuple[str, str]: (nombre_sin_extension, extension_con_punto)

        Ejemplos:
            'archivo.tar.gz' -> ('archivo', '.tar.gz')
            'datos.gdb.zip' -> ('datos', '.gdb.zip')
            'documento.pdf' -> ('documento', '.pdf')
        """
        filename_lower = filename.lower()

        # Primero verificar extensiones compuestas (ordenadas de más larga a más corta)
        for compound_ext in self.COMPOUND_EXTENSIONS:
            if filename_lower.endswith(compound_ext):
                # Extraer el nombre sin la extensión compuesta
                name_without_ext = filename[:-len(compound_ext)]
                # Preservar el case original de la extensión del archivo
                original_ext = filename[-len(compound_ext):]
                return name_without_ext, original_ext.lower()

        # Si no es compuesta, usar lógica normal (último punto)
        if '.' in filename:
            parts = filename.rsplit('.', 1)
            if len(parts[1]) <= 10:  # Extensión típica (max 10 chars)
                return parts[0], '.' + parts[1].lower()

        # Sin extensión
        return filename, ''

    def _is_likely_proper_name(self, word: str) -> bool:
        """
        Detecta si una palabra es PROBABLEMENTE un nombre propio.

        Usa múltiples heurísticas en lugar de una lista estática imposible de mantener:
        1. Verifica si está en nuestra lista de exclusión (palabras técnicas comunes)
        2. Verifica si está en el diccionario del sistema (enchant) - si está, NO es nombre propio
        3. Verifica si existe en nuestro diccionario de abreviaciones - si existe, NO es nombre propio
        4. Aplica heurísticas de patrones fonéticos típicos de nombres

        La lógica es: si una palabra NO existe en ningún diccionario conocido,
        y tiene estructura fonética de nombre propio, probablemente lo es.
        """
        word_lower = word.lower()

        # Si tiene menos de 3 caracteres, no considerarla nombre propio
        if len(word_lower) < 3:
            return False

        # Si está en nuestra lista de palabras técnicas, NO es nombre propio
        if word_lower in self.NOT_PROPER_NAMES:
            return False

        # Si está en el diccionario de abreviaciones, NO es nombre propio
        all_terms = self.dictionary.get_all_terms()
        if word_lower in all_terms:
            return False

        # Si es una abreviación del diccionario, NO es nombre propio
        reverse_dict = self.dictionary.get_reverse_dictionary()
        if word_lower in reverse_dict:
            return False

        # Si es una palabra del idioma español (verificar con enchant), NO es nombre propio
        if self._enchant_available and self._enchant_dict:
            try:
                # Si enchant reconoce la palabra como válida en español, no es nombre propio
                if self._enchant_dict.check(word_lower):
                    return False
            except Exception:
                pass

        # HEURÍSTICAS FONÉTICAS para detectar nombres propios
        # Los nombres propios típicos en español tienen ciertas características:

        # 1. Longitud típica de nombres (4-12 caracteres)
        if not (4 <= len(word_lower) <= 12):
            return False

        # 2. Debe ser puramente alfabético
        if not word_lower.isalpha():
            return False

        # 3. Distribución de vocales: los nombres tienen vocales distribuidas
        vowels = [c for c in word_lower if c in 'aeiou']
        consonants = [c for c in word_lower if c not in 'aeiou']

        # Debe tener al menos 1 vocal
        if len(vowels) < 1:
            return False

        # Ratio vocales/consonantes típico de nombres (no muy extremo)
        if len(consonants) == 0:
            return False  # Solo vocales no es típico de nombre

        vowel_ratio = len(vowels) / len(word_lower)
        # Nombres típicos tienen entre 30% y 60% vocales
        if not (0.25 <= vowel_ratio <= 0.65):
            return False

        # 4. Patrones de terminación típicos de nombres propios en español
        name_endings = (
            # Masculinos
            'os', 'es', 'io', 'el', 'an', 'on', 'in', 'en', 'ar', 'er', 'ir', 'or', 'ur',
            'uel', 'iel', 'ael', 'ito', 'eto', 'alo', 'elo', 'ilo', 'ulo',
            'ardo', 'erto', 'isto', 'aldo', 'ando', 'endo', 'ingo', 'ongo',
            'ario', 'erio', 'orio', 'iano', 'iano', 'icio', 'acio',
            # Femeninos
            'ia', 'na', 'la', 'ra', 'sa', 'ta', 'da', 'za', 'ca', 'ga', 'ma', 'pa',
            'ela', 'ila', 'ola', 'ula', 'ana', 'ena', 'ina', 'ona', 'una',
            'esa', 'isa', 'osa', 'usa', 'ica', 'uca', 'eca',
            'ina', 'ena', 'ana', 'ona', 'ina', 'eta', 'ita', 'ota', 'uta',
            'ria', 'lia', 'nia', 'sia', 'cia', 'tia', 'dia', 'gia',
            # Apellidos típicos
            'ez', 'az', 'oz', 'iz', 'uz',  # Sufijos patronímicos (González, Pérez, etc.)
            'ero', 'era', 'ino', 'ina', 'ano', 'ana',
        )

        # 5. Verificar si termina con patrón típico de nombre
        has_name_ending = any(word_lower.endswith(ending) for ending in name_endings)

        # 6. Verificar que no empiece con patrones atípicos para nombres
        bad_starts = ('qu', 'wr', 'sch', 'thr', 'chr', 'spr', 'str', 'scr')
        if any(word_lower.startswith(s) for s in bad_starts):
            return False

        # 7. Verificar estructura silábica (nombres típicos tienen sílabas claras)
        # Patrón: consonante-vocal o vocal-consonante alternando
        # Evitar clusters de consonantes o vocales muy largos
        max_consecutive_consonants = 0
        current_consonants = 0
        for c in word_lower:
            if c not in 'aeiou':
                current_consonants += 1
                max_consecutive_consonants = max(max_consecutive_consonants, current_consonants)
            else:
                current_consonants = 0

        # Más de 3 consonantes seguidas es raro en nombres españoles
        if max_consecutive_consonants > 3:
            return False

        # Si tiene terminación típica de nombre Y pasó todos los filtros, es nombre
        if has_name_ending:
            return True

        # Si no tiene terminación típica pero tiene buena estructura,
        # ser más conservador - solo si tiene buena distribución de vocales
        if vowel_ratio >= 0.35 and len(word_lower) >= 5:
            return True

        return False

    def normalize_text(self, text: str) -> str:
        """
        Normaliza texto aplicando reglas IGAC básicas:
        - Regla 1: Minúsculas
        - Regla 2: Sin tildes/acentos
        """
        # Minúsculas
        text = text.lower()

        # Quitar tildes/acentos (NFD = Canonical Decomposition)
        text = ''.join(
            c for c in unicodedata.normalize('NFD', text)
            if unicodedata.category(c) != 'Mn'
        )

        return text

    def apply_format_rules(self, name: str) -> Tuple[str, List[str]]:
        """
        Aplica reglas de formato IGAC (1-7, 11).

        Returns:
            Tuple[str, List[str]]: (nombre_formateado, lista_de_cambios_aplicados)
        """
        changes = []
        original = name

        # Regla 1: Minúsculas
        if name != name.lower():
            name = name.lower()
            changes.append("Convertido a minúsculas")

        # Regla 2: Sin tildes/acentos
        normalized = self.normalize_text(name)
        if normalized != name:
            name = normalized
            changes.append("Removidas tildes y acentos")

        # Regla 4: Espacios → guiones bajos
        if ' ' in name:
            name = name.replace(' ', '_')
            changes.append("Espacios reemplazados por guiones bajos")

        # Regla 5: Sin paréntesis, guiones medios
        if '(' in name or ')' in name:
            name = re.sub(r'[()]', '_', name)
            changes.append("Paréntesis reemplazados por guiones bajos")

        if '-' in name:
            name = name.replace('-', '_')
            changes.append("Guiones medios reemplazados por guiones bajos")

        # Regla 6: Sin caracteres especiales
        special_chars = re.findall(r'[^a-z0-9_.]', name)
        if special_chars:
            name = re.sub(r'[^a-z0-9_.]', '_', name)
            changes.append(f"Caracteres especiales removidos: {set(special_chars)}")

        # Limpiar guiones bajos múltiples
        while '__' in name:
            name = name.replace('__', '_')

        # Quitar guiones al inicio/final
        name = name.strip('_')

        # Regla 7: Sin caracteres duplicados consecutivos
        # Solo para letras, no números
        # EXCEPCIÓN: Dígrafos válidos del español (rr, ll, cc, nn)
        new_name = []
        prev_char = None
        for char in name:
            if char.isalpha() and char == prev_char:
                # Verificar si forma un dígrafo español válido
                digraph = (prev_char + char).lower()
                if digraph not in self.SPANISH_DIGRAPHS:
                    continue  # Skip duplicado (no es dígrafo protegido)
            new_name.append(char)
            prev_char = char

        if ''.join(new_name) != name:
            name = ''.join(new_name)
            changes.append("Removidos caracteres duplicados consecutivos")

        # Regla 11: Sin prefijos prohibidos
        for prefix in self.FORBIDDEN_PREFIXES:
            if name.startswith(prefix):
                name = name[len(prefix):]
                changes.append(f"Removido prefijo prohibido: {prefix}")
                break

        return name, changes

    def detect_and_format_date(self, text: str) -> Tuple[Optional[str], str]:
        """
        Detecta fechas en el texto y las convierte a formato YYYYMMDD.
        Maneja múltiples formatos: "abr-12", "abril 12", "12 abril 2024", etc.

        Returns:
            Tuple[Optional[str], str]: (fecha_formateada, texto_sin_fecha)
        """
        import datetime
        current_year = datetime.datetime.now().year

        # Patrón 1: YYYYMMDD ya formateado (al inicio o después de _)
        # Usar (?:^|_) en lugar de \b porque _ es considerado parte de palabra
        match = re.search(r'(?:^|_)((19|20)\d{6})(?:_|$)', text)
        if match:
            date_str = match.group(1)  # Capturar solo la fecha, no el _ inicial
            text_without = text.replace(date_str, ' ').strip()
            # Limpiar guiones bajos múltiples y al inicio/final
            text_without = re.sub(r'_+', '_', text_without).strip('_')
            return date_str, text_without

        # Patrón 2: YYYY-MM-DD o YYYY/MM/DD
        match = re.search(r'\b(19|20)\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b', text)
        if match:
            date_str = match.group().replace('-', '').replace('/', '')
            text_without = text.replace(match.group(), ' ').strip()
            return date_str, text_without

        # Patrón 3: DD-MM-YYYY o DD/MM/YYYY
        match = re.search(r'\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](19|20)\d{2}\b', text)
        if match:
            parts = re.split(r'[-/]', match.group())
            date_str = f"{parts[2]}{parts[1]}{parts[0]}"
            text_without = text.replace(match.group(), ' ').strip()
            return date_str, text_without

        # Patrón 4: Mes en texto + día (ej: "abril 12", "abr-12", "12 abril")
        text_lower = text.lower()
        for month_text, month_num in self.MONTHS_ES.items():
            # "abril 12" o "abril-12" o "abril_12"
            pattern1 = rf'\b{month_text}[_\-\s]+(\d{{1,2}})\b'
            match = re.search(pattern1, text_lower)
            if match:
                day = match.group(1).zfill(2)
                date_str = f"{current_year}{month_num}{day}"
                text_without = re.sub(pattern1, ' ', text_lower).strip()
                return date_str, text_without

            # "12 abril" o "12-abril" o "12_abril"
            pattern2 = rf'\b(\d{{1,2}})[_\-\s]+{month_text}\b'
            match = re.search(pattern2, text_lower)
            if match:
                day = match.group(1).zfill(2)
                date_str = f"{current_year}{month_num}{day}"
                text_without = re.sub(pattern2, ' ', text_lower).strip()
                return date_str, text_without

            # "abril 12 2024" o similar
            pattern3 = rf'\b{month_text}[_\-\s]+(\d{{1,2}})[_\-\s]+(\d{{4}})\b'
            match = re.search(pattern3, text_lower)
            if match:
                day = match.group(1).zfill(2)
                year = match.group(2)
                date_str = f"{year}{month_num}{day}"
                text_without = re.sub(pattern3, ' ', text_lower).strip()
                return date_str, text_without

        # Patrón 5: Solo año (YYYY)
        match = re.search(r'\b(19|20)\d{2}\b', text)
        if match:
            year = match.group()
            # No remover el año del texto, solo detectarlo
            return year, text

        return None, text

    def classify_word(self, word: str) -> Dict:
        """
        Clasifica una palabra según su tipo.

        Returns:
            Dict con: type, value, meaning (si aplica), source
        """
        word = word.lower().strip()

        if not word:
            return {'type': 'empty', 'value': '', 'source': 'skip'}

        # 1. ¿Es número puro?
        if word.isdigit():
            return {
                'type': 'number',
                'value': word,
                'source': 'preserved'
            }

        # 2. ¿Es código catastral? (5, 7, 20+ dígitos)
        if word.isdigit() and len(word) >= 5:
            return {
                'type': 'cadastral_code',
                'value': word,
                'source': 'preserved'
            }

        # 3. ¿Es fecha?
        if self._is_date_format(word):
            return {
                'type': 'date',
                'value': word,
                'source': 'preserved'
            }

        # 4. ¿Es conector a eliminar?
        if word in self.CONNECTORS:
            return {
                'type': 'connector',
                'value': word,
                'source': 'removed'
            }

        # 5. ¿Es palabra genérica a evitar?
        if word in self.GENERIC_WORDS:
            return {
                'type': 'generic',
                'value': word,
                'source': 'warning'  # Advertir pero no bloquear
            }

        # 6. ¿Está en el diccionario?
        all_terms = self.dictionary.get_all_terms()
        if word in all_terms:
            return {
                'type': 'dictionary',
                'value': word,
                'meaning': all_terms[word],
                'source': 'dictionary'
            }

        # 7. ¿Es palabra inglés estándar?
        if word in self.STANDARD_ENGLISH:
            return {
                'type': 'standard_english',
                'value': word,
                'source': 'preserved'
            }

        # 8. ¿Parece nombre propio? (mayúscula inicial en original, o más de 3 letras)
        # Los nombres propios se mantienen completos
        if word.isalpha() and len(word) >= 3:
            # Intentar buscar abreviación similar en diccionario
            suggestions = self.dictionary.get_suggestions(word, limit=1)
            if suggestions:
                # Hay una sugerencia similar
                return {
                    'type': 'unknown_with_suggestion',
                    'value': word,
                    'suggestion': suggestions[0],
                    'source': 'ai_candidate'
                }

            # Sin sugerencia - probablemente nombre propio
            return {
                'type': 'proper_name',
                'value': word,
                'source': 'preserved'
            }

        # 9. Palabra desconocida corta
        return {
            'type': 'unknown',
            'value': word,
            'source': 'ai_candidate'
        }

    def _deterministic_abbreviation(self, word: str, max_length: int = 5) -> str:
        """
        Genera una abreviación determinística (siempre igual) para una palabra.

        REGLAS:
        1. Palabras cortas (≤4 chars): mantener completas
        2. Palabras que inician con vocal: V + consonantes principales
        3. Palabras que inician con consonante: C + V + consonantes

        OBJETIVO: Mantener consonantes principales + primera vocal

        Args:
            word: Palabra a abreviar (ya normalizada, sin tildes)
            max_length: Longitud máxima de la abreviación

        Returns:
            Abreviación determinística
        """
        word = word.lower().strip()

        # Palabras muy cortas: mantener
        if len(word) <= 4:
            return word

        # Definir vocales y consonantes
        vowels = set('aeiou')
        consonants = set('bcdfghjklmnpqrstvwxyz')

        # Construir abreviación: consonantes + primera vocal de cada sílaba
        result = []
        found_first_vowel = False

        for i, char in enumerate(word):
            if char in consonants:
                result.append(char)
            elif char in vowels:
                if not found_first_vowel:
                    # Siempre incluir la primera vocal
                    result.append(char)
                    found_first_vowel = True
                elif len(result) < max_length - 1 and i > 0 and word[i-1] in consonants:
                    # Incluir vocal después de consonante si hay espacio
                    result.append(char)

            # Limitar longitud
            if len(result) >= max_length:
                break

        abbrev = ''.join(result)

        # Si quedó muy corto, usar primeras letras
        if len(abbrev) < 3:
            abbrev = word[:max_length]

        return abbrev[:max_length]

    def _is_date_format(self, text: str) -> bool:
        """Detecta si el texto es una fecha en formato válido"""
        # Años: 2023, 2024, etc.
        if text.isdigit() and len(text) == 4:
            year = int(text)
            if 1900 <= year <= 2100:
                return True

        # YYYYMM
        if text.isdigit() and len(text) == 6:
            year = int(text[:4])
            month = int(text[4:])
            if 1900 <= year <= 2100 and 1 <= month <= 12:
                return True

        # YYYYMMDD
        if text.isdigit() and len(text) == 8:
            year = int(text[:4])
            month = int(text[4:6])
            day = int(text[6:])
            if 1900 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31:
                return True

        return False

    def validate_name(self, name: str, user=None, current_path: str = '') -> Dict:
        """
        Validación completa de un nombre según reglas IGAC.

        Args:
            name: Nombre a validar
            user: Usuario (para verificar exenciones)
            current_path: Ruta actual (para calcular longitud total)

        Returns:
            Dict con: valid, errors, warnings, formatted_name, parts_analysis
        """
        errors = []
        warnings = []

        # Verificar exenciones del usuario
        user_exemptions = {}
        if user:
            user_exemptions = user.get_naming_exemptions()

        # Separar extensión (preservando extensiones compuestas como .tar.gz, .gdb.zip)
        name_without_ext, extension = self._extract_extension(name)

        # Aplicar reglas de formato
        formatted_name, format_changes = self.apply_format_rules(name_without_ext)

        # Detectar y formatear fechas
        detected_date, text_without_date = self.detect_and_format_date(formatted_name)

        # Regla 10: Máximo 30 caracteres
        if not user_exemptions.get('exempt_from_name_length', False):
            if len(formatted_name) > self.MAX_NAME_LENGTH:
                errors.append(
                    f"El nombre excede el límite de {self.MAX_NAME_LENGTH} caracteres "
                    f"(actual: {len(formatted_name)})"
                )

        # Analizar cada parte del nombre
        parts = formatted_name.split('_')
        parts_analysis = []
        unknown_parts = []

        for part in parts:
            classification = self.classify_word(part)
            parts_analysis.append(classification)

            if classification['source'] == 'ai_candidate':
                unknown_parts.append(part)

            if classification['source'] == 'warning':
                warnings.append(f"Palabra genérica detectada: '{part}'")

            if classification['source'] == 'removed':
                warnings.append(f"Conector removido: '{part}'")

        # Verificar validación de diccionario
        if not user_exemptions.get('exempt_from_naming_rules', False):
            if unknown_parts:
                # No es error, pero advertir que IA puede ayudar
                warnings.append(
                    f"Palabras no encontradas en diccionario: {', '.join(unknown_parts)}. "
                    "Se recomienda usar sugerencias de IA."
                )

        # Validar longitud de ruta completa
        if current_path and not user_exemptions.get('exempt_from_path_limit', False):
            full_path_length = len(current_path) + len(formatted_name) + len(extension) + 1
            if full_path_length > self.MAX_PATH_LENGTH:
                errors.append(
                    f"La ruta completa excede el límite de {self.MAX_PATH_LENGTH} caracteres "
                    f"(actual: {full_path_length})"
                )

        # Construir nombre formateado con fecha al inicio (Regla 8)
        final_name = formatted_name
        if detected_date and not formatted_name.startswith(detected_date):
            # Mover fecha al inicio
            text_clean = text_without_date.replace(detected_date, '').strip('_')
            if text_clean:
                final_name = f"{detected_date}_{text_clean}"
            else:
                final_name = detected_date
            warnings.append(f"Fecha movida al inicio del nombre: {detected_date}")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'original_name': name,
            'formatted_name': final_name + extension,
            'formatted_base': final_name,
            'extension': extension,
            'format_changes': format_changes,
            'parts_analysis': parts_analysis,
            'unknown_parts': unknown_parts,
            'needs_ai': len(unknown_parts) > 0 and not user_exemptions.get('exempt_from_naming_rules', False),
            'detected_date': detected_date,
            'user_exemptions': user_exemptions
        }

    def suggest_name(self, original_name: str, current_path: str = '', user=None) -> Dict:
        """
        Genera sugerencia de nombre aplicando reglas del Sistema de Archivo + diccionario + IA.

        PROCESO:
        1. Aplica reglas de formato (minúsculas, sin tildes, etc.)
        2. Separa en partes por guiones bajos
        3. Para cada parte:
           - Si es número/fecha/código catastral: preservar
           - Si es conector: eliminar
           - Si ya es abreviación del diccionario (clave): usar tal cual
           - Si es palabra completa con abreviación en diccionario: usar la ABREVIACIÓN
           - Si no está: marcar para IA o usar fallback
        4. Si hay partes no resueltas: llamar IA para abreviar
        5. Construir nombre final respetando límite de 30 caracteres
        """
        errors = []
        warnings = []
        parts_analysis = []

        # Verificar exenciones del usuario
        user_exemptions = {}
        if user:
            user_exemptions = user.get_naming_exemptions()

        # Separar extensión (preservando extensiones compuestas como .tar.gz, .gdb.zip)
        name_without_ext, extension = self._extract_extension(original_name)

        # Aplicar reglas de formato básicas
        formatted_name, format_changes = self.apply_format_rules(name_without_ext)

        # Detectar fecha para moverla al inicio
        detected_date, text_without_date = self.detect_and_format_date(formatted_name)

        # Separar en partes
        parts = formatted_name.split('_')
        abbreviated_parts = []
        parts_needing_ai = []

        # Obtener diccionario y diccionario invertido
        all_terms = self.dictionary.get_all_terms()  # abrev -> significado
        reverse_dict = self.dictionary.get_reverse_dictionary()  # significado -> abrev

        for part in parts:
            part = part.strip()
            if not part:
                continue

            # 1. ¿Es número puro?
            if part.isdigit():
                abbreviated_parts.append(part)
                parts_analysis.append({
                    'type': 'number',
                    'value': part,
                    'source': 'preserved'
                })
                continue

            # 2. ¿Es código catastral? (5+ dígitos)
            if part.isdigit() and len(part) >= 5:
                abbreviated_parts.append(part)
                parts_analysis.append({
                    'type': 'cadastral_code',
                    'value': part,
                    'source': 'preserved'
                })
                continue

            # 3. ¿Es fecha?
            if self._is_date_format(part):
                abbreviated_parts.append(part)
                parts_analysis.append({
                    'type': 'date',
                    'value': part,
                    'source': 'preserved'
                })
                continue

            # 4. ¿Es conector a eliminar?
            if part in self.CONNECTORS:
                warnings.append(f"Conector removido: '{part}'")
                parts_analysis.append({
                    'type': 'connector',
                    'value': part,
                    'source': 'removed'
                })
                continue  # No agregar a partes finales

            # 5. ¿Ya es una abreviación del diccionario (clave)?
            if part in all_terms:
                abbreviated_parts.append(part)
                parts_analysis.append({
                    'type': 'dictionary',
                    'value': part,
                    'meaning': all_terms[part],
                    'source': 'dictionary'
                })
                continue

            # 6. ¿Es palabra completa que tiene abreviación en el diccionario?
            abbreviation = self.dictionary.find_abbreviation(part)
            if abbreviation:
                abbreviated_parts.append(abbreviation)
                parts_analysis.append({
                    'type': 'dictionary',
                    'value': abbreviation,
                    'original': part,
                    'meaning': all_terms.get(abbreviation, part),
                    'source': 'abbreviated'
                })
                warnings.append(f"'{part}' -> '{abbreviation}'")
                continue

            # 7. ¿Es palabra inglés estándar?
            if part in self.STANDARD_ENGLISH:
                abbreviated_parts.append(part)
                parts_analysis.append({
                    'type': 'standard_english',
                    'value': part,
                    'source': 'preserved'
                })
                continue

            # 7.5 ¿Es probablemente un nombre propio? (detectar ANTES de enviar a IA)
            # Los nombres propios NO deben abreviarse - mantenerlos completos
            if self._is_likely_proper_name(part):
                abbreviated_parts.append(part)
                parts_analysis.append({
                    'type': 'proper_name',
                    'value': part,
                    'source': 'preserved_proper_name'
                })
                continue

            # 8. Palabra no encontrada - marcar para IA
            parts_needing_ai.append({
                'word': part,
                'index': len(abbreviated_parts)  # Posición donde insertar
            })
            parts_analysis.append({
                'type': 'unknown',
                'value': part,
                'source': 'needs_abbreviation'
            })

        # Si hay partes que necesitan abreviación
        if parts_needing_ai:
            if user_exemptions.get('exempt_from_naming_rules', False):
                # Usuario exento - mantener palabras originales
                for item in parts_needing_ai:
                    abbreviated_parts.insert(item['index'], item['word'])
                    for analysis in parts_analysis:
                        if analysis.get('value') == item['word'] and analysis['source'] == 'needs_abbreviation':
                            analysis['source'] = 'exempt_preserved'
                            break
            else:
                # =====================================================
                # FLUJO DE ABREVIACIÓN: CACHE → IA → DETERMINÍSTICO
                # =====================================================
                # PRIORIDAD:
                # 1. Cache de abreviaciones (consistencia entre usuarios)
                # 2. IA para generar abreviación inteligente
                # 3. Reglas determinísticas como fallback
                # =====================================================
                from dictionary.models import AIGeneratedAbbreviation

                # Paso 1: Separar palabras en cache vs palabras que necesitan IA
                words_from_cache = []
                words_needing_generation = []

                for item in parts_needing_ai:
                    word = item['word']
                    cached = AIGeneratedAbbreviation.get_or_none(word)
                    if cached:
                        words_from_cache.append({
                            **item,
                            'abbrev': cached.abbreviation,
                            'source_label': 'cache',
                            'source_type': 'cached'
                        })
                        cached.increment_usage()
                    else:
                        words_needing_generation.append(item)

                # Paso 2: Llamar a IA para palabras sin cache (en batch)
                ai_results = {}
                if words_needing_generation:
                    try:
                        from services.ai_naming_service import AINamingService
                        ai_service = AINamingService()
                        words_to_abbreviate = [item['word'] for item in words_needing_generation]

                        # Llamar IA para abreviar todas las palabras de una vez
                        abbreviations = ai_service.abbreviate_words(words_to_abbreviate)

                        # Mapear resultados
                        for word, abbrev in zip(words_to_abbreviate, abbreviations):
                            ai_results[word] = abbrev
                            # Guardar en cache para futuras consultas
                            AIGeneratedAbbreviation.cache_abbreviation(word, abbrev)

                        used_ai = True
                    except Exception as e:
                        print(f"[SmartNaming] Error llamando IA, usando fallback determinístico: {e}")
                        # Fallback: usar reglas determinísticas
                        for item in words_needing_generation:
                            word = item['word']
                            abbrev = self._deterministic_abbreviation(word)
                            ai_results[word] = abbrev
                            AIGeneratedAbbreviation.cache_abbreviation(word, abbrev)

                # Paso 3: Insertar todas las abreviaciones en orden
                all_items = []
                for item in words_from_cache:
                    all_items.append(item)
                for item in words_needing_generation:
                    word = item['word']
                    abbrev = ai_results.get(word, self._deterministic_abbreviation(word))
                    all_items.append({
                        **item,
                        'abbrev': abbrev,
                        'source_label': 'IA' if word in ai_results else 'reglas',
                        'source_type': 'ai_generated' if word in ai_results else 'deterministic'
                    })

                # Ordenar por índice original
                all_items.sort(key=lambda x: x['index'])

                for i, item in enumerate(all_items):
                    word = item['word']
                    abbrev = item['abbrev']
                    source_label = item['source_label']
                    source_type = item['source_type']

                    # Insertar la abreviación
                    abbreviated_parts.insert(item['index'] + i, abbrev)
                    warnings.append(f"'{word}' -> '{abbrev}'")

                    # Actualizar análisis de partes
                    for analysis in parts_analysis:
                        if analysis.get('value') == word and analysis['source'] == 'needs_abbreviation':
                            analysis['abbreviated_to'] = abbrev
                            analysis['source'] = source_type
                            break

        # Construir nombre final
        final_parts = abbreviated_parts

        # Obtener extensión sin punto para verificar si requiere fecha
        ext_without_dot = extension.lstrip('.').lower() if extension else ''

        # Mover fecha al inicio (Regla 8) o AGREGAR fecha actual si no existe y extensión la requiere
        if detected_date:
            # Si hay fecha detectada, moverla al inicio
            final_parts = [p for p in final_parts if p != detected_date]
            final_parts.insert(0, detected_date)
        elif ext_without_dot in self.EXTENSIONS_REQUIRING_DATE:
            # Si NO hay fecha detectada pero la extensión REQUIERE fecha, agregar fecha actual
            current_date = datetime.now().strftime('%Y%m%d')
            final_parts.insert(0, current_date)
            detected_date = current_date  # Actualizar para el retorno
            warnings.append(f"Fecha agregada automáticamente: {current_date}")

        # Unir partes
        suggested_base = '_'.join(final_parts)

        # Verificar límite de caracteres - SIEMPRE truncar si excede
        # (a menos que el usuario tenga exención)
        if len(suggested_base) > self.MAX_NAME_LENGTH:
            if user_exemptions.get('exempt_from_name_length', False):
                # Usuario exento - solo advertir pero no truncar
                warnings.append(f"Nombre excede {self.MAX_NAME_LENGTH} caracteres (permitido por exención)")
            else:
                original_length = len(suggested_base)

                # Truncamiento inteligente: eliminar partes desde el final hasta cumplir límite
                # Mantener las primeras partes que son más importantes (fecha, código, etc.)
                truncated_parts = list(final_parts)

                while len('_'.join(truncated_parts)) > self.MAX_NAME_LENGTH and len(truncated_parts) > 1:
                    # Eliminar la última parte (menos importante)
                    removed = truncated_parts.pop()

                suggested_base = '_'.join(truncated_parts)

                # Si aún excede, truncar directamente
                if len(suggested_base) > self.MAX_NAME_LENGTH:
                    suggested_base = suggested_base[:self.MAX_NAME_LENGTH].rstrip('_')

                # Solo warning, NO error - el archivo SIEMPRE debe poder subirse
                warnings.append(f"Nombre truncado de {original_length} a {len(suggested_base)} caracteres")

        suggested_name = suggested_base + extension

        # Determinar si se usaron reglas determinísticas
        used_deterministic = any(
            p.get('source') == 'deterministic' for p in parts_analysis
        )
        used_cache = any(
            p.get('source') == 'cached' for p in parts_analysis
        )

        return {
            'success': True,
            'original_name': original_name,
            'suggested_name': suggested_name,
            'suggested_base': suggested_base,
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'format_changes': format_changes,
            'used_ai': False,  # Ya no usamos IA por defecto
            'used_deterministic': used_deterministic,
            'used_cache': used_cache,
            'parts_analysis': parts_analysis,
            'detected_date': detected_date,
            'user_exemptions': user_exemptions
        }

    def suggest_batch(self, files: List[Dict], current_path: str = '', user=None) -> List[Dict]:
        """
        Genera sugerencias para múltiples archivos.

        IMPORTANTE: Usa suggest_name() internamente para cada archivo,
        lo que garantiza que se use el cache de abreviaciones y las
        reglas determinísticas de forma consistente.
        """
        results = []

        for idx, file_info in enumerate(files):
            original_name = file_info.get('original_name', file_info.get('name', ''))
            extension = file_info.get('extension', '')

            # IMPORTANTE: Concatenar extensión si viene por separado y no está en el nombre
            full_name = original_name
            if extension and not original_name.lower().endswith(extension.lower()):
                full_name = original_name + extension

            try:
                # Usar suggest_name que tiene el cache implementado
                suggestion = self.suggest_name(full_name, current_path, user)

                results.append({
                    'index': idx,
                    'original_name': original_name,
                    'suggested_name': suggestion.get('suggested_name', original_name),
                    'suggested_base': suggestion.get('suggested_base', ''),
                    'valid': suggestion.get('valid', False),
                    'errors': suggestion.get('errors', []),
                    'warnings': suggestion.get('warnings', []),
                    'used_ai': suggestion.get('used_ai', False),
                    'used_deterministic': suggestion.get('used_deterministic', False),
                    'used_cache': suggestion.get('used_cache', False),
                    'parts_analysis': suggestion.get('parts_analysis', [])
                })
            except Exception as e:
                # Fallback si hay error
                results.append({
                    'index': idx,
                    'original_name': original_name,
                    'suggested_name': original_name.lower(),
                    'suggested_base': original_name.lower(),
                    'valid': False,
                    'errors': [f'Error procesando: {str(e)}'],
                    'warnings': [],
                    'used_ai': False
                })

        return results

    def get_dictionary_stats(self) -> Dict:
        """Retorna estadísticas del diccionario"""
        return self.dictionary.get_stats()

    def search_dictionary(self, query: str, limit: int = 20) -> List[Dict]:
        """Busca en el diccionario"""
        return self.dictionary.get_suggestions(query, limit)
