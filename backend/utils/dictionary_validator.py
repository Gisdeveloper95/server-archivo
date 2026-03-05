"""
Validador de nombres contra diccionario de abreviaciones
"""
from typing import Dict, List, Optional, Set
from difflib import get_close_matches
from django.core.cache import cache


# Palabras comunes que NO son nombres propios (evitar falsos positivos)
NOT_PROPER_NAMES: Set[str] = {
    # Palabras técnicas/documentos
    'archivo', 'documento', 'informe', 'reporte', 'analisis', 'resultado',
    'proyecto', 'proceso', 'sistema', 'servicio', 'registro', 'formato',
    'version', 'estado', 'periodo', 'balance', 'resumen', 'detalle',
    'tecnico', 'tecnica', 'publico', 'publica', 'economico', 'economica',
    'administrativo', 'administrativa', 'operativo', 'operativa',
    'geografico', 'geografica', 'ambiental', 'social', 'cultural',
    # Palabras geográficas/cartografía
    'municipio', 'vereda', 'corregimiento', 'barrio', 'sector', 'zona',
    'region', 'territorio', 'limite', 'predio', 'parcela', 'terreno',
    'catastro', 'geodesia', 'topografia', 'cartografia', 'ortofoto',
    # Palabras administrativas
    'resolucion', 'decreto', 'acuerdo', 'circular', 'oficio', 'memorando',
    'certificado', 'constancia', 'acta', 'contrato', 'convenio',
    # Otras comunes
    'general', 'especial', 'nacional', 'regional', 'local', 'central',
    'interno', 'interna', 'externo', 'externa', 'inicial', 'final',
}


class DictionaryValidator:
    """
    Valida nombres de archivos/directorios contra diccionario oficial en PostgreSQL
    """

    def __init__(self):
        # Cache de 5 minutos para el diccionario
        self.cache_timeout = 300
        self.cache_key = 'dictionary_terms_active'

    def _load_dictionary(self) -> Dict[str, str]:
        """Carga diccionario desde PostgreSQL con cache"""
        # Intentar obtener del cache (con fallback si Redis no está disponible)
        try:
            cached_dict = cache.get(self.cache_key)
            if cached_dict is not None:
                return cached_dict
        except Exception:
            # Redis no disponible - continuar sin cache
            pass

        # Importar el modelo aquí para evitar importaciones circulares
        from dictionary.models import DictionaryEntry

        # Cargar términos activos de la base de datos
        entries = DictionaryEntry.objects.filter(is_active=True).values('key', 'value')

        # Convertir a diccionario
        dictionary = {entry['key']: entry['value'] for entry in entries}

        # Intentar guardar en cache (ignorar si falla)
        try:
            cache.set(self.cache_key, dictionary, self.cache_timeout)
        except Exception:
            # Redis no disponible - ignorar
            pass

        return dictionary

    def invalidate_cache(self):
        """Invalida el cache del diccionario (llamar cuando se modifique)"""
        try:
            cache.delete(self.cache_key)
        except Exception:
            # Redis no disponible - ignorar
            pass

    def _is_likely_proper_name(self, word: str, dictionary: Dict[str, str]) -> bool:
        """
        Detecta si una palabra es probablemente un nombre propio.

        Usa heurísticas en lugar de lista estática (imposible mantener todos los nombres):
        1. No está en lista de palabras técnicas comunes
        2. No está en el diccionario de abreviaciones
        3. Tiene estructura fonética típica de nombres propios
        """
        word_lower = word.lower()

        # Si tiene menos de 3 caracteres, no es nombre propio
        if len(word_lower) < 3:
            return False

        # Si está en nuestra lista de palabras técnicas, NO es nombre propio
        if word_lower in NOT_PROPER_NAMES:
            return False

        # Si está en el diccionario de abreviaciones, NO es nombre propio
        if word_lower in dictionary:
            return False

        # HEURÍSTICAS FONÉTICAS para nombres propios
        # 1. Longitud típica de nombres (4-12 caracteres)
        if not (4 <= len(word_lower) <= 12):
            return False

        # 2. Debe ser puramente alfabético
        if not word_lower.isalpha():
            return False

        # 3. Distribución de vocales típica de nombres
        vowels = [c for c in word_lower if c in 'aeiou']
        consonants = [c for c in word_lower if c not in 'aeiou']

        if len(vowels) < 1 or len(consonants) == 0:
            return False

        vowel_ratio = len(vowels) / len(word_lower)
        # Nombres típicos tienen entre 25% y 65% vocales
        if not (0.25 <= vowel_ratio <= 0.65):
            return False

        # 4. Patrones de terminación típicos de nombres en español
        name_endings = (
            'os', 'es', 'io', 'el', 'an', 'on', 'in', 'en', 'ar', 'er', 'ir', 'or',
            'ia', 'na', 'la', 'ra', 'sa', 'ta', 'da', 'za', 'ca', 'ga', 'ma', 'pa',
            'ez', 'az', 'oz', 'iz', 'uz',  # Patronímicos (González, Pérez)
            'ero', 'era', 'ino', 'ina', 'ano', 'ana',
            'ito', 'ita',  # Diminutivos (Pepito, Juanita)
        )

        has_name_ending = any(word_lower.endswith(ending) for ending in name_endings)

        # 5. Verificar estructura silábica
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

        # Si tiene terminación típica de nombre Y pasó todos los filtros
        if has_name_ending:
            return True

        # Si no tiene terminación típica pero tiene buena estructura
        if vowel_ratio >= 0.35 and len(word_lower) >= 5:
            return True

        return False

    def validate_name(self, name: str, allow_numbers: bool = True) -> dict:
        """
        Valida nombre contra diccionario.

        Args:
            name: Nombre a validar (sin extensión)
            allow_numbers: Si permite números puros como partes válidas

        Returns:
            {
                'valid': bool,
                'errors': list,
                'suggestions': list,
                'parts': list  # Partes validadas
            }
        """
        errors = []
        suggestions = []
        validated_parts = []

        # Remover extensión si existe
        original_name = name
        if '.' in name:
            name = name.rsplit('.', 1)[0]

        # ===== VALIDACIONES DE FORMATO BÁSICO =====
        # 1. NO MAYÚSCULAS
        if name != name.lower():
            errors.append("No se permiten mayúsculas. Use solo minúsculas.")

        # 2. NO ESPACIOS
        if ' ' in name:
            errors.append("No se permiten espacios. Use guiones bajos (_).")

        # 3. NO GUIONES MEDIOS
        if '-' in name:
            errors.append("No se permiten guiones medios (-). Use guiones bajos (_).")

        # 4. CARACTERES INVÁLIDOS (solo letras, números, guiones bajos y puntos)
        import re
        if not re.match(r'^[a-z0-9_.]+$', name):
            errors.append("Solo se permiten letras minúsculas, números, guiones bajos (_) y puntos (.)")

        # Si hay errores de formato básico, retornar inmediatamente
        # NO validar contra diccionario si el formato es inválido
        if errors:
            return {
                'valid': False,
                'errors': errors,
                'suggestions': [],
                'parts': []
            }

        # ===== VALIDACIÓN CONTRA DICCIONARIO =====
        # Cargar diccionario desde BD/cache
        dictionary = self._load_dictionary()

        # Dividir por guiones bajos
        parts = name.lower().split('_')

        for part in parts:
            # Saltar partes vacías
            if not part:
                continue

            # Permitir números puros
            if allow_numbers and part.isdigit():
                validated_parts.append({
                    'part': part,
                    'valid': True,
                    'type': 'number'
                })
                continue

            # Permitir formatos de fecha
            if self._is_date_format(part):
                validated_parts.append({
                    'part': part,
                    'valid': True,
                    'type': 'date'
                })
                continue

            # Permitir nombres propios detectados por heurística
            # Los nombres propios (pepito, gonzalez, maria, etc.) NO deben abreviarse
            if self._is_likely_proper_name(part, dictionary):
                validated_parts.append({
                    'part': part,
                    'valid': True,
                    'type': 'proper_name'
                })
                continue

            # Buscar en diccionario
            if part in dictionary:
                validated_parts.append({
                    'part': part,
                    'valid': True,
                    'type': 'dictionary',
                    'meaning': dictionary[part]
                })
            else:
                errors.append(f"'{part}' no está en el diccionario")
                validated_parts.append({
                    'part': part,
                    'valid': False,
                    'type': 'unknown'
                })

                # Buscar sugerencias similares
                similar = self._find_similar(part, dictionary, limit=3)
                if similar:
                    suggestions.extend(similar)

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'suggestions': list(set(suggestions)),  # Eliminar duplicados
            'parts': validated_parts
        }

    def _is_date_format(self, text: str) -> bool:
        """Detecta si el texto es un formato de fecha válido"""
        # Años: 2023, 2024, etc.
        if text.isdigit() and 1900 <= int(text) <= 2100:
            return True

        # Formato YYYYMM: 202312
        if text.isdigit() and len(text) == 6:
            year = int(text[:4])
            month = int(text[4:])
            if 1900 <= year <= 2100 and 1 <= month <= 12:
                return True

        # Formato YYYYMMDD: 20231205
        if text.isdigit() and len(text) == 8:
            year = int(text[:4])
            month = int(text[4:6])
            day = int(text[6:])
            if 1900 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31:
                return True

        # Formatos de hora: SOLO si es formato explícito como "24h", "24h30m", "10s"
        # NO marcar como fecha si es una palabra que contiene h/m/s
        # Debe ser: dígitos + h/m/s (ejemplo: 24h, 30m, 45s)
        import re
        if re.match(r'^\d+[hms](\d+[hms])?(\d+[hms])?$', text):
            return True

        # Meses en texto
        meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
                 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
        if text in meses:
            return True

        return False

    def _find_similar(self, word: str, dictionary: Dict[str, str], limit: int = 5) -> List[str]:
        """Encuentra palabras similares en el diccionario"""
        close_matches = get_close_matches(
            word,
            dictionary.keys(),
            n=limit,
            cutoff=0.6
        )
        return [
            f"{match} ({dictionary[match]})"
            for match in close_matches
        ]

    def get_suggestions(self, query: str, limit: int = 10) -> List[dict]:
        """
        Autocompletado para UI

        Args:
            query: Texto a buscar
            limit: Máximo de resultados

        Returns:
            Lista de {'key': str, 'value': str}
        """
        # Importar el modelo aquí para evitar importaciones circulares
        from dictionary.models import DictionaryEntry

        query = query.lower()
        matches = []

        # Buscar en base de datos (búsqueda eficiente con filtros)
        from django.db.models import Q

        entries = DictionaryEntry.objects.filter(
            Q(is_active=True),
            Q(key__icontains=query) | Q(value__icontains=query)
        ).values('key', 'value')[:limit]

        for entry in entries:
            matches.append({
                'key': entry['key'],
                'value': entry['value']
            })

        return matches

    def get_all_terms(self) -> Dict[str, str]:
        """Retorna todos los términos del diccionario desde BD"""
        return self._load_dictionary()

    def get_reverse_dictionary(self) -> Dict[str, str]:
        """
        Retorna diccionario invertido: valor (significado) -> clave (abreviación)
        Útil para buscar qué abreviación usar para una palabra completa.
        Normaliza los valores a minúsculas sin tildes.
        """
        import unicodedata
        dictionary = self._load_dictionary()
        reverse = {}

        for abbrev, meaning in dictionary.items():
            # Normalizar: minúsculas y sin tildes
            normalized = meaning.lower()
            normalized = ''.join(
                c for c in unicodedata.normalize('NFD', normalized)
                if unicodedata.category(c) != 'Mn'
            )
            reverse[normalized] = abbrev

        return reverse

    def find_abbreviation(self, word: str) -> Optional[str]:
        """
        Busca si existe una abreviación para una palabra completa.

        PRIORIDAD DE BÚSQUEDA:
        1. Coincidencia EXACTA del valor completo (ej: "autorización" -> "autoriz")
        2. Coincidencia con palabras individuales SOLO si el valor es UNA palabra
        3. NO hacer búsqueda parcial en frases compuestas para evitar falsos positivos

        Args:
            word: Palabra completa a buscar (ej: "autorizacion")

        Returns:
            Abreviación si existe (ej: "autoriz"), None si no existe
        """
        import unicodedata

        # Normalizar la palabra de entrada
        normalized = word.lower()
        normalized = ''.join(
            c for c in unicodedata.normalize('NFD', normalized)
            if unicodedata.category(c) != 'Mn'
        )

        # Cargar diccionario directamente (no invertido)
        dictionary = self._load_dictionary()

        # PASO 1: Buscar coincidencia EXACTA del valor
        for abbrev, meaning in dictionary.items():
            # Normalizar el significado
            meaning_normalized = meaning.lower()
            meaning_normalized = ''.join(
                c for c in unicodedata.normalize('NFD', meaning_normalized)
                if unicodedata.category(c) != 'Mn'
            )

            # Coincidencia exacta del valor completo
            if normalized == meaning_normalized:
                return abbrev

        # PASO 2: Buscar si el valor es UNA sola palabra igual a la buscada
        # (evita que "prestación" coincida con "orden de prestación de servicios")
        for abbrev, meaning in dictionary.items():
            meaning_normalized = meaning.lower()
            meaning_normalized = ''.join(
                c for c in unicodedata.normalize('NFD', meaning_normalized)
                if unicodedata.category(c) != 'Mn'
            )

            # Solo si el valor del diccionario es UNA palabra
            words = meaning_normalized.split()
            if len(words) == 1 and normalized == words[0]:
                return abbrev

        # PASO 3: Buscar variaciones comunes (singular/plural)
        # Ej: "servicios" -> buscar "servicio"
        singular_forms = [normalized]
        if normalized.endswith('es'):
            singular_forms.append(normalized[:-2])  # "servicios" -> "servici"
            singular_forms.append(normalized[:-1])  # "servicios" -> "servicio"
        if normalized.endswith('s'):
            singular_forms.append(normalized[:-1])  # "prestadores" -> "prestadore"
        if normalized.endswith('iones'):
            singular_forms.append(normalized[:-5] + 'ion')  # "manifestaciones" -> "manifestacion"
        if normalized.endswith('cion'):
            singular_forms.append(normalized[:-4])  # "autorizacion" -> "autoriza"

        for singular in singular_forms:
            for abbrev, meaning in dictionary.items():
                meaning_normalized = meaning.lower()
                meaning_normalized = ''.join(
                    c for c in unicodedata.normalize('NFD', meaning_normalized)
                    if unicodedata.category(c) != 'Mn'
                )

                # Solo coincidencias exactas con singulares
                if singular == meaning_normalized:
                    return abbrev

        return None

    def get_stats(self) -> dict:
        """Retorna estadísticas del diccionario desde BD"""
        from dictionary.models import DictionaryEntry

        total_active = DictionaryEntry.objects.filter(is_active=True).count()
        total_inactive = DictionaryEntry.objects.filter(is_active=False).count()

        # Obtener muestra de 10 términos
        sample_entries = DictionaryEntry.objects.filter(is_active=True).values('key', 'value')[:10]
        sample = [(entry['key'], entry['value']) for entry in sample_entries]

        return {
            'total_terms': total_active,
            'total_active': total_active,
            'total_inactive': total_inactive,
            'sample': sample
        }

    def validate_batch(self, names: List[str], allow_numbers: bool = True) -> List[dict]:
        """
        Valida múltiples nombres EN LOTE de forma optimizada.
        Carga el diccionario UNA SOLA VEZ y valida todos en memoria.

        Args:
            names: Lista de nombres a validar (sin extensión)
            allow_numbers: Si permite números puros como partes válidas

        Returns:
            Lista de resultados de validación para cada nombre
        """
        import time
        start = time.time()

        # Edge case: lista vacía
        if not names or len(names) == 0:
            return []

        # Cargar diccionario UNA SOLA VEZ
        dictionary = self._load_dictionary()

        results = []

        for name in names:
            errors = []
            validated_parts = []

            # Remover extensión si existe
            original_name = name
            if '.' in name:
                name = name.rsplit('.', 1)[0]

            # ===== VALIDACIONES DE FORMATO BÁSICO =====
            format_errors = []

            # 1. NO MAYÚSCULAS
            if name != name.lower():
                format_errors.append("No se permiten mayúsculas. Use solo minúsculas.")

            # 2. NO ESPACIOS
            if ' ' in name:
                format_errors.append("No se permiten espacios. Use guiones bajos (_).")

            # 3. NO GUIONES MEDIOS
            if '-' in name:
                format_errors.append("No se permiten guiones medios (-). Use guiones bajos (_).")

            # 4. CARACTERES INVÁLIDOS (solo letras, números, guiones bajos y puntos)
            import re
            if not re.match(r'^[a-z0-9_.]+$', name):
                format_errors.append("Solo se permiten letras minúsculas, números, guiones bajos (_) y puntos (.)")

            # Agregar errores de formato a la lista principal
            errors.extend(format_errors)

            # ===== VALIDACIÓN CONTRA DICCIONARIO =====
            # IMPORTANTE: Validar SIEMPRE contra diccionario, incluso si hay errores de formato
            # Para validar, normalizar el nombre (quitar espacios/mayúsculas/tildes temporalmente)

            # Normalizar: minúsculas, sin tildes, sin caracteres especiales
            import unicodedata
            normalized_name = name.lower()
            # Remover tildes/acentos
            normalized_name = ''.join(
                c for c in unicodedata.normalize('NFD', normalized_name)
                if unicodedata.category(c) != 'Mn'
            )
            # Reemplazar espacios y guiones por guiones bajos
            normalized_name = normalized_name.replace(' ', '_').replace('-', '_')

            # Dividir por guiones bajos
            parts = normalized_name.split('_')

            for part in parts:
                # Saltar partes vacías
                if not part:
                    continue

                # Permitir números puros
                if allow_numbers and part.isdigit():
                    validated_parts.append({
                        'part': part,
                        'valid': True,
                        'type': 'number'
                    })
                    continue

                # Permitir formatos de fecha
                if self._is_date_format(part):
                    validated_parts.append({
                        'part': part,
                        'valid': True,
                        'type': 'date'
                    })
                    continue

                # Permitir nombres propios detectados por heurística
                if self._is_likely_proper_name(part, dictionary):
                    validated_parts.append({
                        'part': part,
                        'valid': True,
                        'type': 'proper_name'
                    })
                    continue

                # Buscar SOLO en KEYs del diccionario (NO en values)
                # La parte debe ser una KEY válida del diccionario
                if part in dictionary:
                    validated_parts.append({
                        'part': part,
                        'valid': True,
                        'type': 'dictionary',
                        'meaning': dictionary[part]
                    })
                else:
                    # NO está en diccionario - OBLIGATORIO usar IA para renombrar
                    errors.append(f"'{part}' no está en el diccionario")
                    validated_parts.append({
                        'part': part,
                        'valid': False,
                        'type': 'unknown'
                    })
                    # NO buscar sugerencias durante batch - muy lento
                    # El usuario DEBE usar IA o renombrar manualmente

            results.append({
                'valid': len(errors) == 0,
                'errors': errors,
                'suggestions': [],  # No sugerencias en batch
                'parts': validated_parts
            })

        elapsed = time.time() - start
        if len(results) > 0:
            print(f"[DICT BATCH] Validados {len(results)} nombres en {elapsed:.2f}s ({elapsed/len(results)*1000:.1f}ms por nombre)")
        else:
            print(f"[DICT BATCH] No se validaron nombres (lista vacía)")

        return results
