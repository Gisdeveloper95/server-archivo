# Correcciones de Seguridad - Server_Archivo

**Fecha:** 2025-12-30
**Basado en:** Análisis del reporte de evaluación de seguridad WAS_gestiondato_igac_gov_co.txt

---

## 🔧 Vulnerabilidades Corregidas

### 1. ✅ Host Header Injection (MEDIA - CVSS 4.3)

**Vulnerabilidad:** El uso de `'*'` en ALLOWED_HOSTS permitía ataques de Host Header Injection.

**Corrección:**
- **Archivo:** `backend/config/settings.py`
- **Cambio:** Eliminado `'*'` de ALLOWED_HOSTS y especificados solo dominios válidos
  ```python
  ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[
      'localhost',
      '127.0.0.1',
      '172.29.48.1',
      'gestionarchivo.duckdns.org',
  ])
  ```

**Impacto:**
- ✅ Previene cache poisoning
- ✅ Previene ataques de password reset vía email
- ✅ Fuerza validación estricta del header Host

**Acción requerida:**
- Si agregas un nuevo dominio, añádelo a la variable de entorno `ALLOWED_HOSTS` en tu `.env`

---

### 2. ✅ Password Field With Auto-Complete (BAJA - CVSS 3.1)

**Vulnerabilidad:** Los campos de contraseña permitían autocompletado del navegador.

**Correcciones:**
- **Archivo:** `frontend/src/pages/Login.tsx`
  - Agregado `autoComplete="off"` al campo de contraseña

- **Archivo:** `frontend/src/pages/ResetPassword.tsx`
  - Agregado `autoComplete="new-password"` a ambos campos (nueva contraseña y confirmación)

**Impacto:**
- ✅ Previene que contraseñas sean guardadas en navegadores compartidos
- ✅ Reduce riesgo de acceso no autorizado en equipos públicos

---

### 3. ✅ Missing Cache-Control Header (INFO)

**Vulnerabilidad:** Respuestas de API no tenían headers Cache-Control, permitiendo caché de datos sensibles.

**Corrección:**
- **Archivo creado:** `backend/config/middleware.py`
- **Middleware:** `SecurityHeadersMiddleware`
  - Agrega `Cache-Control: no-cache, no-store, must-revalidate, private`
  - Agrega `Pragma: no-cache`
  - Agrega `Expires: 0`
  - Solo se aplica a rutas `/api/*`

- **Archivo modificado:** `backend/config/settings.py`
  - Agregado middleware a MIDDLEWARE stack

**Impacto:**
- ✅ Previene caché de datos sensibles en navegador
- ✅ Previene caché de datos sensibles en proxies intermedios
- ✅ Cumple con mejores prácticas de seguridad para APIs

---

### 4. ✅ X-Forwarded Headers Documentation

**Mejora:** Documentación clara sobre el uso seguro de headers X-Forwarded-*

**Corrección:**
- **Archivo:** `backend/audit/middleware.py`
- **Cambio:** Agregada documentación detallada sobre seguridad:
  ```python
  SECURITY NOTE:
  - La IP del cliente se obtiene desde X-Forwarded-For para propósitos de AUDITORÍA únicamente
  - NUNCA usar client_ip para control de acceso o autenticación
  - X-Forwarded-For puede ser falsificado por el cliente
  - Solo usar para logging, estadísticas y auditoría
  ```

**Impacto:**
- ✅ Previene uso incorrecto de IPs para autenticación
- ✅ Documenta el propósito correcto (solo auditoría)
- ✅ Advierte a futuros desarrolladores sobre riesgos

---

## 🛡️ Configuraciones de Seguridad Ya Implementadas

### ✅ Nginx Off-By-Slash
- **Estado:** NO VULNERABLE
- **Motivo:** Todas las directivas `location` terminan correctamente con `/`

### ✅ Content Security Policy (CSP)
- **Estado:** IMPLEMENTADO
- **Ubicación:** `nginx/conf.d/default.conf:55`
- **Nota:** Usa `'unsafe-inline'` y `'unsafe-eval'` por compatibilidad con React/Vite

### ✅ CSRF Protection
- **Estado:** PROTEGIDO
- **Motivo:** Django CSRF middleware + JWT authentication (inmune a CSRF)

### ✅ Server Tokens
- **Estado:** CONFIGURADO
- **Ubicación:** `nginx/conf.d/default.conf:59`
- **Configuración:** `server_tokens off;`

### ✅ Security Headers
Implementados en `nginx/conf.d/default.conf`:
- ✅ Strict-Transport-Security (HSTS)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy

---

## 📊 Resumen de Estado

| Vulnerabilidad | Severidad | Estado Anterior | Estado Actual |
|----------------|-----------|-----------------|---------------|
| Nginx Off-By-Slash | ALTA | ✅ No vulnerable | ✅ No vulnerable |
| Access Restriction Bypass | MEDIA | ⚠️ Parcial | ✅ Documentado |
| **Host Header Injection** | MEDIA | ❌ Vulnerable | ✅ **CORREGIDO** |
| **Password Autocomplete** | BAJA | ❌ Vulnerable | ✅ **CORREGIDO** |
| Missing CSP | INFO | ✅ Implementado | ✅ Implementado |
| **Missing Cache-Control** | INFO | ⚠️ Parcial | ✅ **CORREGIDO** |
| CSRF Protection | INFO | ✅ Protegido | ✅ Protegido |
| Header Info Disclosure | BAJA | ✅ Configurado | ✅ Configurado |

---

## 🔄 Pasos Siguientes

### Para Aplicar los Cambios:

1. **Backend Django:**
   ```bash
   cd backend
   # Reiniciar el servidor Django para cargar el nuevo middleware
   docker-compose restart backend
   ```

2. **Frontend React:**
   ```bash
   cd frontend
   # Reconstruir el frontend
   npm run build
   docker-compose restart frontend
   ```

3. **Nginx:**
   ```bash
   # Recargar configuración de nginx
   docker-compose restart nginx
   ```

4. **Verificar cambios:**
   ```bash
   # Verificar headers de respuesta
   curl -I https://gestionarchivo.duckdns.org/api/auth/me/

   # Deberías ver:
   # Cache-Control: no-cache, no-store, must-revalidate, private
   # Pragma: no-cache
   # Expires: 0
   ```

### Configuración de Entorno:

Asegúrate de configurar en tu `.env`:
```env
ALLOWED_HOSTS=localhost,127.0.0.1,172.29.48.1,gestionarchivo.duckdns.org
```

---

## 📝 Notas Adicionales

### Sobre CSP (Content Security Policy):
La política actual incluye `'unsafe-inline'` y `'unsafe-eval'` para compatibilidad con React/Vite. Si quieres mejorar la seguridad:

1. **Opción 1 (Recomendada):** Usar nonces en producción
2. **Opción 2:** Refactorizar para eliminar inline scripts
3. **Opción 3:** Mantener configuración actual (aceptable para apps internas)

### Sobre Rate Limiting:
Ya implementado en nginx:
- Login: 5 req/min
- API general: 100 req/min
- Tráfico general: 30 req/seg

### Sobre SSL/TLS:
Configuración ya robusta:
- TLSv1.2 y TLSv1.3
- Cifrados modernos
- HSTS habilitado

---

## 🔒 Checklist de Seguridad

- [x] ALLOWED_HOSTS sin wildcard
- [x] Password autocomplete deshabilitado
- [x] Cache-Control en API responses
- [x] X-Forwarded headers documentados
- [x] CSRF protection habilitado
- [x] CSP configurado
- [x] HSTS habilitado
- [x] Security headers configurados
- [x] Rate limiting activo
- [x] Server tokens ocultos
- [ ] Actualizar SECRET_KEY en producción (pendiente por ti)
- [ ] Configurar ALLOWED_HOSTS en .env (pendiente por ti)
- [ ] Revisar logs regularmente (pendiente)

---

## 🎯 Nuevas Mejoras de Seguridad - 2025-12-30 (Actualización)

### 5. ✅ Separación de Modos Desarrollo vs Producción

**Problema identificado:** La configuración anterior permitía WebSocket en producción

**Vulnerabilidad:**
- CSP permitía `wss://gestionarchivo.duckdns.org:4545` (servidor de desarrollo)
- Puerto 4545 expuesto innecesariamente en producción
- Riesgo de WebSocket hijacking si el puerto es comprometido

**Corrección implementada:**

**Archivos creados:**
1. `nginx/conf.d/development.conf` - Configuración para desarrollo con WebSocket
2. `nginx/conf.d/production.conf` - Configuración para producción SIN WebSocket
3. `nginx/docker-entrypoint.sh` - Script para seleccionar configuración automáticamente
4. `DEPLOYMENT_MODES.md` - Documentación completa de modos

**Archivos modificados:**
1. `docker-compose.yml` - Agregado soporte para NGINX_MODE
2. `.env` - Agregada variable `NGINX_MODE=development`

**Diferencias de seguridad:**

| Aspecto | Desarrollo | Producción |
|---------|------------|------------|
| **CSP connect-src** | `wss://...:4545` permitido | Solo `https://...` |
| **Puerto 4545** | Usado (Vite dev server) | NO usado |
| **Archivos servidos** | Proxy a Vite | Archivos estáticos compilados |
| **HMR** | Habilitado | Deshabilitado |
| **Cache** | Sin cache | Cache agresivo (1 año) |

**Uso:**

```bash
# Modo desarrollo (actual)
NGINX_MODE=development docker compose up -d nginx

# Modo producción (RECOMENDADO para despliegue público)
NGINX_MODE=production docker compose up -d nginx
```

**Impacto en seguridad:**
- ✅ En producción: CSP más restrictivo, sin WebSocket
- ✅ Menor superficie de ataque en producción
- ✅ Desarrollo sigue siendo cómodo con HMR
- ✅ Separación clara de preocupaciones

**RECOMENDACIÓN:**
- **SIEMPRE** usar `NGINX_MODE=production` en servidores públicos
- Solo usar `development` en entornos de desarrollo local

---

### 6. ✅ Corrección de Breadcrumbs (Navegación)

**Problema:** Los breadcrumbs no se mostraban en el explorador de archivos

**Causa:** Frontend descartaba los breadcrumbs enviados por el backend

**Corrección:**
- **Archivo:** `frontend/src/api/files.ts:28`
- **Cambio:**
  ```typescript
  // ANTES
  breadcrumbs: [],  // ❌ Siempre vacío

  // DESPUÉS
  breadcrumbs: backendData.breadcrumbs || [],  // ✅ Usa datos del backend
  ```

**Impacto:**
- ✅ Navegación restaurada en el explorador de archivos
- ✅ No hay impacto en seguridad (solo lectura de datos)
- ✅ React escapa automáticamente el contenido (prevención XSS)

---

### 7. ✅ Corrección de Errores 403 en Hook usePathPermissions

**Problema:** El hook `usePathPermissions` realizaba llamadas API incluso con `path` vacío

**Síntomas:**
- Errores 403 en consola cuando el usuario está en "Mis Accesos"
- Log: `GET /api/file-ops/check-permissions?path= 403 (Forbidden)`
- No afectaba funcionalidad pero generaba ruido en logs

**Causa raíz:**
- El hook ejecutaba `fetchPermissions()` en cada cambio de `currentPath`
- Cuando `currentPath = ''` (pantalla "Mis Accesos"), hacía llamada al backend
- Backend retorna 403 porque no hay permisos para verificar en ruta vacía

**Corrección:**
- **Archivo:** `frontend/src/hooks/usePathPermissions.ts:45-50`
- **Cambio:** Agregada validación para evitar llamada API cuando path está vacío
  ```typescript
  // Si currentPath está vacío (pantalla "Mis Accesos"), no hacer llamada API
  // Retornar permisos por defecto sin permisos (solo lectura de accesos)
  if (!currentPath || currentPath.trim() === '') {
    setPermissions({ ...DEFAULT_PERMISSIONS, path: '' });
    setLoading(false);
    setError(null);
    return;
  }
  ```

**Impacto:**
- ✅ Elimina errores 403 silenciosos en consola
- ✅ Reduce carga innecesaria al backend
- ✅ Logs más limpios para debugging
- ✅ No afecta funcionalidad (pantalla "Mis Accesos" no necesita permisos de path)

**Comportamiento:**
- **En "Mis Accesos" (path vacío):** No hace llamada API, retorna permisos por defecto
- **En navegación de carpetas (path válido):** Hace llamada API normal

---

### 8. ✅ Permisos Granulares por Item (Botones de Edición)

**Problema:** Botones de edición (Renombrar, Eliminar, Cortar) se mostraban para todos los archivos/carpetas aunque el usuario tuviera restricciones específicas

**Escenario:**
- Usuario tiene acceso a un directorio padre
- Dentro hay subdirectorios con restricciones de solo lectura
- Los botones de edición aparecían para TODOS los items, incluyendo los restringidos

**Causa raíz:**
- Permisos se verificaban solo a nivel del directorio actual (global)
- No se enviaban permisos individuales por cada archivo/carpeta
- Frontend usaba permisos globales para todos los items

**Corrección implementada:**

**Backend:**
- **Archivo:** `backend/services/permission_service.py:657-673`
- **Cambio:** `filter_accessible_items` ahora agrega permisos específicos a cada item
  ```python
  if item.get('is_directory'):
      item_permissions = PermissionService.get_path_permissions_detail(user, item_path)
      item['can_write'] = item_permissions.get('can_write', False)
      item['can_delete'] = item_permissions.get('can_delete', False)
      item['can_rename'] = item_permissions.get('can_write', False)
      item['read_only_mode'] = item_permissions.get('read_only_mode', False)
  else:
      # Para archivos, usar permisos del directorio padre
      parent_permissions = PermissionService.get_path_permissions_detail(user, normalized_base)
      item['can_write'] = parent_permissions.get('can_write', False)
      item['can_delete'] = parent_permissions.get('can_delete', False)
      # ...
  ```

**Frontend:**
- **Archivo:** `frontend/src/types/file.ts:19-23`
- **Cambio:** Agregados campos de permisos a la interfaz `FileItem`
  ```typescript
  can_write?: boolean;
  can_delete?: boolean;
  can_rename?: boolean;
  read_only_mode?: boolean;
  ```

- **Archivo:** `frontend/src/components/FileListWithSelection.tsx:353,386,397`
- **Cambio:** Botones usan permisos del item con fallback a permisos globales
  ```typescript
  // Antes: {canRename && onRename && (...)
  // Después: {(file.can_rename ?? canRename) && onRename && (...)

  // Antes: {canDeleteFiles && onDelete && (...)
  // Después: {(file.can_delete ?? canDeleteFiles) && onDelete && (...)

  // Antes: {canCutFiles && (...)
  // Después: {(file.can_delete ?? canCutFiles) && (...)
  ```

**Lógica de permisos:**
1. **Directorios:** Se verifican permisos específicos de la ruta completa del directorio
2. **Archivos:** Heredan permisos del directorio padre (más eficiente)
3. **Fallback:** Si no hay permisos del item, usa permisos globales (compatibilidad)

**Impacto:**
- ✅ Botones de edición solo aparecen si el usuario tiene permisos en ese item específico
- ✅ Respeta restricciones de solo lectura (`read_only_paths`)
- ✅ Respeta rutas bloqueadas (`blocked_paths`)
- ✅ Previene operaciones no autorizadas desde el UI
- ✅ Seguridad por capas: UI + Backend + Permisos del sistema

**Ejemplo de uso:**
```
Usuario tiene acceso a: 05_grup_trab/11_gest_info/
Con restricción de solo lectura: 05_grup_trab/11_gest_info/2025/06_arch/jose_aguilar/

ANTES:
- Carpeta "jose_aguilar" mostraba botones de Renombrar, Eliminar, Cortar
- Usuario podía intentar operaciones (fallaban en backend con 403)

DESPUÉS:
- Carpeta "jose_aguilar" NO muestra botones de edición
- UI refleja correctamente las restricciones de permisos
- Mejor experiencia de usuario (no intenta operaciones que fallarán)
```

**Seguridad:**
- Esto es SOLO UI - el backend SIEMPRE valida permisos antes de ejecutar
- Si un usuario modifica el frontend, el backend rechazará operaciones no autorizadas
- Defensa en profundidad: UI + API + Sistema de archivos

---

**Autor:** Claude Code
**Revisión:** Pendiente por equipo de seguridad
**Última actualización:** 2025-12-30 20:36
