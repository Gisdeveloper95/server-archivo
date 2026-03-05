# 4. Frontend - React + TypeScript

## 4.1 Visión General

El frontend es una **Single Page Application (SPA)** construida con tecnologías modernas que proporciona una interfaz de usuario rica y responsiva.

### Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.2.0 | Biblioteca UI principal |
| TypeScript | 5.9.3 | Tipado estático |
| Vite | 7.2.2 | Build tool y dev server |
| TailwindCSS | 4.1.17 | Framework CSS utility-first |
| Zustand | 5.0.8 | Estado global |
| React Router DOM | 7.9.6 | Enrutamiento SPA |
| Axios | 1.13.2 | Cliente HTTP |
| Lucide React | 0.553.0 | Iconografía |
| JSZip | 3.10.1 | Compresión de archivos |
| docx | 9.5.1 | Generación de documentos Word |

---

## 4.2 Estructura de Directorios

```
frontend/
├── src/
│   ├── api/                    # Clientes API
│   │   ├── client.ts           # Axios instance configurado
│   │   ├── auth.ts             # Endpoints de autenticación
│   │   ├── files.ts            # Operaciones de archivos
│   │   ├── fileOps.ts          # Operaciones avanzadas
│   │   ├── users.ts            # Gestión de usuarios
│   │   ├── admin.ts            # Endpoints administrativos
│   │   ├── audit.ts            # Auditoría
│   │   ├── notifications.ts    # Notificaciones y mensajes
│   │   ├── favorites.ts        # Favoritos
│   │   ├── trash.ts            # Papelera
│   │   ├── sharing.ts          # Compartir enlaces
│   │   ├── stats.ts            # Estadísticas
│   │   ├── groqStats.ts        # Estadísticas GROQ
│   │   ├── aiAbbreviations.ts  # Abreviaciones IA
│   │   └── directoryColors.ts  # Colores de carpetas
│   │
│   ├── components/             # Componentes reutilizables
│   │   ├── Layout.tsx          # Layout principal
│   │   ├── FileList.tsx        # Lista de archivos
│   │   ├── FileTreeView.tsx    # Vista de árbol
│   │   ├── Breadcrumbs.tsx     # Navegación breadcrumb
│   │   ├── FilterPanel.tsx     # Panel de filtros
│   │   ├── NotificationBell.tsx # Campana de notificaciones
│   │   ├── AISystemWidget.tsx  # Widget estado IA
│   │   ├── RenameModal.tsx     # Modal de renombrado
│   │   ├── UploadModal.tsx     # Modal de subida
│   │   ├── ShareLinkModal.tsx  # Modal compartir
│   │   ├── admin/              # Componentes admin
│   │   ├── dictionary/         # Componentes diccionario
│   │   └── ui/                 # Componentes UI base
│   │
│   ├── pages/                  # Páginas/Vistas
│   │   ├── Dashboard.tsx       # Inicio
│   │   ├── FileExplorer.tsx    # Explorador de archivos
│   │   ├── Search.tsx          # Búsqueda global
│   │   ├── Favorites.tsx       # Favoritos
│   │   ├── Notifications.tsx   # Notificaciones
│   │   ├── Messages.tsx        # Mensajería
│   │   ├── Login.tsx           # Inicio de sesión
│   │   ├── Administration.tsx  # Administración
│   │   ├── Users.tsx           # Gestión usuarios
│   │   ├── Audit.tsx           # Auditoría
│   │   ├── Statistics.tsx      # Estadísticas
│   │   ├── Trash.tsx           # Papelera
│   │   └── ...                 # Otras páginas
│   │
│   ├── store/                  # Estado global (Zustand)
│   │   ├── authStore.ts        # Estado de autenticación
│   │   ├── notificationStore.ts # Estado de notificaciones
│   │   └── clipboardStore.ts   # Portapapeles virtual
│   │
│   ├── hooks/                  # Custom hooks
│   │   ├── useModal.tsx        # Gestión de modales
│   │   ├── useToast.ts         # Notificaciones toast
│   │   ├── useFileSort.ts      # Ordenamiento de archivos
│   │   ├── useTreeData.ts      # Datos para vista árbol
│   │   ├── useDirectoryColors.ts # Colores de directorios
│   │   ├── usePathPermissions.ts # Permisos por ruta
│   │   └── useClipboardWithConflicts.ts # Portapapeles avanzado
│   │
│   ├── contexts/               # React Contexts
│   │   └── ThemeContext.tsx    # Tema claro/oscuro
│   │
│   ├── types/                  # Definiciones TypeScript
│   │   ├── index.ts            # Exportaciones
│   │   ├── api.ts              # Tipos de API
│   │   ├── file.ts             # Tipos de archivos
│   │   ├── user.ts             # Tipos de usuario
│   │   └── stats.ts            # Tipos de estadísticas
│   │
│   ├── utils/                  # Utilidades
│   │   ├── formatSize.ts       # Formateo de tamaños
│   │   ├── formatDate.ts       # Formateo de fechas
│   │   ├── roleUtils.ts        # Utilidades de roles
│   │   └── security.ts         # Sanitización
│   │
│   ├── App.tsx                 # Componente raíz
│   └── main.tsx                # Punto de entrada
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 4.3 Sistema de Enrutamiento

El sistema utiliza **React Router DOM v7** con protección de rutas basada en roles.

### Tipos de Rutas

```typescript
// App.tsx - Componentes de protección

// Rutas públicas (sin autenticación)
const PublicRoute = ({ children }) => {
  // Login, recuperar contraseña, enlaces compartidos
};

// Rutas protegidas (requiere autenticación)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
};

// Rutas de Admin (admin y superadmin)
const AdminRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

// Rutas de SuperAdmin (solo superadmin)
const SuperAdminRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (user?.role !== 'superadmin') {
    return <Navigate to="/dashboard" />;
  }
  return children;
};
```

### Mapa de Rutas

| Ruta | Componente | Protección | Descripción |
|------|------------|------------|-------------|
| `/login` | Login | Pública | Inicio de sesión |
| `/recuperar-contrasena` | ForgotPassword | Pública | Recuperar contraseña |
| `/resetear-contrasena` | ResetPassword | Pública | Resetear contraseña |
| `/share/:token` | PublicShare | Pública | Enlace compartido público |
| `/dashboard` | Dashboard | Protegida | Página de inicio |
| `/explorar` | FileExplorer | Protegida | Explorador de archivos |
| `/buscar` | Search | Protegida | Búsqueda global |
| `/favoritos` | Favorites | Protegida | Directorios favoritos |
| `/notifications` | Notifications | Protegida | Notificaciones |
| `/mensajes` | Messages | Protegida | Mensajería interna |
| `/mis-permisos` | MyPermissions | Protegida | Ver permisos propios |
| `/ayuda-renombramiento` | NamingHelp | Protegida | Asistente de nombres |
| `/diccionario` | DictionaryManagement | Protegida | Diccionario IGAC |
| `/usuarios` | Users | Admin | Gestión de usuarios |
| `/estadisticas` | Statistics | Admin | Estadísticas de uso |
| `/auditoria` | Audit | Admin | Logs de auditoría |
| `/administracion` | Administration | SuperAdmin | Panel de admin |
| `/links-compartidos` | ShareLinks | SuperAdmin | Gestión de enlaces |
| `/papelera` | Trash | SuperAdmin | Papelera de reciclaje |

---

## 4.4 Diagrama de Arquitectura Frontend

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND REACT                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         App.tsx                                  │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │  │ThemeProvider│  │BrowserRouter│  │    ModalProvider        │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         Routes                                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │    │
│  │  │ Public   │ │Protected │ │  Admin   │ │    SuperAdmin    │   │    │
│  │  │ Routes   │ │ Routes   │ │  Routes  │ │     Routes       │   │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│           ┌────────────────────────┼────────────────────────┐           │
│           ▼                        ▼                        ▼           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │     Layout      │    │     Pages       │    │   Components    │     │
│  │  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │     │
│  │  │  Header   │  │    │  │ Dashboard │  │    │  │ FileList  │  │     │
│  │  ├───────────┤  │    │  ├───────────┤  │    │  ├───────────┤  │     │
│  │  │  Sidebar  │  │    │  │FileExplorer│  │    │  │ TreeView  │  │     │
│  │  ├───────────┤  │    │  ├───────────┤  │    │  ├───────────┤  │     │
│  │  │  Main     │  │    │  │  Search   │  │    │  │  Modals   │  │     │
│  │  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│                                    │                                     │
│           ┌────────────────────────┼────────────────────────┐           │
│           ▼                        ▼                        ▼           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │   Zustand       │    │      API        │    │     Hooks       │     │
│  │   Stores        │    │    Clients      │    │                 │     │
│  │  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │     │
│  │  │ authStore │  │    │  │  client   │  │    │  │ useModal  │  │     │
│  │  ├───────────┤  │    │  ├───────────┤  │    │  ├───────────┤  │     │
│  │  │notification│ │    │  │   files   │  │    │  │ useToast  │  │     │
│  │  │  Store    │  │    │  ├───────────┤  │    │  ├───────────┤  │     │
│  │  ├───────────┤  │    │  │   auth    │  │    │  │useFileSort│  │     │
│  │  │clipboard  │  │    │  └───────────┘  │    │  └───────────┘  │     │
│  │  │  Store    │  │    │                 │    │                 │     │
│  │  └───────────┘  │    │                 │    │                 │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Backend API (/api)                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4.5 Cliente API (Axios)

### Configuración Base

```typescript
// src/api/client.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - agrega token JWT
apiClient.interceptors.request.use((config) => {
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/request_password_reset',
    '/auth/confirm_password_reset'
  ];

  const isPublicRoute = publicRoutes.some(route =>
    config.url?.includes(route)
  );

  if (!isPublicRoute) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - maneja errores 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Módulos API

| Módulo | Archivo | Endpoints Principales |
|--------|---------|----------------------|
| Autenticación | `auth.ts` | login, logout, register, reset_password |
| Archivos | `files.ts` | browse, search, download, upload, delete |
| Operaciones | `fileOps.ts` | rename, move, copy, smart_validate |
| Usuarios | `users.ts` | list, create, update, delete, permissions |
| Admin | `admin.ts` | stats, bulk_permissions, system_config |
| Auditoría | `audit.ts` | logs, export, filters |
| Notificaciones | `notifications.ts` | list, mark_read, threads, messages |
| Favoritos | `favorites.ts` | list, add, remove, reorder |
| Papelera | `trash.ts` | list, restore, permanent_delete |
| Compartir | `sharing.ts` | create_link, list_links, revoke |
| GROQ Stats | `groqStats.ts` | usage, api_keys, stats |

---

## 4.6 Estado Global (Zustand)

### AuthStore - Autenticación

```typescript
// src/store/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Inicializar desde localStorage
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));
```

### NotificationStore - Notificaciones

```typescript
// src/store/notificationStore.ts
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  unreadByType: Record<NotificationType, number>;
  hasUrgent: boolean;
  isLoading: boolean;
  pollingInterval: number;
  isPollingActive: boolean;

  // Acciones
  fetchNotifications: (forceRefresh?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (notificationId: number) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}
```

**Características:**
- Polling automático cada 30 segundos
- Cache de 10 segundos para evitar requests excesivos
- Conteo separado por tipo de notificación
- Indicador de notificaciones urgentes

### ClipboardStore - Portapapeles Virtual

```typescript
// src/store/clipboardStore.ts
interface ClipboardState {
  items: FileItem[];
  operation: 'copy' | 'cut' | null;
  sourcePath: string | null;

  // Acciones
  setClipboard: (items: FileItem[], operation: 'copy' | 'cut', path: string) => void;
  clearClipboard: () => void;
  hasItems: () => boolean;
}
```

---

## 4.7 Sistema de Tipos (TypeScript)

### User Types

```typescript
// src/types/user.ts

// Roles del sistema
type UserRole = 'consultation' | 'consultation_edit' | 'admin' | 'superadmin';

// Niveles de permisos de edición
type EditPermissionLevel = 'upload_only' | 'upload_own' | 'upload_all';

// Modos de herencia
type InheritanceMode = 'total' | 'blocked' | 'limited_depth' | 'partial_write';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  department?: string;
  position?: string;
  is_active: boolean;
  // Exenciones de nombrado
  exempt_from_naming_rules?: boolean;
  exempt_from_path_limit?: boolean;
  exempt_from_name_length?: boolean;
  naming_exemptions?: NamingExemptions;
}

interface UserPermission {
  id?: number;
  user: number;
  base_path: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_create_directories: boolean;
  exempt_from_dictionary: boolean;
  edit_permission_level?: EditPermissionLevel;
  inheritance_mode: InheritanceMode;
  blocked_paths: string[];
  read_only_paths: string[];
  max_depth?: number;
  expires_at?: string | null;
}
```

### File Types

```typescript
// src/types/file.ts

interface FileItem {
  id: number | null;
  path: string;
  name: string;
  extension: string | null;
  size: number;
  size_formatted: string;
  is_directory: boolean;
  modified_date: string;
  created_date: string;
  md5_hash: string | null;
  // Propietario
  owner_name?: string;
  owner_username?: string;
  // Permisos individuales
  can_write?: boolean;
  can_delete?: boolean;
  can_rename?: boolean;
  read_only_mode?: boolean;
  // Conteo de elementos
  item_count?: number | null;
}

interface BrowseResponse {
  files: FileItem[];
  total: number;
  page: number;
  pages: number;
  current_path: string;
  breadcrumbs: Breadcrumb[];
  available_filters: AvailableFilters;
}
```

### Smart Naming Types

```typescript
// src/api/files.ts

interface PartAnalysis {
  type: 'number' | 'date' | 'dictionary' | 'connector' |
        'generic' | 'standard_english' | 'proper_name' |
        'unknown' | 'unknown_with_suggestion' | 'cadastral_code' | 'empty';
  value: string;
  meaning?: string;
  suggestion?: { key: string; value: string };
  source: 'preserved' | 'dictionary' | 'removed' |
          'warning' | 'ai_candidate' | 'skip';
}

interface SmartValidateResponse {
  success: boolean;
  valid: boolean;
  errors: string[];
  warnings: string[];
  original_name: string;
  formatted_name: string;
  parts_analysis: PartAnalysis[];
  unknown_parts: string[];
  needs_ai: boolean;
  detected_date: string | null;
  user_exemptions: UserExemptions;
}

interface SmartRenameResponse {
  success: boolean;
  original_name: string;
  suggested_name: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  used_ai: boolean;
  ai_metadata?: Record<string, any>;
  parts_analysis: PartAnalysis[];
}
```

---

## 4.8 Custom Hooks

### useModal - Gestión de Modales

```typescript
// src/hooks/useModal.tsx
interface ModalContextType {
  openModal: (component: React.ReactNode) => void;
  closeModal: () => void;
  isOpen: boolean;
}

export const useModal = () => {
  const context = useContext(ModalContext);
  return context;
};

// Uso:
const { openModal, closeModal } = useModal();
openModal(<RenameModal file={file} onClose={closeModal} />);
```

### useToast - Notificaciones Toast

```typescript
// src/hooks/useToast.ts
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type, message, duration = 5000) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message, duration }]);
    setTimeout(() => removeToast(id), duration);
  };

  return { toasts, success: (m) => addToast('success', m),
           error: (m) => addToast('error', m) };
};
```

### useFileSort - Ordenamiento

```typescript
// src/hooks/useFileSort.ts
type SortField = 'name' | 'size' | 'modified_date' | 'extension';
type SortOrder = 'asc' | 'desc';

export const useFileSort = (files: FileItem[]) => {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const sortedFiles = useMemo(() => {
    // Siempre directorios primero
    const dirs = files.filter(f => f.is_directory);
    const regularFiles = files.filter(f => !f.is_directory);

    const sortFn = (a, b) => {
      // Lógica de ordenamiento según campo
    };

    return [...dirs.sort(sortFn), ...regularFiles.sort(sortFn)];
  }, [files, sortField, sortOrder]);

  return { sortedFiles, sortField, sortOrder, setSortField, setSortOrder };
};
```

### usePathPermissions - Permisos por Ruta

```typescript
// src/hooks/usePathPermissions.ts
interface PathPermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_create_directories: boolean;
  is_loading: boolean;
}

export const usePathPermissions = (path: string): PathPermissions => {
  const [permissions, setPermissions] = useState({
    can_read: false,
    can_write: false,
    can_delete: false,
    can_create_directories: false,
    is_loading: true,
  });

  useEffect(() => {
    const fetchPermissions = async () => {
      const result = await adminApi.checkPathPermissions(path);
      setPermissions({ ...result, is_loading: false });
    };
    fetchPermissions();
  }, [path]);

  return permissions;
};
```

### useDirectoryColors - Colores de Carpetas

```typescript
// src/hooks/useDirectoryColors.ts
interface DirectoryColorHook {
  colors: Map<string, string>;
  setColor: (path: string, color: string) => Promise<void>;
  getColor: (path: string) => string | undefined;
  removeColor: (path: string) => Promise<void>;
}

export const useDirectoryColors = (): DirectoryColorHook => {
  const [colors, setColors] = useState<Map<string, string>>(new Map());

  // Cargar colores del servidor
  useEffect(() => {
    directoryColorsApi.list().then(data => {
      const colorMap = new Map(data.map(c => [c.path, c.color]));
      setColors(colorMap);
    });
  }, []);

  return { colors, setColor, getColor, removeColor };
};
```

---

## 4.9 Contextos React

### ThemeContext - Tema Claro/Oscuro

```typescript
// src/contexts/ThemeContext.tsx
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Verificar preferencia guardada o del sistema
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Aplicar clase 'dark' al documento
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Uso en componentes:
const { isDark, toggleTheme } = useThemeContext();
```

---

## 4.10 Componentes Principales

### Layout - Estructura Principal

El componente `Layout` proporciona la estructura base para todas las páginas protegidas:

**Características:**
- Header fijo con información del usuario
- Sidebar colapsable en móviles
- Menú dinámico según rol del usuario
- Widget de estado del sistema IA
- Notificaciones en tiempo real
- Toggle de tema claro/oscuro

```typescript
// Estructura del Layout
<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  <header>
    {/* Logo, info usuario, notificaciones, logout */}
  </header>

  <div className="flex">
    <aside>
      {/* Menú de navegación */}
      {/* Widget AI */}
    </aside>

    <main>
      {children}
    </main>
  </div>
</div>
```

### FileList - Lista de Archivos

Componente para mostrar archivos en formato de lista o grilla:

| Prop | Tipo | Descripción |
|------|------|-------------|
| `files` | `FileItem[]` | Array de archivos a mostrar |
| `viewMode` | `'list' \| 'grid'` | Modo de visualización |
| `onSelect` | `(file: FileItem) => void` | Callback al seleccionar |
| `onDoubleClick` | `(file: FileItem) => void` | Callback al hacer doble clic |
| `selectedItems` | `FileItem[]` | Items seleccionados |
| `onContextMenu` | `(e, file) => void` | Menú contextual |

### FileTreeView - Vista de Árbol

Navegación jerárquica de directorios con lazy loading:

**Características:**
- Expansión/colapso de nodos
- Carga bajo demanda
- Indicador de elementos
- Colores personalizados
- Drag & drop (futuro)

### Breadcrumbs - Navegación

Muestra la ruta actual con enlaces navegables:

```typescript
// Ejemplo de breadcrumbs
<Breadcrumbs
  items={[
    { name: 'Raíz', path: '/' },
    { name: 'Documentos', path: '/Documentos' },
    { name: 'Proyectos', path: '/Documentos/Proyectos' },
  ]}
  onNavigate={(path) => navigateTo(path)}
/>
```

### RenameModal - Renombrado Inteligente

Modal de renombrado con integración Smart Naming:

**Funcionalidades:**
1. Validación IGAC en tiempo real
2. Sugerencias con IA
3. Análisis de partes del nombre
4. Alertas de errores/advertencias
5. Vista previa del nombre sugerido
6. Búsqueda en diccionario

---

## 4.11 Utilidades

### formatSize - Formateo de Tamaños

```typescript
// src/utils/formatSize.ts
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Ejemplos:
formatSize(1024);       // "1 KB"
formatSize(1048576);    // "1 MB"
formatSize(1073741824); // "1 GB"
```

### formatDate - Formateo de Fechas

```typescript
// src/utils/formatDate.ts
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeDate = (date: string | Date): string => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60000) return 'Hace un momento';
  if (diff < 3600000) return `Hace ${Math.floor(diff/60000)} minutos`;
  if (diff < 86400000) return `Hace ${Math.floor(diff/3600000)} horas`;
  return formatDate(date);
};
```

### roleUtils - Utilidades de Roles

```typescript
// src/utils/roleUtils.ts
export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    consultation: 'Solo Consulta',
    consultation_edit: 'Consulta y Edición',
    admin: 'Administrador',
    superadmin: 'Super Administrador',
  };
  return labels[role] || role;
};

export const getRoleColor = (role: UserRole): string => {
  const colors: Record<UserRole, string> = {
    consultation: 'bg-gray-100 text-gray-800',
    consultation_edit: 'bg-blue-100 text-blue-800',
    admin: 'bg-purple-100 text-purple-800',
    superadmin: 'bg-red-100 text-red-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
};

export const canManageUsers = (role: UserRole): boolean => {
  return role === 'admin' || role === 'superadmin';
};

export const canAccessAdmin = (role: UserRole): boolean => {
  return role === 'superadmin';
};
```

### security - Sanitización

```typescript
// src/utils/security.ts
export const sanitizeFilename = (filename: string): string => {
  // Remover caracteres peligrosos
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.\./g, '')
    .trim();
};

export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};
```

---

## 4.12 Configuración de Build

### Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4545,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand', 'axios'],
          ui: ['lucide-react'],
        },
      },
    },
  },
});
```

### Tailwind Config

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },
    },
  },
  plugins: [],
};
```

### TypeScript Config

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 4.13 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE DATOS FRONTEND                       │
└─────────────────────────────────────────────────────────────────┘

    Usuario interactúa
          │
          ▼
    ┌───────────┐
    │ Component │ ──────────────────────────────────┐
    └─────┬─────┘                                   │
          │ Acción del usuario                      │
          ▼                                         │
    ┌───────────┐                                   │
    │   Hook    │ useModal, useToast, etc.          │
    └─────┬─────┘                                   │
          │                                         │
          ▼                                         │
    ┌───────────┐      ┌───────────┐               │
    │   Store   │◄────►│    API    │               │
    │ (Zustand) │      │  Client   │               │
    └─────┬─────┘      └─────┬─────┘               │
          │                  │                      │
          │                  ▼                      │
          │           ┌───────────┐                │
          │           │  Backend  │                │
          │           │   Django  │                │
          │           └─────┬─────┘                │
          │                 │                      │
          │                 ▼                      │
          │           ┌───────────┐                │
          │           │ Response  │                │
          │           └─────┬─────┘                │
          │                 │                      │
          ▼                 ▼                      │
    ┌─────────────────────────────┐               │
    │    Estado Actualizado       │               │
    └─────────────┬───────────────┘               │
                  │                                │
                  ▼                                │
    ┌─────────────────────────────┐               │
    │      Re-render UI           │◄──────────────┘
    └─────────────────────────────┘
```

---

## 4.14 Resumen de Componentes

### Total: 82 Componentes TSX

| Categoría | Cantidad | Ejemplos |
|-----------|----------|----------|
| **Páginas** | 19 | Dashboard, FileExplorer, Login, Audit |
| **Modales** | 18 | RenameModal, UploadModal, ShareLinkModal |
| **UI Base** | 12 | Layout, Toast, Pagination, Breadcrumbs |
| **Archivos** | 10 | FileList, FileTreeView, FileIcon, FilterPanel |
| **Admin** | 11 | UserManagement, PermissionManagement |
| **Otros** | 12 | AISystemWidget, NotificationBell, CharacterCounter |

### Total: 39 Archivos TypeScript

| Categoría | Cantidad | Descripción |
|-----------|----------|-------------|
| **API** | 14 | Clientes para cada endpoint |
| **Hooks** | 11 | Custom hooks reutilizables |
| **Types** | 5 | Definiciones de tipos |
| **Store** | 3 | Estados globales Zustand |
| **Utils** | 4 | Funciones de utilidad |
| **Config** | 2 | Configuraciones |

---

*Figura 4.1: Arquitectura completa del Frontend React*
