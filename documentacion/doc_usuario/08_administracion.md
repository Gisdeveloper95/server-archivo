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
