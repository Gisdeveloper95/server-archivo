# Arquitectura de Infraestructura - Sistema de Gestión de Archivos IGAC

## Resumen de Infraestructura

- **Orquestación:** Docker Compose v3.8
- **Total de Servicios:** 7 contenedores
- **Red:** Bridge (server_archivo_network)
- **Almacenamiento:** PostgreSQL + Redis + NAS NetApp

---

## Diagrama de Arquitectura General

```mermaid
flowchart TB
    subgraph USUARIOS["👥 USUARIOS"]
        USER[("Usuario Final<br/>Navegador Web")]
        ADMIN[("Administrador<br/>Panel Admin")]
    end

    subgraph PROXY["🌐 CAPA DE ENTRADA"]
        NGINX["<b>NGINX</b><br/>Reverse Proxy<br/>📦 nginx:alpine<br/>🔒 SSL/TLS<br/>⚡ Rate Limiting"]
    end

    subgraph APP["⚙️ CAPA DE APLICACIÓN"]
        direction TB
        FRONTEND["<b>FRONTEND</b><br/>React + Vite<br/>📦 Node.js<br/>🎨 TailwindCSS<br/>Puerto: 4545"]
        BACKEND["<b>BACKEND</b><br/>Django 4.x + DRF<br/>📦 Python 3.11<br/>🔐 JWT Auth<br/>Puerto: 8000"]
    end

    subgraph WORKERS["🔄 PROCESAMIENTO ASÍNCRONO"]
        direction TB
        CELERY_W["<b>CELERY WORKER</b><br/>Tareas Asíncronas<br/>📦 Python 3.11<br/>🗑️ Papelera<br/>📧 Emails"]
        CELERY_B["<b>CELERY BEAT</b><br/>Scheduler<br/>📦 Python 3.11<br/>⏰ Tareas Programadas<br/>🧹 Limpieza Auto"]
    end

    subgraph DATA["💾 CAPA DE DATOS"]
        direction TB
        POSTGRES[("🐘 <b>PostgreSQL 15</b><br/>Base de Datos<br/>Puerto: 5432<br/>📊 19 Modelos")]
        REDIS[("🔴 <b>Redis 7</b><br/>Cache + Broker<br/>Puerto: 6379<br/>📨 Queue Celery")]
    end

    subgraph STORAGE["📁 ALMACENAMIENTO EXTERNO"]
        NAS[("🗄️ <b>NetApp NAS</b><br/>Repositorio CIFS/SMB<br/>/mnt/repositorio<br/>IP: 172.21.54.24")]
        TRASH["🗑️ Papelera<br/>/.trash"]
        ATTACH["📎 Adjuntos<br/>/message_attachments"]
    end

    subgraph EXTERNAL["🌍 SERVICIOS EXTERNOS"]
        GROQ["🤖 <b>GROQ API</b><br/>LLM Llama 3.3<br/>Sugerencias IA"]
        SMTP["📧 <b>SMTP Gmail</b><br/>Notificaciones<br/>Email"]
        DNS_IGAC["🌐 <b>DNS IGAC</b><br/>Dominio Institucional<br/>gestionarchivo.igac.gov.co"]
    end

    %% Conexiones de usuarios
    USER -->|HTTPS :443| NGINX
    ADMIN -->|HTTPS :443| NGINX

    %% Nginx routing
    NGINX -->|/api/*| BACKEND
    NGINX -->|/*| FRONTEND
    NGINX -->|/static /media| BACKEND

    %% Frontend-Backend
    FRONTEND -.->|API Calls| BACKEND

    %% Backend connections
    BACKEND -->|SQL| POSTGRES
    BACKEND -->|Cache/Sessions| REDIS
    BACKEND -->|Queue Tasks| REDIS
    BACKEND -->|File Ops| NAS
    BACKEND -->|AI Naming| GROQ
    BACKEND -->|Notifications| SMTP

    %% Worker connections
    REDIS -->|Consume| CELERY_W
    CELERY_W -->|SQL| POSTGRES
    CELERY_W -->|Files| NAS
    CELERY_W -->|Email| SMTP
    CELERY_B -->|Schedule| CELERY_W

    %% NAS subdirectories
    NAS --- TRASH
    NAS --- ATTACH

    %% DNS
    DNS_IGAC -.->|Resolves| NGINX

    %% Styling
    classDef nginx fill:#009639,stroke:#333,color:#fff
    classDef frontend fill:#61DAFB,stroke:#333,color:#000
    classDef backend fill:#092E20,stroke:#333,color:#fff
    classDef db fill:#336791,stroke:#333,color:#fff
    classDef redis fill:#DC382D,stroke:#333,color:#fff
    classDef celery fill:#37814A,stroke:#333,color:#fff
    classDef storage fill:#FF9900,stroke:#333,color:#fff
    classDef external fill:#6B7280,stroke:#333,color:#fff

    class NGINX nginx
    class FRONTEND frontend
    class BACKEND backend
    class POSTGRES db
    class REDIS redis
    class CELERY_W,CELERY_B celery
    class NAS,TRASH,ATTACH storage
    class GROQ,SMTP,DNS_IGAC external
```

---

## Diagrama de Contenedores Docker

```mermaid
flowchart LR
    subgraph DOCKER["🐳 Docker Compose - server_archivo"]
        direction TB

        subgraph NET["Red: server_archivo_network (bridge)"]
            direction LR

            subgraph INFRA["Infraestructura"]
                PG["server_archivo_postgres<br/>━━━━━━━━━━━━━━━━<br/>📦 postgres:15-alpine<br/>🔌 5433:5432<br/>💾 ./postgres_data"]
                RD["server_archivo_redis<br/>━━━━━━━━━━━━━━━━<br/>📦 redis:7-alpine<br/>🔌 6379:6379<br/>💾 ./redis_data"]
            end

            subgraph APPLICATION["Aplicación"]
                BE["server_archivo_backend<br/>━━━━━━━━━━━━━━━━<br/>📦 ./backend/Dockerfile<br/>🔌 8000:8000<br/>💾 ./backend, NETAPP"]
                FE["server_archivo_frontend<br/>━━━━━━━━━━━━━━━━<br/>📦 ./frontend/Dockerfile<br/>🔌 4545:4545<br/>💾 ./frontend"]
            end

            subgraph ASYNC["Procesamiento"]
                CW["server_archivo_celery_worker<br/>━━━━━━━━━━━━━━━━<br/>📦 ./backend/Dockerfile<br/>🔌 N/A<br/>💾 ./backend, NETAPP"]
                CB["server_archivo_celery_beat<br/>━━━━━━━━━━━━━━━━<br/>📦 ./backend/Dockerfile<br/>🔌 N/A<br/>💾 ./backend, NETAPP"]
            end

            subgraph PROXY["Proxy"]
                NX["server_archivo_nginx<br/>━━━━━━━━━━━━━━━━<br/>📦 nginx:alpine<br/>🔌 80, 443<br/>💾 ./nginx, static, media"]
            end
        end
    end

    %% Dependencies
    PG -.->|healthcheck| BE
    RD -.->|healthcheck| BE
    PG -.->|healthcheck| CW
    RD -.->|healthcheck| CW
    CW -.->|depends| CB
    BE -.->|depends| NX
    FE -.->|depends| NX
    BE -.->|depends| FE
```

---

## Diagrama de Puertos y Comunicación

```mermaid
flowchart TB
    subgraph EXTERNAL["🌐 Acceso Externo"]
        BROWSER["Navegador"]
        EXTAPI["API Clients"]
    end

    subgraph PORTS["📡 Puertos Expuestos"]
        P443["HTTPS :443"]
        P80["HTTP :80"]
        P8000["API :8000"]
        P4545["Dev :4545"]
        P5433["DB :5433"]
        P6379["Redis :6379"]
    end

    subgraph SERVICES["🔧 Servicios Internos"]
        NGINX_S["Nginx"]
        BACKEND_S["Django"]
        FRONTEND_S["React"]
        POSTGRES_S["PostgreSQL"]
        REDIS_S["Redis"]
    end

    %% External access
    BROWSER --> P443
    BROWSER --> P80
    EXTAPI --> P8000

    %% Port mappings
    P443 --> NGINX_S
    P80 --> NGINX_S
    P8000 --> BACKEND_S
    P4545 --> FRONTEND_S
    P5433 --> POSTGRES_S
    P6379 --> REDIS_S

    %% Internal routing
    NGINX_S -->|proxy_pass :8000| BACKEND_S
    NGINX_S -->|proxy_pass :4545| FRONTEND_S
    BACKEND_S -->|:5432| POSTGRES_S
    BACKEND_S -->|:6379| REDIS_S
```

---

## Diagrama de Volúmenes y Almacenamiento

```mermaid
flowchart TB
    subgraph HOST["💻 Host System"]
        direction TB

        subgraph LOCAL["Volúmenes Locales"]
            V_PG["./postgres_data<br/>━━━━━━━━━━━━<br/>📊 Base de datos<br/>~500MB - 2GB"]
            V_RD["./redis_data<br/>━━━━━━━━━━━━<br/>📨 Cache AOF<br/>~50MB - 500MB"]
            V_BE["./backend<br/>━━━━━━━━━━━━<br/>🐍 Código Django<br/>~50MB"]
            V_FE["./frontend<br/>━━━━━━━━━━━━<br/>⚛️ Código React<br/>~200MB"]
            V_NX["./nginx<br/>━━━━━━━━━━━━<br/>⚙️ Configuración<br/>~10KB"]
            V_ST["./backend/static<br/>━━━━━━━━━━━━<br/>📁 Assets Django<br/>~5MB"]
            V_MD["./backend/media<br/>━━━━━━━━━━━━<br/>📷 Media files<br/>Variable"]
            V_DIST["./frontend/dist<br/>━━━━━━━━━━━━<br/>🏗️ Build React<br/>~2MB"]
        end

        subgraph REMOTE["Volumen Remoto NAS"]
            V_NAS["/mnt/repositorio<br/>━━━━━━━━━━━━<br/>🗄️ NetApp CIFS<br/>~2TB+"]
            V_TRASH["/.trash<br/>━━━━━━━━━━━━<br/>🗑️ Papelera<br/>Max 5GB"]
            V_ATTACH["/message_attachments<br/>━━━━━━━━━━━━<br/>📎 Adjuntos<br/>180 días"]
        end
    end

    subgraph CONTAINERS["🐳 Contenedores"]
        C_PG["postgres"]
        C_RD["redis"]
        C_BE["backend"]
        C_FE["frontend"]
        C_CW["celery_worker"]
        C_CB["celery_beat"]
        C_NX["nginx"]
    end

    %% Mappings
    V_PG -->|/var/lib/postgresql/data| C_PG
    V_RD -->|/data| C_RD
    V_BE -->|/app| C_BE
    V_BE -->|/app| C_CW
    V_BE -->|/app| C_CB
    V_FE -->|/app| C_FE
    V_NX -->|/etc/nginx| C_NX
    V_ST -->|/app/static| C_NX
    V_MD -->|/app/media| C_NX
    V_DIST -->|/app/frontend/dist| C_NX

    V_NAS -->|${NETAPP_BASE_PATH}| C_BE
    V_NAS -->|${NETAPP_BASE_PATH}| C_CW
    V_NAS -->|${NETAPP_BASE_PATH}| C_CB
    V_NAS --- V_TRASH
    V_NAS --- V_ATTACH
```

---

## Diagrama de Dependencias de Servicios

```mermaid
flowchart TB
    subgraph STARTUP["🚀 Orden de Inicio"]
        direction TB

        L1["<b>Nivel 1: Infraestructura</b>"]
        L2["<b>Nivel 2: Aplicación</b>"]
        L3["<b>Nivel 3: Workers</b>"]
        L4["<b>Nivel 4: Proxy</b>"]

        L1 --> L2 --> L3 --> L4
    end

    subgraph LEVEL1["Nivel 1"]
        PG1["🐘 PostgreSQL<br/>healthcheck: pg_isready"]
        RD1["🔴 Redis<br/>healthcheck: redis-cli ping"]
    end

    subgraph LEVEL2["Nivel 2"]
        BE2["🐍 Backend<br/>depends: postgres, redis<br/>condition: service_healthy"]
        FE2["⚛️ Frontend<br/>depends: backend"]
    end

    subgraph LEVEL3["Nivel 3"]
        CW3["⚙️ Celery Worker<br/>depends: postgres, redis<br/>condition: service_healthy"]
        CB3["⏰ Celery Beat<br/>depends: celery_worker"]
    end

    subgraph LEVEL4["Nivel 4"]
        NX4["🌐 Nginx<br/>depends: backend, frontend"]
    end

    %% Dependencies arrows
    PG1 -->|healthy| BE2
    RD1 -->|healthy| BE2
    PG1 -->|healthy| CW3
    RD1 -->|healthy| CW3
    BE2 --> FE2
    CW3 --> CB3
    BE2 --> NX4
    FE2 --> NX4
```

---

## Diagrama de Flujo de Datos

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Usuario
    participant N as 🌐 Nginx
    participant F as ⚛️ Frontend
    participant B as 🐍 Backend
    participant R as 🔴 Redis
    participant P as 🐘 PostgreSQL
    participant C as ⚙️ Celery
    participant S as 🗄️ NAS

    Note over U,S: Flujo 1: Navegación y Listado de Archivos

    U->>N: GET /explorar?path=/carpeta
    N->>F: Proxy frontend
    F->>N: Request /api/file-ops/browse
    N->>B: Proxy backend
    B->>R: Check cache
    alt Cache Hit
        R-->>B: Cached data
    else Cache Miss
        B->>S: os.listdir(path)
        S-->>B: File listing
        B->>P: Query metadata (owners, permissions)
        P-->>B: Metadata
        B->>R: Store in cache
    end
    B-->>N: JSON response
    N-->>F: Response
    F-->>U: Render file list

    Note over U,S: Flujo 2: Subida de Archivo

    U->>N: POST /api/file-ops/upload (multipart)
    N->>B: Proxy with file
    B->>P: Check permissions
    P-->>B: Permissions OK
    B->>B: Validate filename (IGAC rules)
    B->>S: Write file to NAS
    S-->>B: Success
    B->>P: Create File record, AuditLog
    B->>R: Invalidate cache
    B-->>N: Success response
    N-->>U: Upload complete

    Note over U,S: Flujo 3: Eliminación con Papelera

    U->>N: DELETE /api/file-ops/delete
    N->>B: Proxy
    B->>P: Check delete permission
    P-->>B: Permission OK
    B->>R: Queue async task
    R->>C: Process delete task
    C->>S: Move to .trash/
    C->>P: Create TrashItem
    C->>P: Create AuditLog
    C-->>R: Task complete
    B-->>U: Deletion queued
```

---

## Tabla de Configuración de Servicios

### Servicios de Infraestructura

| Servicio | Imagen | Puerto Ext | Puerto Int | Volúmenes | Healthcheck |
|----------|--------|------------|------------|-----------|-------------|
| PostgreSQL | postgres:15-alpine | 5433 | 5432 | ./postgres_data | pg_isready -U postgres |
| Redis | redis:7-alpine | 6379 | 6379 | ./redis_data | redis-cli ping |

### Servicios de Aplicación

| Servicio | Build | Puerto Ext | Puerto Int | Volúmenes | Dependencias |
|----------|-------|------------|------------|-----------|--------------|
| Backend | ./backend/Dockerfile | 8000 | 8000 | ./backend, NETAPP | postgres(healthy), redis(healthy) |
| Frontend | ./frontend/Dockerfile | 4545 | 4545 | ./frontend | backend |

### Servicios de Procesamiento

| Servicio | Build | Comando | Volúmenes | Dependencias |
|----------|-------|---------|-----------|--------------|
| Celery Worker | ./backend/Dockerfile | celery -A config worker -l INFO | ./backend, NETAPP | postgres(healthy), redis(healthy) |
| Celery Beat | ./backend/Dockerfile | celery -A config beat -l INFO | ./backend, NETAPP | celery_worker |

### Servicios de Proxy

| Servicio | Imagen | Puertos | Volúmenes | Dependencias |
|----------|--------|---------|-----------|--------------|
| Nginx | nginx:alpine | 80, 443 | ./nginx, static, media, dist | backend, frontend |

---

## Variables de Entorno Críticas

### Base de Datos
```env
POSTGRES_DB=gestion_archivo_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=********
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
```

### Redis/Celery
```env
REDIS_HOST=redis
REDIS_PORT=6379
CELERY_BROKER_URL=redis://redis:6379/2
CELERY_RESULT_BACKEND=redis://redis:6379/2
```

### Django
```env
DEBUG=False
DJANGO_SECRET_KEY=********
ALLOWED_HOSTS=localhost,127.0.0.1,gestionarchivo.igac.gov.co
JWT_SECRET_KEY=********
```

### Almacenamiento NAS
```env
NETAPP_BASE_PATH=/mnt/repositorio/2510SP/H_Informacion_Consulta/Sub_Proy
SMB_SERVER=172.21.54.24
SMB_SHARE=DirGesCat
TRASH_PATH=04_bk/bk_temp_subproy/.trash
MESSAGE_ATTACHMENTS_PATH=04_bk/trans_doc_platform/message_attachments
```

### Servicios Externos
```env
GROQ_MODEL=llama-3.3-70b-versatile
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
DOMAIN=gestionarchivo.igac.gov.co
```

---

## Notas de Implementación

### Alta Disponibilidad
- PostgreSQL con volumen persistente para datos
- Redis con AOF (Append Only File) para persistencia
- Nginx como punto único de entrada con SSL

### Escalabilidad
- Celery workers pueden escalar horizontalmente
- Frontend estático servido por Nginx (cacheable)
- Backend stateless (sesiones en Redis)

### Seguridad
- SSL/TLS termination en Nginx
- JWT para autenticación stateless
- Secrets en variables de entorno (.env)
- Rate limiting en Nginx

### Monitoreo
- Healthchecks en PostgreSQL y Redis
- Logs centralizados en Docker
- Auditoría completa en base de datos
