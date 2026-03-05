# NetApp Bridge IGAC - Frontend

Sistema de Gestión de Archivos Corporativo para el Instituto Geográfico Agustín Codazzi (IGAC).

## Tecnologías

- **React 18** con TypeScript
- **Vite** - Build tool
- **TailwindCSS** - Estilos
- **Axios** - Cliente HTTP
- **React Router v6** - Navegación
- **Zustand** - Estado global
- **Lucide React** - Iconos

## Requisitos Previos

- Node.js 18+
- Backend corriendo en `http://localhost:5000`

## Instalación

```bash
# Instalar dependencias
npm install
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Producción

```bash
# Construir para producción
npm run build

# Previsualizar build de producción
npm run preview
```

## Estructura del Proyecto

```
src/
├── api/              # Servicios HTTP (Axios)
│   ├── client.ts     # Cliente Axios configurado
│   ├── auth.ts       # Endpoints de autenticación
│   ├── files.ts      # Endpoints de archivos
│   ├── users.ts      # Endpoints de usuarios
│   └── stats.ts      # Endpoints de estadísticas
├── components/       # Componentes reutilizables
│   ├── FileIcon.tsx      # Icono según tipo de archivo
│   ├── FileList.tsx      # Lista de archivos/carpetas
│   ├── Breadcrumbs.tsx   # Navegación de rutas
│   ├── Pagination.tsx    # Paginación
│   ├── FilterPanel.tsx   # Panel de filtros
│   └── Layout.tsx        # Layout principal
├── pages/            # Páginas/Vistas
│   ├── Login.tsx           # Inicio de sesión
│   ├── Dashboard.tsx       # Página principal
│   ├── FileExplorer.tsx    # Explorador de archivos (PRINCIPAL)
│   ├── Search.tsx          # Búsqueda global
│   ├── MyPermissions.tsx   # Permisos del usuario
│   ├── Users.tsx           # Gestión de usuarios (admin)
│   └── Statistics.tsx      # Estadísticas (admin)
├── store/            # Estado global (Zustand)
│   └── authStore.ts  # Estado de autenticación
├── types/            # TypeScript types
│   ├── api.ts        # Tipos de respuestas API
│   ├── file.ts       # Tipos de archivos
│   ├── user.ts       # Tipos de usuarios
│   └── stats.ts      # Tipos de estadísticas
├── utils/            # Utilidades
│   ├── formatSize.ts # Formatear tamaños
│   └── formatDate.ts # Formatear fechas
├── App.tsx           # Componente principal con rutas
└── main.tsx          # Punto de entrada
```

## Características Implementadas

### Autenticación
- Login con JWT
- Almacenamiento de token en localStorage
- Rutas protegidas
- Auto-logout en token expirado (401)

### Explorador de Archivos (Página Principal)
- Navegación LIVE del filesystem
- Breadcrumbs clickeables
- Filtros por extensión, año, mes
- Búsqueda en directorio actual
- Paginación
- Descarga de archivos
- Iconos según tipo de archivo

### Búsqueda Global
- Búsqueda en toda la base de datos
- Filtro por extensión
- Resultados paginados

### Gestión de Usuarios (Admin/SuperAdmin)
- Listar usuarios
- Crear/Editar/Eliminar usuarios
- Activar/Desactivar usuarios
- Gestión de permisos

### Estadísticas (Admin/SuperAdmin)
- Total de archivos y directorios
- Espacio utilizado
- Descargas y búsquedas del día
- Usuarios activos

### Mis Permisos
- Ver rutas de acceso asignadas
- Tipo de permiso (lectura/escritura/eliminación)

## Sistema de Permisos

### Roles
- **SuperAdmin**: Acceso total al sistema
- **Admin**: Gestión de usuarios y estadísticas
- **User**: Solo acceso a rutas asignadas

### Navegación Jerárquica
Si un usuario tiene permiso a `/A/B/C`, puede navegar:
- `/A`
- `/A/B`
- `/A/B/C`

Esto permite explorar carpetas padre hasta llegar a las rutas permitidas.

## Credenciales de Prueba

```
Usuario: master
Contraseña: master
Rol: superadmin
```

## Endpoints del Backend

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/register` - Registrar usuario

### Archivos
- `GET /api/files/browse-live` - Navegación LIVE ⭐ Principal
- `GET /api/files/browse` - Navegación DB (con filtros avanzados)
- `GET /api/files/search` - Búsqueda global
- `GET /api/files/download/:id` - Descargar archivo
- `GET /api/files/quick-access` - Accesos rápidos

### Usuarios (Admin)
- `GET /api/users/all` - Listar usuarios
- `POST /api/users/create` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario
- `PUT /api/users/:id/toggle-status` - Activar/Desactivar

### Estadísticas (Admin)
- `GET /api/stats/overview` - Resumen general
- `GET /api/stats/downloads` - Descargas por período
- `GET /api/stats/searches` - Búsquedas por período

## Flujo de Uso

1. **Login**: Ingresar con usuario y contraseña
2. **Dashboard**: Ver resumen y accesos rápidos
3. **Explorar Archivos**:
   - Navegar por carpetas
   - Aplicar filtros
   - Buscar en directorio actual
   - Descargar archivos
4. **Búsqueda Global**: Buscar archivos en todo el sistema
5. **Mis Permisos**: Ver rutas de acceso

### Admin/SuperAdmin adicional
6. **Usuarios**: Gestionar usuarios y permisos
7. **Estadísticas**: Ver métricas del sistema

## Notas Importantes

- El backend debe estar corriendo en `http://localhost:5000`
- Los paths de Windows usan backslash `\`
- El token JWT se almacena en localStorage
- Si el backend retorna 401, se redirige automáticamente a login
- Los archivos sin ID (carpetas generadas en LIVE mode) no se pueden descargar

## Mejoras Futuras

- [ ] Subir archivos
- [ ] Crear carpetas
- [ ] Eliminar archivos
- [ ] Modal de creación/edición de usuarios
- [ ] Gráficos de estadísticas (Recharts)
- [ ] React Query para cache de datos
- [ ] Toast notifications
- [ ] Drag & drop para subir archivos
- [ ] Preview de archivos (PDF, imágenes)
