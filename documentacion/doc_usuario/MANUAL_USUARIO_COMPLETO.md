# MANUAL DE USUARIO
## Sistema de Gestión de Archivos IGAC
### Instituto Geográfico Agustín Codazzi

---

| Campo | Valor |
|-------|-------|
| **Versión del Manual** | 1.0.0 |
| **Fecha** | Enero 2025 |
| **Aplicación** | Sistema de Gestión de Archivos NetApp |
| **URL de Acceso** | https://gestionarchivo.igac.gov.co |
| **Soporte** | sistemas@igac.gov.co |

---

## Tabla de Contenido

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Navegación por el Sistema](#3-navegación)
4. [Explorador de Archivos](#4-explorador-de-archivos)
5. [Operaciones con Archivos](#5-operaciones-con-archivos)
6. [Renombramiento Inteligente](#6-renombramiento-inteligente)
7. [Favoritos](#7-favoritos)
8. [Notificaciones y Mensajes](#8-notificaciones-y-mensajes)
9. [Papelera de Reciclaje](#9-papelera-de-reciclaje)
10. [Compartir Archivos](#10-compartir-archivos)
11. [Panel de Administración](#11-panel-de-administración)
12. [Preguntas Frecuentes](#12-preguntas-frecuentes)
13. [Solución de Problemas](#13-solución-de-problemas)

---

# 1. Introducción

## 1.1 ¿Qué es el Sistema de Gestión de Archivos?

El **Sistema de Gestión de Archivos IGAC** es una aplicación web que le permite acceder, organizar y gestionar los archivos almacenados en el servidor institucional de manera segura y eficiente.

### Beneficios principales:

| Beneficio | Descripción |
|-----------|-------------|
| **Acceso desde cualquier lugar** | Ingrese desde su navegador web sin instalar software |
| **Organización inteligente** | Nombres de archivos estandarizados automáticamente |
| **Seguridad** | Control de acceso por usuario y carpeta |
| **Trazabilidad** | Registro de todas las operaciones |
| **Colaboración** | Comparta archivos de forma segura |

## 1.2 ¿Qué puede hacer con este sistema?

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUNCIONALIDADES PRINCIPALES                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   📁 EXPLORAR                    📤 SUBIR                       │
│   Navegue por las carpetas       Cargue archivos desde          │
│   del servidor institucional     su computador                  │
│                                                                  │
│   📥 DESCARGAR                   ✏️ RENOMBRAR                    │
│   Descargue archivos a su        Cambie nombres siguiendo       │
│   computador local               las normas IGAC                │
│                                                                  │
│   📋 COPIAR/MOVER                ⭐ FAVORITOS                    │
│   Organice archivos entre        Marque carpetas de             │
│   carpetas                       acceso frecuente               │
│                                                                  │
│   🔗 COMPARTIR                   🔔 NOTIFICACIONES              │
│   Genere enlaces para            Reciba alertas y               │
│   compartir externamente         mensajes del sistema           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 1.3 Requisitos del Sistema

Para usar el sistema necesita:

| Requisito | Especificación |
|-----------|----------------|
| **Navegador web** | Chrome 90+, Firefox 90+, Edge 90+ o Safari 14+ |
| **Conexión a internet** | Conexión estable (mínimo 1 Mbps) |
| **Resolución de pantalla** | Mínimo 1280 x 720 píxeles |
| **Cuenta de usuario** | Proporcionada por el administrador del sistema |

## 1.4 Roles de Usuario

Dependiendo de su rol, tendrá acceso a diferentes funcionalidades:

| Rol | Permisos |
|-----|----------|
| **Solo Consulta** | Ver y descargar archivos |
| **Consulta y Edición** | Ver, descargar, subir y modificar archivos |
| **Administrador** | Gestionar usuarios y permisos |
| **Super Administrador** | Acceso completo al sistema |

---

## 1.5 Estructura de la Interfaz

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 IGAC                              🔔  👤 Juan Pérez  🚪    │
├─────────────┬───────────────────────────────────────────────────┤
│             │                                                    │
│  📊 Inicio  │   ┌─────────────────────────────────────────────┐ │
│             │   │ 📁 Raíz > Documentos > Proyectos            │ │
│  📁 Explorar│   ├─────────────────────────────────────────────┤ │
│             │   │                                              │ │
│  🔍 Buscar  │   │  📁 Catastro_2025                           │ │
│             │   │  📁 Geodesia                                 │ │
│  ⭐ Favoritos│   │  📄 20250107_informe_anual.pdf              │ │
│             │   │  📄 20250105_presupuesto.xlsx               │ │
│  🔔 Alertas │   │                                              │ │
│             │   │                                              │ │
│  💬 Mensajes│   └─────────────────────────────────────────────┘ │
│             │                                                    │
│  ───────────│   ┌─────────────────────────────────────────────┐ │
│             │   │ Seleccionados: 2  │ 📥 📤 ✏️ 🗑️ │ │ │
│  🤖 IA      │   └─────────────────────────────────────────────┘ │
│  ○ Activo   │                                                    │
│             │                                                    │
└─────────────┴───────────────────────────────────────────────────┘
     MENÚ                      ÁREA DE TRABAJO
    LATERAL
```

### Elementos de la interfaz:

| Elemento | Ubicación | Función |
|----------|-----------|---------|
| **Logo IGAC** | Superior izquierda | Volver al inicio |
| **Campana** | Superior derecha | Ver notificaciones |
| **Nombre de usuario** | Superior derecha | Información de su cuenta |
| **Botón salir** | Superior derecha | Cerrar sesión |
| **Menú lateral** | Izquierda | Navegación principal |
| **Área de trabajo** | Centro | Contenido de la página actual |
| **Widget IA** | Inferior izquierda | Estado del sistema inteligente |

---

*Continúe con la siguiente sección para aprender a acceder al sistema.*



---


# 2. Acceso al Sistema

## 2.1 Iniciar Sesión

### Paso a paso para ingresar:

```
┌─────────────────────────────────────────────────────────────────┐
│                     PROCESO DE INICIO DE SESIÓN                  │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │ 1. ABRIR     │
    │ NAVEGADOR    │
    │              │
    │ Chrome, Edge │
    │ o Firefox    │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ 2. IR A      │
    │ LA DIRECCIÓN │
    │              │
    │ gestionarchivo│
    │ .igac.gov.co │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────────────────────────┐
    │ 3. PANTALLA DE INICIO DE SESIÓN      │
    │ ┌──────────────────────────────────┐ │
    │ │                                  │ │
    │ │    🏛️ Sistema de Gestión         │ │
    │ │       de Archivos IGAC           │ │
    │ │                                  │ │
    │ │  Usuario:                        │ │
    │ │  ┌────────────────────────────┐  │ │
    │ │  │ juan.perez                 │  │ │
    │ │  └────────────────────────────┘  │ │
    │ │                                  │ │
    │ │  Contraseña:                     │ │
    │ │  ┌────────────────────────────┐  │ │
    │ │  │ ••••••••••                 │  │ │
    │ │  └────────────────────────────┘  │ │
    │ │                                  │ │
    │ │  ┌────────────────────────────┐  │ │
    │ │  │      INICIAR SESIÓN        │  │ │
    │ │  └────────────────────────────┘  │ │
    │ │                                  │ │
    │ │  ¿Olvidó su contraseña?          │ │
    │ │                                  │ │
    │ └──────────────────────────────────┘ │
    └──────────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │ 4. INGRESAR  │
    │ CREDENCIALES │
    │              │
    │ Usuario y    │
    │ contraseña   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ 5. CLIC EN   │
    │ "INICIAR     │
    │ SESIÓN"      │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ ✅ LISTO     │
    │ Bienvenido   │
    │ al sistema   │
    └──────────────┘
```

### Credenciales de acceso

- **Usuario**: Proporcionado por el administrador (generalmente su nombre.apellido)
- **Contraseña**: Proporcionada inicialmente, debe cambiarla en su primer acceso

> **⚠️ Importante**: No comparta su contraseña con nadie. Cada acción en el sistema queda registrada con su usuario.

---

## 2.2 Recuperar Contraseña

Si olvidó su contraseña, siga estos pasos:

```
┌─────────────────────────────────────────────────────────────────┐
│                RECUPERACIÓN DE CONTRASEÑA                        │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │ 1. CLIC EN   │     │ 2. INGRESAR  │     │ 3. REVISAR   │
    │ "¿Olvidó su  │────►│ SU CORREO    │────►│ SU EMAIL     │
    │ contraseña?" │     │ ELECTRÓNICO  │     │              │
    └──────────────┘     └──────────────┘     └──────────────┘
                                                      │
                                                      ▼
    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │ 6. ¡LISTO!   │     │ 5. CREAR     │     │ 4. CLIC EN   │
    │ Use su nueva │◄────│ NUEVA        │◄────│ ENLACE DEL   │
    │ contraseña   │     │ CONTRASEÑA   │     │ CORREO       │
    └──────────────┘     └──────────────┘     └──────────────┘
```

### Requisitos de la nueva contraseña:

| Requisito | Descripción |
|-----------|-------------|
| Mínimo 8 caracteres | La contraseña debe tener al menos 8 caracteres |
| Una mayúscula | Debe incluir al menos una letra mayúscula |
| Un número | Debe incluir al menos un número |
| Un carácter especial | Debe incluir al menos un símbolo (!@#$%&*) |

---

## 2.3 Cerrar Sesión

Para cerrar sesión de forma segura:

1. Haga clic en el **icono de puerta** (🚪) en la esquina superior derecha
2. O haga clic en su **nombre de usuario** y seleccione "Cerrar sesión"

```
┌─────────────────────────────────────────────────────────────────┐
│                                    🔔  👤 Juan Pérez ▼  🚪     │
│                                         ┌────────────────┐      │
│                                         │ 👤 Mi perfil   │      │
│                                         │ 🔑 Cambiar clave│     │
│                                         │ ─────────────── │     │
│                                         │ 🚪 Cerrar sesión│     │
│                                         └────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

> **💡 Consejo**: Siempre cierre sesión cuando use un computador compartido.

---

# 3. Navegación por el Sistema

## 3.1 Página de Inicio (Dashboard)

Al iniciar sesión, verá su **Dashboard** o página de inicio:

```
┌─────────────────────────────────────────────────────────────────┐
│                        PÁGINA DE INICIO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  👋 Bienvenido, Juan Pérez                               │   │
│   │  Último acceso: 07 de enero 2025, 08:30 AM              │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│   │ 📁 EXPLORAR   │  │ ⭐ FAVORITOS  │  │ 📊 MI ACTIVIDAD│      │
│   │               │  │               │  │               │      │
│   │ Ir al         │  │ Acceso rápido │  │ Últimas       │      │
│   │ explorador    │  │ a carpetas    │  │ operaciones   │      │
│   │ de archivos   │  │ marcadas      │  │ realizadas    │      │
│   └───────────────┘  └───────────────┘  └───────────────┘      │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ ⭐ MIS FAVORITOS                                         │   │
│   │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
│   │ │📁 Catastro│ │📁 Geodesia│ │📁 Informes│ │📁 Proyectos│   │   │
│   │ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 📋 ACTIVIDAD RECIENTE                                    │   │
│   │ • Subió: informe_enero.pdf                    Hace 2h   │   │
│   │ • Descargó: datos_catastro.xlsx               Hace 5h   │   │
│   │ • Creó carpeta: Proyectos_2025                Ayer      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 3.2 Menú de Navegación

El menú lateral izquierdo le permite acceder a todas las secciones:

```
┌─────────────────────┐
│                     │
│  📊 Inicio          │  ← Página principal con resumen
│                     │
│  📁 Explorar        │  ← Navegador de archivos
│                     │
│  🔍 Buscar          │  ← Búsqueda global
│                     │
│  ⭐ Favoritos       │  ← Sus carpetas marcadas
│                     │
│  🔔 Notificaciones  │  ← Alertas del sistema
│                     │
│  💬 Mensajes        │  ← Comunicación interna
│                     │
│  ─────────────────  │
│                     │
│  📖 Diccionario     │  ← Términos y abreviaciones
│                     │
│  ❓ Ayuda Renombrado│  ← Asistente de nombres
│                     │
│  ─────────────────  │
│                     │
│  🤖 Sistema IA      │  ← Estado del asistente
│  ● Activo           │
│                     │
└─────────────────────┘
```

### Opciones adicionales según su rol:

| Rol | Opciones adicionales |
|-----|---------------------|
| **Administrador** | Usuarios, Estadísticas, Auditoría |
| **Super Administrador** | Todo lo anterior + Papelera, Administración, Enlaces Compartidos |

## 3.3 Navegación con Breadcrumbs

Los **breadcrumbs** (migas de pan) le muestran dónde se encuentra y permiten regresar a carpetas anteriores:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📁 Raíz  >  📁 Documentos  >  📁 Proyectos  >  📁 2025         │
│                                                                  │
│  Clic en cualquier nivel para ir a esa carpeta                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Ejemplo de uso:**
- Está en: `Raíz > Documentos > Proyectos > 2025`
- Quiere volver a "Documentos"
- Simplemente haga clic en "Documentos" en los breadcrumbs

## 3.4 Atajos de Teclado

| Tecla | Función |
|-------|---------|
| `Ctrl + F` | Abrir búsqueda |
| `Ctrl + U` | Subir archivos |
| `Ctrl + A` | Seleccionar todo |
| `Delete` | Eliminar selección |
| `Escape` | Cancelar / Cerrar modal |
| `Enter` | Abrir archivo/carpeta seleccionado |
| `Backspace` | Ir a carpeta anterior |

---

## 3.5 Cambiar Tema (Claro/Oscuro)

El sistema soporta modo claro y oscuro. Para cambiar:

1. Haga clic en su **nombre de usuario** en la esquina superior derecha
2. Seleccione **"Cambiar tema"**

```
┌──────────────────────────────────────┐
│                                      │
│   MODO CLARO ☀️        MODO OSCURO 🌙│
│                                      │
│  ┌────────────────┐  ┌────────────────┐
│  │ Fondo blanco   │  │ Fondo oscuro   │
│  │ Texto negro    │  │ Texto claro    │
│  │                │  │                │
│  │ Ideal para     │  │ Ideal para     │
│  │ oficinas       │  │ trabajar de    │
│  │ iluminadas     │  │ noche          │
│  └────────────────┘  └────────────────┘
│                                      │
└──────────────────────────────────────┘
```

---

*Continúe con la siguiente sección para aprender a usar el explorador de archivos.*



---


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



---


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



---


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



---


# 7. Favoritos, Papelera y Compartir

## 7.1 Carpetas Favoritas

Los **Favoritos** le permiten acceder rápidamente a las carpetas que usa con más frecuencia.

### Agregar a favoritos

1. Navegue a la carpeta que desea marcar
2. Haga clic derecho y seleccione **⭐ Agregar a favoritos**
   - O haga clic en el ícono de estrella ☆ junto al nombre

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📁 Raíz > Documentos > Proyectos > Catastro_2025               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  📁 Catastro_2025  ☆                                        ││
│  │                    ↑                                         ││
│  │                    Clic para agregar a favoritos            ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Después de marcar:                                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  📁 Catastro_2025  ⭐  ← Ahora es favorito                   ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Ver carpetas favoritas

Acceda a sus favoritos desde el menú lateral:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  MENÚ LATERAL                 │        FAVORITOS                 │
│  ────────────                 │        ─────────                 │
│                               │                                  │
│  📊 Inicio                    │  ┌─────────────────────────────┐│
│  📁 Explorar                  │  │                              ││
│  🔍 Buscar                    │  │  Sus carpetas favoritas:     ││
│  ⭐ Favoritos  ← Clic aquí    │  │                              ││
│  🔔 Alertas                   │  │  ⭐ 📁 Catastro_2025         ││
│  💬 Mensajes                  │  │  ⭐ 📁 Proyectos_Geodesia    ││
│  🗑️ Papelera                  │  │  ⭐ 📁 Informes_Mensuales    ││
│                               │  │  ⭐ 📁 Datos_Importantes     ││
│                               │  │                              ││
│                               │  │  Clic en cualquier carpeta   ││
│                               │  │  para ir directamente         ││
│                               │  │                              ││
│                               │  └─────────────────────────────┘│
│                               │                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Quitar de favoritos

1. Vaya a **⭐ Favoritos** en el menú lateral
2. Haga clic derecho en la carpeta
3. Seleccione **Quitar de favoritos**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ⭐ 📁 Catastro_2025                                             │
│        ┌────────────────────────────┐                           │
│        │ 📂 Abrir carpeta           │                           │
│        │ ───────────────────────── │                           │
│        │ ⭐ Quitar de favoritos  ← │                           │
│        └────────────────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7.2 Papelera de Reciclaje

La **Papelera** almacena los archivos eliminados durante **30 días** antes de borrarlos permanentemente.

### Ver la papelera

1. Haga clic en **🗑️ Papelera** en el menú lateral

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAPELERA DE RECICLAJE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Estadísticas de la papelera:                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Elementos: 15  │  Tamaño total: 45.2 MB  │  Expiran: 30 días││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │ ♻️ Restaurar todo  │  │ 🗑️ Vaciar papelera │                  │
│  └───────────────────┘  └───────────────────┘                   │
│                                                                  │
│  ☐ │ Nombre                    │ Ubicación orig.   │ Expira     │
│  ───────────────────────────────────────────────────────────────│
│  ☐ │ 📄 informe_antiguo.pdf    │ /Documentos       │ 06/02/2025 │
│  ☐ │ 📊 datos_2024.xlsx        │ /Datos            │ 04/02/2025 │
│  ☐ │ 📁 Carpeta_temporal       │ /Proyectos        │ 02/02/2025 │
│  ☐ │ 🖼️ imagen_borrador.png    │ /Imágenes         │ 31/01/2025 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Restaurar archivos

Para recuperar archivos eliminados:

1. Seleccione los archivos a restaurar
2. Haga clic en **♻️ Restaurar**

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESTAURAR ARCHIVOS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ♻️ ¿Restaurar los archivos seleccionados?                       │
│                                                                  │
│  Los siguientes elementos se restaurarán a su ubicación original:│
│                                                                  │
│  📄 informe_antiguo.pdf    →  /Documentos                       │
│  📊 datos_2024.xlsx        →  /Datos                            │
│                                                                  │
│  ⚠️ Si la carpeta original ya no existe, se creará nuevamente.  │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐                           │
│  │ ♻️ Restaurar   │  │ ✕ Cancelar    │                           │
│  └───────────────┘  └───────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Eliminar permanentemente

> **⚠️ ADVERTENCIA**: Esta acción es **irreversible**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ELIMINAR PERMANENTEMENTE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️ ¿Está seguro de eliminar PERMANENTEMENTE estos archivos?     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  Esta acción NO se puede deshacer.                           ││
│  │  Los archivos se perderán para siempre.                      ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Archivos a eliminar:                                            │
│  📄 informe_antiguo.pdf                                          │
│  📊 datos_2024.xlsx                                              │
│                                                                  │
│  ┌───────────────────────┐  ┌───────────────┐                   │
│  │ 🗑️ Eliminar permanente │  │ ✕ Cancelar    │                   │
│  └───────────────────────┘  └───────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Vaciar la papelera

Para eliminar **todos** los elementos de la papelera:

1. Haga clic en **🗑️ Vaciar papelera**
2. Confirme la acción

```
┌─────────────────────────────────────────────────────────────────┐
│                    VACIAR PAPELERA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️ ¿Vaciar toda la papelera?                                    │
│                                                                  │
│  Se eliminarán PERMANENTEMENTE:                                  │
│                                                                  │
│  • 15 archivos                                                   │
│  • 3 carpetas                                                    │
│  • Tamaño total: 45.2 MB                                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ⚠️ Esta acción NO se puede deshacer                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌────────────────────┐  ┌───────────────┐                      │
│  │ 🗑️ Sí, vaciar todo  │  │ ✕ Cancelar    │                      │
│  └────────────────────┘  └───────────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7.3 Compartir Archivos

Puede compartir archivos con otras personas generando **enlaces de descarga**.

### Compartir un archivo

1. Haga clic derecho en el archivo
2. Seleccione **🔗 Compartir**

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPARTIR ARCHIVO                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📄 20250107_informe_catastro.pdf                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  CONFIGURACIÓN DEL ENLACE                                    ││
│  │  ─────────────────────────                                   ││
│  │                                                              ││
│  │  Expiración del enlace:                                      ││
│  │  ┌──────────────────────────────────────────────────────┐   ││
│  │  │ ○ 24 horas                                           │   ││
│  │  │ ● 7 días                                             │   ││
│  │  │ ○ 30 días                                            │   ││
│  │  │ ○ Sin expiración                                     │   ││
│  │  └──────────────────────────────────────────────────────┘   ││
│  │                                                              ││
│  │  Proteger con contraseña:                                    ││
│  │  [✓] Activar                                                 ││
│  │  Contraseña: [••••••••           ]                          ││
│  │                                                              ││
│  │  Límite de descargas:                                        ││
│  │  [10          ] descargas máximas (0 = ilimitado)           ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌───────────────────┐  ┌───────────────┐                       │
│  │ 🔗 Generar enlace │  │ ✕ Cancelar    │                       │
│  └───────────────────┘  └───────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Copiar enlace generado

Una vez generado, puede copiar el enlace:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENLACE GENERADO                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✓ Enlace creado exitosamente                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ https://gestionarchivo.igac.gov.co/s/aB3cD4eF5gH6           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │ 📋 Copiar    │  │ 📧 Enviar    │                             │
│  └──────────────┘  └──────────────┘                             │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Detalles del enlace:                                            │
│  • Archivo: 20250107_informe_catastro.pdf                       │
│  • Expira: 14/01/2025                                           │
│  • Contraseña: Sí                                               │
│  • Descargas restantes: 10                                       │
│                                                                  │
│  ┌───────────────┐                                              │
│  │ ✓ Cerrar      │                                              │
│  └───────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Gestionar enlaces compartidos

Para ver y administrar todos sus enlaces:

1. Vaya a **🔗 Compartidos** en el menú (si está disponible)
2. O acceda desde **Perfil > Mis enlaces compartidos**

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIS ENLACES COMPARTIDOS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Archivo              │ Creado     │ Expira     │ Descargas │ ⚙️│
│  ─────────────────────────────────────────────────────────────  │
│  📄 informe.pdf       │ 07/01/2025 │ 14/01/2025 │ 3/10      │ ⋮ │
│  📊 datos.xlsx        │ 05/01/2025 │ 12/01/2025 │ 5/5 ✓     │ ⋮ │
│  📁 proyecto.zip      │ 03/01/2025 │ Expirado   │ 2/∞       │ ⋮ │
│                                                                  │
│  Acciones disponibles:                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 📋 Copiar enlace │ ✏️ Editar │ 🔄 Renovar │ 🗑️ Eliminar │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Compartir carpeta completa

También puede compartir carpetas enteras:

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPARTIR CARPETA                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📁 Catastro_2025 (15 archivos, 45.2 MB)                        │
│                                                                  │
│  El destinatario recibirá:                                       │
│                                                                  │
│  ○ Un archivo ZIP con todo el contenido                         │
│  ● Acceso a explorar la carpeta en línea                        │
│                                                                  │
│  Permisos del destinatario:                                      │
│                                                                  │
│  [✓] Ver archivos                                               │
│  [✓] Descargar archivos                                         │
│  [ ] Subir archivos (requiere cuenta)                           │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────┐                       │
│  │ 🔗 Generar enlace │  │ ✕ Cancelar    │                       │
│  └───────────────────┘  └───────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7.4 Resumen de Acciones

| Función | Cómo acceder | Descripción |
|---------|--------------|-------------|
| **Agregar a favoritos** | Clic derecho > ⭐ Favoritos | Acceso rápido a carpetas frecuentes |
| **Ver favoritos** | Menú > ⭐ Favoritos | Lista de carpetas marcadas |
| **Ver papelera** | Menú > 🗑️ Papelera | Archivos eliminados (30 días) |
| **Restaurar** | Papelera > Seleccionar > ♻️ | Recuperar archivos eliminados |
| **Vaciar papelera** | Papelera > 🗑️ Vaciar | Eliminar permanentemente todo |
| **Compartir archivo** | Clic derecho > 🔗 Compartir | Generar enlace de descarga |
| **Gestionar enlaces** | Perfil > Mis enlaces | Ver/editar enlaces activos |

---

*Continúe con la siguiente sección para aprender sobre Notificaciones y Mensajes.*



---


# 8. Notificaciones y Mensajes

## 8.1 Sistema de Notificaciones

El sistema le mantiene informado sobre eventos importantes mediante **notificaciones** en tiempo real.

### Tipos de notificaciones

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIPOS DE NOTIFICACIONES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ℹ️ INFORMACIÓN                                                  │
│  ─────────────                                                   │
│  Eventos informativos generales                                  │
│  Ejemplo: "Su archivo se ha subido correctamente"               │
│                                                                  │
│  ✓ ÉXITO                                                        │
│  ───────                                                        │
│  Operaciones completadas exitosamente                           │
│  Ejemplo: "Archivo renombrado correctamente"                    │
│                                                                  │
│  ⚠️ ADVERTENCIA                                                  │
│  ─────────────                                                   │
│  Situaciones que requieren su atención                          │
│  Ejemplo: "El archivo será eliminado en 3 días"                 │
│                                                                  │
│  ❌ ERROR                                                        │
│  ────────                                                        │
│  Problemas que impiden una operación                            │
│  Ejemplo: "No se pudo subir el archivo"                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Ver notificaciones

Haga clic en el ícono de **🔔 campana** en la barra superior:

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 IGAC                              🔔 3  👤 Juan Pérez  🚪   │
│                                        ↑                        │
│                                        Número de notificaciones │
│                                        sin leer                  │
└─────────────────────────────────────────────────────────────────┘

                            ↓ Clic en la campana

┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICACIONES                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ● ✓ Archivo subido exitosamente                 Hace 5 min  ││
│  │     20250107_informe.pdf se ha subido a /Documentos         ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ● ⚠️ Enlace por expirar                         Hace 1 hora ││
│  │     El enlace de datos.xlsx expira mañana                   ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ● ℹ️ Nuevo mensaje del administrador            Hace 2 horas││
│  │     Mantenimiento programado para el viernes               ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ○ ✓ Carpeta creada                              Ayer        ││
│  │     Catastro_2025 creada en /Proyectos                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ● = No leída    ○ = Leída                                      │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │ ✓ Marcar leídas   │  │ Ver todas         │                   │
│  └───────────────────┘  └───────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Centro de notificaciones

Para ver el historial completo, vaya a **🔔 Alertas** en el menú lateral:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CENTRO DE ALERTAS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Filtrar por:  [Todas ▼]  [Esta semana ▼]                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  HOY                                                         ││
│  │  ────                                                        ││
│  │  09:30  ✓  Archivo subido: 20250107_informe.pdf             ││
│  │  09:15  ✓  Sesión iniciada desde Chrome/Windows             ││
│  │                                                              ││
│  │  AYER                                                        ││
│  │  ────                                                        ││
│  │  16:45  ⚠️ Archivo movido a papelera: datos_antiguos.xlsx   ││
│  │  14:20  ✓  Carpeta creada: Catastro_2025                    ││
│  │  10:00  ℹ️ Mensaje del sistema: Actualización disponible    ││
│  │                                                              ││
│  │  ESTA SEMANA                                                 ││
│  │  ───────────                                                 ││
│  │  05/01  ✓  3 archivos renombrados automáticamente           ││
│  │  04/01  ℹ️ Enlace compartido descargado 5 veces             ││
│  │  03/01  ⚠️ Intento de acceso desde ubicación desconocida    ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Mostrando 10 de 45 alertas  │  ◀ 1 2 3 4 5 ▶                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8.2 Sistema de Mensajes

Los **mensajes** son comunicaciones importantes enviadas por el administrador del sistema o generadas automáticamente.

### Ver mensajes

Acceda a través de **💬 Mensajes** en el menú lateral:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BANDEJA DE MENSAJES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Recibidos (3)  │  Enviados  │  Importantes  │  Archivados      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ● De: Administrador del Sistema           07/01/2025 08:00  ││
│  │   Asunto: Mantenimiento programado                          ││
│  │   El sistema estará en mantenimiento el viernes de 22:00... ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ● De: Sistema Automático                  05/01/2025 10:30  ││
│  │   Asunto: Resumen semanal de actividad                      ││
│  │   Esta semana usted subió 15 archivos y descargó 8...       ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ○ De: Administrador del Sistema           03/01/2025 14:00  ││
│  │   Asunto: Bienvenido al nuevo sistema                       ││
│  │   Hemos actualizado el sistema de gestión de archivos...    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ● = No leído    ○ = Leído                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Leer un mensaje

Haga clic en cualquier mensaje para abrirlo:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MENSAJE                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  De:      Administrador del Sistema                             │
│  Fecha:   07/01/2025 08:00                                      │
│  Asunto:  Mantenimiento programado                              │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Estimados usuarios,                                             │
│                                                                  │
│  Les informamos que el sistema estará en mantenimiento          │
│  programado el próximo viernes 10 de enero de 2025, desde       │
│  las 22:00 hasta las 02:00 del sábado.                          │
│                                                                  │
│  Durante este período:                                           │
│  • El sistema no estará disponible                              │
│  • Las descargas en progreso se cancelarán                      │
│  • Los enlaces compartidos seguirán funcionando                 │
│                                                                  │
│  Recomendamos guardar su trabajo antes de las 21:30.            │
│                                                                  │
│  Atentamente,                                                    │
│  Equipo de Sistemas IGAC                                        │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ ↩️ Responder  │  │ ⭐ Importante │  │ 📁 Archivar  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Marcar como importante

Para no perder mensajes importantes:

1. Abra el mensaje
2. Haga clic en **⭐ Importante**
3. El mensaje aparecerá en la pestaña "Importantes"

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ⭐ Mensaje marcado como importante                              │
│                                                                  │
│  Puede encontrarlo en la pestaña "Importantes"                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8.3 Configurar Notificaciones

Personalice qué notificaciones desea recibir:

1. Vaya a **Perfil > Configuración > Notificaciones**

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURACIÓN DE NOTIFICACIONES               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NOTIFICACIONES EN LA APLICACIÓN                                 │
│  ──────────────────────────────                                  │
│                                                                  │
│  [✓] Archivos subidos exitosamente                              │
│  [✓] Archivos eliminados                                        │
│  [✓] Archivos renombrados automáticamente                       │
│  [✓] Enlaces compartidos próximos a expirar                     │
│  [✓] Enlaces compartidos descargados                            │
│  [ ] Inicio de sesión desde nuevo dispositivo                   │
│  [✓] Mensajes del administrador                                 │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  NOTIFICACIONES POR CORREO                                       │
│  ─────────────────────────                                       │
│                                                                  │
│  [✓] Resumen semanal de actividad                               │
│  [ ] Cada archivo subido                                        │
│  [✓] Alertas de seguridad                                       │
│  [✓] Mensajes importantes del administrador                     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  FRECUENCIA DE RESÚMENES                                         │
│  ───────────────────────                                         │
│                                                                  │
│  ○ Diario                                                       │
│  ● Semanal                                                      │
│  ○ Mensual                                                      │
│  ○ Nunca                                                        │
│                                                                  │
│  ┌───────────────┐                                              │
│  │ ✓ Guardar     │                                              │
│  └───────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8.4 Notificaciones en Tiempo Real

Las notificaciones aparecen automáticamente mientras usa el sistema:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ✓ Archivo subido exitosamente                        ✕    │ │
│  │   20250107_informe.pdf                                    │ │
│  │   ─────────────────────────────────────────────           │ │
│  │   Se desvanece en 5 segundos...                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Las notificaciones aparecen en la esquina superior derecha     │
│  y desaparecen automáticamente después de unos segundos.        │
│                                                                  │
│  Puede hacer clic en ✕ para cerrarlas inmediatamente.           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Notificaciones apiladas

Si ocurren varias notificaciones seguidas:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         ┌──────────────────────────────────────┐│
│                         │ ✓ 3 archivos subidos          ✕     ││
│                         │   informe.pdf, datos.xlsx, mapa.png ││
│                         └──────────────────────────────────────┘│
│                         ┌──────────────────────────────────────┐│
│                         │ ✓ Carpeta creada              ✕     ││
│                         │   Catastro_2025                     ││
│                         └──────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8.5 Alertas de Seguridad

El sistema le notificará sobre eventos de seguridad importantes:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALERTA DE SEGURIDAD                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️ Inicio de sesión desde nueva ubicación                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  Detectamos un inicio de sesión desde una ubicación         ││
│  │  que no reconocemos:                                         ││
│  │                                                              ││
│  │  📍 Ubicación: Bogotá, Colombia                              ││
│  │  💻 Dispositivo: Chrome en Windows 11                        ││
│  │  🕐 Fecha/Hora: 07/01/2025 14:30                             ││
│  │  🌐 IP: 190.xxx.xxx.xxx                                      ││
│  │                                                              ││
│  │  ¿Fue usted?                                                 ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────────────────┐           │
│  │ ✓ Sí, fui yo    │  │ ⚠️ No, asegurar mi cuenta   │           │
│  └─────────────────┘  └─────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tipos de alertas de seguridad

| Alerta | Descripción |
|--------|-------------|
| **Nuevo dispositivo** | Inicio de sesión desde navegador/dispositivo nuevo |
| **Nueva ubicación** | Acceso desde IP o ciudad diferente |
| **Múltiples intentos** | Varios intentos de contraseña incorrecta |
| **Cambio de contraseña** | Confirmación de cambio de contraseña |
| **Sesión cerrada** | Su sesión fue cerrada en otro dispositivo |

---

## 8.6 Resumen de Iconos

| Ícono | Significado |
|-------|-------------|
| 🔔 | Centro de notificaciones |
| 💬 | Mensajes |
| ● | No leído |
| ○ | Leído |
| ✓ | Éxito/Completado |
| ⚠️ | Advertencia |
| ❌ | Error |
| ℹ️ | Información |
| ⭐ | Importante/Favorito |

---

*Continúe con la siguiente sección para aprender sobre las funciones de Administración.*



---


# 9. Panel de Administración

> **Nota**: Esta sección es solo para usuarios con rol de **Administrador** o **Super Administrador**.

## 9.1 Acceder al Panel de Administración

Si tiene permisos de administrador, verá la opción en el menú lateral:

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
│  🔔 Alertas                                                      │
│  💬 Mensajes                                                     │
│  🗑️ Papelera                                                     │
│                                                                  │
│  ───────────────                                                 │
│                                                                  │
│  ⚙️ ADMINISTRACIÓN  ← Solo visible para administradores         │
│     │                                                            │
│     ├── 👥 Usuarios                                              │
│     ├── 🔐 Permisos                                              │
│     ├── 📋 Auditoría                                             │
│     └── 📊 Estadísticas                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9.2 Gestión de Usuarios

### Ver lista de usuarios

```
┌─────────────────────────────────────────────────────────────────┐
│                    GESTIÓN DE USUARIOS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────┐                                          │
│  │ + Nuevo usuario   │  🔍 Buscar usuario...                    │
│  └───────────────────┘                                          │
│                                                                  │
│  Usuario          │ Correo              │ Rol        │ Estado │⚙️│
│  ─────────────────────────────────────────────────────────────  │
│  Juan Pérez       │ juan@igac.gov.co    │ Editor     │ ● Activo│⋮│
│  María García     │ maria@igac.gov.co   │ Consulta   │ ● Activo│⋮│
│  Carlos López     │ carlos@igac.gov.co  │ Admin      │ ● Activo│⋮│
│  Ana Rodríguez    │ ana@igac.gov.co     │ Editor     │ ○ Inact.│⋮│
│  Pedro Martínez   │ pedro@igac.gov.co   │ Consulta   │ ● Activo│⋮│
│                                                                  │
│  Mostrando 5 de 45 usuarios  │  ◀ 1 2 3 4 5 ... 9 ▶             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Crear nuevo usuario

1. Haga clic en **+ Nuevo usuario**
2. Complete el formulario

```
┌─────────────────────────────────────────────────────────────────┐
│                    NUEVO USUARIO                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INFORMACIÓN BÁSICA                                              │
│  ──────────────────                                              │
│                                                                  │
│  Nombre completo:  [                                         ]  │
│  Correo:           [                         ]@igac.gov.co      │
│  Identificación:   [                    ]                       │
│  Dependencia:      [Seleccionar...                          ▼]  │
│                                                                  │
│  ROL Y PERMISOS                                                  │
│  ──────────────                                                  │
│                                                                  │
│  Rol:              ┌────────────────────────────────────────┐   │
│                    │ ○ Solo consulta                        │   │
│                    │ ● Consulta y edición                   │   │
│                    │ ○ Administrador                        │   │
│                    └────────────────────────────────────────┘   │
│                                                                  │
│  CARPETAS ASIGNADAS                                              │
│  ──────────────────                                              │
│                                                                  │
│  ☑ 📁 /Documentos                                               │
│  ☑ 📁 /Documentos/Proyectos                                     │
│  ☐ 📁 /Datos                                                    │
│  ☑ 📁 /Datos/Catastro                                           │
│  ☐ 📁 /Administración                                           │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐                           │
│  │ ✓ Crear       │  │ ✕ Cancelar    │                           │
│  └───────────────┘  └───────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Editar usuario existente

Haga clic en **⋮** y seleccione **Editar**:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Juan Pérez                                                      │
│        ┌────────────────────────────┐                           │
│        │ ✏️ Editar usuario           │                           │
│        │ 🔐 Cambiar permisos         │                           │
│        │ 🔑 Restablecer contraseña   │                           │
│        │ ───────────────────────── │                           │
│        │ ○ Desactivar usuario        │                           │
│        │ 🗑️ Eliminar usuario         │                           │
│        └────────────────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Roles de usuario disponibles

| Rol | Permisos |
|-----|----------|
| **Solo Consulta** | Ver archivos, descargar, buscar |
| **Consulta y Edición** | Todo lo anterior + subir, renombrar, eliminar |
| **Administrador** | Todo lo anterior + gestionar usuarios de su área |
| **Super Administrador** | Acceso completo al sistema |

---

## 9.3 Gestión de Permisos por Carpeta

### Asignar permisos a una carpeta

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERMISOS DE CARPETA                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📁 /Documentos/Proyectos/Catastro_2025                         │
│                                                                  │
│  USUARIOS CON ACCESO                                             │
│  ───────────────────                                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Usuario          │ Permiso            │ Heredado │ Acción   ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Juan Pérez       │ Lectura/Escritura  │ No       │ ✏️ 🗑️    ││
│  │ María García     │ Solo lectura       │ Sí ↑     │ ✏️       ││
│  │ Carlos López     │ Administrador      │ No       │ ✏️ 🗑️    ││
│  │ Grupo: Catastro  │ Lectura/Escritura  │ No       │ ✏️ 🗑️    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ↑ = Permiso heredado de carpeta superior                       │
│                                                                  │
│  ┌───────────────────────────┐                                  │
│  │ + Agregar usuario/grupo   │                                  │
│  └───────────────────────────┘                                  │
│                                                                  │
│  OPCIONES DE HERENCIA                                            │
│  ────────────────────                                            │
│                                                                  │
│  [✓] Aplicar permisos a subcarpetas                             │
│  [ ] Reemplazar permisos existentes en subcarpetas              │
│                                                                  │
│  ┌───────────────┐                                              │
│  │ ✓ Guardar     │                                              │
│  └───────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tipos de permisos

| Permiso | Descripción |
|---------|-------------|
| **Solo lectura** | Ver y descargar archivos |
| **Lectura/Escritura** | Ver, descargar, subir, renombrar, eliminar |
| **Administrador** | Todo lo anterior + gestionar permisos de la carpeta |

---

## 9.4 Registro de Auditoría

### Ver actividad del sistema

El registro de auditoría muestra todas las acciones realizadas:

```
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRO DE AUDITORÍA                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Filtros:                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Usuario: [Todos        ▼] Acción: [Todas        ▼]          ││
│  │ Desde:   [01/01/2025    ] Hasta:  [07/01/2025    ]          ││
│  │                                                              ││
│  │ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        ││
│  │ │ 🔍 Buscar    │  │ 📥 Exportar  │  │ 🔄 Actualizar│        ││
│  │ └──────────────┘  └──────────────┘  └──────────────┘        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Fecha/Hora    │ Usuario       │ Acción     │ Detalle           │
│  ─────────────────────────────────────────────────────────────  │
│  07/01 09:30   │ Juan Pérez    │ SUBIR      │ informe.pdf       │
│  07/01 09:28   │ Juan Pérez    │ LOGIN      │ Chrome/Windows    │
│  07/01 08:45   │ María García  │ DESCARGAR  │ datos.xlsx        │
│  06/01 17:00   │ Carlos López  │ ELIMINAR   │ archivo_viejo.doc │
│  06/01 16:30   │ Ana Rodríguez │ RENOMBRAR  │ informe → informe_v2│
│  06/01 15:00   │ Sistema       │ AUTO-RENAME│ 5 archivos        │
│                                                                  │
│  Mostrando 6 de 1,234 registros  │  ◀ 1 2 3 ... 124 ▶           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tipos de acciones registradas

| Acción | Descripción |
|--------|-------------|
| **LOGIN** | Inicio de sesión |
| **LOGOUT** | Cierre de sesión |
| **SUBIR** | Archivo subido |
| **DESCARGAR** | Archivo descargado |
| **ELIMINAR** | Archivo/carpeta eliminado |
| **RENOMBRAR** | Archivo/carpeta renombrado |
| **MOVER** | Archivo/carpeta movido |
| **COPIAR** | Archivo/carpeta copiado |
| **COMPARTIR** | Enlace de compartir creado |
| **CREAR_USUARIO** | Usuario creado |
| **MODIFICAR_PERMISO** | Permisos modificados |

### Exportar registro

Puede exportar el registro a Excel o CSV:

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPORTAR AUDITORÍA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Formato de exportación:                                         │
│  ○ Excel (.xlsx)                                                │
│  ● CSV (.csv)                                                   │
│                                                                  │
│  Rango de fechas:                                                │
│  Desde: [01/01/2025]  Hasta: [07/01/2025]                       │
│                                                                  │
│  Filtrar por:                                                    │
│  [✓] Incluir todas las acciones                                 │
│  [ ] Solo acciones de archivos                                  │
│  [ ] Solo acciones de usuarios                                  │
│  [ ] Solo acciones de seguridad                                 │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐                           │
│  │ 📥 Exportar   │  │ ✕ Cancelar    │                           │
│  └───────────────┘  └───────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9.5 Estadísticas del Sistema

### Panel de estadísticas

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTADÍSTICAS DEL SISTEMA                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RESUMEN GENERAL                                                 │
│  ───────────────                                                 │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐│
│  │   📁        │  │   📄        │  │   👥        │  │   💾    ││
│  │   127       │  │   4,523     │  │   45        │  │  125 GB ││
│  │  Carpetas   │  │  Archivos   │  │  Usuarios   │  │  Usado  ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘│
│                                                                  │
│  ACTIVIDAD DE LA SEMANA                                          │
│  ──────────────────────                                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  Archivos subidos:     156  ████████████████████░░░░  80%   ││
│  │  Archivos descargados: 234  █████████████████████████ 100%  ││
│  │  Archivos eliminados:   45  ████████░░░░░░░░░░░░░░░░░  35%  ││
│  │  Usuarios activos:      38  ████████████████████████░  95%  ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  TIPOS DE ARCHIVOS MÁS COMUNES                                   │
│  ─────────────────────────────                                   │
│                                                                  │
│  📄 PDF         45%  █████████████████████░░░░░░░░░░░          │
│  📊 Excel       25%  ████████████░░░░░░░░░░░░░░░░░░░░          │
│  🖼️ Imágenes    15%  ███████░░░░░░░░░░░░░░░░░░░░░░░░░          │
│  📝 Word        10%  █████░░░░░░░░░░░░░░░░░░░░░░░░░░░          │
│  📦 Otros        5%  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Usuarios más activos

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIOS MÁS ACTIVOS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Esta semana:                                                    │
│                                                                  │
│  1. 🥇 Juan Pérez       - 156 acciones                          │
│  2. 🥈 María García     - 134 acciones                          │
│  3. 🥉 Carlos López     - 98 acciones                           │
│  4.    Ana Rodríguez    - 67 acciones                           │
│  5.    Pedro Martínez   - 45 acciones                           │
│                                                                  │
│  Desglose por tipo de acción:                                    │
│  ────────────────────────────                                    │
│                                                                  │
│  Usuario       │ Subidas │ Descargas │ Renombrados │ Eliminados │
│  ─────────────────────────────────────────────────────────────  │
│  Juan Pérez    │    45   │    78     │     28      │     5      │
│  María García  │    30   │    85     │     15      │     4      │
│  Carlos López  │    25   │    50     │     18      │     5      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9.6 Enviar Mensajes a Usuarios

Los administradores pueden enviar mensajes a todos los usuarios o grupos específicos:

```
┌─────────────────────────────────────────────────────────────────┐
│                    NUEVO MENSAJE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Destinatarios:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ○ Todos los usuarios                                        ││
│  │ ○ Solo administradores                                      ││
│  │ ● Usuarios específicos:                                     ││
│  │   ☑ Juan Pérez                                              ││
│  │   ☑ María García                                            ││
│  │   ☐ Carlos López                                            ││
│  │   [+ Agregar más...]                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Asunto:                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Mantenimiento programado                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Mensaje:                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Estimados usuarios,                                         ││
│  │                                                              ││
│  │ Les informamos que el sistema estará en mantenimiento       ││
│  │ programado el próximo viernes...                            ││
│  │                                                              ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [✓] Marcar como importante                                     │
│  [✓] Enviar notificación por correo                            │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐                           │
│  │ 📤 Enviar     │  │ ✕ Cancelar    │                           │
│  └───────────────┘  └───────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9.7 Resumen de Funciones Administrativas

| Función | Acceso | Descripción |
|---------|--------|-------------|
| **Gestionar usuarios** | Admin, Super Admin | Crear, editar, desactivar usuarios |
| **Asignar permisos** | Admin, Super Admin | Definir acceso a carpetas |
| **Ver auditoría** | Admin, Super Admin | Consultar registro de actividad |
| **Ver estadísticas** | Admin, Super Admin | Métricas de uso del sistema |
| **Enviar mensajes** | Admin, Super Admin | Comunicarse con usuarios |
| **Configurar sistema** | Solo Super Admin | Parámetros generales |

---

*Continúe con la siguiente sección para consultar las Preguntas Frecuentes.*



---


# 10. Preguntas Frecuentes (FAQ)

## 10.1 Acceso y Cuenta

### ¿Cómo obtengo acceso al sistema?

Solicite una cuenta a través de su jefe inmediato, quien enviará la solicitud al administrador del sistema (sistemas@igac.gov.co). Recibirá un correo con sus credenciales.

### ¿Olvidé mi contraseña, qué hago?

1. En la pantalla de inicio de sesión, haga clic en **"¿Olvidó su contraseña?"**
2. Ingrese su correo institucional
3. Recibirá un enlace para restablecerla

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  📧 Se ha enviado un correo a j***@igac.gov.co                  │
│                                                                  │
│  Revise su bandeja de entrada y siga las instrucciones.         │
│  El enlace expira en 24 horas.                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ¿Por qué me sale "acceso denegado" a una carpeta?

Su cuenta puede no tener permisos para esa carpeta. Contacte a su administrador para solicitar acceso.

### ¿Puedo acceder desde mi celular?

Sí, el sistema es compatible con navegadores móviles. Sin embargo, recomendamos usar un computador para una mejor experiencia.

---

## 10.2 Archivos y Carpetas

### ¿Cuál es el tamaño máximo de archivo que puedo subir?

El límite es de **100 MB por archivo**. Para archivos más grandes, comprima en partes o contacte al administrador.

### ¿Qué tipos de archivo puedo subir?

Se permiten la mayoría de formatos comunes:
- Documentos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Imágenes: PNG, JPG, GIF, TIFF
- Comprimidos: ZIP, RAR, 7Z
- Datos: CSV, JSON, XML
- Geográficos: SHP, GDB, GPKG

### ¿Por qué mi archivo se renombró automáticamente?

El sistema aplica las **normas de nomenclatura IGAC** automáticamente. Esto asegura:
- Fecha al inicio (YYYYMMDD)
- Sin espacios ni caracteres especiales
- Todo en minúsculas

### ¿Puedo recuperar un archivo que eliminé?

Sí, los archivos eliminados van a la **Papelera** donde permanecen 30 días. Después de ese tiempo, se eliminan permanentemente.

### ¿Cómo busco un archivo específico?

Use la **búsqueda global** (🔍 en el menú lateral) para buscar en todo el sistema, o la búsqueda rápida en la barra superior para buscar en la carpeta actual.

---

## 10.3 Compartir Archivos

### ¿Cómo comparto un archivo con alguien externo?

1. Haga clic derecho en el archivo
2. Seleccione **🔗 Compartir**
3. Configure la expiración y contraseña (opcional)
4. Copie el enlace generado y envíelo

### ¿El destinatario necesita cuenta para descargar?

No, cualquier persona con el enlace puede descargar el archivo (a menos que esté protegido con contraseña).

### ¿Puedo ver quién descargó mi archivo compartido?

Sí, en **Perfil > Mis enlaces compartidos** puede ver las estadísticas de descargas.

### ¿Cómo elimino un enlace compartido?

Vaya a **Perfil > Mis enlaces compartidos**, seleccione el enlace y haga clic en **🗑️ Eliminar**.

---

## 10.4 Renombramiento Inteligente

### ¿Puedo desactivar el renombramiento automático?

Sí, en **Perfil > Configuración > Renombramiento Inteligente** puede configurarlo para que siempre pregunte antes de renombrar.

### ¿Por qué la fecha que agrega no es la correcta?

Por defecto, el sistema usa la fecha actual. Si desea usar la fecha de creación del archivo, cambie la configuración en su perfil.

### ¿Qué significan los códigos de error en el renombramiento?

| Código | Significado |
|--------|-------------|
| E01 | Contiene espacios |
| E02 | Caracteres especiales no permitidos |
| E03 | Sin fecha al inicio |
| E04 | Formato de fecha incorrecto |
| E05 | Letras consecutivas repetidas |
| E06 | Muy largo (máximo 100 caracteres) |

---

## 10.5 Rendimiento y Técnicos

### ¿Por qué la carga es lenta?

Posibles causas:
- Archivos muy grandes
- Conexión a internet lenta
- Muchos archivos simultáneos

**Solución**: Suba archivos de uno en uno o comprima varios archivos pequeños en un ZIP.

### ¿Por qué no puedo ver la previsualización de un archivo?

No todos los formatos son compatibles con previsualización. Los formatos soportados son: PDF, imágenes (PNG, JPG), documentos Office y texto.

### ¿Cuánto espacio tengo disponible?

Consulte con su administrador. El espacio se asigna por dependencia, no por usuario individual.

---

# 11. Solución de Problemas

## 11.1 Problemas de Acceso

### "Usuario o contraseña incorrectos"

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ❌ Usuario o contraseña incorrectos                             │
│                                                                  │
│  Verifique:                                                      │
│  • ¿Está usando su correo institucional completo?              │
│  • ¿Las mayúsculas/minúsculas son correctas?                   │
│  • ¿No tiene activado Bloq Mayús?                              │
│                                                                  │
│  Si el problema persiste:                                        │
│  → Use "¿Olvidó su contraseña?" para restablecerla             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "Su cuenta ha sido desactivada"

Contacte al administrador del sistema. Su cuenta puede haber sido desactivada por:
- Inactividad prolongada
- Cambio de dependencia
- Solicitud administrativa

### "Sesión expirada"

Su sesión se cierra automáticamente después de un período de inactividad (generalmente 30 minutos). Simplemente inicie sesión nuevamente.

---

## 11.2 Problemas con Archivos

### "Error al subir archivo"

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  POSIBLES CAUSAS Y SOLUCIONES                                    │
│  ────────────────────────────                                    │
│                                                                  │
│  1. Archivo muy grande (> 100 MB)                               │
│     → Comprima el archivo o divídalo en partes                  │
│                                                                  │
│  2. Tipo de archivo no permitido                                │
│     → Verifique que la extensión esté permitida                 │
│                                                                  │
│  3. Nombre de archivo con caracteres especiales                 │
│     → Renombre el archivo antes de subirlo                      │
│                                                                  │
│  4. Conexión interrumpida                                       │
│     → Verifique su conexión e intente nuevamente               │
│                                                                  │
│  5. Sin espacio disponible                                      │
│     → Contacte al administrador                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "No tiene permisos para esta operación"

Usted no tiene los permisos necesarios para realizar esa acción en esa carpeta. Opciones:
- Solicite permisos adicionales a su administrador
- Trabaje en una carpeta donde sí tenga permisos

### "El archivo ya existe"

Ya hay un archivo con ese nombre en la carpeta. Opciones:
- Renombre su archivo antes de subirlo
- Seleccione "Reemplazar" si desea sobrescribir
- Seleccione "Agregar número" para crear una copia

---

## 11.3 Problemas de Visualización

### "La página no carga correctamente"

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  PASOS PARA SOLUCIONAR                                           │
│  ─────────────────────                                           │
│                                                                  │
│  1. Presione Ctrl + F5 para recargar completamente              │
│                                                                  │
│  2. Borre la caché del navegador:                               │
│     Chrome: Ctrl + Shift + Delete                               │
│     Firefox: Ctrl + Shift + Delete                              │
│     Edge: Ctrl + Shift + Delete                                 │
│                                                                  │
│  3. Intente con otro navegador                                  │
│                                                                  │
│  4. Verifique su conexión a internet                            │
│                                                                  │
│  5. Si persiste, contacte a soporte                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### "Los iconos o imágenes no aparecen"

Esto puede deberse a:
- Conexión lenta: Espere a que cargue completamente
- Caché corrupta: Borre la caché del navegador
- Navegador desactualizado: Actualice su navegador

### "El sistema se ve diferente / desordenado"

Verifique:
- Que su navegador esté actualizado
- Que no tenga zoom activado (Ctrl + 0 para restablecer)
- Que la resolución de pantalla sea al menos 1280x720

---

## 11.4 Problemas de Descarga

### "La descarga no inicia"

1. Verifique que su navegador no esté bloqueando descargas
2. Desactive temporalmente el bloqueador de ventanas emergentes
3. Intente con clic derecho > "Guardar enlace como..."

### "El archivo descargado está corrupto"

- La descarga pudo haberse interrumpido
- Intente descargar nuevamente
- Si el problema persiste, el archivo puede estar dañado en el servidor

### "El ZIP descargado está vacío"

Esto puede ocurrir si:
- Los archivos fueron eliminados antes de completar la descarga
- Hubo un error de conexión durante la generación del ZIP

---

## 11.5 Problemas con Enlaces Compartidos

### "El enlace no funciona"

Posibles causas:
- **Enlace expirado**: El enlace tiene fecha de vencimiento
- **Límite de descargas alcanzado**: Se agotaron las descargas permitidas
- **Enlace eliminado**: El creador eliminó el enlace

### "Pide contraseña pero no la tengo"

Contacte a la persona que le compartió el enlace para obtener la contraseña.

---

## 11.6 Contactar Soporte

Si ninguna de las soluciones anteriores resuelve su problema:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTACTAR SOPORTE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📧 Correo: sistemas@igac.gov.co                                │
│                                                                  │
│  📋 Información a incluir:                                       │
│                                                                  │
│  1. Su nombre y correo institucional                            │
│  2. Descripción detallada del problema                          │
│  3. Pasos para reproducir el error                              │
│  4. Captura de pantalla del error (si es posible)              │
│  5. Navegador y sistema operativo que usa                       │
│  6. Fecha y hora aproximada del problema                        │
│                                                                  │
│  ⏰ Horario de atención: Lunes a Viernes 8:00 - 17:00           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11.7 Códigos de Error Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| **400** | Solicitud incorrecta | Verifique los datos ingresados |
| **401** | No autorizado | Inicie sesión nuevamente |
| **403** | Acceso denegado | No tiene permisos suficientes |
| **404** | No encontrado | El archivo/carpeta no existe |
| **408** | Tiempo agotado | Conexión lenta, reintente |
| **413** | Archivo muy grande | Reduzca el tamaño del archivo |
| **500** | Error del servidor | Reporte a soporte técnico |
| **502** | Servidor no disponible | Intente más tarde |
| **503** | Servicio en mantenimiento | Espere a que finalice |

---

# Glosario

| Término | Definición |
|---------|------------|
| **Breadcrumb** | Ruta de navegación que muestra su ubicación actual |
| **Caché** | Datos temporales guardados en su navegador |
| **Dashboard** | Panel principal con resumen de información |
| **Drag & Drop** | Arrastrar y soltar con el mouse |
| **Favoritos** | Carpetas marcadas para acceso rápido |
| **Papelera** | Ubicación temporal de archivos eliminados |
| **Permisos** | Nivel de acceso a carpetas y archivos |
| **Previsualización** | Vista rápida de un archivo sin descargarlo |
| **Renombramiento inteligente** | Sistema automático de nombres normalizados |
| **ZIP** | Formato de archivo comprimido |

---

**FIN DEL MANUAL**

---

| Campo | Valor |
|-------|-------|
| **Versión** | 1.0.0 |
| **Fecha** | Enero 2025 |
| **Autor** | Dirección de Gestión Catastral - IGAC |
| **Soporte** | sistemas@igac.gov.co |

---

*© 2025 Instituto Geográfico Agustín Codazzi. Todos los derechos reservados.*



---

