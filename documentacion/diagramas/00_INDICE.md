# Documentacion Tecnica - Sistema de Gestion de Archivos IGAC

## Informacion del Proyecto

| Campo | Valor |
|-------|-------|
| **Nombre** | Sistema de Gestion de Archivos NetApp |
| **Organizacion** | Instituto Geografico Agustin Codazzi (IGAC) |
| **Version** | 1.0.0 |
| **Fecha Documentacion** | Enero 2025 |
| **Autor** | Direccion de Gestion Catastral |

---

## Resumen del Sistema

Sistema web empresarial para la gestion centralizada de archivos almacenados en un NAS NetApp. Incluye:

- Navegacion y busqueda de archivos en tiempo real
- Sistema de permisos granulares por usuario y ruta
- Nomenclatura inteligente con validacion IGAC e IA (GROQ)
- Auditoria completa de todas las operaciones
- Papelera de reciclaje con recuperacion
- Sistema de comparticion mediante enlaces publicos
- Notificaciones en tiempo real

---

## Indice de Documentacion Tecnica

### 1. Modelo de Datos (ERD)

**Archivo:** [01_ERD_modelo_datos.md](01_ERD_modelo_datos.md)

Diagrama Entidad-Relacion completo del sistema con:
- 19 modelos Django distribuidos en 8 aplicaciones
- 37 relaciones de clave foranea
- Indices y constraints documentados
- Campos y tipos de cada modelo

**Apps cubiertas:**
- `users` - Usuarios, permisos, favoritos
- `files` - Archivos indexados, colores directorio
- `audit` - Logs de auditoria, historial permisos
- `dictionary` - Diccionario de abreviaciones
- `groq_stats` - Estadisticas de API keys IA
- `sharing` - Enlaces compartidos
- `trash` - Papelera de reciclaje
- `notifications` - Sistema de notificaciones

---

### 2. Arquitectura de Infraestructura

**Archivo:** [02_arquitectura_infraestructura.md](02_arquitectura_infraestructura.md)

Documentacion de la infraestructura Docker con:
- 7 contenedores Docker Compose
- Mapeo de puertos y volumenes
- Diagrama de red y comunicacion
- Flujo de datos entre servicios
- Variables de entorno criticas

**Servicios:**
- PostgreSQL 15 (Base de datos)
- Redis 7 (Cache + Broker Celery)
- Django/Gunicorn (Backend API)
- React/Vite (Frontend SPA)
- Celery Worker (Tareas asincronas)
- Celery Beat (Scheduler)
- Nginx (Reverse proxy)

---

### 3. Arquitectura Frontend

**Archivo:** [03_arquitectura_frontend.md](03_arquitectura_frontend.md)

Documentacion del frontend React con:
- Estructura de directorios completa
- 82 componentes TSX documentados
- 19 paginas/vistas
- 11 hooks personalizados
- Sistema de estado con Zustand
- Configuracion de API client

**Tecnologias:**
- React 18 + TypeScript
- Vite 5.x (Build tool)
- TailwindCSS 3.x (Estilos)
- Zustand (Estado global)
- React Router DOM 6.x
- Axios (HTTP client)
- Lucide React (Iconos)

---

### 4. Flujos de Usuario

**Archivo:** [04_flujos_usuario.md](04_flujos_usuario.md)

Diagramas de secuencia para los principales flujos:
- Autenticacion (login, logout, recuperar contrasena)
- Navegacion de archivos
- Subida de archivos (simple y carpeta)
- Descarga (archivo y ZIP)
- Renombrado inteligente con IA
- Sistema de permisos
- Papelera de reciclaje
- Compartir archivos
- Notificaciones
- Auditoria

**Incluye:**
- Diagramas de secuencia (Mermaid)
- Diagramas de estado (archivo, usuario)
- Flujo de validacion IGAC

---

### 5. API REST Endpoints

**Archivo:** [05_api_endpoints.md](05_api_endpoints.md)

Documentacion completa de la API REST:
- 100+ endpoints documentados
- Request/Response examples
- Codigos HTTP y errores
- Headers requeridos
- Rate limiting
- Diagrama de seguridad

**Categorias:**
- Autenticacion JWT
- Usuarios y permisos
- Operaciones de archivos
- Smart Naming (IA)
- Diccionario
- Auditoria
- Estadisticas
- Administracion
- Compartir
- Papelera
- Notificaciones

---

## Stack Tecnologico

```
+--------------------------------------------------+
|                    FRONTEND                       |
|  React 18 | TypeScript | Vite | TailwindCSS      |
|  Zustand | React Router | Axios | Lucide         |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|                 REVERSE PROXY                     |
|          Nginx (SSL/TLS, Rate Limiting)          |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|                    BACKEND                        |
|  Django 4.x | DRF | JWT | Gunicorn              |
|  Celery Worker | Celery Beat                     |
+--------------------------------------------------+
           |                    |
           v                    v
+-------------------+  +-------------------+
|    PostgreSQL 15  |  |     Redis 7       |
|    (Datos)        |  |  (Cache + Queue)  |
+-------------------+  +-------------------+
                        |
                        v
+--------------------------------------------------+
|              ALMACENAMIENTO EXTERNO              |
|  NetApp NAS (CIFS/SMB) | GROQ AI API            |
+--------------------------------------------------+
```

---

## Estadisticas del Codigo

| Componente | Archivos | Lineas (aprox) |
|------------|----------|----------------|
| Backend Python | ~50 | ~8,000 |
| Frontend TSX | 82 | ~12,000 |
| Frontend TS | 39 | ~3,000 |
| Documentacion | 6 | ~3,500 |
| **Total** | **~177** | **~26,500** |

---

## Requisitos del Sistema

### Servidor

| Recurso | Minimo | Recomendado |
|---------|--------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Disco | 50 GB | 100 GB SSD |
| SO | Ubuntu 20.04+ | Ubuntu 22.04 |
| Docker | 20.10+ | 24.x |
| Docker Compose | 2.x | 2.x |

### Cliente

- Navegador moderno (Chrome 90+, Firefox 90+, Edge 90+)
- Resolucion minima: 1280x720
- JavaScript habilitado

---

## Contacto

Para dudas tecnicas sobre esta documentacion:

- **Subdireccion:** Direccion de Gestion Catastral
- **Area:** Sistemas de Informacion
- **Email:** [sistemas@igac.gov.co]

---

## Historial de Versiones

| Version | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2025-01-07 | Documentacion inicial completa |

---

## Como Usar los Diagramas

Todos los diagramas estan escritos en formato **Mermaid**, compatible con:

- GitHub/GitLab (renderizado automatico)
- VSCode con extension Mermaid
- Notion, Obsidian
- [Mermaid Live Editor](https://mermaid.live/)

Para renderizar localmente:
```bash
# Instalar mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Generar PNG
mmdc -i 01_ERD_modelo_datos.md -o erd.png

# Generar SVG
mmdc -i 01_ERD_modelo_datos.md -o erd.svg -f svg
```
