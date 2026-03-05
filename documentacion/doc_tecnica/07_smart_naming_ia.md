# 7. Módulo: Smart Naming (IA) y Diccionario

## 7.1 Descripción General

El sistema **Smart Naming** implementa las **12 reglas oficiales de nomenclatura del IGAC** para archivos, combinando:

1. **Reglas determinísticas** para formato básico
2. **Diccionario IGAC** con términos/abreviaciones oficiales
3. **Inteligencia Artificial (GROQ/Llama)** para palabras desconocidas
4. **Cache de abreviaciones** para consistencia entre usuarios

### Las 12 Reglas IGAC

| # | Regla | Ejemplo |
|---|-------|---------|
| 1 | Todo en minúsculas | `Informe.PDF` → `informe.pdf` |
| 2 | Sin tildes/acentos | `información` → `informacion` |
| 3 | Sin conectores (a, y, de, entre, etc.) | `plan_de_accion` → `plan_accion` |
| 4 | Espacios → guiones bajos | `mi archivo` → `mi_archivo` |
| 5 | Sin paréntesis, guiones medios → _ | `doc(v2)` → `doc_v2` |
| 6 | Sin caracteres especiales | `@#$%` → eliminados |
| 7 | Sin caracteres duplicados consecutivos | `coorrecto` → `corecto` |
| 8 | Fecha al INICIO en formato YYYYMMDD | `informe_enero` → `20250115_informe` |
| 9 | Sin palabras genéricas | `archivo_final` → advertencia |
| 10 | Máximo 65 caracteres en nombre | Truncamiento automático |
| 11 | Sin prefijos como "nuevo_", "copia_" | `copia_doc` → `doc` |
| 12 | Ceros iniciales en secuencias numéricas | `v1` → `v01` |

---

## 7.2 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART NAMING SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   SmartNamingService                     │    │
│  │                                                          │    │
│  │  1. apply_format_rules()    - Reglas 1-7, 11            │    │
│  │  2. detect_and_format_date() - Regla 8                   │    │
│  │  3. classify_word()         - Análisis de partes        │    │
│  │  4. validate_name()         - Validación completa       │    │
│  │  5. suggest_name()          - Generar sugerencia        │    │
│  │                                                          │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │                                      │
│           ┌───────────────┼───────────────┐                     │
│           ▼               ▼               ▼                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐         │
│  │ Dictionary  │  │   AI Cache  │  │  GROQ API       │         │
│  │ Validator   │  │ (BD Cache)  │  │  (Llama 3.3)    │         │
│  │             │  │             │  │                 │         │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐    │         │
│  │ │ Términos│ │  │ │AIGenerat│ │  │ │abbreviate│    │         │
│  │ │ Oficiales│ │  │ │Abbreviat│ │  │ │_words() │    │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘    │         │
│  └─────────────┘  └─────────────┘  └─────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7.3 Flujo de Procesamiento

```
┌─────────────────────────────────────────────────────────────────┐
│              FLUJO DE SUGERENCIA DE NOMBRE                      │
└─────────────────────────────────────────────────────────────────┘

    Nombre original: "Informe Técnico de Catastro - Abril 2024.PDF"
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ 1. SEPARAR EXTENSIÓN                                        │
    │    base: "Informe Técnico de Catastro - Abril 2024"        │
    │    ext: ".pdf"                                              │
    └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ 2. APLICAR REGLAS DE FORMATO                                │
    │    - Minúsculas                                             │
    │    - Sin tildes                                             │
    │    - Espacios → _                                           │
    │    - Guiones → _                                            │
    │    Resultado: "informe_tecnico_de_catastro_abril_2024"     │
    └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ 3. DETECTAR Y FORMATEAR FECHA                               │
    │    "abril 2024" → "20240415"                                │
    │    texto sin fecha: "informe_tecnico_de_catastro"          │
    └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ 4. SEPARAR EN PARTES Y CLASIFICAR                           │
    │                                                             │
    │    informe  → unknown (no en diccionario)                   │
    │    tecnico  → unknown (no en diccionario)                   │
    │    de       → connector (eliminar)                          │
    │    catastro → unknown (no en diccionario)                   │
    └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ 5. PROCESO DE ABREVIACIÓN                                   │
    │                                                             │
    │    ¿"informe" en cache?                                     │
    │    → SÍ: usar "inf"                                         │
    │    → NO: enviar a IA → guardar en cache                     │
    │                                                             │
    │    ¿"tecnico" en cache?                                     │
    │    → SÍ: usar "tec"                                         │
    │    → NO: enviar a IA → guardar en cache                     │
    │                                                             │
    │    ¿"catastro" en diccionario?                              │
    │    → SÍ: usar "cat" (abreviación oficial)                   │
    └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ 6. CONSTRUIR NOMBRE FINAL                                   │
    │                                                             │
    │    fecha + partes abreviadas + extensión                    │
    │    "20240415_inf_tec_cat.pdf"                               │
    └─────────────────────────────────────────────────────────────┘
```

---

## 7.4 Modelos de Datos

### DictionaryEntry - Diccionario Oficial

```python
class DictionaryEntry(models.Model):
    """Términos y abreviaciones oficiales IGAC"""

    key = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text='Término o sigla (ej: "igac", "cat", "geo")'
    )

    value = models.TextField(
        help_text='Significado completo (ej: "instituto geográfico agustín codazzi")'
    )

    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### AIGeneratedAbbreviation - Cache de IA

```python
class AIGeneratedAbbreviation(models.Model):
    """
    Cache de abreviaciones generadas por IA.

    GARANTIZA CONSISTENCIA: una vez que la IA abrevia una palabra,
    todos los usuarios obtienen la misma abreviación.
    """

    STATUS_CHOICES = (
        ('pending', 'Pendiente de revisión'),
        ('approved', 'Aprobado'),
        ('rejected', 'Rechazado'),
        ('corrected', 'Corregido manualmente'),
    )

    original_word = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text='Palabra completa normalizada (ej: "prestacion")'
    )

    abbreviation = models.CharField(
        max_length=20,
        db_index=True,
        help_text='Abreviación generada (ej: "prest")'
    )

    times_used = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Si fue corregido manualmente
    original_ai_abbreviation = models.CharField(max_length=20, null=True)

    reviewed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    reviewed_at = models.DateTimeField(null=True)

    @classmethod
    def get_or_none(cls, word: str):
        """Busca abreviación cacheada (no usar si está rechazada)"""
        normalized = normalize_word(word)
        try:
            entry = cls.objects.get(original_word=normalized)
            if entry.status == 'rejected':
                return None
            return entry
        except cls.DoesNotExist:
            return None

    @classmethod
    def cache_abbreviation(cls, word: str, abbreviation: str):
        """Guarda nueva abreviación o incrementa contador"""
        entry, created = cls.objects.get_or_create(
            original_word=normalize_word(word),
            defaults={'abbreviation': clean_abbreviation(abbreviation)}
        )
        if not created:
            entry.increment_usage()
        return entry
```

---

## 7.5 Servicio de Nomenclatura Inteligente

### Clasificación de Palabras

El sistema clasifica cada parte del nombre:

| Tipo | Descripción | Acción |
|------|-------------|--------|
| `number` | Números puros (001, 2024) | Preservar |
| `cadastral_code` | Códigos catastrales (5+ dígitos) | Preservar |
| `date` | Fechas detectadas | Mover al inicio |
| `connector` | Conectores (de, la, y) | Eliminar |
| `generic` | Palabras genéricas | Advertir |
| `dictionary` | En diccionario oficial | Usar abreviación |
| `standard_english` | Términos técnicos inglés | Preservar |
| `proper_name` | Nombres propios | Preservar completo |
| `unknown` | No encontrado | Enviar a IA/cache |

### Detección de Nombres Propios

```python
def _is_likely_proper_name(self, word: str) -> bool:
    """
    Detecta si una palabra es PROBABLEMENTE un nombre propio.

    Heurísticas:
    1. No está en lista de palabras técnicas comunes
    2. No está en diccionario de abreviaciones
    3. No es palabra válida en español (enchant)
    4. Tiene estructura fonética de nombre propio:
       - Longitud 4-12 caracteres
       - Puramente alfabético
       - 25-65% vocales
       - Terminación típica española (ez, ia, ana, etc.)
       - Máximo 3 consonantes consecutivas
    """
```

---

## 7.6 Integración con GROQ API

### Servicio de IA

```python
# services/ai_naming_service.py

class AINamingService:
    """Servicio para llamadas a GROQ API (Llama 3.3)"""

    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "llama-3.3-70b-versatile"

    def abbreviate_words(self, words: List[str]) -> List[str]:
        """
        Genera abreviaciones para múltiples palabras en una sola llamada.

        Prompt:
        "Genera abreviaciones de máximo 5 caracteres para estas palabras
         en español. Mantén las consonantes principales y la primera vocal.
         Formato de respuesta: palabra:abrev,palabra:abrev,..."

        Returns:
            Lista de abreviaciones en el mismo orden
        """
        if not words:
            return []

        prompt = f"""Genera abreviaciones cortas (máx 5 caracteres) para estas palabras
en español. Responde SOLO con el formato: palabra1:abrev1,palabra2:abrev2

Palabras: {', '.join(words)}

Reglas:
- Máximo 5 caracteres por abreviación
- Mantener consonantes principales
- Solo letras minúsculas
- Sin tildes ni caracteres especiales"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,  # Baja temperatura para consistencia
                max_tokens=500
            )

            # Parsear respuesta
            result_text = response.choices[0].message.content.strip()
            abbreviations = self._parse_response(result_text, words)

            return abbreviations

        except Exception as e:
            # Fallback a reglas determinísticas
            return [self._deterministic_abbreviation(w) for w in words]
```

### Estadísticas de API Keys

```python
# groq_stats/models.py

class GroqAPIKey(models.Model):
    """Gestión de API keys de GROQ con rate limiting"""

    key_identifier = models.CharField(max_length=20, unique=True)
    api_key = models.CharField(max_length=100)

    # Límites
    daily_limit = models.IntegerField(default=14400)  # Requests/día
    requests_per_minute = models.IntegerField(default=30)

    # Uso actual
    requests_today = models.IntegerField(default=0)
    tokens_today = models.IntegerField(default=0)
    last_used = models.DateTimeField(null=True)

    # Estado
    is_active = models.BooleanField(default=True)
    is_primary = models.BooleanField(default=False)

    @classmethod
    def get_available_key(cls):
        """Retorna una key disponible que no haya excedido límites"""
        now = timezone.now()

        return cls.objects.filter(
            is_active=True,
            requests_today__lt=F('daily_limit')
        ).order_by('-is_primary', 'requests_today').first()
```

---

## 7.7 Endpoints API

### Validación y Sugerencias

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/file-ops/smart-validate/` | POST | Validar nombre con reglas IGAC |
| `/api/file-ops/smart-rename/` | POST | Obtener sugerencia de nombre |
| `/api/file-ops/smart-rename-batch/` | POST | Sugerencias en lote |
| `/api/file-ops/dictionary-search/` | GET | Buscar en diccionario |
| `/api/file-ops/naming-exemptions/` | GET | Exenciones del usuario |

### Diccionario

| Endpoint | Método | Acceso | Descripción |
|----------|--------|--------|-------------|
| `/api/dictionary/` | GET | Todos | Listar términos |
| `/api/dictionary/` | POST | Admin* | Crear término |
| `/api/dictionary/{id}/` | PUT | Admin* | Actualizar término |
| `/api/dictionary/{id}/` | DELETE | Admin* | Eliminar término |
| `/api/dictionary/active/` | GET | Todos | Solo términos activos |
| `/api/dictionary/export-csv/` | GET | Todos | Exportar a CSV |

*Admin = superadmin o usuario con `can_manage_dictionary=True`

### Abreviaciones de IA

| Endpoint | Método | Acceso | Descripción |
|----------|--------|--------|-------------|
| `/api/ai-abbreviations/` | GET | Admin* | Listar abreviaciones |
| `/api/ai-abbreviations/summary/` | GET | Admin* | Estadísticas |
| `/api/ai-abbreviations/{id}/approve/` | POST | Admin* | Aprobar |
| `/api/ai-abbreviations/{id}/reject/` | POST | Admin* | Rechazar |
| `/api/ai-abbreviations/{id}/correct/` | POST | Admin* | Corregir |
| `/api/ai-abbreviations/{id}/add-to-dictionary/` | POST | Admin* | Agregar a diccionario |
| `/api/ai-abbreviations/bulk-approve/` | POST | Admin* | Aprobar en lote |

---

## 7.8 Request/Response Examples

### Smart Validate

**Request:**
```json
POST /api/file-ops/smart-validate/
{
    "name": "Informe Técnico de Catastro.pdf",
    "current_path": "/documentos/informes"
}
```

**Response:**
```json
{
    "success": true,
    "valid": true,
    "errors": [],
    "warnings": [
        "Conector removido: 'de'"
    ],
    "original_name": "Informe Técnico de Catastro.pdf",
    "formatted_name": "informe_tecnico_catastro.pdf",
    "formatted_base": "informe_tecnico_catastro",
    "extension": ".pdf",
    "format_changes": [
        "Convertido a minúsculas",
        "Removidas tildes y acentos",
        "Espacios reemplazados por guiones bajos"
    ],
    "parts_analysis": [
        {"type": "unknown", "value": "informe", "source": "ai_candidate"},
        {"type": "unknown", "value": "tecnico", "source": "ai_candidate"},
        {"type": "connector", "value": "de", "source": "removed"},
        {"type": "dictionary", "value": "catastro", "meaning": "Sistema de información catastral", "source": "dictionary"}
    ],
    "unknown_parts": ["informe", "tecnico"],
    "needs_ai": true,
    "detected_date": null,
    "user_exemptions": {
        "exempt_from_naming_rules": false,
        "exempt_from_path_limit": false,
        "exempt_from_name_length": false
    }
}
```

### Smart Rename

**Request:**
```json
POST /api/file-ops/smart-rename/
{
    "name": "Informe Técnico de Catastro abril 2024.pdf",
    "current_path": "/documentos"
}
```

**Response:**
```json
{
    "success": true,
    "original_name": "Informe Técnico de Catastro abril 2024.pdf",
    "suggested_name": "20240415_inf_tec_cat.pdf",
    "suggested_base": "20240415_inf_tec_cat",
    "valid": true,
    "errors": [],
    "warnings": [
        "Conector removido: 'de'",
        "'informe' -> 'inf' (cache)",
        "'tecnico' -> 'tec' (cache)",
        "Fecha movida al inicio: 20240415"
    ],
    "format_changes": [
        "Convertido a minúsculas",
        "Removidas tildes y acentos"
    ],
    "used_ai": false,
    "used_cache": true,
    "used_deterministic": false,
    "parts_analysis": [
        {"type": "date", "value": "20240415", "source": "preserved"},
        {"type": "unknown", "value": "informe", "abbreviated_to": "inf", "source": "cached"},
        {"type": "unknown", "value": "tecnico", "abbreviated_to": "tec", "source": "cached"},
        {"type": "dictionary", "value": "cat", "meaning": "catastro", "source": "dictionary"}
    ],
    "detected_date": "20240415"
}
```

---

## 7.9 Sistema de Exenciones

Algunos usuarios pueden tener exenciones de las reglas de nombrado:

### Tipos de Exención

| Exención | Efecto |
|----------|--------|
| `exempt_from_naming_rules` | Puede usar cualquier nombre sin validación |
| `exempt_from_path_limit` | Sin límite de longitud de ruta |
| `exempt_from_name_length` | Sin límite de caracteres en nombre |

### Roles con Exención Automática

```python
def get_naming_exemptions(self) -> dict:
    """Retorna exenciones del usuario"""

    # Roles privilegiados tienen exención total
    if self.role in ['admin', 'superadmin']:
        return {
            'exempt_from_naming_rules': True,
            'exempt_from_path_limit': True,
            'exempt_from_name_length': True,
            'exemption_reason': f'Rol privilegiado: {self.role}',
            'is_privileged_role': True
        }

    # Verificar exenciones individuales
    return {
        'exempt_from_naming_rules': self.exempt_from_naming_rules,
        'exempt_from_path_limit': self.exempt_from_path_limit,
        'exempt_from_name_length': self.exempt_from_name_length,
        'exemption_reason': None,
        'is_privileged_role': False
    }
```

---

## 7.10 Widget Frontend

### AISystemWidget

Componente que muestra el estado del sistema de IA en el sidebar:

```typescript
// components/AISystemWidget.tsx

const AISystemWidget = () => {
  const [stats, setStats] = useState<AIStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const response = await groqStatsApi.getSystemStatus();
      setStats(response.data);
    };
    fetchStats();
  }, []);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-lg">
      <h3 className="font-semibold text-purple-800 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Sistema de IA
      </h3>

      <div className="mt-2 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Estado:</span>
          <span className={stats?.is_active ? 'text-green-600' : 'text-red-600'}>
            {stats?.is_active ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Requests hoy:</span>
          <span>{stats?.requests_today} / {stats?.daily_limit}</span>
        </div>

        <div className="flex justify-between">
          <span>Abreviaciones en cache:</span>
          <span>{stats?.cached_abbreviations}</span>
        </div>
      </div>
    </div>
  );
};
```

### Modal de Renombrado

```typescript
// components/RenameModal.tsx

const RenameModal = ({ file, onClose, onRename }) => {
  const [newName, setNewName] = useState(file.name);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // Validar en tiempo real mientras escribe
  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = await filesApi.smartValidate({ name: newName });
      setValidation(result);
    }, 300);

    return () => clearTimeout(timer);
  }, [newName]);

  // Obtener sugerencia de IA
  const handleGetSuggestion = async () => {
    const result = await filesApi.smartRename({ name: newName });
    setSuggestion(result.suggested_name);
    setNewName(result.suggested_name);
  };

  return (
    <Modal>
      <h2>Renombrar archivo</h2>

      <input
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        className="w-full border rounded p-2"
      />

      {/* Errores de validación */}
      {validation?.errors.length > 0 && (
        <div className="text-red-600">
          {validation.errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {/* Advertencias */}
      {validation?.warnings.length > 0 && (
        <div className="text-yellow-600">
          {validation.warnings.map((w, i) => <p key={i}>{w}</p>)}
        </div>
      )}

      {/* Análisis de partes */}
      {validation?.parts_analysis && (
        <PartAnalysisViewer parts={validation.parts_analysis} />
      )}

      <div className="flex gap-2">
        <Button onClick={handleGetSuggestion}>
          <Sparkles className="w-4 h-4" />
          Sugerencia IA
        </Button>
        <Button onClick={() => onRename(newName)}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
};
```

---

## 7.11 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│             FLUJO COMPLETO SMART NAMING                         │
└─────────────────────────────────────────────────────────────────┘

    Usuario escribe nombre
              │
              ▼
    ┌─────────────────────┐
    │  Frontend valida    │  (debounce 300ms)
    │  /smart-validate/   │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │  Mostrar errores/   │
    │  advertencias       │
    └──────────┬──────────┘
               │
               │  Usuario hace clic "Sugerencia IA"
               ▼
    ┌─────────────────────┐
    │  /smart-rename/     │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    SmartNamingService                        │
    ├─────────────────────────────────────────────────────────────┤
    │                                                              │
    │  1. Aplicar reglas formato  ────────────────────────────►   │
    │                                                              │
    │  2. Detectar fecha  ──────────────────────────────────►     │
    │                                                              │
    │  3. Para cada palabra:                                       │
    │     ┌──────────────────────────────────────────────────┐    │
    │     │ ¿En diccionario oficial?                          │    │
    │     │   SÍ → usar abreviación                           │    │
    │     │   NO ↓                                            │    │
    │     │ ¿En cache AIGeneratedAbbreviation?                │    │
    │     │   SÍ → usar abreviación, incrementar contador     │    │
    │     │   NO ↓                                            │    │
    │     │ ¿Es nombre propio?                                │    │
    │     │   SÍ → preservar completo                         │    │
    │     │   NO ↓                                            │    │
    │     │ Llamar GROQ API para abreviar                     │    │
    │     │   → Guardar en cache                              │    │
    │     └──────────────────────────────────────────────────┘    │
    │                                                              │
    │  4. Construir nombre final                                   │
    │     - Fecha al inicio                                        │
    │     - Partes abreviadas                                      │
    │     - Extensión                                              │
    │                                                              │
    │  5. Verificar límite caracteres                              │
    │     - Truncar si excede                                      │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘
               │
               ▼
    ┌─────────────────────┐
    │  Frontend muestra   │
    │  sugerencia         │
    └──────────┬──────────┘
               │
               │  Usuario acepta
               ▼
    ┌─────────────────────┐
    │  /file-ops/rename/  │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │  Archivo renombrado │
    │  Auditoría guardada │
    └─────────────────────┘
```

---

## 7.12 Extensiones que Requieren Fecha

Ciertas extensiones REQUIEREN fecha al inicio del nombre. Si no se detecta fecha, se agrega automáticamente la fecha actual:

```python
EXTENSIONS_REQUIRING_DATE = {
    # Documentos de oficina
    'docx', 'doc', 'txt', 'pptx', 'xlsx', 'xls', 'xlsb', 'xlsm', 'csv', 'pdf',
    # Multimedia - audio
    'mp3', 'ogg', 'wav', 'm4a', 'aac',
    # Multimedia - video
    'mp4', 'mpeg', 'mpg', 'mov', 'mpe',
    # Imágenes básicas (NO profesionales/geoespaciales)
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
```

**Nota:** Formatos geoespaciales profesionales (.ecw, .tiff, .jp2, .shp, etc.) NO requieren fecha obligatoria.

---

*Figura 7.1: Sistema Smart Naming con IA*
