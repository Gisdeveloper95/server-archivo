"""
Servicio de renombrado inteligente con IA (Ollama Local + GROQ Cloud)
Prioridad: 1) Diccionario local, 2) Ollama local, 3) GROQ API, 4) Fallback algorítmico
"""
import requests
import time
from typing import Dict, Optional, List
from django.conf import settings
from django.core.cache import cache
from utils.dictionary_validator import DictionaryValidator
from utils.path_validator import PathValidator


class AINamingService:
    """
    Servicio de renombrado inteligente con IA híbrida

    Prioridad de backends:
    1. Diccionario local (instantáneo, ~10,000 palabras)
    2. Ollama local (1-3 segundos, sin límites)
    3. GROQ API cloud (fallback si Ollama no disponible)
    4. Fallback algorítmico (truncado simple)

    Características:
    - Ollama local para independencia de APIs externas
    - Pool de múltiples API keys de Groq como fallback
    - Round-robin para distribuir carga en GROQ
    - Tracking de uso en base de datos
    """

    # Lista de nombres propios comunes en español/Colombia que NO deben abreviarse
    COMMON_PROPER_NAMES = {
        # Nombres masculinos comunes
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
        'dagoberto', 'dario', 'edgar', 'efrain', 'elkin', 'enrique', 'ernesto',
        'esteban', 'fabio', 'ferney', 'francisco', 'freddy', 'gilberto', 'gonzalo',
        'gregorio', 'guillermo', 'harold', 'henry', 'humberto', 'ignacio', 'ismael',
        # Nombres femeninos comunes
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
        'beatriz', 'blanca', 'consuelo', 'dora', 'elsa', 'emma', 'esther', 'fabiola',
        # Apellidos comunes colombianos
        'osorio', 'rodriguez', 'martinez', 'lopez', 'gonzalez', 'garcia', 'hernandez',
        'sanchez', 'ramirez', 'torres', 'flores', 'rivera', 'gomez', 'diaz', 'reyes',
        'morales', 'jimenez', 'ruiz', 'alvarez', 'romero', 'vargas', 'castro', 'ortiz',
        'rubio', 'marin', 'soto', 'suarez', 'contreras', 'rojas', 'moreno', 'gutierrez',
        'munoz', 'fernandez', 'perez', 'medina', 'aguilar', 'pena', 'salazar', 'cardenas',
        'espinosa', 'espindola', 'valencia', 'cortes', 'herrera', 'guerrero', 'mendoza',
        'leon', 'vega', 'caicedo', 'paez', 'quintero', 'silva', 'trujillo', 'vera',
        'acosta', 'arango', 'arias', 'avila', 'bautista', 'becerra', 'bejarano', 'bello',
        'bermudez', 'betancur', 'bolivar', 'bonilla', 'borja', 'bravo', 'buitrago',
        'cabrera', 'calderon', 'campo', 'cardona', 'carvajal', 'castaño', 'castillo',
        'ceballos', 'ceron', 'chacon', 'cifuentes', 'clavijo', 'colorado', 'correa',
        'cuellar', 'delgado', 'duarte', 'duque', 'echeverry', 'escobar', 'estrada',
        'fajardo', 'figueroa', 'forero', 'franco', 'galeano', 'galindo', 'galvis',
        'garzon', 'giraldo', 'guzman', 'hoyos', 'hurtado', 'jaramillo', 'lasso',
        'leal', 'lemos', 'llanos', 'londono', 'lozano', 'machado', 'mancilla',
        'manrique', 'mejia', 'mesa', 'molina', 'montana', 'montoya', 'mora',
        'murillo', 'naranjo', 'navarro', 'nino', 'ocampo', 'ochoa', 'orozco',
        'ospina', 'otalora', 'pacheco', 'palacios', 'pardo', 'paredes', 'patino',
        'perdomo', 'pineda', 'pinzon', 'polanco', 'porras', 'posada', 'poveda',
        'prieto', 'puentes', 'pulido', 'quevedo', 'quiceno', 'quiroga', 'quiroz',
        # Lugares/ciudades colombianas
        'bogota', 'medellin', 'cali', 'barranquilla', 'cartagena', 'cucuta',
        'bucaramanga', 'pereira', 'manizales', 'ibague', 'villavicencio',
        'monteria', 'pasto', 'neiva', 'armenia', 'popayan', 'sincelejo',
        'tunja', 'florencia', 'valledupar', 'riohacha', 'quibdo', 'mocoa',
        'leticia', 'yopal', 'arauca', 'mitú', 'inirida', 'puerto', 'san',
        'santa', 'norte', 'sur', 'oriente', 'occidente', 'magdalena', 'cauca',
        'valle', 'amazonas', 'antioquia', 'atlantico', 'bolivar', 'boyaca',
        'caldas', 'caqueta', 'casanare', 'cesar', 'choco', 'cordoba', 'cundinamarca',
        'guainia', 'guaviare', 'huila', 'guajira', 'meta', 'narino', 'putumayo',
        'quindio', 'risaralda', 'santander', 'sucre', 'tolima', 'vaupes', 'vichada',
    }

    def __init__(self):
        # --- Configuración de Ollama (IA Local) ---
        self.ollama_enabled = getattr(settings, 'OLLAMA_ENABLED', True)
        self.ollama_base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.ollama_model = getattr(settings, 'OLLAMA_MODEL', 'llama3.2:3b')
        self.ollama_timeout = getattr(settings, 'OLLAMA_TIMEOUT', 30)
        self.ollama_available = False

        # Verificar disponibilidad de Ollama
        if self.ollama_enabled:
            self.ollama_available = self._check_ollama_availability()

        # --- Configuración de GROQ (Fallback Cloud) ---
        api_keys_str = getattr(settings, 'GROQ_API_KEYS', None) or getattr(settings, 'GROQ_API_KEY', '')

        # GROQ es opcional si Ollama está disponible
        if api_keys_str:
            self.api_keys = [key.strip() for key in api_keys_str.split(',') if key.strip()]
        else:
            self.api_keys = []

        if not self.api_keys and not self.ollama_available:
            print("[AI SERVICE] ⚠️ WARNING: No hay backends de IA disponibles (ni Ollama ni GROQ)")

        self.groq_model = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')
        self.groq_max_tokens = getattr(settings, 'GROQ_MAX_TOKENS', 1000)
        self.groq_temperature = getattr(settings, 'GROQ_TEMPERATURE', 0.3)

        self.dictionary = DictionaryValidator()
        self.path_validator = PathValidator()

        # Índice actual para round-robin (compartido en cache)
        self.cache_key_index = 'groq_api_key_index'

        # Log del estado
        if self.ollama_available:
            print(f"[AI SERVICE] ✅ Ollama LOCAL disponible ({self.ollama_model})")
        else:
            print(f"[AI SERVICE] ❌ Ollama no disponible")

        if self.api_keys:
            print(f"[AI SERVICE] ✅ GROQ Cloud configurado ({len(self.api_keys)} keys)")
        else:
            print(f"[AI SERVICE] ❌ GROQ no configurado")

    def _check_ollama_availability(self) -> bool:
        """Verifica si Ollama está disponible y tiene el modelo cargado"""
        try:
            response = requests.get(
                f"{self.ollama_base_url}/api/tags",
                timeout=5
            )
            if response.status_code == 200:
                models = response.json().get('models', [])
                model_names = [m.get('name', '') for m in models]
                if self.ollama_model in model_names or any(self.ollama_model.split(':')[0] in m for m in model_names):
                    return True
                print(f"[OLLAMA] Modelo {self.ollama_model} no encontrado. Disponibles: {model_names}")
            return False
        except Exception as e:
            print(f"[OLLAMA] No disponible: {e}")
            return False

    def _call_ollama(self, prompt: str) -> Optional[str]:
        """
        Llama a Ollama local para generar texto.
        Usa formato chat para mejor control de respuestas.
        Retorna None si falla.
        """
        if not self.ollama_available:
            return None

        try:
            start_time = time.time()

            # Usar API de chat para mejor control
            response = requests.post(
                f"{self.ollama_base_url}/api/chat",
                json={
                    "model": self.ollama_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Eres un asistente que abrevia nombres de archivos. SOLO responde con el nombre abreviado, sin explicaciones, sin comillas, sin texto adicional. Usa SOLO guiones bajos (_) entre palabras, NUNCA uses guiones medios (-). Los nombres propios de personas (como pepito, jenifer, carlos) NO se abrevian, se mantienen completos."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                        "num_predict": 50,  # Respuestas muy cortas
                    }
                },
                timeout=self.ollama_timeout
            )

            if response.status_code == 200:
                result = response.json().get('message', {}).get('content', '').strip()
                # Limpiar respuesta - quitar explicaciones si las hay
                result = self._clean_ollama_response(result)
                elapsed = time.time() - start_time
                print(f"[OLLAMA] ✅ Respuesta en {elapsed:.2f}s: '{result[:50]}...'")
                return result
            else:
                print(f"[OLLAMA] ❌ Error {response.status_code}")
                return None

        except requests.exceptions.Timeout:
            print(f"[OLLAMA] ⏱️ Timeout después de {self.ollama_timeout}s")
            return None
        except Exception as e:
            print(f"[OLLAMA] ❌ Error: {e}")
            return None

    def _clean_ollama_response(self, response: str) -> str:
        """Limpia la respuesta de Ollama para obtener solo el nombre"""
        if not response:
            return response

        # Si tiene múltiples líneas, tomar la primera que parezca un nombre
        lines = response.strip().split('\n')
        for line in lines:
            line = line.strip()
            # Saltar líneas que son explicaciones
            if line.startswith(('Explicación', 'Nota:', 'El nombre', 'Resultado:', '-')):
                continue
            # Saltar líneas muy largas (probablemente explicaciones)
            if len(line) > 80:
                continue
            # Si tiene formato de nombre (con guiones bajos o sin espacios)
            if '_' in line or ' ' not in line:
                # Limpiar caracteres no válidos (SOLO letras, números y guión bajo)
                # Convertir guiones medios a guiones bajos
                line = line.replace('-', '_')
                cleaned = ''.join(c for c in line if c.isalnum() or c == '_')
                if cleaned:
                    return cleaned

        # Fallback: tomar la primera línea y limpiarla
        first_line = lines[0].strip()
        first_line = first_line.replace('-', '_')
        cleaned = ''.join(c for c in first_line if c.isalnum() or c == '_')
        return cleaned[:60] if cleaned else response[:60]

    def _normalize_text(self, text: str) -> str:
        """
        Normaliza texto para búsqueda en diccionario:
        - Convierte a minúsculas
        - Quita tildes/acentos
        - Mantiene espacios y guiones bajos para posterior procesamiento
        """
        import unicodedata

        # Minúsculas
        text = text.lower()

        # Quitar tildes/acentos
        # NFD = Canonical Decomposition (separa base + acento)
        # Filtra categoría Mn (Mark, Nonspacing) = acentos/tildes
        text = ''.join(
            c for c in unicodedata.normalize('NFD', text)
            if unicodedata.category(c) != 'Mn'
        )

        return text

    def _get_next_api_key_index(self) -> int:
        """
        Obtiene el siguiente índice de API key usando round-robin.
        Usa Django cache para sincronización entre requests.
        """
        current_index = cache.get(self.cache_key_index, 0)
        next_index = (current_index + 1) % len(self.api_keys)
        cache.set(self.cache_key_index, next_index, timeout=None)
        return current_index

    def _get_api_key_identifier(self, index: int) -> str:
        """Genera un identificador único para la API key por su índice"""
        return f"key_{index + 1}"

    def _initialize_key_tracking(self, key_identifier: str):
        """Inicializa el tracking de una key en la BD si no existe"""
        from groq_stats.models import GroqAPIKeyUsage

        GroqAPIKeyUsage.objects.get_or_create(
            key_identifier=key_identifier,
            defaults={
                'key_name': f'Groq API Key {key_identifier}',
                'is_active': True
            }
        )

    def _record_api_call_success(self, key_identifier: str, tokens_used: int = 0):
        """Registra una llamada exitosa en la BD"""
        from groq_stats.models import GroqAPIKeyUsage

        try:
            key_usage = GroqAPIKeyUsage.objects.get(key_identifier=key_identifier)
            key_usage.record_success(tokens_used=tokens_used)
            print(f"[GROQ TRACKING] ✅ Success recorded for {key_identifier} (tokens: {tokens_used})")
        except GroqAPIKeyUsage.DoesNotExist:
            # Inicializar si no existe
            self._initialize_key_tracking(key_identifier)
            self._record_api_call_success(key_identifier, tokens_used)

    def _record_api_call_failure(self, key_identifier: str, is_rate_limit: bool = False, is_restricted: bool = False, error_message: str = None):
        """Registra una llamada fallida en la BD"""
        from groq_stats.models import GroqAPIKeyUsage

        try:
            key_usage = GroqAPIKeyUsage.objects.get(key_identifier=key_identifier)
            key_usage.record_failure(is_rate_limit=is_rate_limit, is_restricted=is_restricted, error_message=error_message)
            if is_restricted:
                status = "🚫 RESTRICTED"
            elif is_rate_limit:
                status = "🔴 RATE LIMITED"
            else:
                status = "❌ FAILED"
            print(f"[GROQ TRACKING] {status} recorded for {key_identifier}")
        except GroqAPIKeyUsage.DoesNotExist:
            # Inicializar si no existe
            self._initialize_key_tracking(key_identifier)
            self._record_api_call_failure(key_identifier, is_rate_limit, is_restricted, error_message)

    def _is_key_available(self, key_identifier: str) -> bool:
        """
        Verifica si una key está disponible para usar.
        Retorna False si fue rate-limited recientemente.
        """
        from groq_stats.models import GroqAPIKeyUsage

        try:
            key_usage = GroqAPIKeyUsage.objects.get(key_identifier=key_identifier)
            if not key_usage.is_active:
                print(f"[GROQ POOL] {key_identifier} is DISABLED")
                return False
            if key_usage.is_rate_limited_recently:
                print(f"[GROQ POOL] {key_identifier} is RATE LIMITED (recently)")
                return False
            return True
        except GroqAPIKeyUsage.DoesNotExist:
            # Si no existe, asumir que está disponible
            return True

    def suggest_batch(self,
                      files: list,
                      current_path: str,
                      exempt_from_dictionary: bool = False) -> list:
        """
        Genera sugerencias para múltiples archivos EN UNA SOLA LLAMADA a GROQ AI

        Args:
            files: Lista de dicts con 'original_name' y 'extension'
            current_path: Ruta actual
            exempt_from_dictionary: Si está exento del diccionario

        Returns:
            Lista de sugerencias con mismo formato que suggest_name()
        """
        import time
        start = time.time()
        print(f"\n[BATCH AI SERVICE] Procesando {len(files)} archivos en UNA SOLA llamada a GROQ")

        # NORMALIZAR nombres de archivos antes de procesar
        # Crear copias con nombres normalizados para enviar a la IA
        normalized_files = []
        for file_info in files:
            original_name = file_info.get('original_name', '')
            normalized_name = self._normalize_text(original_name)

            print(f"[BATCH NORMALIZE] '{original_name}' -> '{normalized_name}'")

            normalized_files.append({
                'original_name': normalized_name,  # Nombre normalizado para la IA
                'extension': file_info.get('extension', ''),
                '_original_unnormalized': original_name  # Guardar original para metadata
            })

        # Obtener términos relevantes del diccionario (ya usa nombres normalizados)
        dictionary_sample = self._get_batch_dictionary_terms(normalized_files, limit=100)

        # Construir prompt batch con nombres normalizados
        prompt = self._build_batch_groq_prompt(normalized_files, current_path, dictionary_sample, exempt_from_dictionary)

        # Llamar a GROQ una sola vez
        try:
            print(f"[BATCH AI SERVICE] Llamando a GROQ API...")
            ai_response = self._call_ai(prompt)
            print(f"[BATCH AI SERVICE] Respuesta recibida, parseando...")

            # Parsear respuesta (esperamos formato: "1. nombre_sugerido\n2. otro_nombre\n...")
            suggestions = self._parse_batch_response(ai_response, files, exempt_from_dictionary)

            elapsed = time.time() - start
            print(f"[BATCH AI SERVICE] Batch completado en {elapsed:.2f}s ({len(files)} archivos)")

            return suggestions

        except Exception as e:
            print(f"[BATCH AI SERVICE] Error en batch: {str(e)}")
            # Fallback: generar sugerencias básicas para todos
            return self._fallback_batch(files, current_path)

    def _get_batch_dictionary_terms(self, files: list, limit: int = 100) -> str:
        """
        Obtiene términos relevantes del diccionario para todos los archivos.
        NORMALIZA los nombres antes de buscar (minúsculas + sin tildes).
        """
        all_words = set()
        for file_info in files:
            name = file_info.get('original_name', '')
            # NORMALIZAR: minúsculas + sin tildes
            normalized_name = self._normalize_text(name)
            words = normalized_name.split()
            for word in words:
                clean = ''.join(c for c in word if c.isalnum())
                if clean:
                    all_words.add(clean)

        # Buscar términos relevantes
        relevant_terms = []
        seen_keys = set()

        for word in all_words:
            suggestions = self.dictionary.get_suggestions(word, limit=3)
            for term in suggestions:
                if term['key'] not in seen_keys:
                    relevant_terms.append(term)
                    seen_keys.add(term['key'])
                if len(relevant_terms) >= limit:
                    break
            if len(relevant_terms) >= limit:
                break

        # Agregar términos comunes si no hay suficientes
        if len(relevant_terms) < 50:
            common_terms = list(self.dictionary.get_all_terms().items())[:60]
            for key, value in common_terms:
                if key not in seen_keys and len(relevant_terms) < limit:
                    relevant_terms.append({'key': key, 'value': value})
                    seen_keys.add(key)

        formatted = []
        for term in relevant_terms:
            formatted.append(f"  {term['key']}: {term['value']}")

        return '\n'.join(formatted)

    def _build_batch_groq_prompt(self, files: list, current_path: str, dictionary_sample: str, exempt_from_dictionary: bool) -> str:
        """Construye prompt para procesar múltiples archivos de una vez"""

        # Calcular caracteres disponibles (promedio)
        path_info = self.path_validator.get_available_chars_for_name(current_path, '.pdf')
        max_chars = path_info['available']

        # Listar archivos
        files_list = []
        for idx, file_info in enumerate(files, 1):
            name = file_info.get('original_name', '')
            ext = file_info.get('extension', '')
            files_list.append(f"{idx}. {name}{ext}")

        files_str = '\n'.join(files_list)

        if exempt_from_dictionary:
            return f"""Eres un experto en abreviación de nombres de archivos para un sistema de gestión documental del gobierno colombiano (IGAC).

TAREA: Abrevia los siguientes {len(files)} nombres de archivos de forma inteligente y profesional.

ARCHIVOS A ABREVIAR:
{files_str}

RESTRICCIONES:
1. MÁXIMO {max_chars} caracteres por nombre (sin extensión)
2. Separa palabras con guiones bajos (_)
3. Mantén el significado y contexto
4. Prioriza claridad sobre brevedad extrema
5. Permite números (años, fechas) sin abreviar

DICCIONARIO DE REFERENCIA (opcional):
{dictionary_sample}

FORMATO DE RESPUESTA (MUY IMPORTANTE):
Responde SOLO con las abreviaciones, una por línea, en el mismo orden, formato:
1. nombre_abreviado_sin_extension
2. otro_nombre_abreviado
3. tercer_nombre

NO incluyas extensiones, NO agregues explicaciones adicionales."""

        else:
            return f"""Eres un experto en abreviación de nombres de archivos para un sistema de gestión documental del gobierno colombiano (IGAC).

TAREA: Abrevia los siguientes {len(files)} nombres buscando las KEYS más apropiadas mediante búsqueda inteligente en los VALUES del diccionario.

ARCHIVOS A ABREVIAR:
{files_str}

RESTRICCIONES CRÍTICAS:
1. MÁXIMO {max_chars} caracteres por nombre (sin extensión)
2. Separa palabras SOLO con guiones bajos (_), NUNCA uses guiones medios (-)
3. NÚMEROS: Permitidos de CUALQUIER longitud - MANTENLOS TAL CUAL vienen (0, 01, 100000, 17038010000000001000100000000, etc.)
4. FECHAS: Formato numérico permitido (20240115, 2024, etc.)
5. NOMBRES PROPIOS de personas (pepito, jenifer, carlos, maria, etc.): NUNCA abreviar, mantener COMPLETOS

DICCIONARIO OFICIAL (formato: key: value):
{dictionary_sample}

INSTRUCCIONES DE BÚSQUEDA INTELIGENTE:
1. Para cada palabra, busca la coincidencia MÁS SIMILAR en los VALUES del diccionario
2. Usa la KEY correspondiente al VALUE más similar
3. Si una palabra es IDÉNTICA o MUY SIMILAR a un VALUE, usa su KEY
4. Si una palabra es un SINÓNIMO de un VALUE, usa su KEY
5. Si NO hay coincidencia aceptable Y no es nombre propio, OMITE esa palabra (no inventes)
6. Los NÚMEROS siempre se mantienen sin cambios (cualquier longitud)
7. NOMBRES PROPIOS (personas, lugares): MANTENER tal cual si no están en diccionario (ej: jenifer, paola, carlos, bogota)

PROCESO:
- ¿Es un número? → Mantenlo tal cual
- ¿Es una fecha en texto? → Convierte a formato numérico (ej: enero 2024 → 202401)
- Busca la palabra en los VALUES del diccionario
- ¿Hay coincidencia exacta/muy similar/sinónimo? → Usa la KEY
- ¿Es un nombre propio (persona, lugar)? → Mantén la palabra completa en minúsculas
- ¿NO hay coincidencia aceptable? → Omite (NO inventes palabras random como "no", "solo", "perm")

EJEMPLOS:
"Gestor Operacion Nacion 2024" → "gor_nac_2024" (busca en VALUES: gestor→gor, operacion→nac o similar, nacion→nac)
"informe tecnico u 17038010000000001000100000000" → "inf_tec_u_17038010000000001000100000000" (mantiene número largo)
"permisos repositorio jenifer paola" → "perm_repost_jenifer_paola" (mantiene nombres propios)

FORMATO DE RESPUESTA (MUY IMPORTANTE):
Responde SOLO con las abreviaciones, una por línea, en el mismo orden:
1. nombre_abreviado_sin_extension
2. otro_nombre_abreviado
3. tercer_nombre

NO incluyas extensiones, NO agregues explicaciones adicionales.
Usa SOLO KEYs del diccionario + números."""

    def _parse_batch_response(self, response: str, files: list, exempt_from_dictionary: bool) -> list:
        """Parsea la respuesta de GROQ con múltiples sugerencias"""
        lines = response.strip().split('\n')
        suggestions = []

        print(f"[BATCH PARSE] Parseando {len(lines)} líneas de respuesta")

        for idx, file_info in enumerate(files):
            original_name = file_info.get('original_name', '')
            extension = file_info.get('extension', '')

            # Buscar la línea correspondiente
            suggested_base = None
            for line in lines:
                line = line.strip()
                # Buscar formato "N. nombre" o simplemente "nombre"
                if line.startswith(f"{idx + 1}."):
                    suggested_base = line.split('.', 1)[1].strip()
                    break

            if not suggested_base and idx < len(lines):
                # Fallback: tomar línea por índice
                suggested_base = lines[idx].strip()
                # Remover números iniciales si existen
                if suggested_base and suggested_base[0].isdigit():
                    suggested_base = suggested_base.split('.', 1)[-1].strip()

            if not suggested_base:
                print(f"[BATCH PARSE] No se encontró sugerencia para archivo {idx + 1}, usando fallback")
                suggested_base = self._simple_abbreviation(original_name, 50)

            # Limpiar respuesta
            suggested_base = self._clean_ai_response(suggested_base)

            # Guardar para validación batch después
            suggestions.append({
                'original_name': original_name,
                'suggested_base': suggested_base,
                'extension': extension
            })

        # VALIDAR TODOS EN BATCH si NO están exentos del diccionario
        if not exempt_from_dictionary:
            # Extraer solo los suggested_base para validación
            names_to_validate = [s['suggested_base'] for s in suggestions]

            print(f"[BATCH AI] Validando {len(names_to_validate)} nombres contra diccionario EN BATCH...")
            dict_validations = self.dictionary.validate_batch(names_to_validate, allow_numbers=True)
            print(f"[BATCH AI] Validación batch completada")

            # Combinar validaciones con sugerencias
            final_suggestions = []
            for idx, suggestion in enumerate(suggestions):
                original_name = suggestion['original_name']
                suggested_base = suggestion['suggested_base']
                extension = suggestion['extension']
                dict_validation = dict_validations[idx]

                if not dict_validation['valid']:
                    # LA IA GENERÓ UN NOMBRE INVÁLIDO - NO ACEPTARLO
                    print(f"[BATCH AI] ADVERTENCIA: IA generó nombre inválido '{suggested_base}' para '{original_name}'")
                    print(f"[BATCH AI] Errores: {dict_validation['errors']}")

                    # DEJAR EN BLANCO
                    suggested_base = ""
                    suggested_name = ""
                else:
                    # Construir nombre completo
                    if extension:
                        suggested_name = f"{suggested_base}{extension}"
                    else:
                        suggested_name = suggested_base

                # Determinar si es válido
                is_valid = len(suggested_base) > 0
                errors = dict_validation['errors'] if not dict_validation['valid'] else []
                warnings = []

                if not dict_validation['valid']:
                    warnings.append("La IA no pudo generar un nombre válido usando el diccionario. Renombre manualmente.")

                final_suggestions.append({
                    'original_name': original_name,
                    'suggested_name': suggested_name,
                    'suggested_base': suggested_base,
                    'valid': is_valid,
                    'errors': errors,
                    'warnings': warnings,
                    'metadata': {
                        'original_name': original_name,
                        'original_length': len(original_name),
                        'suggested_length': len(suggested_name) if suggested_name else 0,
                        'ai_model': self.groq_model,
                        'used_fallback': False,
                        'dictionary_validated': True
                    }
                })

            return final_suggestions
        else:
            # Si está exento, retornar sin validar
            final_suggestions = []
            for suggestion in suggestions:
                original_name = suggestion['original_name']
                suggested_base = suggestion['suggested_base']
                extension = suggestion['extension']

                if extension:
                    suggested_name = f"{suggested_base}{extension}"
                else:
                    suggested_name = suggested_base

                final_suggestions.append({
                    'original_name': original_name,
                    'suggested_name': suggested_name,
                    'suggested_base': suggested_base,
                    'valid': True,
                    'errors': [],
                    'warnings': [],
                    'metadata': {
                        'original_name': original_name,
                        'original_length': len(original_name),
                        'suggested_length': len(suggested_name),
                        'ai_model': self.groq_model,
                        'used_fallback': False,
                        'dictionary_validated': False
                    }
                })

            return final_suggestions

    def _simple_abbreviation(self, name: str, max_chars: int) -> str:
        """Abreviación simple por palabras"""
        words = name.lower().split()
        abbreviated = '_'.join([w[:4] for w in words])
        if len(abbreviated) > max_chars:
            abbreviated = '_'.join([w[:3] for w in words])
        if len(abbreviated) > max_chars:
            abbreviated = abbreviated[:max_chars]
        return self._clean_ai_response(abbreviated)

    def _fallback_batch(self, files: list, current_path: str) -> list:
        """Genera sugerencias básicas para todos los archivos si GROQ falla"""
        suggestions = []
        for file_info in files:
            original_name = file_info.get('original_name', '')
            extension = file_info.get('extension', '')

            abbreviated = self._simple_abbreviation(original_name, 50)

            if extension:
                suggested_name = f"{abbreviated}{extension}"
            else:
                suggested_name = abbreviated

            suggestions.append({
                'original_name': original_name,
                'suggested_name': suggested_name,
                'suggested_base': abbreviated,
                'valid': True,
                'errors': [],
                'warnings': ['Generado con método de respaldo (GROQ AI no disponible)'],
                'metadata': {
                    'original_name': original_name,
                    'original_length': len(original_name),
                    'suggested_length': len(suggested_name),
                    'used_fallback': True
                }
            })

        return suggestions

    def suggest_name(self,
                     original_name: str,
                     current_path: str,
                     file_extension: str = None,
                     exempt_from_dictionary: bool = False) -> Dict:
        """
        Genera sugerencia de nombre usando GROQ AI

        Args:
            original_name: Nombre largo propuesto por usuario
            current_path: Ruta actual donde se creará el archivo
            file_extension: Extensión del archivo (ej: '.pdf', '.xlsx')

        Returns:
            {
                'suggested_name': str,  # Nombre completo con extensión
                'suggested_base': str,  # Nombre sin extensión
                'valid': bool,
                'errors': list,
                'warnings': list,
                'metadata': {
                    'original_name': str,
                    'original_length': int,
                    'suggested_length': int,
                    'path_length': int,
                    'available_chars': int,
                    'ai_model': str,
                    'used_fallback': bool
                }
            }
        """
        # Remover extensión del nombre original si existe
        if '.' in original_name and not file_extension:
            base_name, ext = original_name.rsplit('.', 1)
            file_extension = f'.{ext}'
        else:
            base_name = original_name

        # NORMALIZAR: Convertir a minúsculas y quitar tildes/acentos
        # Esto asegura que "Repositorio" se convierta a "repositorio"
        # y la IA pueda encontrarlo en el diccionario
        normalized_base_name = self._normalize_text(base_name)

        print(f"[AI NAMING] Nombre original: '{base_name}'")
        print(f"[AI NAMING] Nombre normalizado: '{normalized_base_name}'")

        # Calcular caracteres disponibles
        path_info = self.path_validator.get_available_chars_for_name(
            current_path,
            file_extension or ''
        )
        available_chars = path_info['available']

        # Si no hay espacio disponible
        if available_chars <= 0:
            return {
                'suggested_name': None,
                'suggested_base': None,
                'valid': False,
                'errors': [
                    f'No hay caracteres disponibles en esta ruta. '
                    f'La ruta actual ya ocupa {path_info["path_length"]} caracteres.'
                ],
                'warnings': [],
                'metadata': {
                    'original_name': original_name,
                    'original_length': len(original_name),
                    'path_length': path_info['path_length'],
                    'available_chars': available_chars,
                    'used_fallback': False
                }
            }

        # Preparar prompt para GROQ
        # Usar el nombre NORMALIZADO para buscar en el diccionario
        dictionary_sample = self._get_relevant_dictionary_terms(normalized_base_name)

        # Enviar el nombre NORMALIZADO a la IA
        prompt = self._build_groq_prompt(
            normalized_base_name,
            available_chars,
            dictionary_sample,
            exempt_from_dictionary
        )

        # Intentar generar con GROQ AI
        try:
            ai_suggestion_base = self._call_ai(prompt)

            # Limpiar respuesta
            ai_suggestion_base = self._clean_ai_response(ai_suggestion_base)

            # Si el usuario NO está exento, validar estrictamente contra diccionario
            if not exempt_from_dictionary:
                print(f"[AI VALIDATION DEBUG] Validando respuesta IA contra diccionario: '{ai_suggestion_base}'")
                ai_suggestion_base = self._validate_and_clean_against_dictionary(ai_suggestion_base, base_name)
                print(f"[AI VALIDATION DEBUG] Después de validación: '{ai_suggestion_base}'")

            # Validar longitud
            if len(ai_suggestion_base) > available_chars:
                ai_suggestion_base = ai_suggestion_base[:available_chars]

        except Exception as e:
            # Fallback si GROQ falla
            return self._fallback_abbreviation(
                base_name,
                available_chars,
                file_extension,
                error=str(e)
            )

        # Construir nombre completo
        if file_extension:
            suggested_name = f"{ai_suggestion_base}{file_extension}"
        else:
            suggested_name = ai_suggestion_base

        # Validar contra diccionario
        dict_validation = self.dictionary.validate_name(ai_suggestion_base)

        # Validar longitud de ruta completa
        path_validation = self.path_validator.validate_path_length(
            current_path,
            suggested_name
        )

        # Construir respuesta
        errors = []
        warnings = []

        if not dict_validation['valid']:
            # No agregamos como error, solo como warning
            # porque la IA puede tener razón en algunos casos
            warnings.extend([
                f"Advertencia de diccionario: {err}"
                for err in dict_validation['errors']
            ])

        if not path_validation['valid']:
            errors.append(
                f"La ruta excede el límite por {path_validation['exceeds_by']} caracteres"
            )

        return {
            'suggested_name': suggested_name,
            'suggested_base': ai_suggestion_base,
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'metadata': {
                'original_name': original_name,
                'original_length': len(original_name),
                'suggested_length': len(suggested_name),
                'path_length': path_validation['current_length'],
                'available_chars': available_chars,
                'ai_model': self.groq_model,
                'used_fallback': False,
                'dictionary_warnings': len(warnings) > 0
            }
        }

    def _build_groq_prompt(self, base_name: str, max_chars: int, dictionary_sample: str, exempt_from_dictionary: bool = False) -> str:
        """Construye el prompt para GROQ"""

        print(f"[AI PROMPT DEBUG] exempt_from_dictionary = {exempt_from_dictionary}")

        if exempt_from_dictionary:
            # Prompt libre para admins o usuarios exentos
            return f"""Eres un experto en abreviación de nombres de archivos para un sistema de gestión documental del gobierno colombiano (IGAC - Instituto Geográfico Agustín Codazzi).

TAREA: Abrevia el siguiente nombre de archivo de forma inteligente y profesional.

NOMBRE ORIGINAL: "{base_name}"

RESTRICCIONES:
1. MÁXIMO {max_chars} caracteres TOTALES (incluyendo guiones bajos)
2. Separa palabras con guiones bajos (_)
3. Mantén el significado y contexto del nombre original
4. Prioriza claridad sobre brevedad extrema
5. Puedes usar abreviaciones comunes y lógicas
6. Permite números (años, fechas, códigos) sin abreviar

DICCIONARIO DE REFERENCIA (opcional):
{dictionary_sample}

REGLAS DE ABREVIACIÓN:
- Fechas/años pueden ir sin abreviar: 2024, 2025, 20240115
- Números de referencia: mantenerlos completos
- Palabras comunes: puedes abreviarlas libremente de forma lógica
- Términos técnicos: usa abreviaciones estándar

EJEMPLOS:
Input: "reunion de directores del magdalena medio para asignacion de presupuesto"
Output: "reunion_dir_magdalena_asig_presup"

Input: "informe tecnico de la subdivision catastral numero 25 año 2024"
Output: "inf_tec_subdivision_cat_25_2024"

RESPONDE SOLO con el nombre abreviado, sin explicaciones, comillas ni texto adicional.
FORMATO DE SALIDA: palabras_separadas_por_guiones_bajos
"""
        else:
            # Prompt MEJORADO con búsqueda inteligente en VALUES del diccionario
            return f"""Eres un experto en abreviación de nombres de archivos para un sistema de gestión documental del gobierno colombiano (IGAC - Instituto Geográfico Agustín Codazzi).

TAREA: Abrevia el siguiente nombre de archivo buscando las KEYS más apropiadas del diccionario oficial mediante búsqueda inteligente en los VALUES.

NOMBRE ORIGINAL: "{base_name}"

RESTRICCIONES CRÍTICAS:
1. MÁXIMO {max_chars} caracteres TOTALES (incluyendo guiones bajos)
2. Separa palabras SOLO con guiones bajos (_), NUNCA uses guiones medios (-)
3. Mantén el significado y contexto del nombre original
4. NÚMEROS: Permitidos de CUALQUIER longitud (0, 01, 100000, 17038010000000001000100000000, etc.) - MANTENLOS TAL CUAL vienen
5. FECHAS: Formato numérico permitido (20240115, 2024, etc.)
6. NOMBRES PROPIOS de personas (pepito, jenifer, carlos, maria, etc.): NUNCA abreviar, mantener COMPLETOS tal cual

DICCIONARIO OFICIAL (formato: key: value):
{dictionary_sample}

INSTRUCCIONES DE BÚSQUEDA INTELIGENTE:
1. Para cada palabra del nombre original, busca la coincidencia MÁS SIMILAR en los VALUES del diccionario
2. Usa la KEY correspondiente al VALUE más similar
3. Si una palabra es IDÉNTICA o MUY SIMILAR a un VALUE, usa su KEY
4. Si una palabra es un SINÓNIMO de un VALUE, usa su KEY
5. Si NO hay coincidencia aceptable Y no es nombre propio, OMITE esa palabra (no inventes)
6. Los NÚMEROS siempre se mantienen sin cambios (cualquier longitud)
7. NOMBRES PROPIOS (personas, lugares específicos): MANTENER tal cual si no están en diccionario (ej: jenifer, paola, espindola, romero)

PROCESO DE ABREVIACIÓN:
Paso 1: Identifica cada palabra del nombre original
Paso 2: Para cada palabra:
  - ¿Es un número? → Mantenlo tal cual
  - ¿Es una fecha? → Formato numérico (ej: 20240115)
  - Busca la palabra en los VALUES del diccionario
  - ¿Hay coincidencia exacta o muy similar? → Usa la KEY
  - ¿Hay sinónimo en VALUES? → Usa la KEY del sinónimo
  - ¿Es un nombre propio (persona, lugar)? → Mantén la palabra completa en minúsculas
  - ¿NO hay coincidencia aceptable? → Omite (no inventes KEYs random)
Paso 3: Une las KEYs con guiones bajos (_)

EJEMPLOS CORRECTOS:

Input: "Gestor Operacion de la Nacion 2024"
Proceso:
  - "gestor" → buscar en VALUES → encuentra "gestor operativo" (KEY: "gor")
  - "operacion" → similar a "operativo" (incluido en "gor")
  - "nacion" → buscar → encuentra "nacional" (KEY: "nac")
  - "2024" → número → mantener "2024"
Output: "gor_nac_2024"

Input: "informe tecnico subdivision catastral 17038010000000001000100000000"
Proceso:
  - "informe" → buscar → encuentra "informe" (KEY: "inf")
  - "tecnico" → buscar → encuentra "técnico" (KEY: "tec")
  - "subdivision" → buscar → encuentra "subdivisión" (KEY: "subdiv")
  - "catastral" → buscar → encuentra "catastral" (KEY: "cat")
  - "17038010000000001000100000000" → número largo → mantener tal cual
Output: "inf_tec_subdiv_cat_17038010000000001000100000000"

Input: "reunion directores magdalena medio enero 2024"
Proceso:
  - "reunion" → buscar → encuentra "reunión" (KEY: "reu")
  - "directores" → buscar → encuentra "director" (KEY: "dir")
  - "magdalena" → buscar → encuentra "Magdalena" (KEY: "magd")
  - "medio" → buscar → encuentra "medio" (KEY: "med")
  - "enero 2024" → fecha → convertir a "202401"
Output: "reu_dir_magd_med_202401"

Input: "20251118 permisos repositorio jenifer paola espindola romero"
Proceso:
  - "20251118" → número → mantener "20251118"
  - "permisos" → buscar → encuentra "permiso" (KEY: "perm")
  - "repositorio" → buscar → encuentra "repositorio" (KEY: "repost")
  - "jenifer" → NOMBRE PROPIO de persona → mantener COMPLETO "jenifer"
  - "paola" → NOMBRE PROPIO de persona → mantener COMPLETO "paola"
  - "espindola" → NOMBRE PROPIO (apellido) → mantener COMPLETO "espindola"
  - "romero" → NOMBRE PROPIO (apellido) → mantener COMPLETO "romero"
Output: "20251118_perm_repost_jenifer_paola_espindola_romero"

Input: "test pepito carpeta nueva"
Proceso:
  - "test" → buscar → NO está en diccionario → omitir o mantener si es técnico
  - "pepito" → NOMBRE PROPIO de persona → mantener COMPLETO "pepito" (NUNCA abreviar a "pe_pi" o similar)
  - "carpeta" → buscar → encuentra "carpeta" (KEY: correspondiente)
  - "nueva" → buscar → encuentra "nuevo/a" (KEY: correspondiente)
Output: "test_pepito_carp_nuev" (o similar según diccionario)

EJEMPLOS INCORRECTOS (NO HACER):
❌ "reunion_directores_magdalena" (usar palabras completas en vez de KEYs)
❌ "gor_oper_nac" (inventar "oper" cuando no está en diccionario)
❌ "inf_tec_subdiv_cat_17" (omitir parte del número largo)
❌ "20251118_perm_no_perm_no_solo" (inventar palabras random como "no", "solo")
❌ "pe-pi" o "pe_pi" en lugar de "pepito" (NUNCA abreviar nombres propios de personas)
❌ "jen-pa" o "jen_pa" en lugar de "jenifer_paola" (los nombres se mantienen COMPLETOS)
❌ Usar guiones medios (-) en cualquier parte del nombre
❌ "conv_r" en lugar de "conv" (NUNCA dividir UNA palabra en MÚLTIPLES partes)
❌ "doc_u" en lugar de "doc" (UNA palabra original = UNA abreviación)
❌ "info_r_me" en lugar de "inf" (CADA palabra se abrevia como UNA SOLA unidad)

REGLA CRÍTICA DE ABREVIACIÓN:
⚠️ UNA palabra del texto original = UNA abreviación (KEY) en el resultado
⚠️ NUNCA dividir una palabra en múltiples partes separadas por guión bajo
⚠️ Ejemplo: "convertir" → "conv" (CORRECTO), NUNCA "conv_r" o "con_ver" (INCORRECTO)
⚠️ Ejemplo: "documento" → "doc" (CORRECTO), NUNCA "doc_u" o "docu_men" (INCORRECTO)

RESPONDE SOLO con el nombre abreviado usando KEYs del diccionario + números.
Sin explicaciones, comillas ni texto adicional.
FORMATO DE SALIDA: keys_del_diccionario_separadas_por_guiones_bajos
"""

    def _get_relevant_dictionary_terms(self, text: str, limit: int = 50) -> str:
        """
        Obtiene términos relevantes del diccionario para el prompt.
        Busca coincidencias tanto en KEYs como en VALUEs.
        NORMALIZA el texto antes de buscar (minúsculas + sin tildes).
        """
        # NORMALIZAR: minúsculas + sin tildes
        normalized_text = self._normalize_text(text)

        # Dividir texto en palabras
        words = normalized_text.split()

        # Buscar términos relevantes
        relevant_terms = []
        seen_keys = set()

        for word in words:
            # Limpiar palabra de caracteres especiales (mantener solo alfanuméricos)
            clean_word = ''.join(c for c in word if c.isalnum())

            if not clean_word:
                continue

            # Buscar sugerencias (busca en KEYs y VALUEs)
            # get_suggestions() ya busca con icontains (case-insensitive)
            suggestions = self.dictionary.get_suggestions(clean_word, limit=5)

            for term in suggestions:
                if term['key'] not in seen_keys:
                    relevant_terms.append(term)
                    seen_keys.add(term['key'])

                if len(relevant_terms) >= limit:
                    break

            if len(relevant_terms) >= limit:
                break

        # Si no encontramos suficientes, agregar algunos comunes
        if len(relevant_terms) < 20:
            common_terms = list(self.dictionary.get_all_terms().items())[:30]
            for key, value in common_terms:
                if key not in seen_keys and len(relevant_terms) < limit:
                    relevant_terms.append({'key': key, 'value': value})
                    seen_keys.add(key)

        # Formatear para el prompt - FORMATO MEJORADO para búsqueda inteligente
        # Ahora incluimos tanto la KEY como el VALUE para que la IA busque similitudes
        formatted = []
        for term in relevant_terms:
            # Formato: "key: value" - La IA debe buscar similitudes en el VALUE
            formatted.append(f"  {term['key']}: {term['value']}")

        return '\n'.join(formatted)

    def _call_ai(self, prompt: str) -> str:
        """
        Método unificado para llamar a IA.
        Prioridad: 1) Ollama local, 2) GROQ API cloud

        Returns:
            Contenido generado por la IA

        Raises:
            Exception: Si todos los backends fallan
        """
        # 1. Intentar con Ollama local primero (más rápido, sin límites)
        if self.ollama_available:
            result = self._call_ollama(prompt)
            if result:
                return result
            print("[AI SERVICE] Ollama falló, intentando con GROQ...")

        # 2. Intentar con GROQ API
        if self.api_keys:
            try:
                return self._call_groq_api(prompt)
            except Exception as e:
                print(f"[AI SERVICE] GROQ falló: {e}")

        # 3. Si ambos fallan
        raise Exception("No hay backends de IA disponibles")

    def _call_groq_api(self, prompt: str) -> str:
        """
        Llama a la API de GROQ con pool de keys y fallback automático.

        Estrategia:
        1. Intenta con la siguiente key del pool (round-robin)
        2. Si falla por rate limit, prueba con las demás keys disponibles
        3. Registra todos los intentos en la BD
        4. Si todas fallan, lanza excepción

        Returns:
            Contenido generado por la IA

        Raises:
            Exception: Si todas las API keys fallan
        """
        if not self.api_keys:
            raise Exception("No hay API keys de GROQ configuradas")

        url = 'https://api.groq.com/openai/v1/chat/completions'

        payload = {
            'model': self.groq_model,
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': self.groq_temperature,
            'max_tokens': self.groq_max_tokens,
            'top_p': 1,
            'stream': False
        }

        # Obtener índice inicial con round-robin
        start_index = self._get_next_api_key_index()

        # Intentar con todas las keys (empezando por la del round-robin)
        attempts = []
        for offset in range(len(self.api_keys)):
            key_index = (start_index + offset) % len(self.api_keys)
            api_key = self.api_keys[key_index]
            key_identifier = self._get_api_key_identifier(key_index)

            # Verificar si la key está disponible (no rate-limited recientemente)
            if not self._is_key_available(key_identifier):
                print(f"[GROQ POOL] Skipping {key_identifier} (unavailable)")
                continue

            print(f"[GROQ POOL] Attempting with {key_identifier} (attempt {offset + 1}/{len(self.api_keys)})")

            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }

            start_time = time.time()

            try:
                response = requests.post(url, headers=headers, json=payload, timeout=15)
                elapsed = time.time() - start_time

                # Verificar si fue rate limited (código 429)
                if response.status_code == 429:
                    print(f"[GROQ POOL] 🔴 {key_identifier} RATE LIMITED (429)")
                    self._record_api_call_failure(key_identifier, is_rate_limit=True, error_message="Rate limit exceeded (429)")
                    attempts.append(f"{key_identifier}: Rate Limited")
                    continue

                # Verificar errores 400 (Bad Request) - puede ser restricción de organización
                if response.status_code == 400:
                    try:
                        error_data = response.json()
                        error_msg = error_data.get('error', {}).get('message', 'Unknown 400 error')
                        error_code = error_data.get('error', {}).get('code', '')

                        # Detectar restricción de organización
                        is_restricted = 'restricted' in error_msg.lower() or error_code == 'organization_restricted'

                        if is_restricted:
                            print(f"[GROQ POOL] 🚫 {key_identifier} ORGANIZATION RESTRICTED")
                            self._record_api_call_failure(key_identifier, is_restricted=True, error_message=error_msg[:200])
                            attempts.append(f"{key_identifier}: Organization Restricted")
                        else:
                            print(f"[GROQ POOL] ❌ {key_identifier} BAD REQUEST: {error_msg[:100]}")
                            self._record_api_call_failure(key_identifier, error_message=error_msg[:200])
                            attempts.append(f"{key_identifier}: Bad Request - {error_msg[:50]}")
                        continue
                    except Exception:
                        print(f"[GROQ POOL] ❌ {key_identifier} BAD REQUEST (400)")
                        self._record_api_call_failure(key_identifier, error_message="Bad Request (400)")
                        attempts.append(f"{key_identifier}: Bad Request")
                        continue

                # Verificar otros errores HTTP
                response.raise_for_status()

                data = response.json()

                # Extraer tokens usados (si está disponible)
                tokens_used = data.get('usage', {}).get('total_tokens', 0)

                # Extraer contenido
                if 'choices' in data and len(data['choices']) > 0:
                    result = data['choices'][0]['message']['content']

                    # ✅ ÉXITO: Registrar en BD
                    self._record_api_call_success(key_identifier, tokens_used=tokens_used)

                    print(f"[GROQ POOL] ✅ SUCCESS with {key_identifier} in {elapsed:.2f}s (tokens: {tokens_used})")
                    return result
                else:
                    raise ValueError("Respuesta inesperada de GROQ API")

            except requests.exceptions.Timeout:
                print(f"[GROQ POOL] ⏱️ {key_identifier} TIMEOUT")
                self._record_api_call_failure(key_identifier, error_message="Request timeout")
                attempts.append(f"{key_identifier}: Timeout")
                continue

            except requests.exceptions.RequestException as e:
                error_msg = str(e)
                print(f"[GROQ POOL] ❌ {key_identifier} ERROR: {error_msg}")

                # Detectar rate limit por mensaje de error
                is_rate_limit = '429' in error_msg or 'rate limit' in error_msg.lower()
                is_restricted = 'restricted' in error_msg.lower()
                self._record_api_call_failure(key_identifier, is_rate_limit=is_rate_limit, is_restricted=is_restricted, error_message=error_msg[:200])

                attempts.append(f"{key_identifier}: {error_msg[:50]}")
                continue

            except Exception as e:
                print(f"[GROQ POOL] ❌ {key_identifier} UNEXPECTED ERROR: {str(e)}")
                self._record_api_call_failure(key_identifier, error_message=str(e)[:200])
                attempts.append(f"{key_identifier}: {str(e)[:50]}")
                continue

        # Si llegamos aquí, todas las keys fallaron
        error_summary = "; ".join(attempts)
        raise Exception(
            f"All {len(self.api_keys)} Groq API keys failed. Attempts: {error_summary}"
        )

    def _clean_ai_response(self, response: str) -> str:
        """Limpia la respuesta de la IA"""
        # Remover comillas, backticks, espacios extras
        cleaned = response.strip()
        cleaned = cleaned.strip('"\'`')
        cleaned = cleaned.strip()

        # Remover saltos de línea
        cleaned = cleaned.replace('\n', '_')
        cleaned = cleaned.replace('\r', '')

        # Remover espacios por guiones bajos
        cleaned = cleaned.replace(' ', '_')

        # IMPORTANTE: Convertir guiones medios a guiones bajos
        # Solo se permiten guiones bajos, NUNCA guiones medios
        cleaned = cleaned.replace('-', '_')

        # Remover caracteres no permitidos (SOLO letras, números y guión bajo)
        allowed_chars = 'abcdefghijklmnopqrstuvwxyz0123456789_'
        cleaned = ''.join(c for c in cleaned.lower() if c in allowed_chars)

        # Remover guiones bajos duplicados
        while '__' in cleaned:
            cleaned = cleaned.replace('__', '_')

        # Remover guiones bajos al inicio y fin
        cleaned = cleaned.strip('_')

        return cleaned

    def _is_proper_name(self, word: str) -> bool:
        """
        Verifica si una palabra es un nombre propio conocido.
        Busca en la lista de nombres comunes y también detecta patrones.
        """
        word_lower = word.lower()

        # Verificar en la lista de nombres propios conocidos
        if word_lower in self.COMMON_PROPER_NAMES:
            return True

        # Detectar posibles nombres propios por patrones:
        # - Palabras alfabéticas de 4+ caracteres que no son abreviaciones típicas
        # - Las abreviaciones típicas tienen 2-4 caracteres y consonantes
        if word.isalpha() and len(word) >= 4:
            # Si tiene vocales distribuidas, probablemente es un nombre
            vowels = sum(1 for c in word_lower if c in 'aeiou')
            if vowels >= 2:  # Al menos 2 vocales sugiere nombre completo
                return True

        return False

    def _restore_proper_names(self, original_text: str, suggestion: str) -> str:
        """
        Restaura nombres propios que la IA pudo haber abreviado incorrectamente.
        Compara las palabras originales con la sugerencia y restaura nombres propios.
        """
        # Extraer palabras del texto original (normalizado)
        original_words = self._normalize_text(original_text).replace('_', ' ').split()
        suggestion_words = suggestion.split('_')

        # Identificar nombres propios en el original
        proper_names_in_original = []
        for word in original_words:
            clean_word = ''.join(c for c in word if c.isalnum())
            if clean_word and self._is_proper_name(clean_word):
                proper_names_in_original.append(clean_word.lower())

        if not proper_names_in_original:
            return suggestion

        print(f"[PROPER NAMES] Nombres propios detectados en original: {proper_names_in_original}")

        # Verificar si algún nombre propio fue abreviado y restaurarlo
        result_words = []
        used_proper_names = set()

        for sug_word in suggestion_words:
            restored = False

            # Verificar si esta palabra parece una abreviación de un nombre propio
            for proper_name in proper_names_in_original:
                if proper_name in used_proper_names:
                    continue

                # Si la sugerencia es un prefijo del nombre propio, restaurar
                if proper_name.startswith(sug_word) and len(sug_word) < len(proper_name):
                    print(f"[PROPER NAMES] Restaurando '{sug_word}' -> '{proper_name}'")
                    result_words.append(proper_name)
                    used_proper_names.add(proper_name)
                    restored = True
                    break

            if not restored:
                result_words.append(sug_word)

        return '_'.join(result_words)

    def _fix_split_words(self, suggestion: str, original_text: str = None) -> str:
        """
        Detecta y corrige palabras que la IA dividió erróneamente.

        Ejemplo de error: "convertir" → "conv_r" (la IA dividió en 2 partes)
        Corrección: "conv_r" → "conv" (eliminar la parte suelta)

        Criterio: Una "parte suelta" es un fragmento de 1-2 caracteres alfabéticos
        que parece ser el resto de una palabra dividida incorrectamente.
        """
        if not suggestion:
            return suggestion

        words = suggestion.split('_')
        if len(words) <= 1:
            return suggestion

        # Obtener todas las claves del diccionario
        all_terms = self.dictionary.get_all_terms()
        valid_keys = set(all_terms.keys())

        fixed_words = []
        skip_next = False

        for i, word in enumerate(words):
            if skip_next:
                skip_next = False
                continue

            # Si es un fragmento corto (1-2 chars) alfabético que NO está en diccionario
            if word.isalpha() and len(word) <= 2 and word not in valid_keys:
                # Verificar si la palabra anterior + esta forman algo del diccionario
                if fixed_words:
                    combined = fixed_words[-1] + word
                    if combined in valid_keys:
                        # Reemplazar la última palabra con la combinada
                        print(f"[SPLIT FIX] Fusionando '{fixed_words[-1]}' + '{word}' -> '{combined}'")
                        fixed_words[-1] = combined
                        continue

                # Si no se puede fusionar, simplemente eliminar el fragmento suelto
                print(f"[SPLIT FIX] Eliminando fragmento suelto '{word}' (probable división errónea)")
                continue

            # Verificar si la siguiente palabra es un fragmento suelto de esta
            if i + 1 < len(words):
                next_word = words[i + 1]
                if next_word.isalpha() and len(next_word) <= 2 and next_word not in valid_keys:
                    # Verificar si word + next_word forman algo del diccionario
                    combined = word + next_word
                    if combined in valid_keys:
                        print(f"[SPLIT FIX] Fusionando '{word}' + '{next_word}' -> '{combined}'")
                        fixed_words.append(combined)
                        skip_next = True
                        continue

            fixed_words.append(word)

        result = '_'.join(fixed_words)
        if result != suggestion:
            print(f"[SPLIT FIX] Corregido: '{suggestion}' -> '{result}'")

        return result

    def _validate_and_clean_against_dictionary(self, suggestion: str, original_text: str = None) -> str:
        """
        Valida cada palabra de la sugerencia contra el diccionario.
        Elimina palabras que NO existan en el diccionario.
        Mantiene números sin cambios (de CUALQUIER longitud).
        Restaura nombres propios que pudieron ser abreviados incorrectamente.
        """
        if not suggestion:
            return suggestion

        # PRIMERO: Corregir palabras divididas erróneamente
        suggestion = self._fix_split_words(suggestion, original_text)

        # Restaurar nombres propios si tenemos el texto original
        if original_text:
            suggestion = self._restore_proper_names(original_text, suggestion)

        # Dividir por guiones bajos
        words = suggestion.split('_')
        validated_words = []

        # Obtener todas las claves del diccionario
        all_terms = self.dictionary.get_all_terms()
        valid_keys = set(all_terms.keys())

        print(f"[DICT VALIDATION] Palabras a validar: {words}")
        print(f"[DICT VALIDATION] Total de términos en diccionario: {len(valid_keys)}")

        for word in words:
            if not word:  # Skip empty strings
                continue

            # IMPORTANTE: Permitir números de CUALQUIER longitud
            # Esto incluye: 0, 01, 100000, 17038010000000001000100000000, etc.
            if word.isdigit():
                print(f"[DICT VALIDATION] '{word}' es número (longitud: {len(word)}) - MANTENER")
                validated_words.append(word)
                continue

            # Verificar si es un nombre propio conocido
            if self._is_proper_name(word):
                print(f"[DICT VALIDATION] '{word}' es nombre propio - MANTENER COMPLETO")
                validated_words.append(word)
                continue

            # Verificar si la palabra existe en el diccionario (es una KEY válida)
            if word in valid_keys:
                print(f"[DICT VALIDATION] '{word}' encontrada en diccionario - MANTENER")
                validated_words.append(word)
            else:
                # Permitir palabras alfabéticas de 3+ caracteres (posibles nombres no en lista)
                if word.isalpha() and len(word) >= 3:
                    print(f"[DICT VALIDATION] '{word}' posible nombre propio no listado - MANTENER")
                    validated_words.append(word)
                else:
                    print(f"[DICT VALIDATION] '{word}' NO está en diccionario - ELIMINAR")

        # Reconstruir el nombre
        result = '_'.join(validated_words)

        print(f"[DICT VALIDATION] Resultado final: '{result}'")

        return result

    def _fallback_abbreviation(self,
                                name: str,
                                max_chars: int,
                                extension: Optional[str],
                                error: str = None) -> Dict:
        """Método de abreviación simple si GROQ falla"""
        # Método simple: tomar primeras letras de cada palabra
        words = name.lower().split()

        # Estrategia 1: Primeras 4 letras de cada palabra
        abbreviated = '_'.join([w[:4] for w in words])

        # Si excede, reducir a 3
        if len(abbreviated) > max_chars:
            abbreviated = '_'.join([w[:3] for w in words])

        # Si aún excede, reducir a 2
        if len(abbreviated) > max_chars:
            abbreviated = '_'.join([w[:2] for w in words])

        # Si todavía excede, truncar
        if len(abbreviated) > max_chars:
            abbreviated = abbreviated[:max_chars]

        # Construir nombre completo
        if extension:
            suggested_name = f"{abbreviated}{extension}"
        else:
            suggested_name = abbreviated

        return {
            'suggested_name': suggested_name,
            'suggested_base': abbreviated,
            'valid': True,
            'errors': [],
            'warnings': [
                'Generado con método de respaldo (GROQ AI no disponible)',
                f'Error de IA: {error}' if error else 'Sin conexión a IA'
            ],
            'metadata': {
                'original_name': name,
                'original_length': len(name),
                'suggested_length': len(suggested_name),
                'used_fallback': True,
                'fallback_reason': error or 'Sin conexión'
            }
        }

    def abbreviate_words(self, words: List[str]) -> List[str]:
        """
        Abrevia una lista de palabras usando IA.
        Las abreviaciones generadas se guardan en caché para consistencia.

        Args:
            words: Lista de palabras a abreviar (ej: ['autorizacion', 'manifestaciones'])

        Returns:
            Lista de abreviaciones (ej: ['aut', 'manif'])
        """
        from dictionary.models import AIGeneratedAbbreviation

        if not words:
            return []

        # Separar palabras que necesitan IA vs las que ya son cortas o están en caché
        words_needing_ai = []
        word_results = {}  # Mapeo palabra -> abreviación

        for word in words:
            word_clean = word.lower().strip()
            # Palabras de 5 caracteres o menos: mantener tal cual
            if len(word_clean) <= 5:
                word_results[word] = word_clean
            # Palabras que parecen códigos (contienen números): mantener
            elif any(c.isdigit() for c in word_clean):
                word_results[word] = word_clean
            else:
                # Buscar en caché de abreviaciones generadas por IA
                cached = AIGeneratedAbbreviation.get_or_none(word_clean)
                if cached:
                    word_results[word] = cached.abbreviation
                    cached.increment_usage()
                    print(f"[AI CACHE HIT] '{word_clean}' -> '{cached.abbreviation}' (usado {cached.times_used}x)")
                else:
                    words_needing_ai.append(word)

        # Si no hay palabras que necesiten IA, retornar directamente
        if not words_needing_ai:
            return [word_results.get(w, w) for w in words]

        # Construir prompt solo para palabras largas
        words_list = '\n'.join([f"{i+1}. {w}" for i, w in enumerate(words_needing_ai)])

        prompt = f"""Abrevia cada palabra a 4-5 caracteres. Mantén consonantes principales y primera vocal.

PALABRAS:
{words_list}

RESPONDE SOLO las abreviaciones en orden, una por línea:"""

        try:
            response = self._call_ai(prompt)
            lines = [l.strip() for l in response.strip().split('\n') if l.strip()]

            # Procesar respuestas de IA
            for i, word in enumerate(words_needing_ai):
                abbrev = None

                # Buscar por número
                for line in lines:
                    if line.startswith(f"{i+1}.") or line.startswith(f"{i+1}:"):
                        abbrev = line.split('.', 1)[-1].split(':', 1)[-1].strip()
                        break

                # Fallback: tomar por índice
                if not abbrev and i < len(lines):
                    abbrev = lines[i].strip()
                    # Limpiar números iniciales
                    if abbrev and abbrev[0].isdigit():
                        parts = abbrev.split('.', 1)
                        abbrev = parts[-1].strip() if len(parts) > 1 else abbrev
                        parts = abbrev.split(':', 1)
                        abbrev = parts[-1].strip() if len(parts) > 1 else abbrev

                # Limpiar y validar
                if abbrev:
                    abbrev = self._clean_ai_response(abbrev)

                    # CRÍTICO: Detectar y corregir divisiones erróneas
                    # Si la IA dividió una palabra (ej: "conv_r"), solo tomar la parte principal
                    if '_' in abbrev:
                        parts = abbrev.split('_')
                        # Filtrar fragmentos sueltos de 1-2 caracteres
                        clean_parts = [p for p in parts if len(p) >= 3 or p.isdigit()]
                        if clean_parts:
                            abbrev = clean_parts[0]  # Tomar solo la primera parte válida
                            print(f"[AI SPLIT FIX] Corrigiendo división errónea: '{abbrev}' de partes {parts}")
                        else:
                            abbrev = parts[0]  # Fallback: primera parte

                    # Asegurar que no sea muy largo
                    if len(abbrev) > 6:
                        abbrev = abbrev[:5]
                else:
                    # Fallback: primeras 4-5 letras
                    abbrev = word[:5] if len(word) > 5 else word

                word_results[word] = abbrev

                # Guardar en caché para futuras consultas
                try:
                    AIGeneratedAbbreviation.cache_abbreviation(word, abbrev)
                    print(f"[AI CACHE SAVE] '{word}' -> '{abbrev}' (guardado para consistencia)")
                except Exception as cache_err:
                    print(f"[AI CACHE ERROR] No se pudo guardar '{word}': {cache_err}")

            return [word_results.get(w, w) for w in words]

        except Exception as e:
            print(f"[AI ABBREVIATE] Error: {e}")
            # Fallback: usar método determinístico
            for word in words_needing_ai:
                # Consonantes + primera vocal, max 5 chars
                vowels = set('aeiou')
                result = []
                found_vowel = False
                for c in word.lower():
                    if c not in vowels:
                        result.append(c)
                    elif not found_vowel:
                        result.append(c)
                        found_vowel = True
                    if len(result) >= 5:
                        break
                word_results[word] = ''.join(result) if len(result) >= 3 else word[:5]

            return [word_results.get(w, w) for w in words]

    def validate_suggestion(self, suggested_name: str, current_path: str) -> Dict:
        """
        Valida una sugerencia de nombre

        Args:
            suggested_name: Nombre sugerido a validar
            current_path: Ruta actual

        Returns:
            Resultado de validación
        """
        # Validar contra diccionario
        dict_validation = self.dictionary.validate_name(suggested_name)

        # Validar longitud
        path_validation = self.path_validator.validate_path_length(
            current_path,
            suggested_name
        )

        return {
            'valid': dict_validation['valid'] and path_validation['valid'],
            'errors': dict_validation['errors'] + (
                [f"Excede límite de caracteres"] if not path_validation['valid'] else []
            ),
            'suggestions': dict_validation['suggestions'],
            'path_info': path_validation
        }
