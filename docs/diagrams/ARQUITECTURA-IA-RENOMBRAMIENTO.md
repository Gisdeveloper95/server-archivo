# 📋 ARQUITECTURA TÉCNICA - MÓDULO DE IA

## 1. VISIÓN GENERAL DEL MÓDULO IA

El módulo IA gestiona:
1. **Sugerencias de Renombramiento:** IA sugiere nombres basados en 12 reglas
2. **Abreviaciones Automáticas:** IA abrevia palabras según diccionario
3. **Gestión de Diccionario:** CRUD de términos permitidos
4. **Validación de Nombres:** Verifica compliance con 12 reglas
5. **Diccionario de Datos:** Administración centralizada de términos

---

## 2. COMPONENTES FRONTEND

### 2.1 Página: `NamingHelp.tsx`
**Ruta:** `frontend/src/pages/NamingHelp.tsx` (635 líneas)

**Funcionalidad:**
```
Herramienta de Ayuda para Nomenclatura
├─ 12 Reglas de Nomenclatura (mostradas)
├─ Input para probar nombres
├─ Sugerencias de IA en tiempo real
└─ Validación contra 12 reglas
```

**Las 12 Reglas Oficial es:**
```
1. Todo en minúsculas        → "Documento_IMPORTANTE" → "documento_importante"
2. Sin tildes ni acentos     → "autorizacion_técnica" → "autorizacion_tecnica"
3. Sin conectores            → "informe_de_la_reunion" → "informe_reunion"
4. Espacios = Guiones bajos  → "mi documento final" → "mi_documento_final"
5. Sin paréntesis ni guiones → "archivo(v2)-final" → "archivo_v2_final"
6. Solo: a-z, 0-9, _, .     → "doc@empresa#2024!" → "doc_empresa_2024"
7. Sin duplicados            → "documentoo_finaal" → "documento_final"
8. Fecha al INICIO YYYYMMDD  → "reunion_enero_2025" → "20250115_reunion"
9. Sin genéricas             → "archivo_final_nuevo" → "informe_presupuesto"
10. Máximo 50 caracteres     → nombres muy largos → acortados
11. Sin prefijos prohibidos  → "nuevo_", "copia_", "backup_", "temp_"
12. Usar abreviaciones dict  → "autorizacion_manifes" (según diccionario)
```

**Estado (11 variables):**
```typescript
testName: string                    // Nombre a probar
validationResult: ValidationResult  // Resultado validación
rules: NamingRule[]                 // Las 12 reglas
activeRule: number | null           // Regla expandida
expandedRules: Set<number>          // Reglas expandidas
suggestedName: string | null        // Sugerencia de IA
loadingSuggestion: boolean          // Pidiendo a IA
error: string                       // Error message
showRawSuggestion: boolean          // Mostrar JSON raw
abbreviationMode: boolean           // Modo abreviación
```

**Flujo:**
```
Usuario entra a NamingHelp
  ↓
Mostrar panel con 12 reglas explicadas + ejemplos
  ↓
Usuario escribe nombre: "Nueva_Autorizacion_De_La_Empresa_2025"
  ↓
Validación en tiempo real:
  ├─ Validar contra cada regla
  ├─ Detectar violaciones
  └─ Mostrar en rojo las que fallan
  ↓
Usuario cliclea "Obtener Sugerencia IA"
  ↓
POST /api/ai/suggest-rename
  {
    current_name: "Nueva_Autorizacion_De_La_Empresa_2025",
    file_extension: ".pdf"
  }
  ↓
Backend:
  1. Normalizar nombre (minúsculas, sin tildes)
  2. Validar contra 12 reglas
  3. Llamar IA (Groq) con contexto
  4. Retornar sugerencia
  ↓
Mostrar:
  ├─ Nombre original (rojo si inválido)
  ├─ Sugerencia IA (verde si válido)
  ├─ Explicación de cambios
  ├─ Diferencias destacadas
  └─ Botón "Aplicar"
```

### 2.2 Página: `DictionaryManagement.tsx`
**Ruta:** `frontend/src/pages/DictionaryManagement.tsx` (513 líneas)

**Estructura:**
```
DictionaryManagement (2 tabs)
├─ Tab 1: Diccionario de Términos
│  ├─ Tabla: Términos permitidos (activos/inactivos)
│  ├─ Búsqueda: Filtrar por término
│  ├─ Acciones: Crear, editar, eliminar, toggle active
│  └─ Paginación: 50 términos por página
│
└─ Tab 2: Abreviaciones Generadas por IA (AIAbbreviationsManager)
   ├─ Tabla: Abreviaciones pendientes/aprobadas
   ├─ Filtros: status (pending, approved, rejected, corrected)
   ├─ Acciones: Aprobar, rechazar, corregir, agregar diccionario
   └─ Bulk actions: Aprobar todos, agregar todos
```

**Componentes Hijo (3):**
```
DictionaryManagement
├─ CreateDictionaryEntryModal   → POST /dictionary/
├─ EditDictionaryEntryModal     → PATCH /dictionary/{id}/
└─ AIAbbreviationsManager       → Gestiona abreviaciones IA
   └─ Sub-acciones:
      ├─ approve()              → Aprobar abreviación
      ├─ reject()               → Rechazar
      ├─ correct()              → Corregir
      └─ addToDictionary()      → Agregar como término oficial
```

**Estado (15 variables):**
```typescript
// Diccionario
filteredEntries: DictionaryEntry[]
loading: boolean
error: string
searchTerm: string
filterActive: 'all'|'active'|'inactive'
currentPage: number
totalCount: number

// Modales
showCreateModal: boolean
showEditModal: boolean
selectedEntry: DictionaryEntry | null
showAISuggestions: boolean

// Permisos
canManage: boolean (superadmin or can_manage_dictionary)
```

**DictionaryEntry Model:**
```typescript
interface DictionaryEntry {
  id: number;
  key: string;              // Término: "igac"
  value: string;            // Significado: "Instituto Geográfico Agustín Codazzi"
  is_active: boolean;       // Si está disponible para uso
  created_by?: number;      // User ID que creó
  created_at: string;       // ISO date
  updated_by?: number;      // Last edited by
  updated_at: string;       // Last edited date
}
```

**Flujo:**
```
Admin entra a DictionaryManagement
  ↓
Tab 1: Diccionario
  ├─ GET /api/dictionary/?page=1&page_size=50
  ├─ Mostrar tabla con términos activos
  └─ Búsqueda + filtros
  ↓
Admin cliclea "Crear Término"
  ├─ CreateDictionaryEntryModal abre
  ├─ Input: key ("cdi"), value ("contenedor digital información")
  ├─ POST /api/dictionary/
  └─ loadEntries()
  ↓
Admin cliclea "Editar"
  ├─ EditDictionaryEntryModal abre
  ├─ Pre-cargado con datos
  ├─ PATCH /api/dictionary/{id}/
  └─ loadEntries()
  ↓
Admin cliclea "Desactivar"
  ├─ PATCH /api/dictionary/{id}/toggle-active/
  ├─ is_active = false
  └─ Término no validará en regla 12
  ↓
Tab 2: Abreviaciones IA
  ├─ GET /api/ai-abbreviations/?status=pending
  ├─ Mostrar tabla de abreviaciones generadas
  │  ├─ Palabra original: "prestación"
  │  ├─ Abreviación: "prest"
  │  ├─ Status: "pending"
  │  ├─ Veces usado: 5
  │  └─ Generado por: IA
  ├─ Acciones por fila:
  │  ├─ Aprobar → POST /ai-abbreviations/{id}/approve/
  │  │  └─ Status = "approved"
  │  │  └─ Puede agregarse al diccionario
  │  ├─ Rechazar → POST /ai-abbreviations/{id}/reject/
  │  │  └─ Status = "rejected"
  │  │  └─ IA generará otra
  │  ├─ Corregir → POST /ai-abbreviations/{id}/correct/
  │  │  └─ Input nuevo valor
  │  │  └─ Status = "corrected"
  │  └─ Agregar Diccionario → POST /ai-abbreviations/{id}/add-to-dictionary/
  │     └─ Crea DictionaryEntry automático
  │     └─ Status = "in_dictionary"
  │
  ├─ Bulk actions:
  │  ├─ "Aprobar todos pendientes"
  │  │  └─ POST /ai-abbreviations/bulk-approve/
  │  └─ "Agregar todos aprobados al diccionario"
  │     └─ POST /ai-abbreviations/bulk-add-to-dictionary/
  │
  └─ Estadísticas:
     ├─ Total generadas
     ├─ Pendientes aprobación
     ├─ Aprobadas
     ├─ Rechazadas
     ├─ Top 10 usadas
     └─ Histograma uso
```

### 2.3 Componente: `AIAbbreviationsManager.tsx`
**Ruta:** `frontend/src/components/AIAbbreviationsManager.tsx` (489 líneas)

**Funcionalidad:**
```
Manager de Abreviaciones Generadas por IA
├─ Tabla paginada de abreviaciones
├─ Filtrar por status
├─ Buscar por palabra original
├─ Aprobar/rechazar/corregir individualmente
├─ Bulk operations
└─ Estadísticas en tiempo real
```

**Estado (9 variables):**
```typescript
abbreviations: AIAbbreviation[]        // Lista de abreviaciones
summary: AIAbbreviationSummary | null  // Stats
loading: boolean                       // Cargando
error: string | null                   // Error
statusFilter: string                   // Filtro por status
searchTerm: string                     // Búsqueda
processingId: number | null            // Procesando item
editingId: number | null               // Editando item
bulkProcessing: boolean                // Procesando bulk
```

**AIAbbreviation Model:**
```typescript
interface AIAbbreviation {
  id: number;
  original_word: string;        // "prestación"
  abbreviated_form: string;     // "prest"
  status: 'pending'|'approved'|'rejected'|'corrected'|'in_dictionary';
  created_at: string;           // Cuándo la IA lo generó
  times_used: number;           // Cuántas veces se usó
  created_by_ai: boolean;       // Siempre true (generada por IA)
  confidence: number;           // 0-100, confianza de IA
  context?: string;             // Contexto de uso
}
```

**Flujo Interactivo:**
```
AIAbbreviationsManager monta
  ↓
GET /api/ai-abbreviations/summary/
  ├─ Total: 245
  ├─ Pendientes: 32
  ├─ Aprobadas: 150
  ├─ Rechazadas: 45
  ├─ Corregidas: 18
  └─ Top usadas: [lista]
  ↓
GET /api/ai-abbreviations/?status=pending&page=1&limit=50
  ├─ Mostrar 50 abreviaciones pendientes
  ├─ Por defecto: ordenadas por veces_usado DESC
  └─ Tabla con columnas:
     ├─ Palabra original
     ├─ Abreviación
     ├─ Confianza %
     ├─ Usado N veces
     └─ Acciones
  ↓
Usuario cliclea "Aprobar" (palabra: "prestación")
  ├─ POST /api/ai-abbreviations/5/approve/
  ├─ Status = "approved"
  ├─ Ahora puede usarse
  ├─ Fila se mueve a tab "aprobadas"
  └─ reload()
  ↓
Usuario cliclea "Corregir"
  ├─ Modal edición: "prest" → "prest_" (ej. corregir)
  ├─ POST /api/ai-abbreviations/5/correct/
  │  {corrected_form: "prest_"}
  ├─ Status = "corrected"
  └─ reload()
  ↓
Usuario cliclea "Agregar Diccionario"
  ├─ POST /api/ai-abbreviations/5/add-to-dictionary/
  ├─ Crea automáticamente:
  │  └─ DictionaryEntry(key="prest", value="prestación")
  ├─ Status = "in_dictionary"
  ├─ Ahora está permanente en diccionario
  └─ reload()
  ↓
Bulk Action: "Aprobar todos pendientes"
  ├─ POST /api/ai-abbreviations/bulk-approve/
  │  {all_pending: true}
  ├─ Aprueba todas las 32 pendientes
  ├─ Mostrar progreso
  └─ reload()
  ↓
Bulk Action: "Agregar al diccionario"
  ├─ POST /api/ai-abbreviations/bulk-add-to-dictionary/
  │  {all_approved: true}
  ├─ Crea DictionaryEntry para cada aprobada
  ├─ Mostrar progreso: "Agregando 150..."
  └─ reload()
```

---

## 3. COMPONENTES BACKEND

### 3.1 Apps Django

**dictionary/models.py (2 modelos):**
```
DictionaryEntry
  ├─ id, key (unique), value
  ├─ is_active, created_by, updated_by
  ├─ created_at, updated_at
  └─ Methods: get_full_definition()

AIGeneratedAbbreviation
  ├─ id, original_word, abbreviated_form
  ├─ status (pending|approved|rejected|corrected|in_dictionary)
  ├─ times_used, confidence
  ├─ created_at, updated_at
  ├─ created_by_ai (always True)
  └─ Methods: is_approved(), mark_used()
```

**dictionary/views.py (2 ViewSets):**
```
DictionaryViewSet
  ├─ list()          → GET /dictionary/ (paginado, filtros)
  ├─ create()        → POST /dictionary/
  ├─ retrieve()      → GET /dictionary/{id}/
  ├─ update()        → PATCH /dictionary/{id}/
  ├─ destroy()       → DELETE /dictionary/{id}/
  ├─ toggle_active() → PATCH /dictionary/{id}/toggle-active/
  ├─ export_csv()    → GET /dictionary/export-csv/
  └─ Permissions: Crear/editar solo admin

AIGeneratedAbbreviationViewSet
  ├─ list()          → GET /ai-abbreviations/ (filtros: status, search)
  ├─ summary()       → GET /ai-abbreviations/summary/ (stats)
  ├─ approve()       → POST /ai-abbreviations/{id}/approve/
  ├─ reject()        → POST /ai-abbreviations/{id}/reject/
  ├─ correct()       → POST /ai-abbreviations/{id}/correct/
  ├─ add_to_dictionary() → POST /ai-abbreviations/{id}/add-to-dictionary/
  ├─ bulk_approve()  → POST /ai-abbreviations/bulk-approve/
  ├─ bulk_add()      → POST /ai-abbreviations/bulk-add-to-dictionary/
  └─ Permissions: Todas requieren admin
```

### 3.2 Servicio de IA: `GroqAIService`

**Responsabilidades:**
```
1. Generar sugerencias de renombramiento
2. Abreviar palabras no encontradas en diccionario
3. Validar nombres contra 12 reglas
4. Mantener consistencia de abreviaciones
5. Integrar con API de Groq
```

**Métodos:**

```python
class GroqAIService:
    
    @staticmethod
    def suggest_rename(current_name: str, file_extension: str) -> SuggestionResult:
        """
        Sugerir nombre mejorado basado en 12 reglas
        
        Input: "Nueva_Autorizacion_De_La_Empresa_2025"
        Output: {
          suggested_name: "20250115_autoriz_manif",
          violations: ["Rule 3: conectores", "Rule 9: genéricas"],
          explanation: "...",
          confidence: 95
        }
        """
        1. Normalizar nombre actual
        2. Validar contra 12 reglas → listar violaciones
        3. Preparar contexto para Groq
        4. Llamar Groq con prompt específico
        5. Parsear respuesta
        6. Validar resultado
        7. Retornar SuggestionResult
    
    @staticmethod
    def abbreviate_word(word: str) -> AbbreviationResult:
        """
        Abreviar palabra no encontrada en diccionario.
        
        Input: "prestación"
        Output: {
          original: "prestación",
          abbreviated: "prest",
          confidence: 92,
          reasoning: "primera + última sílaba"
        }
        
        Flujo:
        1. Buscar en DictionaryEntry → encontrado: retornar value
        2. Buscar en AIGeneratedAbbreviation → encontrado: retornar cached
        3. Normalizar palabra (minúsculas, sin tildes)
        4. Llamar Groq para generar abreviación
        5. Guardar en AIGeneratedAbbreviation (status='pending')
        6. Retornar resultado
        """
    
    @staticmethod
    def validate_name(name: str) -> ValidationResult:
        """
        Validar nombre contra 12 reglas.
        
        Retorna:
        {
          is_valid: bool,
          violations: [
            {rule: 1, passed: True},
            {rule: 2, passed: False, details: "Found: 'á'"},
            ...
          ],
          overall_score: 92
        }
        """
    
    @staticmethod
    def get_groq_prompt_for_rename(current_name, violations, file_extension):
        """
        Construir prompt para IA:
        
        Mensaje a Groq:
        ---
        Eres un experto en nomenclatura de archivos empresariales.
        
        El usuario tiene un archivo llamado: "Nueva_Autorizacion_De_La_Empresa_2025"
        
        Debe cumplir estas 12 reglas:
        [listar reglas + ejemplos]
        
        Violaciones detectadas:
        - Regla 3: Contiene conectores (De, La)
        - Regla 1: Contiene mayúsculas
        
        Usando diccionario de términos:
        - autoriz → autorización
        - manifes → manifestación
        
        Sugiere UN SOLO nombre mejorado que:
        1. Cumpla todas las 12 reglas
        2. Use abreviaciones del diccionario
        3. Sea conciso pero descriptivo
        
        Responde SOLO con el nombre sugerido, sin explicación.
        ---
        """
```

### 3.3 Validator: `DictionaryValidator`

```python
class DictionaryValidator:
    
    @staticmethod
    def validate_against_rules(name: str, file_extension: str = None) -> ValidationResult:
        """
        Validar nombre contra 12 reglas
        
        Retorna: {
          is_valid: bool,
          rule_results: {
            1: {passed: True, message: "..."},
            2: {passed: False, message: "Encontrado: á, é"},
            ...
          },
          score: 92,  # Cuántas reglas pasan
          first_violation: 2  # Primera regla que falla
        }
        """
        1. Rule 1: Validar minúsculas: name == name.lower()
        2. Rule 2: Sin tildes: normalizar NFD y validar
        3. Rule 3: Sin conectores: ["a", "y", "de", ...]
        4. Rule 4: Espacios=guiones: verificar pattern
        5. Rule 5: Sin paréntesis/guiones: regex
        6. Rule 6: Solo a-z,0-9,_,.
        7. Rule 7: Sin duplicados: "aa", "ee", etc
        8. Rule 8: Fecha al inicio: YYYYMMDD pattern
        9. Rule 9: Sin genéricas: ["archivo", "final", ...]
        10. Rule 10: Max 50 chars (sin extension)
        11. Rule 11: Sin prefijos: ["nuevo_", "copia_", ...]
        12. Rule 12: Usar abreviaciones: contra diccionario
    
    @staticmethod
    def check_rule_12(name: str) -> RuleCheckResult:
        """
        Verificar regla 12: Usar abreviaciones del diccionario
        
        Lógica:
        1. Extraer palabras del nombre
        2. Para cada palabra:
           ├─ Buscar en DictionaryEntry (oficial)
           ├─ Si encontrado: ✓ cumple
           ├─ Si no encontrado:
           │  └─ Buscar en AIGeneratedAbbreviation
           │     ├─ Si encontrado y approved: ✓ cumple
           │     ├─ Si no existe: ⚠ palabra desconocida
           │     └─ Si pending: ? aún no aprobada
        3. Retornar: {
             passed: bool,
             unknown_words: [lista],
             message: "..."
           }
        """
```

### 3.4 Modelo de Request/Response

```python
# Request para sugerencia
class SuggestRenameRequest:
    current_name: str          # "Nueva_Autorizacion_De_La_Empresa_2025"
    file_extension: str        # ".pdf"
    context: str = None        # "contrato_especial" (opcional)

# Response de sugerencia
class SuggestionResult:
    current_name: str
    suggested_name: str         # "20250115_autoriz_manif.pdf"
    violations: List[str]       # Qué reglas violaba
    explanations: Dict          # Cambios realizados
    confidence: int             # 0-100
    is_valid: bool              # Cumple todas 12 reglas
    alternative_suggestions: List[str]  # Opciones alternativas

# Request para abreviar
class AbbreviateRequest:
    word: str                   # "prestación"

# Response de abreviación
class AbbreviationResult:
    original: str
    abbreviated: str            # "prest"
    source: str                 # "dictionary" | "ai_cache" | "ai_generated"
    confidence: int
    reasoning: str              # Explicación de cómo lo hizo
```

---

## 4. FLUJOS DE VALIDACIÓN

### 4.1 Flujo Completo: Usuario Renombra Archivo

```
Usuario cliclea archivo "Nueva_Autorización" → quiere renombrarlo
  ↓
Frontend abre RenameModal
  ├─ Campo input con nombre actual
  ├─ Botón: "Obtener sugerencia IA"
  └─ Validación en tiempo real
  ↓
Usuario cliclea "Obtener sugerencia IA"
  ↓
POST /api/files/suggest-rename
  {
    current_name: "Nueva_Autorización",
    file_extension: ".pdf"
  }
  ↓
Backend:
  1. Normalizar: "Nueva_Autorización" → "nueva_autorizacion"
  2. Validar contra 12 reglas:
     ├─ Rule 1: ✗ Tenía mayúsculas
     ├─ Rule 2: ✗ Tenía tilde (á)
     ├─ Rule 3: ✗ Tenía "de" (omitido: "de_la")
     ├─ Rule 4-7: ✓ OK
     ├─ Rule 8: ? Sin fecha
     ├─ Rule 9: ✗ Tenía "nueva" (genérica)
     ├─ Rule 10: ✓ OK (< 50 chars)
     ├─ Rule 11: ? Sin prefijo prohibido
     └─ Rule 12: ? Validar "autorizacion" contra diccionario
        └─ Buscar en DictionaryEntry → "autoriz" encontrado
        └─ ✓ Rule 12: OK
  3. Llamar IA para sugerencia:
     prompt = """
     Nombre actual: nueva_autorizacion
     Violations: 1, 2, 3, 9
     Dictionary: autoriz → autorización
     Sugiere nombre cumpliendo 12 reglas
     """
  4. IA retorna: "20250116_autoriz"
  5. Validar resultado: ✓ Todas las reglas OK
  6. Retornar:
     {
       current: "Nueva_Autorización",
       suggested: "20250116_autoriz.pdf",
       violations: ["Rule 1: mayúsculas", "Rule 2: tildes", ...],
       explanation: "Agregada fecha, eliminadas genéricas",
       confidence: 97
     }
  ↓
Frontend:
  ├─ Mostrar nombre actual (rojo: inválido)
  ├─ Mostrar sugerencia (verde: válida)
  ├─ Listar violaciones
  ├─ Mostrar cambios realizados
  └─ Botón "Aceptar sugerencia"
  ↓
Usuario cliclea "Aceptar"
  ├─ Cambiar input a "20250116_autoriz"
  ├─ POST /files/{id}/rename con nuevo nombre
  ├─ AuditLog: RENAME, violaciones corregidas
  └─ Toast: "✓ Archivo renombrado correctamente"
```

### 4.2 Flujo: Abreviación de Palabra Desconocida

```
Usuario sube archivo con nombre que contiene: "gestión"
  ↓
Backend detecta palabra no en diccionario
  ↓
Buscar en AIGeneratedAbbreviation
  ├─ Si existe y aprobada: usar cache
  ├─ Si existe y pending: avisar al usuario
  ├─ Si no existe: generar nueva
  ↓
Generar con IA:
  POST /ai/abbreviate
  {
    word: "gestión"
  }
  ↓
Backend:
  1. Llamar Groq con contexto
  2. IA retorna: {
       abbreviated: "gest",
       confidence: 89,
       reasoning: "primeras 4 letras + regla de vocal final"
     }
  3. Guardar en AIGeneratedAbbreviation:
     {
       original_word: "gestión",
       abbreviated_form: "gest",
       status: "pending",
       created_at: now,
       times_used: 1,
       confidence: 89
     }
  4. Retornar respuesta
  ↓
Frontend:
  ├─ Mostrar nombre generado: "20250116_gest_..."
  ├─ Avisar: "Contiene abreviación pendiente: 'gest' (gestión)"
  ├─ Sugerir: "Un administrador debe aprobar esta abreviación"
  └─ Permitir upload de todos modos
  ↓
Admin revisa ABBREVIATIONs pendientes:
  ├─ Ve: "gestión" → "gest" (usado 15 veces)
  ├─ Cliclea "Aprobar"
  ├─ Status = "approved"
  ├─ Futuras referencias a "gestión" usan "gest" automáticamente
  └─ Opción: "Agregar al Diccionario"
     ├─ Crea DictionaryEntry(key="gest", value="gestión")
     ├─ Status = "in_dictionary"
     └─ Siempre disponible para todos
```

---

## 5. INTEGRACIONES

### 5.1 Integración con Groq (IA externa)

```python
# En backend/services/groq_service.py

class GroqIntegration:
    API_KEY = os.getenv('GROQ_API_KEY')
    MODEL = "mixtral-8x7b-32768"
    
    @classmethod
    def generate_abbreviation(cls, word: str) -> str:
        """Llama a Groq API para abreviar palabra"""
        client = Groq(api_key=cls.API_KEY)
        message = client.messages.create(
            model=cls.MODEL,
            messages=[
                {
                    "role": "user",
                    "content": f"Abrevia esta palabra a 3-5 caracteres, cumpliendo reglas de nomenclatura: {word}"
                }
            ]
        )
        return message.content[0].text.strip()
    
    @classmethod
    def suggest_rename(cls, name: str, violations: List[str]) -> str:
        """Llama a Groq API para sugerir renombramiento"""
        # Similar a anterior, pero con prompt más complejo
```

### 5.2 Integración con Sistema de Archivos

```
Cuando usuario sube archivo:
  1. Validar nombre contra 12 reglas
  2. Detectar palabras desconocidas
  3. Para cada desconocida:
     ├─ Buscar en DictionaryEntry → encontrada: OK
     ├─ Buscar en AIGeneratedAbbreviation → encontrada: OK (pero avisar si pending)
     └─ No encontrada: generar + guardar como pending
  4. Si hay pendientes: avisar admin
  5. Permitir upload con nombre tal cual
```

---

## 6. CACHÉ Y OPTIMIZACIONES

### 6.1 Caché de Diccionario
```
DictionaryEntry (rara cambios):
  ├─ Redis key: "dict:all_entries"
  ├─ TTL: 1 hora
  ├─ Invalidar: al crear/editar/eliminar
  └─ Carga en memoria: primera vez
```

### 6.2 Caché de Abreviaciones
```
AIGeneratedAbbreviation (frecuentes cambios):
  ├─ Redis: "ai_abbrev:{word}" → {abbreviated, status}
  ├─ TTL: 30 minutos
  ├─ Actualizar: cuando se aprueba/rechaza/corrige
  └─ Fallback: query DB si expira
```

### 6.3 Rate Limiting IA
```
Para prevenir abuso:
  ├─ 100 sugerencias/hora por usuario
  ├─ 10 abreviaciones nuevas/hora por usuario
  ├─ Cache local frontend: no pedir 2x mismo nombre
  └─ Mostrar "requerimientos de IA" en dashboard admin
```

---

## 7. SEGURIDAD Y PERMISOS

```
GET /dictionary/        → Cualquier usuario autenticado (lectura)
POST /dictionary/       → Solo SUPERADMIN
PATCH /dictionary/{id}/ → Solo SUPERADMIN
DELETE /dictionary/{id}/ → Solo SUPERADMIN

GET /ai-abbreviations/  → Cualquier usuario autenticado
POST /ai-abbreviations/*/approve → Solo SUPERADMIN
POST /ai-abbreviations/*/reject  → Solo SUPERADMIN
POST /ai-abbreviations/*/add-to-dictionary → Solo SUPERADMIN

POST /files/suggest-rename   → Cualquier usuario
POST /ai/abbreviate          → Cualquier usuario
```

---

## 8. REFERENCIAS CRUZADAS

Ver también:
- [Explorer Architecture](ARQUITECTURA-EXPLORADOR-ARCHIVOS.md)
- [Admin Module](ARQUITECTURA-ADMIN-AUDITORIA.md)
- [Backend Overview](00-SUPER-DIAGRAMA-BACKEND-EXPLICACION.md)

---

## 9. PRÓXIMOS PASOS

1. **Entrenar Modelo Local:** Usar Ollama/LLaMA en lugar de Groq
2. **Diccionario Multiidioma:** Agregar soporte para inglés, francés
3. **Análisis de Tendencias:** Dashboard de palabras más usadas
4. **Integración con OneDrive:** Sincronizar abreviaciones
5. **Machine Learning:** Mejorar confianza de IA con feedback
6. **Auditoría Detallada:** Registrar todas las sugerencias IA
