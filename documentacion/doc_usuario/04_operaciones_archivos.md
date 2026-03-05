# 5. Operaciones con Archivos

## 5.1 Subir Archivos

### Subir un archivo individual

1. Navegue a la carpeta donde desea subir el archivo
2. Haga clic en el botón **📤 Subir**
3. Seleccione el archivo de su computador
4. Espere a que se complete la carga

```
┌─────────────────────────────────────────────────────────────────┐
│                         SUBIR ARCHIVOS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │      ┌────────────────────────────────────────────┐         ││
│  │      │                                            │         ││
│  │      │         📁                                 │         ││
│  │      │                                            │         ││
│  │      │   Arrastre archivos aquí                   │         ││
│  │      │            o                               │         ││
│  │      │   ┌─────────────────────────┐             │         ││
│  │      │   │  Seleccionar archivos   │             │         ││
│  │      │   └─────────────────────────┘             │         ││
│  │      │                                            │         ││
│  │      └────────────────────────────────────────────┘         ││
│  │                                                              ││
│  │  Formatos permitidos: PDF, Word, Excel, imágenes, ZIP       ││
│  │  Tamaño máximo: 100 MB por archivo                          ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Subir múltiples archivos

Puede seleccionar varios archivos a la vez:

1. Haga clic en **📤 Subir**
2. Mantenga presionado **Ctrl** y seleccione varios archivos
3. O arrastre múltiples archivos al área de carga

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROGRESO DE CARGA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Subiendo 3 de 5 archivos...                                    │
│                                                                  │
│  ✓ 20250107_informe_anual.pdf              2.5 MB    Completado │
│  ✓ 20250107_presupuesto.xlsx               1.2 MB    Completado │
│  ⟳ 20250107_presentacion.pptx              5.8 MB    65%  ████░░│
│  ◯ mapa_catastral.png                      8.1 MB    Pendiente  │
│  ◯ datos_geodesia.zip                     15.3 MB    Pendiente  │
│                                                                  │
│  ────────────────────────────────────────────────────────────── │
│  Progreso total: ████████████░░░░░░░░  60%                      │
│                                                                  │
│  ┌───────────────┐                                              │
│  │ ✕ Cancelar    │                                              │
│  └───────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Validación automática de nombres

Al subir archivos, el sistema **valida automáticamente** que el nombre cumpla con las normas IGAC:

```
┌─────────────────────────────────────────────────────────────────┐
│                  VALIDACIÓN DE ARCHIVO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️ El nombre del archivo no cumple con las normas IGAC         │
│                                                                  │
│  Archivo original: Informe Final (1).pdf                        │
│                                                                  │
│  Problemas encontrados:                                          │
│  • ✗ Contiene espacios (debe usar guiones bajos)                │
│  • ✗ Contiene paréntesis (caracteres no permitidos)             │
│  • ✗ No tiene fecha al inicio (formato: YYYYMMDD)               │
│                                                                  │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  💡 Nombre sugerido por el sistema:                              │
│                                                                  │
│     20250107_informe_final.pdf                                   │
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ ✓ Usar sugerencia   │  │ ✏️ Editar nombre    │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

> **💡 Consejo**: Active el **Renombramiento Inteligente** en la configuración para que el sistema corrija automáticamente los nombres sin preguntar.

---

## 5.2 Descargar Archivos

### Descargar un archivo

1. Ubique el archivo que desea descargar
2. Haga clic en el menú **⋮** del archivo
3. Seleccione **📥 Descargar**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📄 20250107_informe_anual.pdf                                  │
│        ┌────────────────────────────┐                           │
│        │ 👁️ Ver / Abrir             │                           │
│        │ 📥 Descargar        ← Clic │                           │
│        │ ───────────────────────── │                           │
│        │ ✏️ Renombrar               │                           │
│        └────────────────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Descargar múltiples archivos (ZIP)

Para descargar varios archivos a la vez:

1. Seleccione los archivos usando las casillas de verificación
2. Haga clic en **📥 Descargar** en la barra de acciones
3. Se descargará un archivo ZIP con todos los archivos seleccionados

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ☑ │ 📄 20250107_informe.pdf                                    │
│  ☑ │ 📊 20250106_datos.xlsx                                     │
│  ☑ │ 🖼️ 20250105_mapa.png                                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 3 elementos seleccionados │ 📥 Descargar como ZIP  │ 🗑️    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  📦 Generando archivo ZIP...                                     │
│  ████████████████████░░░░░░░  75%                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Descargar una carpeta completa

También puede descargar carpetas enteras:

1. Haga clic derecho en la carpeta
2. Seleccione **📥 Descargar como ZIP**
3. Se creará un ZIP con todo el contenido

---

## 5.3 Crear Carpetas

### Crear una nueva carpeta

1. Navegue a la ubicación deseada
2. Haga clic en **📁 Nueva carpeta**
3. Escriba el nombre de la carpeta
4. Presione **Enter** o haga clic en **Crear**

```
┌─────────────────────────────────────────────────────────────────┐
│                      NUEVA CARPETA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Ubicación actual: 📁 Raíz > Documentos > Proyectos             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Nombre de la carpeta:                                        ││
│  │ ┌─────────────────────────────────────────────────────────┐ ││
│  │ │ Catastro_2025                                           │ ││
│  │ └─────────────────────────────────────────────────────────┘ ││
│  │                                                              ││
│  │ 💡 Use guiones bajos (_) en lugar de espacios               ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐                           │
│  │ ✓ Crear       │  │ ✕ Cancelar    │                           │
│  └───────────────┘  └───────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Reglas para nombres de carpetas

| Permitido | No permitido |
|-----------|--------------|
| Letras (a-z, A-Z) | Espacios |
| Números (0-9) | Tildes (á, é, í, ó, ú) |
| Guión bajo (_) | Caracteres especiales (*, ?, <, >) |
| Guión (-) | Puntos al inicio o final |

---

## 5.4 Copiar y Mover Archivos

### Copiar archivos

1. Seleccione los archivos a copiar
2. Haga clic derecho y seleccione **📋 Copiar**
   - O presione **Ctrl + C**
3. Navegue a la carpeta destino
4. Haga clic derecho y seleccione **📋 Pegar**
   - O presione **Ctrl + V**

```
┌─────────────────────────────────────────────────────────────────┐
│                         COPIAR ARCHIVOS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Copiando 3 archivos...                                          │
│                                                                  │
│  Desde: 📁 Documentos/Proyectos                                  │
│  Hacia: 📁 Documentos/Respaldos                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📄 20250107_informe.pdf              ████████████░░  85%    ││
│  │ 📊 20250106_datos.xlsx               ████████████████ 100%  ││
│  │ 🖼️ 20250105_mapa.png                 ██████░░░░░░░░░  40%   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌───────────────┐                                              │
│  │ ✕ Cancelar    │                                              │
│  └───────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Mover archivos

1. Seleccione los archivos a mover
2. Haga clic derecho y seleccione **✂️ Cortar**
   - O presione **Ctrl + X**
3. Navegue a la carpeta destino
4. Haga clic derecho y seleccione **📋 Pegar**
   - O presione **Ctrl + V**

> **⚠️ Importante**: Al mover archivos, estos desaparecen de la ubicación original. Use **Copiar** si necesita mantener el archivo en ambas ubicaciones.

### Arrastrar y soltar

También puede mover archivos arrastrándolos:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📁 Proyectos                         📁 Respaldos              │
│  ├── 📄 informe.pdf  ─────────────→   ├── 📄 informe.pdf       │
│  ├── 📊 datos.xlsx    (arrastrando)   ├── ...                   │
│  └── 🖼️ mapa.png                      └──                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Soltar aquí para mover                                       ││
│  │ Mantener Ctrl para copiar                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5.5 Renombrar Archivos

### Renombrar un archivo

1. Haga clic derecho en el archivo
2. Seleccione **✏️ Renombrar**
3. Escriba el nuevo nombre
4. Presione **Enter** o haga clic fuera del campo

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📄 [20250107_informe_anual.pdf                    ]            │
│       ↑                                                          │
│       Editando nombre...                                         │
│                                                                  │
│  💡 Recuerde: El nombre debe cumplir con las normas IGAC        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Renombrar con ayuda inteligente

Si el nuevo nombre no cumple las normas, el sistema le ayudará:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RENOMBRAR ARCHIVO                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Nombre actual:                                                  │
│  📄 20250107_informe_anual.pdf                                   │
│                                                                  │
│  Nuevo nombre:                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Informe Final Revisado.pdf                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ⚠️ El nombre tiene problemas:                                   │
│  • Contiene espacios                                             │
│  • No tiene formato de fecha                                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🤖 Sugerencia: 20250107_informe_final_revisado.pdf          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌───────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│  │ ✓ Usar sugerencia │  │ Guardar igual   │  │ ✕ Cancelar    │ │
│  └───────────────────┘  └─────────────────┘  └───────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

> **💡 Consejo**: Para un renombramiento más completo, use la función **Renombramiento Inteligente** descrita en la siguiente sección.

---

## 5.6 Eliminar Archivos

### Eliminar archivos (enviar a papelera)

1. Seleccione los archivos a eliminar
2. Haga clic en **🗑️ Eliminar** o presione **Supr**
3. Confirme la eliminación

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIRMAR ELIMINACIÓN                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️ ¿Está seguro que desea eliminar estos elementos?             │
│                                                                  │
│  Se moverán a la papelera:                                       │
│                                                                  │
│  📄 20250107_informe_anual.pdf                                   │
│  📊 20250106_datos_catastro.xlsx                                 │
│  📁 Carpeta_temporal (y todo su contenido)                       │
│                                                                  │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  💡 Los elementos permanecerán en la papelera por 30 días        │
│     antes de eliminarse permanentemente.                         │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────┐                       │
│  │ 🗑️ Eliminar       │  │ ✕ Cancelar    │                       │
│  └───────────────────┘  └───────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Recuperar archivos de la papelera

Los archivos eliminados van a la **Papelera de Reciclaje** donde permanecen 30 días:

1. Vaya a **🗑️ Papelera** en el menú lateral
2. Seleccione los archivos a recuperar
3. Haga clic en **♻️ Restaurar**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAPELERA DE RECICLAJE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │ ♻️ Restaurar todo  │  │ 🗑️ Vaciar papelera │                  │
│  └───────────────────┘  └───────────────────┘                   │
│                                                                  │
│  ☑ │ Nombre                    │ Eliminado    │ Expira         │
│  ───────────────────────────────────────────────────────────────│
│  ☑ │ 📄 informe_anual.pdf      │ 07/01/2025   │ 06/02/2025     │
│  ☐ │ 📊 datos_catastro.xlsx    │ 05/01/2025   │ 04/02/2025     │
│  ☐ │ 📁 Carpeta_temporal       │ 03/01/2025   │ 02/02/2025     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1 elemento seleccionado │ ♻️ Restaurar │ 🗑️ Eliminar        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

> **⚠️ Advertencia**: Vaciar la papelera elimina los archivos **permanentemente**. Esta acción no se puede deshacer.

---

## 5.7 Ver y Previsualizar Archivos

### Previsualización rápida

Haga **doble clic** en un archivo para previsualizarlo:

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISOR DE DOCUMENTOS                           │
├─────────────────────────────────────────────────────────────────┤
│  📄 20250107_informe_catastro.pdf                    ✕ Cerrar   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │                    INFORME CATASTRAL                         ││
│  │                    ─────────────────                         ││
│  │                                                              ││
│  │    1. Introducción                                           ││
│  │                                                              ││
│  │    Este informe presenta los resultados                      ││
│  │    del levantamiento catastral realizado                     ││
│  │    en el municipio de...                                     ││
│  │                                                              ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     Página 1 de 25        │
│  │  ◀   │ │  ▶   │ │  🔍+ │ │  🔍- │                            │
│  └──────┘ └──────┘ └──────┘ └──────┘                            │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐                           │
│  │ 📥 Descargar  │  │ 🖨️ Imprimir   │                           │
│  └───────────────┘  └───────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tipos de archivos soportados

| Tipo | Extensiones | Previsualización |
|------|-------------|------------------|
| **Documentos** | PDF, DOC, DOCX | ✓ Completa |
| **Hojas de cálculo** | XLS, XLSX | ✓ Completa |
| **Imágenes** | PNG, JPG, GIF | ✓ Completa |
| **Texto** | TXT, CSV | ✓ Completa |
| **Comprimidos** | ZIP, RAR | Lista de contenido |
| **Otros** | Cualquier otro | Solo información |

---

## 5.8 Información del Archivo

Para ver los detalles de un archivo:

1. Haga clic derecho en el archivo
2. Seleccione **ℹ️ Propiedades** o **Información**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROPIEDADES DEL ARCHIVO                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📄 20250107_informe_catastro.pdf                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  INFORMACIÓN GENERAL                                         ││
│  │  ───────────────────                                         ││
│  │  Nombre:        20250107_informe_catastro.pdf                ││
│  │  Tipo:          Documento PDF                                ││
│  │  Tamaño:        2.5 MB (2,621,440 bytes)                    ││
│  │  Ubicación:     /Documentos/Proyectos/Catastro_2025         ││
│  │                                                              ││
│  │  FECHAS                                                      ││
│  │  ──────                                                      ││
│  │  Creado:        07/01/2025 09:30:15                         ││
│  │  Modificado:    07/01/2025 14:22:45                         ││
│  │  Accedido:      07/01/2025 16:00:00                         ││
│  │                                                              ││
│  │  PERMISOS                                                    ││
│  │  ────────                                                    ││
│  │  Propietario:   Juan Pérez                                   ││
│  │  Acceso:        Lectura y escritura                          ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌───────────────┐                                              │
│  │ ✓ Cerrar      │                                              │
│  └───────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5.9 Atajos de Teclado para Operaciones

| Acción | Atajo |
|--------|-------|
| Copiar | Ctrl + C |
| Cortar | Ctrl + X |
| Pegar | Ctrl + V |
| Eliminar | Supr o Delete |
| Renombrar | F2 |
| Seleccionar todo | Ctrl + A |
| Deshacer selección | Esc |
| Nueva carpeta | Ctrl + Shift + N |
| Descargar | Ctrl + D |
| Buscar | Ctrl + F |

---

*Continúe con la siguiente sección para aprender sobre el Renombramiento Inteligente.*
