# Modos de Despliegue - Desarrollo vs Producción

Este sistema soporta dos modos de operación con diferentes niveles de seguridad.

## 🔧 Modo Desarrollo (Development)

**Cuándo usar:** Desarrollo local, debugging, cambios frecuentes en el frontend

**Características:**
- ✅ Hot Module Replacement (HMR) - Los cambios se reflejan automáticamente
- ✅ WebSocket habilitado para comunicación con Vite dev server
- ✅ Source maps disponibles para debugging
- ⚠️ **MENOS SEGURO** - CSP permite conexiones WebSocket al puerto 4545

**Configuración:**
```bash
# En .env
NGINX_MODE=development
```

**Arquitectura:**
```
Browser → Nginx (443) → Vite Dev Server (4545) → React App
                     ↓
                 Backend API (8000)
```

**CSP (Content Security Policy):**
```
connect-src 'self' https://gestionarchivo.duckdns.org wss://gestionarchivo.duckdns.org:4545;
```

---

## 🔒 Modo Producción (Production)

**Cuándo usar:** Despliegue en servidores de producción, ambientes públicos

**Características:**
- ✅ Archivos estáticos pre-compilados y optimizados
- ✅ Cache agresivo para mejor rendimiento
- ✅ **MÁS SEGURO** - CSP sin WebSocket, sin puerto de desarrollo expuesto
- ✅ Menor superficie de ataque
- ❌ No hay HMR - Requiere rebuild y reinicio para cambios

**Configuración:**
```bash
# En .env
NGINX_MODE=production
```

**Arquitectura:**
```
Browser → Nginx (443) → Archivos estáticos (/frontend/dist/)
                     ↓
                 Backend API (8000)
```

**CSP (Content Security Policy):**
```
connect-src 'self' https://gestionarchivo.duckdns.org;
```

---

## 🚀 Cómo Cambiar de Modo

### Opción 1: Cambiar modo permanentemente

1. **Editar `.env`:**
   ```bash
   # Para desarrollo
   NGINX_MODE=development

   # Para producción
   NGINX_MODE=production
   ```

2. **Si cambias a producción, rebuild del frontend:**
   ```bash
   docker compose exec frontend npm run build
   ```

3. **Reiniciar nginx:**
   ```bash
   docker compose restart nginx
   ```

### Opción 2: Cambiar modo temporalmente (sin editar .env)

```bash
# Ejecutar en modo producción
NGINX_MODE=production docker compose up -d nginx

# Ejecutar en modo desarrollo
NGINX_MODE=development docker compose up -d nginx
```

---

## 🛡️ Diferencias de Seguridad

| Aspecto | Desarrollo | Producción |
|---------|------------|------------|
| **WebSocket** | ✅ Permitido (puerto 4545) | ❌ Bloqueado |
| **CSP** | Menos restrictivo | Más restrictivo |
| **Puerto 4545** | Expuesto | No usado |
| **Source Maps** | Disponibles | Minificados |
| **Cache** | Deshabilitado | Agresivo (1 año) |
| **Superficie de ataque** | Mayor | Menor |

---

## ⚠️ IMPORTANTE: Seguridad en Producción

**NUNCA uses modo desarrollo en producción pública** porque:

1. **Riesgo de WebSocket hijacking:** El puerto 4545 puede ser comprometido
2. **Información sensible:** Source maps exponen código fuente
3. **CSP debilitado:** Permite más conexiones de lo necesario
4. **Performance:** Sin optimizaciones de build

---

## 📋 Checklist de Despliegue

### ✅ Antes de ir a Producción:

- [ ] Cambiar `NGINX_MODE=production` en `.env`
- [ ] Ejecutar `docker compose exec frontend npm run build`
- [ ] Verificar que `frontend/dist/` tiene archivos actualizados
- [ ] Reiniciar nginx: `docker compose restart nginx`
- [ ] Verificar logs: `docker compose logs nginx | grep MODE`
  - Debe mostrar: `🔒 PRODUCTION MODE - Serving static files`
- [ ] Probar la aplicación en navegador
- [ ] Verificar CSP en DevTools (Network → Headers)
  - NO debe tener `wss://gestionarchivo.duckdns.org:4545`

### ✅ Para volver a Desarrollo:

- [ ] Cambiar `NGINX_MODE=development` en `.env`
- [ ] Reiniciar nginx: `docker compose restart nginx`
- [ ] Verificar logs: `docker compose logs nginx | grep MODE`
  - Debe mostrar: `🔧 DEVELOPMENT MODE - Proxying to Vite dev server`

---

## 🔍 Verificar Modo Actual

```bash
# Ver logs de nginx al iniciar
docker compose logs nginx | grep MODE

# Development muestra:
# 🔧 DEVELOPMENT MODE - Proxying to Vite dev server

# Production muestra:
# 🔒 PRODUCTION MODE - Serving static files
```

---

## 🐛 Troubleshooting

### Problema: "Archivos no se actualizan en producción"
**Solución:** Rebuild del frontend
```bash
docker compose exec frontend npm run build
docker compose restart nginx
```

### Problema: "WebSocket connection failed en producción"
**Causa:** Esto es ESPERADO en producción. No es un error.
**Solución:** Ignorar, es el comportamiento correcto.

### Problema: "404 Not Found en producción"
**Causa:** No se hizo build del frontend
**Solución:**
```bash
docker compose exec frontend npm run build
docker compose restart nginx
```

### Problema: "HMR no funciona en desarrollo"
**Causa:** Nginx en modo producción
**Solución:**
```bash
# En .env cambiar a:
NGINX_MODE=development
docker compose restart nginx
```

---

## 📝 Notas Adicionales

- El modo se selecciona **al iniciar nginx**, no dinámicamente
- Cambios en `.env` requieren **reinicio de nginx** para aplicarse
- Los archivos de configuración están en:
  - `nginx/conf.d/development.conf` - Modo desarrollo
  - `nginx/conf.d/production.conf` - Modo producción
- El volumen `frontend/dist` se monta en ambos modos, pero solo se usa en producción

---

**Última actualización:** 2025-12-30
**Autor:** Claude Code
