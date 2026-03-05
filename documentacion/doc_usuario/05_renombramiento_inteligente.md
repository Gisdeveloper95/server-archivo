# 6. Renombramiento Inteligente

## 6.1 ¿Qué es el Renombramiento Inteligente?

El **Renombramiento Inteligente** es una función asistida por Inteligencia Artificial que le ayuda a nombrar sus archivos siguiendo las normas institucionales del IGAC de manera automática.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ANTES                              DESPUÉS                     │
│   ──────                             ───────                     │
│                                                                  │
│   📄 Informe Final (1).pdf    →     📄 20250107_informe_final.pdf│
│   📄 PRESUPUESTO 2025.xlsx    →     📄 20250107_presupuesto.xlsx │
│   📄 MapaCatastral.png        →     📄 20250107_mapa_catastral.png│
│   📄 datos123.csv             →     📄 20250107_datos.csv        │
│                                                                  │
│   ✓ Nombres estandarizados automáticamente                      │
│   ✓ Fechas agregadas                                            │
│   ✓ Caracteres especiales eliminados                            │
│   ✓ Espacios convertidos a guiones bajos                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6.2 Normas de Nomenclatura IGAC

El sistema aplica automáticamente estas reglas:

### Estructura del nombre de archivo

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   YYYYMMDD_descripcion_del_archivo.extension                     │
│   ────────────────────────────────────────────                   │
│      │              │                    │                       │
│      │              │                    └── Extensión del archivo│
│      │              │                                            │
│      │              └── Descripción en minúsculas                │
│      │                  separada por guiones bajos               │
│      │                                                           │
│      └── Fecha en formato AñoMesDía                              │
│          Ejemplo: 20250107 = 7 de enero de 2025                  │
│                                                                  │
│   Ejemplos válidos:                                              │
│   • 20250107_informe_catastral.pdf                               │
│   • 20250315_mapa_zona_norte.png                                 │
│   • 20241225_presupuesto_anual.xlsx                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Reglas aplicadas

| Regla | Descripción | Ejemplo |
|-------|-------------|---------|
| **Fecha obligatoria** | Todos los archivos deben iniciar con fecha YYYYMMDD | 20250107_... |
| **Sin espacios** | Los espacios se reemplazan por guiones bajos | informe_anual |
| **Minúsculas** | Todo el nombre debe estar en minúsculas | informe (no INFORME) |
| **Sin tildes** | Las tildes se eliminan | catastro (no catástro) |
| **Sin caracteres especiales** | Solo letras, números, guiones y guiones bajos | archivo_1 (no archivo#1) |
| **Sin paréntesis** | Se eliminan paréntesis y su contenido | documento (no documento(1)) |
| **Sin dobles guiones** | No se permiten guiones consecutivos | archivo_nuevo (no archivo__nuevo) |

## 6.3 Usar el Renombramiento Inteligente

### Opción 1: Al subir archivos

Cuando sube un archivo con nombre no válido:

```
┌─────────────────────────────────────────────────────────────────┐
│                  RENOMBRAMIENTO INTELIGENTE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🤖 El sistema ha detectado que el nombre necesita ajustes      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  Archivo original:                                           ││
│  │  📄 Informe Catastral FINAL (revisión 3).pdf                ││
│  │                                                              ││
│  │  ▼ Análisis del nombre ▼                                    ││
│  │                                                              ││
│  │  ✗ Contiene espacios                                        ││
│  │  ✗ Usa mayúsculas                                           ││
│  │  ✗ Tiene paréntesis                                         ││
│  │  ✗ No tiene fecha al inicio                                 ││
│  │                                                              ││
│  │  ▼ Nombre sugerido ▼                                        ││
│  │                                                              ││
│  │  📄 20250107_informe_catastral_final.pdf                    ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ✓ Aplicar       │  │ ✏️ Modificar    │  │ ✕ Mantener orig.│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Opción 2: Renombrar archivo existente

1. Haga clic derecho en el archivo
2. Seleccione **🤖 Renombrar inteligente**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📄 datos_proyecto.xlsx                                         │
│        ┌────────────────────────────┐                           │
│        │ 👁️ Ver / Abrir             │                           │
│        │ 📥 Descargar               │                           │
│        │ ───────────────────────── │                           │
│        │ ✏️ Renombrar               │                           │
│        │ 🤖 Renombrar inteligente ← │                           │
│        │ ───────────────────────── │                           │
│        │ 📋 Copiar                  │                           │
│        └────────────────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Opción 3: Renombramiento en lote

Para renombrar **múltiples archivos** a la vez:

1. Seleccione varios archivos
2. Haga clic en **🤖 Renombrar inteligente** en la barra de acciones

```
┌─────────────────────────────────────────────────────────────────┐
│                RENOMBRAMIENTO EN LOTE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Se renombrarán 5 archivos:                                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ORIGINAL                      →  NUEVO NOMBRE               ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Informe FINAL.pdf             →  20250107_informe_final.pdf ││
│  │ PRESUPUESTO (2).xlsx          →  20250107_presupuesto.xlsx  ││
│  │ Mapa Catastral.png            →  20250107_mapa_catastral.png││
│  │ datos proyecto.csv            →  20250107_datos_proyecto.csv││
│  │ FOTOS REUNION.zip             →  20250107_fotos_reunion.zip ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ☑ Aplicar fecha actual a todos los archivos                    │
│  ☐ Mantener fechas existentes si las tienen                     │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────┐                       │
│  │ ✓ Renombrar todos │  │ ✕ Cancelar    │                       │
│  └───────────────────┘  └───────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6.4 Personalizar la Sugerencia

Si la sugerencia automática no es exactamente lo que necesita:

```
┌─────────────────────────────────────────────────────────────────┐
│               PERSONALIZAR NOMBRE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Sugerencia del sistema:                                         │
│  📄 20250107_informe_catastral_final.pdf                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Personalice el nombre:                                       ││
│  │                                                              ││
│  │ Fecha:        [20250107    ] 📅                              ││
│  │                                                              ││
│  │ Descripción:  [informe_catastral_municipio_bogota        ]  ││
│  │                                                              ││
│  │ Extensión:    .pdf (no editable)                            ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Vista previa:                                                   │
│  📄 20250107_informe_catastral_municipio_bogota.pdf             │
│                                                                  │
│  ✓ Nombre válido según normas IGAC                              │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐                           │
│  │ ✓ Aplicar     │  │ ✕ Cancelar    │                           │
│  └───────────────┘  └───────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6.5 Configuración del Renombramiento Automático

En su **Perfil > Configuración**, puede activar el renombramiento automático:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RENOMBRAMIENTO INTELIGENTE                                      │
│  ─────────────────────────────                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  Renombramiento automático al subir:                         ││
│  │  ┌────────────────────────────────────────────────────────┐ ││
│  │  │ ○ Desactivado - Siempre preguntar                      │ ││
│  │  │ ○ Solo si hay errores - Preguntar cuando hay problemas │ ││
│  │  │ ● Automático - Renombrar sin preguntar                 │ ││
│  │  └────────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  │  Fecha predeterminada:                                       ││
│  │  ┌────────────────────────────────────────────────────────┐ ││
│  │  │ ● Fecha actual del sistema                             │ ││
│  │  │ ○ Fecha de creación del archivo                        │ ││
│  │  │ ○ Preguntar siempre                                    │ ││
│  │  └────────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  │  Notificar cuando se renombre automáticamente:               ││
│  │  [✓] Activado                                                ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌───────────────┐                                              │
│  │ ✓ Guardar     │                                              │
│  └───────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6.6 Indicador de Estado IA

En la esquina inferior del menú lateral puede ver el estado del sistema inteligente:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  MENÚ LATERAL                                                    │
│  ────────────                                                    │
│                                                                  │
│  📊 Inicio                                                       │
│  📁 Explorar                                                     │
│  🔍 Buscar                                                       │
│  ⭐ Favoritos                                                    │
│  🗑️ Papelera                                                     │
│                                                                  │
│  ─────────────                                                   │
│                                                                  │
│  🤖 SISTEMA IA                                                   │
│  ┌─────────────┐                                                 │
│  │ ● Activo    │  ← Verde = Sistema disponible                  │
│  └─────────────┘                                                 │
│                                                                  │
│  ┌─────────────┐                                                 │
│  │ ○ Inactivo  │  ← Gris = Sistema no disponible                │
│  └─────────────┘                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6.7 Ejemplos de Transformaciones

### Ejemplos comunes

| Nombre original | Nombre corregido |
|-----------------|------------------|
| `Informe Final.pdf` | `20250107_informe_final.pdf` |
| `PRESUPUESTO 2025 (v2).xlsx` | `20250107_presupuesto_2025.xlsx` |
| `Mapa_Catastral.PNG` | `20250107_mapa_catastral.png` |
| `datos-proyecto.CSV` | `20250107_datos_proyecto.csv` |
| `FOTO reunión.jpg` | `20250107_foto_reunion.jpg` |
| `Cédula María.pdf` | `20250107_cedula_maria.pdf` |
| `análisis técnico.docx` | `20250107_analisis_tecnico.docx` |

### Casos especiales

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ARCHIVOS CON FECHA EXISTENTE                                    │
│  ────────────────────────────                                    │
│                                                                  │
│  Si el archivo ya tiene una fecha válida al inicio,              │
│  el sistema la preserva:                                         │
│                                                                  │
│  20241215_informe.pdf  →  20241215_informe.pdf (sin cambios)    │
│  2024-12-15_datos.xlsx →  20241215_datos.xlsx (formato ajustado)│
│  15-12-2024_mapa.png   →  20241215_mapa.png (formato ajustado)  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6.8 Preguntas Frecuentes sobre Renombramiento

### ¿Puedo deshacer un renombramiento?

Sí. Después de renombrar, aparecerá una notificación con la opción de deshacer:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ✓ Archivo renombrado exitosamente                              │
│                                                                  │
│  informe.pdf → 20250107_informe.pdf                             │
│                                                                  │
│  ┌──────────────┐                                               │
│  │ ↩️ Deshacer   │  ← Disponible por 30 segundos                 │
│  └──────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ¿Qué pasa si ya existe un archivo con ese nombre?

El sistema agregará un número al final:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ⚠️ Ya existe un archivo con ese nombre                          │
│                                                                  │
│  Archivo existente: 20250107_informe.pdf                        │
│                                                                  │
│  Opciones:                                                       │
│  ○ Agregar número: 20250107_informe_2.pdf                       │
│  ○ Reemplazar archivo existente                                 │
│  ○ Cancelar operación                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ¿Puedo desactivar el renombramiento inteligente?

Sí, desde **Perfil > Configuración > Renombramiento Inteligente** puede desactivarlo completamente. Sin embargo, los archivos deberán cumplir manualmente con las normas IGAC.

---

*Continúe con la siguiente sección para aprender sobre Favoritos y Organización.*
