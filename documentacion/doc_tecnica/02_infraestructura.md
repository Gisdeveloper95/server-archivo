# 3. Infraestructura y Despliegue

## 3.1 Docker Compose

El sistema utiliza Docker Compose v3.8 para orquestar todos los servicios. El archivo `docker-compose.yml` define 7 contenedores interconectados.

### Diagrama de Contenedores

![Contenedores Docker](imagenes/02_arquitectura_infraestructura_diagrama_02.png)

*Figura 3.1: Diagrama de Contenedores Docker*

### Servicios Definidos

| Servicio | Container Name | Imagen | Puerto |
|----------|---------------|--------|--------|
| postgres | server_archivo_postgres | postgres:15-alpine | 5433:5432 |
| redis | server_archivo_redis | redis:7-alpine | 6379:6379 |
| backend | server_archivo_backend | ./backend/Dockerfile | 8000:8000 |
| frontend | server_archivo_frontend | ./frontend/Dockerfile | 4545:4545 |
| celery_worker | server_archivo_celery_worker | ./backend/Dockerfile | - |
| celery_beat | server_archivo_celery_beat | ./backend/Dockerfile | - |
| nginx | server_archivo_nginx | nginx:alpine | 80, 443 |

### Red Docker

Todos los servicios están conectados a una red bridge llamada `server_archivo_network`, lo que permite comunicación interna por nombre de servicio.

```yaml
networks:
  server_archivo_network:
    driver: bridge
```

### Volúmenes Persistentes

| Volumen | Propósito | Tamaño Estimado |
|---------|-----------|-----------------|
| `./postgres_data` | Datos PostgreSQL | 500MB - 2GB |
| `./redis_data` | Persistencia Redis AOF | 50MB - 500MB |
| `./backend` | Código Django (desarrollo) | ~50MB |
| `./frontend` | Código React (desarrollo) | ~200MB |
| `${NETAPP_BASE_PATH}` | Montaje NAS NetApp | 2TB+ |

---

## 3.2 PostgreSQL

### Configuración

```yaml
postgres:
  image: postgres:15-alpine
  container_name: server_archivo_postgres
  restart: unless-stopped
  environment:
    POSTGRES_DB: ${POSTGRES_DB}
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  volumes:
    - ./postgres_data:/var/lib/postgresql/data
  ports:
    - "5433:5432"
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `POSTGRES_DB` | Nombre de la base de datos | gestion_archivo_db |
| `POSTGRES_USER` | Usuario de PostgreSQL | postgres |
| `POSTGRES_PASSWORD` | Contraseña (en .env) | ******** |
| `POSTGRES_HOST` | Host (interno Docker) | postgres |
| `POSTGRES_PORT` | Puerto interno | 5432 |
| `POSTGRES_EXTERNAL_PORT` | Puerto externo | 5433 |

### Estadísticas de la Base de Datos

| Métrica | Valor |
|---------|-------|
| Total de Modelos | 19 |
| Total de Tablas | ~25 (incluyendo Django) |
| Relaciones FK | 37 |
| Índices Personalizados | 15+ |

### Backup y Restauración

**Crear backup:**
```bash
docker exec server_archivo_postgres pg_dump -U postgres gestion_archivo_db > backup_$(date +%Y%m%d).sql
```

**Restaurar backup:**
```bash
docker exec -i server_archivo_postgres psql -U postgres gestion_archivo_db < backup_20250107.sql
```

### Optimización para Producción

```sql
-- postgresql.conf recomendado
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
max_parallel_maintenance_workers = 2
```

---

## 3.3 Redis

### Configuración

```yaml
redis:
  image: redis:7-alpine
  container_name: server_archivo_redis
  restart: unless-stopped
  command: redis-server --appendonly yes
  volumes:
    - ./redis_data:/data
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

### Usos en el Sistema

| Uso | Descripción |
|-----|-------------|
| **Cache** | Cache de consultas frecuentes |
| **Sesiones** | Almacenamiento de sesiones Django |
| **Celery Broker** | Cola de mensajes para tareas async |
| **Celery Result** | Almacenamiento de resultados de tareas |

### Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `REDIS_HOST` | Host interno | redis |
| `REDIS_PORT` | Puerto | 6379 |
| `CELERY_BROKER_URL` | URL del broker | redis://redis:6379/2 |
| `CELERY_RESULT_BACKEND` | URL de resultados | redis://redis:6379/2 |

### Monitoreo

**Ver estadísticas:**
```bash
docker exec server_archivo_redis redis-cli INFO
```

**Ver claves:**
```bash
docker exec server_archivo_redis redis-cli KEYS "*"
```

**Flush cache (solo desarrollo):**
```bash
docker exec server_archivo_redis redis-cli FLUSHALL
```

---

## 3.4 Nginx

### Configuración de Producción

El archivo `/nginx/conf.d/production.conf` contiene la configuración completa.

### Funciones Principales

| Función | Descripción |
|---------|-------------|
| **Reverse Proxy** | Enruta peticiones a backend/frontend |
| **SSL Termination** | Maneja certificados SSL/TLS |
| **Rate Limiting** | Protección contra abuso |
| **Static Files** | Sirve archivos estáticos |
| **Security Headers** | Headers de seguridad HTTP |

### Rate Limiting por Zona

| Zona | Límite | Aplicación |
|------|--------|------------|
| `login_limit` | 10 req/min | Login, registro, reset password |
| `api_limit` | 50 req/seg | Endpoints API generales |
| `general_limit` | 60 req/seg | Frontend y recursos |
| `upload_limit` | 20 req/seg | Uploads de archivos |

### Configuración de Rate Limiting

```nginx
# Rate limiting zones - POR USUARIO (IP real)
limit_req_zone $real_client_ip zone=login_limit:10m rate=10r/m;
limit_req_zone $real_client_ip zone=api_limit:10m rate=50r/s;
limit_req_zone $real_client_ip zone=general_limit:10m rate=60r/s;
limit_req_zone $real_client_ip zone=upload_limit:10m rate=20r/s;

# Connection limiting
limit_conn_zone $real_client_ip zone=addr:10m;
```

### Headers de Seguridad

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
server_tokens off;  # Ocultar versión de nginx
```

### Routing

| Ruta | Destino | Descripción |
|------|---------|-------------|
| `/` | `/app/frontend/dist` | SPA React |
| `/api/*` | `backend:8000` | API Django |
| `/admin/*` | `backend:8000` | Admin Django |
| `/static/*` | `/app/static/` | Estáticos Django |
| `/media/*` | `/app/media/` | Media files |

### Timeouts para Operaciones Largas

```nginx
proxy_connect_timeout 600s;
proxy_send_timeout 600s;
proxy_read_timeout 600s;
client_max_body_size 2048M;  # Para uploads grandes
```

### SSL/TLS

Los certificados se ubican en `/nginx/ssl/`:

| Archivo | Descripción |
|---------|-------------|
| `certificate.crt` | Certificado público |
| `private.key` | Llave privada |
| `ca_bundle.crt` | Cadena de certificados |

---

## 3.5 Celery (Workers Asíncronos)

### Celery Worker

Procesa tareas asíncronas como:
- Movimiento de archivos a papelera
- Envío de emails
- Limpieza de archivos temporales
- Procesamiento de uploads grandes

```yaml
celery_worker:
  command: celery -A config worker -l INFO -Q default
```

### Celery Beat

Scheduler para tareas programadas:

```yaml
celery_beat:
  command: celery -A config beat -l INFO --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Tareas Programadas

| Tarea | Frecuencia | Descripción |
|-------|------------|-------------|
| `clean_expired_trash` | Diaria (3:00 AM) | Elimina archivos expirados de papelera |
| `clean_old_attachments` | Diaria (4:00 AM) | Limpia adjuntos de mensajes >180 días |
| `check_permission_expiry` | Diaria (6:00 AM) | Notifica permisos por expirar |
| `cleanup_audit_logs` | Semanal | Limpia logs de auditoría antiguos |

### Monitoreo de Celery

**Ver workers activos:**
```bash
docker exec server_archivo_celery_worker celery -A config inspect active
```

**Ver tareas programadas:**
```bash
docker exec server_archivo_celery_beat celery -A config inspect scheduled
```

---

## 3.6 Almacenamiento NAS (NetApp)

### Montaje CIFS/SMB

El sistema accede al NAS NetApp mediante protocolo CIFS montado en el host:

```bash
# /etc/fstab
//172.21.54.24/DirGesCat /mnt/repositorio cifs credentials=/etc/cifs.credentials,uid=1000,gid=1000 0 0
```

### Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NETAPP_BASE_PATH` | Ruta base del repositorio | /mnt/repositorio/2510SP/... |
| `TRASH_PATH` | Subcarpeta de papelera | 04_bk/bk_temp_subproy/.trash |
| `MESSAGE_ATTACHMENTS_PATH` | Adjuntos de mensajes | 04_bk/trans_doc_platform/message_attachments |

### Estructura del Repositorio

```
/mnt/repositorio/
└── 2510SP/
    └── H_Informacion_Consulta/
        └── Sub_Proy/
            ├── [Carpetas de proyectos]
            └── 04_bk/
                ├── bk_temp_subproy/
                │   └── .trash/          # Papelera de reciclaje
                └── trans_doc_platform/
                    └── message_attachments/  # Adjuntos de mensajes
```

### Consideraciones de Permisos

⚠️ **Importante:** El usuario que ejecuta Docker debe tener permisos de lectura/escritura sobre el montaje NAS.

```bash
# Verificar montaje
mount | grep repositorio

# Verificar permisos
ls -la /mnt/repositorio/
```

---

## 3.7 Variables de Entorno (.env)

### Archivo .env de Ejemplo

```env
# ==========================================
# DJANGO CORE
# ==========================================
DEBUG=False
DJANGO_SECRET_KEY=your-super-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1,gestionarchivo.igac.gov.co

# ==========================================
# DATABASE
# ==========================================
POSTGRES_DB=gestion_archivo_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-db-password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_EXTERNAL_PORT=5433

# ==========================================
# REDIS
# ==========================================
REDIS_HOST=redis
REDIS_PORT=6379
CELERY_BROKER_URL=redis://redis:6379/2
CELERY_RESULT_BACKEND=redis://redis:6379/2

# ==========================================
# JWT
# ==========================================
JWT_SECRET_KEY=your-jwt-secret
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# ==========================================
# EMAIL (Gmail SMTP)
# ==========================================
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Sistema IGAC <noreply@igac.gov.co>

# ==========================================
# GROQ AI
# ==========================================
GROQ_API_KEYS=key1,key2,key3
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_MAX_TOKENS=1000
GROQ_TEMPERATURE=0.3

# ==========================================
# STORAGE
# ==========================================
NETAPP_BASE_PATH=/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy

# ==========================================
# PAPELERA
# ==========================================
TRASH_ENABLED=True
TRASH_PATH=04_bk/bk_temp_subproy/.trash
TRASH_MAX_SIZE_GB=5
TRASH_RETENTION_DAYS=30

# ==========================================
# MENSAJERÍA
# ==========================================
MESSAGE_ATTACHMENTS_PATH=04_bk/trans_doc_platform/message_attachments
MESSAGE_ATTACHMENTS_RETENTION_DAYS=180

# ==========================================
# UPLOADS
# ==========================================
MAX_UPLOAD_SIZE_MB=500
MAX_PATH_LENGTH=260
CLIENT_MAX_BODY_SIZE=2048M

# ==========================================
# AUDITORÍA
# ==========================================
AUDIT_LOG_RETENTION_DAYS=365

# ==========================================
# FRONTEND
# ==========================================
VITE_API_URL=http://localhost:8000/api
VITE_DEV_PORT=4545
BACKEND_PORT=8000

# ==========================================
# NGINX
# ==========================================
DOMAIN=gestionarchivo.igac.gov.co
NGINX_MODE=production
HTTP_PORT=80
HTTPS_PORT=443

# ==========================================
# CORS
# ==========================================
CORS_ALLOWED_ORIGINS=http://localhost:4545,https://gestionarchivo.igac.gov.co

# ==========================================
# LOGGING
# ==========================================
LOG_LEVEL=INFO
```

---

## 3.8 Comandos de Gestión

### Iniciar Servicios

```bash
# Iniciar todo
docker-compose up -d

# Iniciar servicio específico
docker-compose up -d backend

# Ver logs
docker-compose logs -f backend
```

### Detener Servicios

```bash
# Detener todo
docker-compose down

# Detener con eliminación de volúmenes (¡CUIDADO!)
docker-compose down -v
```

### Reiniciar Servicios

```bash
# Reiniciar todo
docker-compose restart

# Reiniciar servicio específico
docker-compose restart backend
```

### Ejecutar Comandos Django

```bash
# Migraciones
docker-compose exec backend python manage.py migrate

# Crear superusuario
docker-compose exec backend python manage.py createsuperuser

# Shell Django
docker-compose exec backend python manage.py shell

# Recolectar estáticos
docker-compose exec backend python manage.py collectstatic --noinput
```

### Rebuild de Imágenes

```bash
# Rebuild sin cache
docker-compose build --no-cache

# Rebuild y reiniciar
docker-compose up -d --build
```

---

## 3.9 Healthchecks

### PostgreSQL

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Redis

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Verificar Estado

```bash
# Ver estado de todos los contenedores
docker-compose ps

# Ver healthcheck específico
docker inspect --format='{{.State.Health.Status}}' server_archivo_postgres
```

---

## 3.10 Troubleshooting

### Problema: Contenedor no inicia

```bash
# Ver logs del contenedor
docker-compose logs backend

# Ver eventos
docker events --filter container=server_archivo_backend
```

### Problema: Conexión a base de datos falla

```bash
# Verificar que postgres esté corriendo
docker-compose ps postgres

# Probar conexión
docker exec server_archivo_postgres pg_isready -U postgres
```

### Problema: Redis no responde

```bash
# Ping a Redis
docker exec server_archivo_redis redis-cli ping

# Ver info de memoria
docker exec server_archivo_redis redis-cli INFO memory
```

### Problema: Celery no procesa tareas

```bash
# Ver workers activos
docker exec server_archivo_celery_worker celery -A config inspect active

# Ver cola de tareas
docker exec server_archivo_celery_worker celery -A config inspect reserved
```

### Problema: NAS no accesible

```bash
# Verificar montaje en el host
mount | grep repositorio

# Verificar permisos
ls -la /mnt/repositorio/

# Remontar si es necesario
sudo mount -a
```
