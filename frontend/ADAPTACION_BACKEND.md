# Guía de Adaptación del Frontend al Nuevo Backend Django

Este documento describe los cambios necesarios para adaptar el frontend React existente al nuevo backend Django REST.

## Resumen de cambios

El frontend ya está bien estructurado con:
- React 19 + TypeScript
- Vite como bundler
- Axios para llamadas HTTP
- Zustand para manejo de estado
- TailwindCSS para estilos
- React Router para navegación

Solo necesita ajustes menores en las configuraciones de API.

## 1. Configuración de Variables de Entorno

### Archivo creado: `.env`

```env
VITE_API_URL=http://localhost:8000/api
```

**Cambios según el entorno:**

- **Desarrollo local:** `http://localhost:8000/api`
- **Servidor interno:** `http://10.70.10.2:8000/api`
- **Dominio público:** `http://gestionarchivo.duckdns.org/api`

## 2. Endpoints del Backend Django

El backend Django usa la siguiente estructura de URLs (todas bajo `/api/`):

### Autenticación (`/api/auth/`)
- `POST /api/auth/login/` - Iniciar sesión
- `POST /api/auth/logout/` - Cerrar sesión
- `GET /api/auth/me/` - Usuario actual
- `POST /api/auth/change_password/` - Cambiar contraseña
- `POST /api/auth/refresh/` - Refrescar token JWT

### Usuarios (`/api/users/`)
- `GET /api/users/` - Listar usuarios
- `POST /api/users/` - Crear usuario
- `GET /api/users/{id}/` - Detalle de usuario
- `PUT/PATCH /api/users/{id}/` - Actualizar usuario
- `DELETE /api/users/{id}/` - Eliminar usuario
- `GET /api/users/me/` - Usuario actual (duplicado de auth/me)
- `GET /api/users/by_role/` - Filtrar por rol

### Permisos (`/api/permissions/`)
- `GET /api/permissions/` - Listar permisos
- `POST /api/permissions/` - Crear permiso
- `GET /api/permissions/{id}/` - Detalle de permiso
- `PUT/PATCH /api/permissions/{id}/` - Actualizar permiso
- `DELETE /api/permissions/{id}/` - Eliminar permiso
- `GET /api/permissions/by_user/` - Permisos de un usuario
- `GET /api/permissions/by_path/` - Permisos de una ruta
- `POST /api/permissions/{id}/revoke/` - Revocar permiso

### Favoritos (`/api/favorites/`)
- `GET /api/favorites/` - Listar favoritos del usuario actual
- `POST /api/favorites/` - Crear favorito
- `GET /api/favorites/{id}/` - Detalle de favorito
- `DELETE /api/favorites/{id}/` - Eliminar favorito
- `POST /api/favorites/reorder/` - Reordenar favoritos

### Archivos (`/api/files/`)
- `GET /api/files/browse/` - Navegar directorios (parámetro: `?path=`)
- `POST /api/files/create_folder/` - Crear carpeta
- `POST /api/files/upload/` - Subir archivo (multipart/form-data)
- `GET /api/files/download/` - Descargar archivo/carpeta (parámetro: `?path=`)
- `DELETE /api/files/delete/` - Eliminar archivo/carpeta (parámetro: `?path=`)
- `POST /api/files/rename/` - Renombrar (body: `{path, new_name}`)
- `POST /api/files/move/` - Mover (body: `{source_path, destination_path}`)
- `POST /api/files/copy/` - Copiar (body: `{source_path, destination_path}`)
- `POST /api/files/validate_name/` - Validar nombre contra diccionario

### Estadísticas (`/api/stats/`)
- `GET /api/stats/` - Estadísticas globales
- `GET /api/stats/user_stats/` - Estadísticas por usuario

### Auditoría (`/api/audit/`)
- `GET /api/audit/` - Listar logs de auditoría
- `GET /api/audit/{id}/` - Detalle de log
- `GET /api/audit/stats/` - Estadísticas de auditoría

## 3. Adaptaciones necesarias en el código

### 3.1. Archivo `src/api/client.ts`

El archivo ya está bien configurado. Solo verificar que la URL base se actualiza correctamente:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

**Nota:** El backend Django ya está configurado. Cambiar de `http://localhost:5000/api` a `http://localhost:8000/api`.

### 3.2. Archivo `src/api/auth.ts`

Los endpoints ya coinciden con el backend Django:
- ✅ `/auth/login` - Correcto
- ✅ `/auth/me` - Correcto
- ✅ `/auth/change-password` - Backend usa `change_password` con guión bajo

**Cambio requerido:**
```typescript
// Antes
'/auth/change-password'

// Después
'/auth/change_password'
```

### 3.3. Archivo `src/api/files.ts`

Verificar que los endpoints coincidan:
- `GET /files/browse/` con parámetro `?path=`
- `POST /files/create_folder/` con body `{path, name}`
- `POST /files/upload/` con FormData
- `GET /files/download/` con parámetro `?path=`
- `DELETE /files/delete/` con parámetro `?path=`
- `POST /files/rename/` con body `{path, new_name}`

### 3.4. Estructura de respuestas

El backend Django REST devuelve respuestas en este formato:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

Verificar que las interfaces en `src/types/api.ts` coincidan.

### 3.5. Autenticación JWT

El backend usa JWT con estos campos:
- `access` - Token de acceso (60 minutos)
- `refresh` - Token de refresco (7 días)

El frontend debe guardar ambos tokens en localStorage:

```typescript
localStorage.setItem('access_token', response.data.access);
localStorage.setItem('refresh_token', response.data.refresh);
```

Y usar `Authorization: Bearer {access_token}` en los headers.

## 4. Modelos de datos

### User
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'consultation' | 'consultation_edit' | 'admin' | 'superadmin';
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  microsoft_email?: string;
}
```

### UserPermission
```typescript
interface UserPermission {
  id: number;
  user: number;
  path: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  is_active: boolean;
  exempt_from_dictionary: boolean;
  notes?: string;
}
```

### File
```typescript
interface File {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  extension?: string;
  modified_date?: string;
  created_date?: string;
}
```

### Stats
```typescript
interface Stats {
  total_files: number;
  total_directories: number;
  total_size: number;
  last_updated: string;
}
```

## 5. Pasos para ejecutar

1. **Instalar dependencias:**
   ```bash
   cd netapp-bridge-frontend
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   # Copiar .env.example a .env
   # Ajustar VITE_API_URL según el entorno
   ```

3. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev
   ```

   El frontend estará disponible en `http://localhost:5173`

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

   Los archivos compilados estarán en `dist/`

## 6. Integración con el backend

### Desarrollo local:
1. Ejecutar backend Django en `http://localhost:8000`
2. Ejecutar frontend React en `http://localhost:5173`
3. El frontend conectará al backend vía `http://localhost:8000/api`

### Producción:
1. Compilar frontend: `npm run build`
2. Servir archivos estáticos desde `dist/`
3. Configurar CORS en Django para permitir el dominio del frontend
4. Ajustar `VITE_API_URL` en `.env` antes de compilar

## 7. Verificación de funcionalidad

Después de configurar, verificar:

- [ ] Login funciona correctamente
- [ ] Token JWT se guarda en localStorage
- [ ] Headers de autenticación se envían en cada petición
- [ ] Navegación de archivos funciona
- [ ] Subida de archivos funciona
- [ ] Permisos se respetan según el rol
- [ ] Validación de nombres contra diccionario funciona
- [ ] Estadísticas se cargan correctamente

## 8. Problemas comunes

### CORS Error
Si aparece error de CORS, verificar en el backend Django:
```python
# config/settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # Frontend dev
    'http://localhost:3000',   # Alternativo
    # Agregar otros orígenes según necesidad
]
```

### Token expirado
El token de acceso expira en 60 minutos. Implementar refresh automático o redirigir a login.

### Rutas no encontradas (404)
Verificar que el backend esté corriendo y que `VITE_API_URL` apunte correctamente.

### Archivos no se cargan
Verificar que el servicio SMB esté funcionando y que el usuario tenga permisos en la ruta.

## 9. Próximos pasos

1. Actualizar endpoint de cambio de contraseña (`change-password` → `change_password`)
2. Verificar todos los endpoints de archivos
3. Probar funcionalidad completa con el backend
4. Ajustar tipos TypeScript según respuestas reales del backend
5. Implementar refresh automático de tokens JWT
6. Agregar manejo de errores mejorado

## 10. Notas adicionales

- El frontend ya está muy completo y bien estructurado
- Solo requiere ajustes menores en endpoints
- La estructura de componentes y estado es sólida
- TailwindCSS ya está configurado
- React Router ya tiene las rutas principales definidas
