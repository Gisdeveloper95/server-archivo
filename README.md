# Server Archivo - Enterprise Document Management System

<p align="center">
  <img src="logo.ico" alt="Server Archivo" width="80"/>
</p>

**Full-stack enterprise platform for centralized file management**, built to manage large-scale corporate document repositories (2.5TB+). Features AI-powered naming validation, role-based access control, comprehensive audit trails, and real-time file operations over SMB/CIFS network shares.

> Developed for the Instituto Geografico Agustin Codazzi (IGAC), Colombia's national geographic and cadastral authority.

---

## Key Features

- **File Explorer** - Real-time navigation, upload, download, copy/move, rename, and batch operations over network shares (SMB/CIFS)
- **AI-Powered Naming** - Intelligent filename suggestions using local LLM (Ollama) with cloud fallback (GROQ), enforcing corporate naming conventions
- **Role-Based Access Control** - Hierarchical permissions (consultation, editor, admin, superadmin) with path-level granularity
- **Corporate Dictionary** - Curated terminology database for naming validation with abbreviation management
- **Audit & Compliance** - 360-day transaction logging with IP tracking, user activity dashboards, and CSV exports
- **Secure File Sharing** - Public links with expiration, password protection, and download tracking
- **Trash Management** - Soft-delete with 30-day retention, automatic cleanup via Celery scheduled tasks
- **Notifications** - Internal messaging system with threads, attachments, and lifecycle management
- **Office Integration** - OnlyOffice/Microsoft 365 support for collaborative document editing

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Django 4.x + DRF** | REST API framework |
| **PostgreSQL 15** | Primary database |
| **Redis 7** | Cache & Celery broker |
| **Celery + Beat** | Async tasks & scheduling |
| **Ollama (llama3.2)** | Local AI inference |
| **GROQ API** | Cloud AI fallback (key pool) |
| **SMBProtocol** | NetApp/NAS file operations |
| **SimpleJWT** | Token authentication |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite 7** | Build tooling |
| **TailwindCSS 4** | Styling |
| **Zustand** | State management |
| **React Router v7** | Client-side routing |
| **Axios** | HTTP client |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker Compose** | Container orchestration |
| **Nginx** | Reverse proxy + SSL termination |
| **Keycloak** | SSO/Identity management (optional) |
| **Let's Encrypt** | SSL certificates |

---

## Architecture

```
                    +------------------+
                    |     Nginx        |
                    |  (SSL + Proxy)   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     |  React Frontend  |          |  Django Backend  |
     |  (Static Build)  |          |   REST API       |
     +------------------+          +--------+---------+
                                            |
                    +-----------+-----------+-----------+
                    |           |           |           |
              +-----v--+  +----v---+  +----v---+  +---v----+
              |PostgreSQL|  | Redis  |  | Ollama |  | NetApp |
              |   15     |  |   7    |  |  LLM   |  |  SMB   |
              +---------+  +--------+  +--------+  +--------+
                                            |
                                     +------v------+
                                     | GROQ Cloud  |
                                     | (fallback)  |
                                     +-------------+
```

### Django Apps

| App | Description |
|---|---|
| `users` | Authentication, roles, and permission management |
| `files` | File operations (browse, upload, download, rename, copy, move) |
| `audit` | Action logging and compliance reporting |
| `dictionary` | Corporate naming terminology and validation |
| `groq_stats` | AI API usage tracking and key pool management |
| `sharing` | Public link generation with expiration controls |
| `trash` | Recycle bin with retention policies |
| `notifications` | Internal messaging and communication threads |

### Backend Services

| Service | Description |
|---|---|
| `ai_naming_service` | GROQ/Ollama integration for smart filename suggestions |
| `smart_naming_service` | Advanced naming validation and correction engine |
| `netapp_service` | SMB/CIFS file operations on network shares |
| `permission_service` | Path-level permission checking and enforcement |
| `audit_report_service` | Audit trail generation and analytics |
| `microsoft_service` | Office 365/OnlyOffice integration |

---

## API Overview

| Endpoint Group | Description |
|---|---|
| `POST /api/auth/login` | JWT authentication |
| `GET /api/file-ops/browse` | Navigate directories |
| `POST /api/file-ops/upload` | Upload files (single/batch) |
| `GET /api/file-ops/download` | Download files or folders as ZIP |
| `POST /api/file-ops/smart-rename/` | AI-powered file renaming |
| `POST /api/file-ops/validate-name` | Validate filename against dictionary |
| `GET /api/audit/` | Query audit logs |
| `POST /api/sharing/create_share/` | Generate public sharing links |
| `GET /api/dictionary/` | Corporate terminology CRUD |
| `GET /api/trash/` | Trash management |
| `GET /api/notifications/` | Internal messaging |

---

## Setup & Deployment

### Prerequisites
- Docker & Docker Compose
- Network share mounted at `/mnt/repositorio` (SMB/CIFS)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Gisdeveloper95/server-archivo.git
cd server-archivo

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials, API keys, and paths

# 3. Launch all services
docker-compose up -d

# 4. Run migrations
docker-compose exec backend python manage.py migrate

# 5. Create superuser
docker-compose exec backend python manage.py createsuperuser
```

The application will be available at `http://localhost` (Nginx).

### Environment Variables

Key configuration via `.env`:

| Variable | Description |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Database credentials |
| `DJANGO_SECRET_KEY` | Django secret key |
| `JWT_SECRET_KEY` | JWT signing key |
| `SMB_SERVER`, `SMB_SHARE`, `SMB_USER`, `SMB_PASSWORD` | Network share credentials |
| `GROQ_API_KEYS` | Comma-separated GROQ API keys |
| `OLLAMA_BASE_URL` | Ollama server URL |
| `KEYCLOAK_*` | SSO configuration (optional) |

---

## Screenshots

> *Application interface showcasing the file explorer, AI naming suggestions, and admin dashboard.*

---

## License

This project was developed for internal use at IGAC. All rights reserved.

---

## Author

**Andres Felipe Osorio Bastidas**
GIS Developer & Full-Stack Engineer
[GitHub](https://github.com/Gisdeveloper95)
