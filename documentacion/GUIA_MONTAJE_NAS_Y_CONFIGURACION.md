# Guía Completa de Montaje NAS y Configuración del Proyecto Server Archivo

**Fecha de creación**: 30 de Diciembre de 2025
**Autor**: Claude (Asistente IA)
**Versión**: 1.0
**Entorno**: Ubuntu WSL2 en Windows - Red Corporativa IGAC

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Montaje del NAS (Repositorio NetApp)](#montaje-del-nas-repositorio-netapp)
5. [Configuración de Docker](#configuración-de-docker)
6. [Adaptación del Código (Windows → Linux)](#adaptación-del-código-windows--linux)
7. [Configuración de Red Local](#configuración-de-red-local)
8. [Troubleshooting y Errores Comunes](#troubleshooting-y-errores-comunes)
9. [Comandos Útiles](#comandos-útiles)
10. [Checklist de Verificación](#checklist-de-verificación)

---

## 🎯 Introducción

Este documento describe el proceso completo de restauración y despliegue del proyecto **Server Archivo** en un entorno Ubuntu WSL2, incluyendo:

- Montaje del repositorio NAS corporativo (NetApp/SMB)
- Configuración de servicios Docker (PostgreSQL, Redis, Backend Django, Frontend React, Nginx)
- Adaptación de código de Windows a Linux
- Configuración para acceso local en red corporativa

### Contexto Importante

- **Entorno**: Ubuntu WSL2 en Windows, dentro de red corporativa IGAC
- **Restricciones**:
  - VPN corporativo obligatorio
  - Firewall corporativo bloquea servicios externos (DuckDNS, OnlyOffice)
  - NO hay acceso SSH desde fuera
  - Solo acceso LOCAL (localhost, IP de Windows)
- **Recuperación**: Proyecto recuperado desde imágenes Docker después de pérdida del sistema Linux

---

## ✅ Requisitos Previos

### Software Necesario

1. **Ubuntu WSL2** en Windows
2. **Docker** y **Docker Compose** instalados
3. **cifs-utils** (para montaje SMB/CIFS)
4. **Permisos sudo** con contraseña conocida

### Credenciales Requeridas

- **Usuario SMB**: `andres.osorio@igac.gov.co`
- **Password SMB**: `IgacDiciembre..`
- **Dominio**: `IGAC`
- **Sudo password**: `9502`

### Información de Red

- **Servidor NAS**: `172.21.54.24` (repositorio.DCIGAC.LOCAL)
- **Share SMB**: `//172.21.54.24/DirGesCat`
- **Ruta base permitida**: `/2510SP/H_Informacion_Consulta/Sub_Proy/` (hacia profundidad)
- **IP Windows (WSL Host)**: `172.29.48.1` (variable, verificar con `ip route`)

---

## 🏗️ Arquitectura del Sistema

### Estructura de Directorios

```
/home/andres/server_archivo/
├── backend/                    # Django backend
│   ├── config/                # Configuración Django
│   ├── files/                 # App principal de archivos
│   ├── services/              # SMB, permisos, validación
│   ├── .env                   # Variables de entorno
│   └── Dockerfile
├── frontend/                  # React + TypeScript + Vite
│   ├── src/
│   ├── .env                   # Variables de entorno
│   └── Dockerfile
├── nginx/
│   └── conf.d/
│       └── default.conf       # Configuración nginx
├── postgres_data/             # Datos PostgreSQL
├── redis_data/                # Datos Redis
├── docker-compose.yml         # Orquestación de servicios
└── documentacion/             # Esta guía

/mnt/repositorio/              # Punto de montaje NAS
└── 2510SP/
    └── H_Informacion_Consulta/
        └── Sub_Proy/          # Raíz relativa de la aplicación
            ├── 01_actualiz_catas/
            ├── 02_finan/
            └── ... (más carpetas)

/etc/cifs.credentials          # Credenciales SMB (permisos 600)
/etc/fstab                     # Montaje automático del NAS
```

### Servicios Docker

| Servicio   | Puerto | Descripción                          |
|------------|--------|--------------------------------------|
| postgres   | 5433   | Base de datos PostgreSQL 15          |
| redis      | 6379   | Cache y message broker               |
| backend    | 8000   | Django API REST                      |
| frontend   | 4545   | Vite dev server (React + TS)         |
| nginx      | 80     | Reverse proxy                        |

### Mapeo de Red

```
localhost:80 (nginx)
  ├─> frontend:4545 (React SPA)
  └─> backend:8000 (Django API)
        ├─> postgres:5432 (Base de datos)
        ├─> redis:6379 (Cache)
        └─> /mnt/repositorio (NAS montado)
```

---

## 💾 Montaje del NAS (Repositorio NetApp)

### Paso 1: Instalar cifs-utils

```bash
sudo apt-get update
sudo apt-get install -y cifs-utils
```

**¿Por qué?**: Necesario para montar shares SMB/CIFS en Linux.

---

### Paso 2: Crear Archivo de Credenciales

```bash
sudo bash -c "cat > /etc/cifs.credentials << 'EOF'
username=andres.osorio@igac.gov.co
password=IgacDiciembre..
EOF"

sudo chmod 600 /etc/cifs.credentials
```

**¿Por qué chmod 600?**: Seguridad - solo root puede leer las credenciales.

**⚠️ IMPORTANTE**: Nunca usar `domain=` en este archivo, causará errores de autenticación.

---

### Paso 3: Crear Punto de Montaje

```bash
sudo mkdir -p /mnt/repositorio
sudo chown andres:andres /mnt/repositorio
```

---

### Paso 4: Montar el NAS

**Comando correcto**:

```bash
sudo mount -t cifs //172.21.54.24/DirGesCat /mnt/repositorio \
  -o credentials=/etc/cifs.credentials,dir_mode=0777,file_mode=0777,uid=1000,gid=1000,sec=ntlmssp
```

**Parámetros explicados**:

- `//172.21.54.24/DirGesCat`: Ruta UNC del share (usar IP, NO hostname)
- `/mnt/repositorio`: Punto de montaje local
- `credentials=/etc/cifs.credentials`: Archivo con credenciales
- `dir_mode=0777, file_mode=0777`: Permisos completos (rwx para todos)
- `uid=1000, gid=1000`: Usuario/grupo Linux propietario
- `sec=ntlmssp`: Protocolo de seguridad (NTLM v2)

**⚠️ ERRORES COMUNES**:

| Error | Causa | Solución |
|-------|-------|----------|
| `Permission denied` | Credenciales incorrectas o formato usuario incorrecto | Usar formato `usuario@dominio.com` |
| `No such file or directory` | Servidor no accesible o share incorrecto | Verificar conectividad con `ping 172.21.54.24` |
| `STATUS_LOGON_FAILURE` | Formato de usuario incorrecto en credentials | NO usar `domain=` en archivo |

---

### Paso 5: Verificar Montaje

```bash
# Verificar que el montaje está activo
mount | grep repositorio

# Verificar acceso a la ruta permitida
ls -la /mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/

# Probar lectura de archivo específico
head /mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/01_actualiz_catas/.../archivo.pdf
```

**Resultado esperado**:
```
//172.21.54.24/DirGesCat on /mnt/repositorio type cifs (rw,relatime,vers=3.1.1,...)
```

**⚠️ IMPORTANTE - RESTRICCIONES DE ACCESO**:

```bash
# ❌ NUNCA intentar acceder a estas rutas (sin permisos):
ls /mnt/repositorio/                    # Raíz - sin acceso
ls /mnt/repositorio/2510SP/             # Nivel superior - sin acceso
ls /mnt/repositorio/2510SP/H_Informacion_Consulta/  # Antes de Sub_Proy - sin acceso

# ✅ Solo tienes acceso desde Sub_Proy hacia profundidad:
ls /mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/           # OK
ls /mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/01_*/      # OK
```

---

### Paso 6: Montaje Permanente (fstab)

Agregar al final de `/etc/fstab`:

```bash
sudo bash -c "echo '//172.21.54.24/DirGesCat /mnt/repositorio cifs credentials=/etc/cifs.credentials,dir_mode=0777,file_mode=0777,uid=1000,gid=1000,sec=ntlmssp,_netdev,x-systemd.automount 0 0' >> /etc/fstab"
```

**Parámetros adicionales**:
- `_netdev`: Esperar a que la red esté disponible antes de montar
- `x-systemd.automount`: Montar automáticamente cuando se acceda

**Verificar fstab**:
```bash
tail -3 /etc/fstab
```

---

## 🐳 Configuración de Docker

### docker-compose.yml

Configuración completa de los 5 servicios:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: server_archivo_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: gestion_archivo_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 1234
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"
    networks:
      - server_archivo_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: server_archivo_redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - ./redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - server_archivo_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Django Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: server_archivo_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - DEBUG=True
      - DB_HOST=postgres
      - DB_PORT=5432
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/2
    volumes:
      - ./backend:/app
      - /mnt/repositorio:/mnt/repositorio:rw  # ← MONTAJE NAS
    ports:
      - "8000:8000"
    networks:
      - server_archivo_network
    command: >
      bash -c "mkdir -p /app/logs && chmod 777 /app/logs &&
      python manage.py migrate &&
      python manage.py runserver 0.0.0.0:8000"

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: server_archivo_frontend
    restart: unless-stopped
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    networks:
      - server_archivo_network
    command: npm run dev -- --host 0.0.0.0

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: server_archivo_nginx
    restart: unless-stopped
    depends_on:
      - backend
      - frontend
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./backend/static:/app/static:ro
      - ./backend/media:/app/media:ro
    ports:
      - "80:80"
      - "443:443"
    networks:
      - server_archivo_network

networks:
  server_archivo_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

**⚠️ PUNTO CRÍTICO - Bind Mount del NAS**:

```yaml
volumes:
  - /mnt/repositorio:/mnt/repositorio:rw
```

Este bind mount permite que el backend Django acceda al NAS montado en el host.

---

### nginx/conf.d/default.conf

```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:4545;  # ← NOTA: Vite usa puerto 4545, NO 5173
}

server {
    listen 80;
    server_name localhost 127.0.0.1 172.29.48.1;
    client_max_body_size 2048M;

    # Logs
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Frontend (React Vite)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;

        # Timeouts for long operations
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /app/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /app/media/;
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

**⚠️ ERROR COMÚN**: El puerto de Vite dev server es **4545**, NO 5173.

---

## 🔧 Adaptación del Código (Windows → Linux)

### Problema Principal

El código original fue diseñado para Windows, usando rutas UNC (`\\server\share\path`). En Linux con montaje CIFS, usamos rutas POSIX (`/mnt/repositorio/path`).

### backend/services/smb_service.py

**ANTES (Windows)**:

```python
def __init__(self):
    server = getattr(settings, 'SMB_SERVER', '172.21.54.13')
    share = getattr(settings, 'SMB_SHARE', 'DirGesCat')
    base_path = getattr(settings, 'SMB_BASE_PATH', '')

    # UNC base: \\172.21.54.13\DirGesCat
    if base_path:
        self.base_unc = f"\\\\{server}\\{share}\\{base_path}"
    else:
        self.base_unc = f"\\\\{server}\\{share}"

def normalize_path(self, path):
    if not path:
        return ""
    return path.replace('/', '\\')  # ← Windows backslashes
```

**DESPUÉS (Linux)**:

```python
def __init__(self):
    # Usar NETAPP_BASE_PATH de Linux (montaje CIFS)
    self.base_path = getattr(settings, 'NETAPP_BASE_PATH',
                            '/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy')

    # Asegurar que existe
    if not os.path.exists(self.base_path):
        raise ValueError(f"NETAPP_BASE_PATH no existe: {self.base_path}")

def normalize_path(self, path):
    if not path:
        return ""
    # Convertir backslashes a forward slashes para Linux
    return path.replace('\\', '/')  # ← Linux forward slashes

def build_full_path(self, relative_path=''):
    if not relative_path:
        return self.base_path

    relative_path = self.normalize_path(relative_path)
    relative_path = relative_path.lstrip('/')

    if not relative_path:
        return self.base_path

    return os.path.join(self.base_path, relative_path)  # ← POSIX join
```

**Cambios clave**:
1. Usar `self.base_path` en lugar de `self.base_unc`
2. Normalizar `\` → `/`
3. Usar `os.path.join()` para rutas Linux
4. Validar que el path existe al inicializar

---

### backend/files/views.py - Breadcrumbs

**AGREGADO**: Generación de breadcrumbs para navegación

```python
# Generar breadcrumbs
breadcrumbs = []
if path:
    parts = path.split('/')
    current_path = ''
    for part in parts:
        if part:  # Ignorar strings vacíos
            current_path = f"{current_path}/{part}" if current_path else part
            breadcrumbs.append({
                'name': part,
                'path': current_path
            })

return Response({
    'path': path,
    'items': items,
    'total': len(items),
    'breadcrumbs': breadcrumbs  # ← Nuevo
})
```

**Resultado**: Frontend muestra `🏠 > carpeta1 > carpeta2 > carpeta3`

---

### frontend/src/pages/FileExplorer.tsx

**Cambios realizados**:

1. **Eliminado FilterPanel** (filtros por extensión, año, mes - no se usaban)

2. **Ordenamiento alfabético**:

```typescript
const getFilteredFiles = () => {
  if (!data?.files) return [];

  let files = data.files;

  // Filtrar por búsqueda si existe
  if (searchTerm.trim() && !searchTerm.trim().startsWith('\\\\')) {
    const searchLower = searchTerm.toLowerCase();
    files = files.filter(file =>
      file.name.toLowerCase().includes(searchLower)
    );
  }

  // Ordenar alfabéticamente: primero directorios, luego archivos
  return [...files].sort((a, b) => {
    // Si uno es directorio y el otro no, el directorio va primero
    if (a.is_directory && !b.is_directory) return -1;
    if (!a.is_directory && b.is_directory) return 1;

    // Si ambos son del mismo tipo, ordenar alfabéticamente por nombre
    return a.name.localeCompare(b.name, 'es', {
      numeric: true,
      sensitivity: 'base'
    });
  });
};
```

**Resultado**: Carpetas primero (alfabético), luego archivos (alfabético)

---

## 🌐 Configuración de Red Local

### backend/.env

```bash
# Django Settings
SECRET_KEY=django-insecure-change-this-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,172.29.48.1,backend

# Database PostgreSQL
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# CORS - Solo orígenes locales
CORS_ALLOWED_ORIGINS=http://localhost,http://localhost:5173,http://127.0.0.1,http://172.29.48.1

# NetApp Base Path (Linux)
NETAPP_BASE_PATH=/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy

# Frontend URL
FRONTEND_URL=http://localhost
```

**⚠️ IMPORTANTE**:
- NO incluir `gestionarchivo.duckdns.org` (bloqueado por firewall)
- Solo URLs locales en `CORS_ALLOWED_ORIGINS`
- `NETAPP_BASE_PATH` debe coincidir con la ruta montada

---

### frontend/.env

```bash
# API Backend URL - Configuración LOCAL
VITE_API_URL=http://localhost/api

# Alternativas:
# VITE_API_URL=http://localhost:8000/api (desarrollo local directo)
# VITE_API_URL=http://172.29.48.1/api (WSL a Windows)
```

**⚠️ IMPORTANTE**: Usar `http://localhost/api` (a través de nginx) para producción.

---

### Acceso desde Windows

Para acceder desde el navegador de Windows:

```
http://172.29.48.1
```

**Obtener IP de Windows**:

```bash
ip route | grep default | awk '{print $3}'
```

**Resultado típico**: `172.29.48.1` (puede variar)

---

## 🔥 Troubleshooting y Errores Comunes

### Error 1: Backend - PermissionError en /app/logs

**Error**:
```
PermissionError: [Errno 13] Permission denied: '/app/logs/django.log'
```

**Causa**: Directorio `/app/logs` no existe o no tiene permisos.

**Solución**: Agregar en `docker-compose.yml`:

```yaml
command: >
  bash -c "mkdir -p /app/logs && chmod 777 /app/logs &&
  python manage.py migrate &&
  python manage.py runserver 0.0.0.0:8000"
```

---

### Error 2: Montaje NAS - Permission Denied

**Error**:
```
mount error(13): Permission denied
```

**Causa**: Credenciales incorrectas o formato de usuario incorrecto.

**Solución**:

```bash
# ✅ CORRECTO - formato email completo
username=andres.osorio@igac.gov.co
password=IgacDiciembre..

# ❌ INCORRECTO - NO usar domain=
username=andres.osorio
password=IgacDiciembre..
domain=IGAC
```

---

### Error 3: Frontend - Error 400 Bad Request

**Error**:
```
GET /api/file-ops/browse?path= HTTP/1.1" 400
```

**Causa**: `SMBService` usando rutas Windows UNC en Linux.

**Solución**: Verificar que `smb_service.py` use rutas Linux (ver sección "Adaptación del Código").

---

### Error 4: Nginx - 502 Bad Gateway

**Error**: Al acceder a `http://localhost` devuelve 502.

**Causa**: Puerto de frontend incorrecto en nginx.

**Solución**: Verificar que nginx apunte a `frontend:4545` (NO 5173):

```nginx
upstream frontend {
    server frontend:4545;  # ← Vite usa 4545
}
```

---

### Error 5: DuckDNS Bloqueado

**Error**:
```
Web Page Blocked - Category: Dynamic DNS
```

**Causa**: Firewall corporativo bloquea duckdns.org.

**Solución**: Configurar solo para acceso LOCAL, eliminar referencias a `gestionarchivo.duckdns.org`.

---

## 📝 Comandos Útiles

### Montaje NAS

```bash
# Verificar montaje activo
mount | grep repositorio

# Desmontar NAS
sudo umount /mnt/repositorio

# Montar manualmente
sudo mount -a

# Ver logs de montaje
dmesg | tail -20

# Verificar acceso
ls /mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/
```

---

### Docker

```bash
# Ver servicios corriendo
docker compose ps

# Ver logs de un servicio
docker logs server_archivo_backend --tail 50 --follow

# Reiniciar un servicio
docker compose restart backend

# Reiniciar todo
docker compose restart

# Detener todo
docker compose down

# Iniciar todo
docker compose up -d

# Reconstruir imágenes
docker compose build --no-cache

# Ver logs de todos los servicios
docker compose logs -f

# Ejecutar comando en contenedor
docker exec -it server_archivo_backend bash
docker exec server_archivo_backend python manage.py shell
```

---

### Verificación de Red

```bash
# IP de Windows (host WSL)
ip route | grep default | awk '{print $3}'

# Verificar conectividad al NAS
ping 172.21.54.24

# Resolver hostname del NAS
getent hosts repositorio

# Verificar puertos abiertos
netstat -tlnp | grep -E '(80|8000|5173|5433|6379)'

# Probar API desde línea de comandos
curl http://localhost/api/
curl http://localhost:8000/api/
```

---

### PostgreSQL

```bash
# Acceder a PostgreSQL
docker exec -it server_archivo_postgres psql -U postgres -d gestion_archivo_db

# Listar bases de datos
\l

# Conectar a base de datos
\c gestion_archivo_db

# Listar tablas
\dt

# Ver usuarios
SELECT * FROM users_user LIMIT 5;

# Salir
\q
```

---

## ✅ Checklist de Verificación

### Pre-despliegue

- [ ] WSL2 instalado y funcionando
- [ ] Docker y Docker Compose instalados
- [ ] cifs-utils instalado (`sudo apt-get install cifs-utils`)
- [ ] Credenciales SMB verificadas
- [ ] Conectividad al servidor NAS (`ping 172.21.54.24`)
- [ ] Permisos sudo disponibles

### Montaje NAS

- [ ] Archivo `/etc/cifs.credentials` creado con permisos 600
- [ ] Punto de montaje `/mnt/repositorio` creado
- [ ] NAS montado exitosamente
- [ ] Acceso verificado a `/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy/`
- [ ] Entrada agregada a `/etc/fstab` para montaje automático
- [ ] Archivo de prueba leído correctamente desde NAS

### Docker

- [ ] Directorio `server_archivo` creado
- [ ] Archivos recuperados copiados
- [ ] `docker-compose.yml` configurado con bind mount del NAS
- [ ] Variables de entorno configuradas (`.env` en backend y frontend)
- [ ] Base de datos PostgreSQL restaurada
- [ ] Todos los servicios iniciados (`docker compose up -d`)
- [ ] Healthchecks pasando (postgres, redis)

### Configuración

- [ ] `backend/.env` configurado con rutas Linux
- [ ] `frontend/.env` apuntando a `http://localhost/api`
- [ ] `nginx/conf.d/default.conf` con puerto frontend correcto (4545)
- [ ] `smb_service.py` adaptado para Linux (rutas POSIX)
- [ ] CORS configurado solo con orígenes locales
- [ ] ALLOWED_HOSTS sin referencias a dominios externos

### Pruebas

- [ ] Acceso a `http://localhost` funciona (frontend carga)
- [ ] Login funciona
- [ ] Navegación por carpetas funciona
- [ ] Breadcrumbs se muestran correctamente
- [ ] Archivos ordenados alfabéticamente (carpetas primero)
- [ ] Descarga de archivos funciona
- [ ] Botón "Home" funciona según rol
- [ ] Acceso desde Windows (`http://172.29.48.1`) funciona

### Logs

- [ ] Backend sin errores en logs
- [ ] Frontend sin errores en consola del navegador
- [ ] Nginx sin errores 502/504
- [ ] PostgreSQL accesible
- [ ] Redis accesible

---

## 📊 Resumen de Puertos

| Puerto Host | Puerto Contenedor | Servicio | Acceso |
|-------------|-------------------|----------|--------|
| 80          | 80                | nginx    | http://localhost |
| 8000        | 8000              | backend  | http://localhost:8000/api |
| 5173        | 4545              | frontend | http://localhost:5173 (dev) |
| 5433        | 5432              | postgres | localhost:5433 |
| 6379        | 6379              | redis    | localhost:6379 |

---

## 🎓 Lecciones Aprendidas

### 1. Diferencias Windows vs Linux

- **Windows**: Usa rutas UNC `\\server\share\path` y backslashes `\`
- **Linux**: Usa rutas POSIX `/mnt/path` y forward slashes `/`
- **Solución**: Normalizar rutas en `smb_service.py`

### 2. Montaje CIFS

- **NO usar `domain=` en `/etc/cifs.credentials`** - causa errores de autenticación
- **Usar IP directa** en lugar de hostname para evitar problemas DNS
- **sec=ntlmssp** es necesario para dominios corporativos
- **_netdev** evita errores de montaje antes de que la red esté lista

### 3. Docker en WSL2

- **Bind mounts** funcionan con rutas del host WSL (`/mnt/repositorio`)
- **Healthchecks** son importantes para `depends_on: condition: service_healthy`
- **Logs directory** debe crearse antes de iniciar Django

### 4. Red Corporativa

- **DuckDNS bloqueado** por firewall corporativo
- **OnlyOffice bloqueado** por firewall corporativo
- **Solo acceso LOCAL** - configurar todo para localhost/IP local
- **VPN obligatorio** - imposible acceso externo

### 5. Permisos en NAS

- **Restricciones de acceso** - solo desde `Sub_Proy/` hacia profundidad
- **NUNCA intentar acceder** a rutas superiores (raíz, DirGesCat, etc.)
- **Validar acceso** antes de configurar `NETAPP_BASE_PATH`

---

## 📞 Contacto y Soporte

**Autor**: Claude (Asistente IA)
**Fecha**: 30 de Diciembre de 2025
**Versión del documento**: 1.0

**Notas**:
- Este documento fue generado automáticamente basado en la configuración real del sistema
- Mantener actualizado cuando se realicen cambios en la configuración
- Hacer backup de este documento junto con los backups del proyecto

---

## 📄 Licencia y Uso

Este documento es propiedad de IGAC y está destinado únicamente para uso interno en el proyecto Server Archivo.

**Confidencialidad**: Este documento contiene credenciales y configuraciones sensibles. No compartir fuera del equipo autorizado.

---

**FIN DEL DOCUMENTO**
