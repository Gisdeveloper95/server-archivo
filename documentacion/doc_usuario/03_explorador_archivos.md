# 4. Explorador de Archivos

## 4.1 Vista General del Explorador

El **Explorador de Archivos** es la herramienta principal para navegar y gestionar sus archivos:

```
┌─────────────────────────────────────────────────────────────────┐
│                      EXPLORADOR DE ARCHIVOS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📁 Raíz > Documentos > Proyectos                          │  │ ← Breadcrumbs
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🔍 Buscar...  │ 📤 Subir │ 📁 Nueva carpeta │ ⚙️ Opciones  ││ ← Barra de herramientas
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Filtros: Tipo ▼ │ Fecha ▼ │ Tamaño ▼ │ 🔄 Limpiar filtros ││ ← Panel de filtros
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ☐ │ Nombre           ▲ │ Tamaño  │ Modificado  │ Acciones  ││ ← Encabezados
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ☐ │ 📁 Catastro_2025    │ --      │ 07/01/2025  │ ⋮         ││
│  │ ☐ │ 📁 Geodesia         │ --      │ 05/01/2025  │ ⋮         ││ ← Lista de archivos
│  │ ☐ │ 📄 informe.pdf      │ 2.5 MB  │ 07/01/2025  │ ⋮         ││
│  │ ☐ │ 📊 datos.xlsx       │ 1.2 MB  │ 06/01/2025  │ ⋮         ││
│  │ ☐ │ 🖼️ mapa.png         │ 5.8 MB  │ 05/01/2025  │ ⋮         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Mostrando 5 de 127 elementos  │  ◀ 1 2 3 4 5 ... 13 ▶      ││ ← Paginación
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Modos de Vista

Puede cambiar cómo se muestran los archivos:

### Vista de Lista (predeterminada)

```
┌────────────────────────────────────────────────────────────────┐
│ ☐ │ 📁 Catastro_2025    │ --      │ 07/01/2025  │ ⋮           │
│ ☐ │ 📄 informe.pdf      │ 2.5 MB  │ 07/01/2025  │ ⋮           │
│ ☐ │ 📊 datos.xlsx       │ 1.2 MB  │ 06/01/2025  │ ⋮           │
└────────────────────────────────────────────────────────────────┘
```

### Vista de Cuadrícula

```
┌──────────────────────────────────────────────────────────────┐
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐             │
│  │  📁    │  │  📄    │  │  📊    │  │  🖼️    │             │
│  │        │  │  PDF   │  │  XLS   │  │  PNG   │             │
│  │Catastro│  │informe │  │ datos  │  │  mapa  │             │
│  │ 2025   │  │ .pdf   │  │ .xlsx  │  │  .png  │             │
│  └────────┘  └────────┘  └────────┘  └────────┘             │
└──────────────────────────────────────────────────────────────┘
```

### Vista de Árbol

```
┌──────────────────────────────────────────────────────────────┐
│  📁 Raíz                                                      │
│  ├── 📁 Documentos                                            │
│  │   ├── 📁 Proyectos                                         │
│  │   │   ├── 📁 Catastro_2025                                │
│  │   │   └── 📁 Geodesia                                      │
│  │   └── 📁 Informes                                          │
│  ├── 📁 Imágenes                                              │
│  └── 📁 Datos                                                 │
└──────────────────────────────────────────────────────────────┘
```

**Para cambiar la vista:** Use los botones de vista en la barra de herramientas:
- 📋 Lista
- 📱 Cuadrícula
- 🌳 Árbol

## 4.3 Ordenar Archivos

Haga clic en los **encabezados de columna** para ordenar:

| Columna | Ordenamiento |
|---------|--------------|
| **Nombre** | Alfabético (A-Z o Z-A) |
| **Tamaño** | Mayor a menor o viceversa |
| **Fecha modificación** | Más reciente o más antiguo |
| **Tipo** | Por extensión de archivo |

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Nombre ▲     ← Clic aquí ordena de A-Z                        │
│   Nombre ▼     ← Clic de nuevo ordena de Z-A                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

> **💡 Nota**: Las carpetas siempre aparecen primero, antes que los archivos.

## 4.4 Filtrar Archivos

Use los filtros para encontrar archivos específicos:

```
┌─────────────────────────────────────────────────────────────────┐
│                        PANEL DE FILTROS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TIPO DE ARCHIVO:                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ☐ Todos  ☑ PDF  ☐ Excel  ☐ Word  ☐ Imágenes  ☐ ZIP       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  FECHA DE MODIFICACIÓN:                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Desde: [01/01/2025]  Hasta: [07/01/2025]                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  TAMAÑO:                                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ○ Cualquiera  ○ < 1 MB  ○ 1-10 MB  ○ 10-100 MB  ○ > 100 MB│ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐                          │
│  │ ✓ Aplicar     │  │ 🔄 Limpiar    │                          │
│  └───────────────┘  └───────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4.5 Buscar Archivos

### Búsqueda rápida (en carpeta actual)

1. Use la barra de búsqueda en la parte superior
2. Escriba el nombre del archivo
3. Los resultados se filtran automáticamente

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 informe                                                     │
│  ──────────────────────────────────────────────────────────────│
│  Resultados en esta carpeta:                                    │
│                                                                  │
│  📄 20250107_informe_mensual.pdf                                │
│  📄 20250105_informe_catastro.pdf                               │
│  📄 20250103_informe_geodesia.docx                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Búsqueda global

Para buscar en **todo el sistema**:

1. Vaya a **🔍 Buscar** en el menú lateral
2. Escriba su búsqueda
3. Use filtros avanzados si lo necesita

```
┌─────────────────────────────────────────────────────────────────┐
│                      BÚSQUEDA GLOBAL                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔍 [presupuesto 2025                              ] [Buscar]   │
│                                                                  │
│  Filtros: ☐ Solo PDF  ☐ Solo Excel  ☐ Esta semana              │
│                                                                  │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  Encontrados: 15 resultados                                     │
│                                                                  │
│  📄 20250105_presupuesto_2025.xlsx                              │
│     📁 Documentos/Finanzas                                      │
│     Modificado: 05/01/2025                                      │
│                                                                  │
│  📄 20250103_informe_presupuesto.pdf                            │
│     📁 Documentos/Informes                                      │
│     Modificado: 03/01/2025                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4.6 Seleccionar Archivos

### Selección individual
- **Clic** en la casilla de verificación del archivo

### Selección múltiple
- **Ctrl + Clic** para seleccionar archivos específicos
- **Shift + Clic** para seleccionar un rango

### Seleccionar todos
- Clic en la casilla del encabezado
- O presione **Ctrl + A**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ☑ │ Nombre                                                     │  ← Seleccionar todos
│  ───────────────────────────────────────────────────────────────│
│  ☑ │ 📁 Catastro_2025       ← Seleccionado                      │
│  ☐ │ 📁 Geodesia            ← No seleccionado                   │
│  ☑ │ 📄 informe.pdf         ← Seleccionado                      │
│  ☐ │ 📊 datos.xlsx                                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 2 elementos seleccionados │ 📥 Descargar │ 📋 Copiar │ 🗑️ ││ ← Barra de acciones
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4.7 Menú Contextual (Clic Derecho)

Al hacer **clic derecho** sobre un archivo o carpeta, aparece un menú con opciones:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📄 informe.pdf                                                 │
│        ┌────────────────────────────┐                           │
│        │ 👁️ Ver / Abrir             │                           │
│        │ 📥 Descargar               │                           │
│        │ ───────────────────────── │                           │
│        │ ✏️ Renombrar               │                           │
│        │ 📋 Copiar                  │                           │
│        │ ✂️ Cortar                  │                           │
│        │ ───────────────────────── │                           │
│        │ 🔗 Compartir               │                           │
│        │ ⭐ Agregar a favoritos     │                           │
│        │ 🎨 Cambiar color           │   ← Solo para carpetas   │
│        │ ───────────────────────── │                           │
│        │ 🗑️ Eliminar                │                           │
│        └────────────────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4.8 Colores de Carpetas

Puede asignar **colores personalizados** a las carpetas para identificarlas fácilmente:

```
┌─────────────────────────────────────────────────────────────────┐
│                     COLORES DE CARPETAS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Seleccione un color para la carpeta "Catastro_2025":           │
│                                                                  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │ 🟡 │ │ 🔴 │ │ 🟠 │ │ 🟢 │ │ 🔵 │ │ 🟣 │ │ 🩷 │ │ ⬜ │      │
│  │Amar│ │Rojo│ │Nara│ │Verd│ │Azul│ │Mora│ │Rosa│ │Gris│      │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘      │
│                                                                  │
│  Vista previa:                                                   │
│  📁 Catastro_2025  →  🔵 Catastro_2025                          │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐                           │
│  │ ✓ Aplicar     │  │ ✕ Cancelar    │                           │
│  └───────────────┘  └───────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Uso recomendado de colores:**

| Color | Sugerencia de uso |
|-------|-------------------|
| 🔴 Rojo | Urgente / Importante |
| 🟠 Naranja | En revisión |
| 🟢 Verde | Completado / Aprobado |
| 🔵 Azul | En proceso |
| 🟣 Morado | Personal |
| 🟡 Amarillo | Pendiente |

---

*Continúe con la siguiente sección para aprender las operaciones con archivos.*
