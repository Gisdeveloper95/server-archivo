# Guía de Inicio Rápido - NetApp Bridge IGAC Frontend

## Pasos para Ejecutar

### 1. Verificar que el Backend esté corriendo

El backend debe estar en ejecución en `http://localhost:5000`

```bash
# Navegar a la carpeta del backend
cd c:\Users\andres.osorio\Desktop\Server_Archivo\backend_archivo

# Iniciar el backend (si no está corriendo)
python app.py
```

### 2. Instalar Dependencias del Frontend

```bash
# Navegar a la carpeta del frontend
cd c:\Users\andres.osorio\Desktop\Server_Archivo\netapp-bridge-frontend

# Instalar dependencias (solo la primera vez)
npm install
```

### 3. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:5173**

### 4. Iniciar Sesión

Abrir el navegador en `http://localhost:5173` y usar las credenciales:

- **Usuario**: `master`
- **Contraseña**: `master`

## Estructura de Navegación

Una vez dentro del sistema:

1. **Dashboard** (`/dashboard`)
   - Ver resumen del sistema
   - Accesos rápidos a funcionalidades

2. **Explorador de Archivos** (`/explorar`) - ⭐ PRINCIPAL
   - Navegar por el filesystem
   - Aplicar filtros (extensión, año, mes)
   - Buscar en directorio actual
   - Descargar archivos

3. **Búsqueda Global** (`/buscar`)
   - Buscar archivos en toda la base de datos
   - Filtrar por extensión

4. **Mis Permisos** (`/mis-permisos`)
   - Ver rutas de acceso asignadas

### Solo Admin/SuperAdmin

5. **Usuarios** (`/usuarios`)
   - Gestionar usuarios del sistema
   - Activar/Desactivar usuarios

6. **Estadísticas** (`/estadisticas`)
   - Ver métricas del sistema
   - Total de archivos, directorios, espacio
   - Actividad del día

## Características Principales

### Explorador de Archivos
- ✅ Navegación en tiempo real del filesystem (modo LIVE)
- ✅ Breadcrumbs para volver a carpetas anteriores
- ✅ Filtros por extensión, año y mes
- ✅ Búsqueda dentro del directorio actual
- ✅ Paginación (50 archivos por página)
- ✅ Descarga de archivos con un clic
- ✅ Iconos según tipo de archivo

### Sistema de Permisos
- SuperAdmin: Acceso total
- Admin: Gestión de usuarios + acceso a rutas asignadas
- User: Solo rutas específicas asignadas

### Navegación Jerárquica
Si tienes permiso a `\\repositorio\DirGesCat\2510SP\Carpeta`:
- Puedes navegar: `\\repositorio`
- Puedes navegar: `\\repositorio\DirGesCat`
- Puedes navegar: `\\repositorio\DirGesCat\2510SP`
- Puedes acceder: `\\repositorio\DirGesCat\2510SP\Carpeta`

## Solución de Problemas

### Error: "Error al cargar archivos"
- ✅ Verificar que el backend esté corriendo en `http://localhost:5000`
- ✅ Verificar que iniciaste sesión correctamente

### La página se redirige a Login
- ✅ El token JWT expiró (válido por 24 horas)
- ✅ Volver a iniciar sesión

### No veo archivos en el explorador
- ✅ Verificar que tu usuario tenga permisos asignados
- ✅ Si eres SuperAdmin, deberías ver las carpetas raíz del sistema

### Error 403 Forbidden
- ✅ No tienes permisos para acceder a esa ruta
- ✅ Solicitar permisos al administrador

## Comandos Útiles

```bash
# Desarrollo
npm run dev           # Iniciar servidor de desarrollo

# Producción
npm run build         # Construir para producción
npm run preview       # Previsualizar build de producción

# Linting
npm run lint          # Revisar código
```

## Puertos

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

## Próximos Pasos

Si necesitas implementar funcionalidades adicionales, puedes:

1. **Subir archivos**: Implementar modal de upload en `FileExplorer.tsx`
2. **Crear carpetas**: Agregar botón y modal en `FileExplorer.tsx`
3. **Eliminar archivos**: Ya está la función `handleDelete` lista para implementar
4. **Gestión de usuarios**: Completar modales de creación/edición en `Users.tsx`
5. **Gráficos**: Instalar Recharts y agregar visualizaciones en `Statistics.tsx`

## Contacto

Para reportar problemas o sugerencias sobre el frontend, contactar al equipo de desarrollo.
