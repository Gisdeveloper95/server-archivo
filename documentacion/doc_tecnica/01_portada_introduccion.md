# MANUAL TÉCNICO
## Sistema de Gestión de Archivos NetApp
### Instituto Geográfico Agustín Codazzi (IGAC)

---

| Campo | Valor |
|-------|-------|
| **Versión del Documento** | 1.0.0 |
| **Fecha de Elaboración** | Enero 2025 |
| **Dependencia** | Dirección de Gestión Catastral |
| **Dominio de Producción** | gestionarchivo.igac.gov.co |
| **Clasificación** | Documento Técnico Interno |

---

## Control de Versiones

| Versión | Fecha | Autor | Descripción |
|---------|-------|-------|-------------|
| 1.0.0 | 2025-01-07 | DGC - Sistemas | Versión inicial del manual técnico |

---

## Tabla de Contenido

1. [Introducción](#1-introducción)
2. [Arquitectura General del Sistema](#2-arquitectura-general)
3. [Infraestructura y Despliegue](#3-infraestructura)
4. [Backend - Django REST Framework](#4-backend)
5. [Frontend - React + TypeScript](#5-frontend)
6. [Módulo: Explorador de Archivos](#6-explorador)
7. [Módulo: Sistema de Permisos](#7-permisos)
8. [Módulo: Smart Naming (IA)](#8-smart-naming)
9. [Módulo: Diccionario IGAC](#9-diccionario)
10. [Módulo: Favoritos](#10-favoritos)
11. [Módulo: Papelera de Reciclaje](#11-papelera)
12. [Módulo: Compartir Archivos](#12-compartir)
13. [Módulo: Notificaciones y Mensajes](#13-notificaciones)
14. [Módulo: Auditoría](#14-auditoria)
15. [Módulo: Administración](#15-administracion)
16. [Seguridad](#16-seguridad)
17. [Mantenimiento y Operación](#17-mantenimiento)
18. [Anexos](#18-anexos)

---

# 1. Introducción

## 1.1 Propósito del Documento

Este manual técnico tiene como objetivo proporcionar una guía completa y detallada del Sistema de Gestión de Archivos NetApp desarrollado para el Instituto Geográfico Agustín Codazzi (IGAC). El documento está dirigido a:

- **Desarrolladores**: Para entender la arquitectura, patrones de diseño y flujos de datos
- **Administradores de Sistemas**: Para la instalación, configuración y mantenimiento
- **Personal de Soporte**: Para diagnóstico y resolución de problemas
- **Auditores**: Para verificar controles de seguridad y trazabilidad

## 1.2 Alcance del Sistema

El Sistema de Gestión de Archivos NetApp es una aplicación web empresarial que centraliza el acceso y gestión de archivos almacenados en un servidor NAS NetApp mediante protocolo CIFS/SMB.

### Funcionalidades Principales:

| Módulo | Descripción |
|--------|-------------|
| **Explorador de Archivos** | Navegación, búsqueda, filtros, vistas múltiples |
| **Operaciones de Archivos** | Subida, descarga, renombrado, copia, movimiento |
| **Sistema de Permisos** | Control granular por usuario, ruta y herencia |
| **Smart Naming** | Validación IGAC + sugerencias con IA (GROQ) |
| **Diccionario** | Términos y abreviaciones oficiales IGAC |
| **Favoritos** | Accesos rápidos personalizados |
| **Papelera** | Eliminación suave con recuperación |
| **Compartir** | Enlaces públicos con seguridad |
| **Notificaciones** | Alertas y mensajería interna |
| **Auditoría** | Registro completo de operaciones |
| **Administración** | Gestión de usuarios y configuración |

## 1.3 Requisitos Previos

Para trabajar con este sistema se requiere conocimiento en:

- Python 3.11+ y Django 4.x
- JavaScript/TypeScript y React 18
- Docker y Docker Compose
- PostgreSQL 15
- Redis 7
- Nginx
- Protocolos CIFS/SMB
- APIs REST y JWT

## 1.4 Convenciones del Documento

| Símbolo | Significado |
|---------|-------------|
| `código` | Fragmentos de código o comandos |
| **Negrita** | Términos importantes |
| *Cursiva* | Nombres de archivos o rutas |
| ⚠️ | Advertencia importante |
| ℹ️ | Información adicional |
| ✅ | Paso completado o recomendación |

## 1.5 Glosario de Términos

| Término | Definición |
|---------|------------|
| **NAS** | Network Attached Storage - Almacenamiento en red |
| **CIFS/SMB** | Protocolo de compartición de archivos de Microsoft |
| **JWT** | JSON Web Token - Sistema de autenticación |
| **DRF** | Django REST Framework |
| **GROQ** | API de IA para modelos LLM (Llama 3.3) |
| **Celery** | Sistema de colas de tareas asíncronas |
| **Smart Naming** | Sistema de nomenclatura inteligente con IA |

---

# 2. Arquitectura General del Sistema

## 2.1 Visión General

El sistema sigue una arquitectura de microservicios containerizada, con separación clara entre:

- **Capa de Presentación**: React SPA servida por Nginx
- **Capa de API**: Django REST Framework
- **Capa de Datos**: PostgreSQL + Redis
- **Capa de Almacenamiento**: NetApp NAS
- **Capa de Procesamiento**: Celery Workers

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIOS                                 │
│                    (Navegador Web)                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS :443
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX                                    │
│              (Reverse Proxy + SSL + Static)                      │
└──────────┬──────────────────────────────────────┬───────────────┘
           │ /api/*                               │ /*
           ▼                                      ▼
┌─────────────────────┐                ┌─────────────────────────┐
│      BACKEND        │                │       FRONTEND          │
│   Django + DRF      │◄──────────────►│    React + Vite         │
│    Puerto 8000      │   API Calls    │     Puerto 4545         │
└─────────┬───────────┘                └─────────────────────────┘
          │
          ├─────────────┬─────────────┬─────────────┐
          ▼             ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │ NetApp   │ │   GROQ API   │
│   Puerto     │ │   Puerto     │ │   NAS    │ │   (IA/LLM)   │
│    5432      │ │    6379      │ │  CIFS    │ │              │
└──────────────┘ └──────┬───────┘ └──────────┘ └──────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │   CELERY WORKERS    │
              │  (Tareas Async)     │
              └─────────────────────┘
```

## 2.2 Diagrama de Arquitectura

![Arquitectura General](imagenes/02_arquitectura_infraestructura_diagrama_01.png)

*Figura 2.1: Arquitectura General del Sistema*

## 2.3 Flujo de Datos

1. **Usuario** accede via HTTPS al dominio `gestionarchivo.igac.gov.co`
2. **Nginx** recibe la petición y la enruta:
   - Rutas `/api/*` → Backend Django (puerto 8000)
   - Otras rutas → Frontend React (puerto 4545)
   - Archivos estáticos → Servidos directamente
3. **Backend** procesa la lógica de negocio:
   - Autenticación JWT
   - Validación de permisos
   - Operaciones de archivos
   - Registro de auditoría
4. **Almacenamiento**:
   - Metadatos → PostgreSQL
   - Cache/Sesiones → Redis
   - Archivos → NetApp NAS via CIFS
5. **Procesamiento Async**:
   - Celery procesa tareas pesadas
   - Limpieza de papelera
   - Envío de emails

## 2.4 Stack Tecnológico Detallado

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Python | 3.11 | Lenguaje principal |
| Django | 4.x | Framework web |
| Django REST Framework | 3.14+ | API REST |
| Celery | 5.x | Tareas asíncronas |
| Gunicorn | 21.x | Servidor WSGI |
| psycopg2 | 2.9+ | Driver PostgreSQL |
| redis-py | 4.x | Cliente Redis |
| PyJWT | 2.x | Tokens JWT |

### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 18.x | Biblioteca UI |
| TypeScript | 5.x | Tipado estático |
| Vite | 5.x | Build tool |
| TailwindCSS | 3.x | Estilos |
| Zustand | 4.x | Estado global |
| React Router | 6.x | Enrutamiento |
| Axios | 1.x | Cliente HTTP |
| Lucide React | 0.x | Iconos |

### Infraestructura
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Docker | 24.x | Containerización |
| Docker Compose | 2.x | Orquestación |
| Nginx | Alpine | Reverse proxy |
| PostgreSQL | 15 | Base de datos |
| Redis | 7 | Cache/Broker |
| NetApp | - | Almacenamiento NAS |

## 2.5 Modelo de Datos (Resumen)

El sistema cuenta con **19 modelos** distribuidos en **8 aplicaciones Django**:

| App | Modelos | Descripción |
|-----|---------|-------------|
| `users` | 4 | User, UserPermission, UserFavorite, PasswordResetToken |
| `files` | 2 | Directory, DirectoryColor |
| `audit` | 2 | AuditLog, PermissionChangeLog |
| `dictionary` | 2 | DictionaryTerm, AIGeneratedAbbreviation |
| `groq_stats` | 1 | GroqAPIKey |
| `sharing` | 2 | ShareLink, ShareLinkAccess |
| `trash` | 2 | TrashItem, TrashConfig |
| `notifications` | 4 | Notification, MessageThread, Message, MessageAttachment |

![Diagrama ERD](imagenes/01_ERD_modelo_datos_diagrama_01.png)

*Figura 2.2: Diagrama Entidad-Relación Completo*
