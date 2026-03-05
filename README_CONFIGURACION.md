# Configuración Centralizada - Server Archivo

## 🎯 Objetivo

Este sistema está configurado siguiendo las mejores prácticas de desarrollo de software para facilitar el despliegue en diferentes entornos (desarrollo, staging, producción) sin modificar código.

## 📂 Estructura de Configuración

```
server_archivo/
├── .env                    # ⭐ ARCHIVO PRINCIPAL DE CONFIGURACIÓN
├── docker-compose.yml      # Lee variables desde .env
├── DESPLIEGUE.md          # Guía paso a paso para infraestructura
├── backend/
│   └── settings.py        # Lee variables desde .env (via Docker)
├── frontend/
│   ├── .env               # Lee VITE_API_URL desde .env principal
│   └── vite.config.ts     # Lee VITE_DEV_PORT desde .env
└── nginx/
    └── conf.d/
        └── default.conf   # Configuración de proxy
```

## ⚙️ Cómo Funciona

### Archivo Principal: `.env`

**TODO se configura aquí**. El ingeniero de infraestructura SOLO modifica este archivo.

```bash
# Ejemplo de variables en .env
DOMAIN=gestionarchivo.duckdns.org
POSTGRES_PASSWORD=mi_password_seguro
DEBUG=False
ALLOWED_HOSTS=localhost,gestionarchivo.duckdns.org
VITE_API_URL=/api
NETAPP_BASE_PATH=/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy
```

### Flujo de Variables

```
.env (raíz)
    ↓
docker-compose.yml (lee y pasa variables a contenedores)
    ↓
    ├─→ backend (Django recibe todas las variables)
    ├─→ frontend (Vite recibe VITE_API_URL)
    ├─→ postgres (recibe POSTGRES_*)
    ├─→ redis (recibe REDIS_*)
    └─→ nginx (recibe HTTP_PORT, HTTPS_PORT, etc.)
```

## 📋 Variables de Entorno Principales

### Red y Dominio
- `DOMAIN`: Dominio o IP del servidor
- `LOCAL_IP`: IP local (para desarrollo)
- `HTTP_PORT`: Puerto HTTP (default: 80)
- `HTTPS_PORT`: Puerto HTTPS (default: 443)
- `PROTOCOL`: http o https

### Base de Datos
- `POSTGRES_DB`: Nombre de la base de datos
- `POSTGRES_USER`: Usuario de PostgreSQL
- `POSTGRES_PASSWORD`: ⚠️ **Contraseña (CAMBIAR EN PRODUCCIÓN)**
- `POSTGRES_HOST`: Host del contenedor (default: postgres)
- `POSTGRES_PORT`: Puerto interno (default: 5432)
- `POSTGRES_EXTERNAL_PORT`: Puerto expuesto al host (default: 5433)

### Django Backend
- `DJANGO_SECRET_KEY`: ⚠️ **Secret key (CAMBIAR EN PRODUCCIÓN)**
- `DEBUG`: True/False (⚠️ **False EN PRODUCCIÓN**)
- `ALLOWED_HOSTS`: Hosts permitidos (separados por coma)
- `BACKEND_PORT`: Puerto del backend (default: 8000)

### Frontend
- `VITE_API_URL`: URL de la API (usar `/api` para producción)
- `VITE_DEV_PORT`: Puerto del dev server (default: 4545)

### Repositorio Corporativo (NAS)
- `NETAPP_BASE_PATH`: Ruta completa del montaje CIFS
- `SMB_SERVER`: IP del servidor SMB
- `SMB_SHARE`: Nombre del share
- `SMB_USERNAME`: Usuario (referencia, credenciales en /etc/cifs.credentials)

### JWT Authentication
- `JWT_SECRET_KEY`: ⚠️ **Secret key para JWT (CAMBIAR EN PRODUCCIÓN)**
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`: Tiempo de vida del token
- `JWT_REFRESH_TOKEN_LIFETIME_DAYS`: Tiempo de vida del refresh token

### Email
- `EMAIL_BACKEND`: Backend de Django para emails
- `EMAIL_HOST`: Servidor SMTP
- `EMAIL_PORT`: Puerto SMTP
- `EMAIL_USE_TLS`: True/False
- `EMAIL_HOST_USER`: Usuario SMTP
- `EMAIL_HOST_PASSWORD`: ⚠️ **Contraseña SMTP**
- `DEFAULT_FROM_EMAIL`: Email remitente

### GROQ AI
- `GROQ_API_KEYS`: Pool de API keys (separadas por comas)
- `GROQ_API_KEY`: API key principal
- `GROQ_MODEL`: Modelo a usar
- `GROQ_MAX_TOKENS`: Máximo de tokens
- `GROQ_TEMPERATURE`: Temperatura del modelo

### SSL/TLS
- `SSL_ENABLED`: true/false
- `SSL_CERTIFICATE_PATH`: Ruta del certificado
- `SSL_CERTIFICATE_KEY_PATH`: Ruta de la clave privada
- `SSL_CA_BUNDLE_PATH`: Ruta del CA bundle

### CORS
- `CORS_ALLOWED_ORIGINS`: Orígenes permitidos (separados por coma)

## 🚀 Despliegue Rápido

### Desarrollo Local

```bash
# 1. Editar .env
nano .env

# Configurar:
DOMAIN=localhost
DEBUG=True
PROTOCOL=http
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1

# 2. Levantar servicios
docker compose up -d

# 3. Verificar
docker compose ps
docker compose logs -f
```

### Producción (Red Corporativa)

```bash
# 1. Montar repositorio NAS
sudo mount -a

# 2. Editar .env
nano .env

# Configurar:
DOMAIN=gestionarchivo.duckdns.org
DEBUG=False
PROTOCOL=https  # Si tienes SSL
DJANGO_SECRET_KEY=<generar_aleatorio>
JWT_SECRET_KEY=<generar_aleatorio>
POSTGRES_PASSWORD=<contraseña_segura>
ALLOWED_HOSTS=gestionarchivo.duckdns.org,IP_DEL_SERVIDOR
CORS_ALLOWED_ORIGINS=https://gestionarchivo.duckdns.org

# 3. Colocar certificados SSL (si usas HTTPS)
cp certificados/* nginx/ssl/

# 4. Verificar configuración
docker compose config

# 5. Levantar servicios
docker compose up -d

# 6. Ver logs
docker compose logs -f
```

## ✅ Verificación de Configuración

Antes de desplegar, ejecutar:

```bash
docker compose config
```

Esto mostrará la configuración final con todas las variables sustituidas. Verificar que:

1. ✅ No aparezcan valores `${VARIABLE_NAME}` sin sustituir
2. ✅ Las contraseñas se hayan cargado correctamente
3. ✅ Los dominios en ALLOWED_HOSTS sean correctos
4. ✅ Las rutas del NAS sean correctas
5. ✅ Los puertos no tengan conflictos

## 🔒 Seguridad

### Variables Críticas a Cambiar en Producción

⚠️ **NUNCA usar los valores por defecto en producción**:

1. `DJANGO_SECRET_KEY`: Generar con `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`
2. `JWT_SECRET_KEY`: Generar con `openssl rand -base64 32`
3. `POSTGRES_PASSWORD`: Contraseña fuerte
4. `EMAIL_HOST_PASSWORD`: Credenciales reales

### Checklist de Seguridad

- [ ] DEBUG=False
- [ ] Secrets cambiados
- [ ] ALLOWED_HOSTS configurado correctamente
- [ ] CORS_ALLOWED_ORIGINS restrictivo
- [ ] SSL habilitado (si es posible)
- [ ] Firewall configurado
- [ ] Backups automáticos configurados

## 📝 Buenas Prácticas

1. **No commitear el archivo .env**: Ya está en `.gitignore`
2. **Usar .env.example**: Mantener un template sin valores sensibles
3. **Documentar cambios**: Si se agregan nuevas variables, documentarlas
4. **Validar configuración**: Siempre ejecutar `docker compose config` antes de desplegar
5. **Backups**: Hacer backup del .env junto con la base de datos

## 🔄 Cambio de Entorno

Para cambiar de desarrollo a producción:

```bash
# 1. Detener servicios
docker compose down

# 2. Editar .env con valores de producción
nano .env

# 3. Verificar configuración
docker compose config

# 4. Levantar con nueva configuración
docker compose up -d --build

# 5. Verificar logs
docker compose logs -f
```

## 📖 Documentación Completa

Ver [DESPLIEGUE.md](./DESPLIEGUE.md) para guía completa paso a paso.

---

**Principio fundamental**: El código nunca se toca. Solo se modifica el archivo `.env`.

---

**Última actualización**: 2025-12-30
