# 6. Módulos Complementarios

## 6.1 Sistema de Favoritos

### Descripción

Permite a los usuarios marcar directorios como favoritos para acceso rápido desde el Dashboard.

### Modelo de Datos

```python
# users/models.py
class UserFavorite(models.Model):
    """Directorio favorito de un usuario"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    path = models.CharField(max_length=1000)
    name = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, default='folder')
    color = models.CharField(max_length=20, default='blue')
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'path']
        ordering = ['position', 'name']
```

### Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/favorites/` | GET | Listar favoritos del usuario |
| `/api/favorites/` | POST | Agregar nuevo favorito |
| `/api/favorites/{id}/` | DELETE | Eliminar favorito |
| `/api/favorites/reorder/` | POST | Reordenar favoritos |

### Flujo de Operación

```
Usuario hace clic en estrella
         │
         ▼
┌────────────────┐    POST /api/favorites/
│ Toggle         │───────────────────────────►┌──────────────┐
│ Favorito       │                            │   Backend    │
└────────────────┘◄───────────────────────────┤ Crear/Delete │
         │                                    └──────────────┘
         ▼
┌────────────────┐
│ Actualizar     │
│ Dashboard      │
└────────────────┘
```

---

## 6.2 Papelera de Reciclaje

### Descripción

Sistema de eliminación "suave" que permite recuperar archivos eliminados durante un período configurable.

### Modelo de Datos

```python
# trash/models.py
class TrashItem(models.Model):
    """Item en la papelera de reciclaje"""
    STATUS_CHOICES = [
        ('stored', 'Almacenado'),
        ('restoring', 'Restaurando'),
        ('restored', 'Restaurado'),
        ('deleted', 'Eliminado Permanentemente'),
        ('failed', 'Error'),
    ]

    trash_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    original_path = models.CharField(max_length=2000)
    original_name = models.CharField(max_length=500)
    is_directory = models.BooleanField(default=False)
    size_bytes = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=255, null=True)
    file_count = models.IntegerField(default=0)
    dir_count = models.IntegerField(default=0)

    deleted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    deleted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)

    restored_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    restored_at = models.DateTimeField(null=True)
    restored_path = models.CharField(max_length=2000, null=True)


class TrashConfig(models.Model):
    """Configuración global de la papelera"""
    retention_days = models.IntegerField(default=30)
    max_size_gb = models.DecimalField(max_digits=10, decimal_places=2, default=100)
    auto_cleanup_enabled = models.BooleanField(default=True)
    excluded_extensions = models.JSONField(default=list)
```

### Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/trash/` | GET | Listar items en papelera |
| `/api/trash/{id}/` | GET | Detalle de item |
| `/api/trash/{id}/restore/` | POST | Restaurar item |
| `/api/trash/{id}/` | DELETE | Eliminar permanentemente |
| `/api/trash/stats/` | GET | Estadísticas de uso |
| `/api/trash/cleanup/` | DELETE | Limpiar expirados |
| `/api/trash/config/` | GET/PUT | Configuración |

### Flujo de Eliminación

```
┌─────────────────────────────────────────────────────────────────┐
│                  FLUJO DE ELIMINACIÓN                           │
└─────────────────────────────────────────────────────────────────┘

Usuario elimina archivo
         │
         ▼
┌────────────────┐
│ Verificar      │
│ permisos       │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Mover a        │  Físicamente a /var/trash/{uuid}/
│ papelera       │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Crear registro │  TrashItem en BD
│ TrashItem      │  expires_at = now + retention_days
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Registrar      │  AuditLog.action = 'delete'
│ auditoría      │
└────────────────┘

         │ Después de retention_days...
         ▼
┌────────────────┐
│ Celery Beat    │  cleanup_expired_trash()
│ (cron diario)  │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Eliminar       │
│ permanente     │
└────────────────┘
```

### Almacenamiento en Papelera

```python
# trash/services.py
class TrashService:
    TRASH_BASE_PATH = '/var/trash'

    def move_to_trash(self, path: str, user) -> TrashItem:
        """Mueve un archivo/directorio a la papelera"""
        smb = SMBService()
        full_path = smb.build_full_path(path)

        # Generar UUID para el item
        trash_id = uuid.uuid4()
        trash_path = os.path.join(self.TRASH_BASE_PATH, str(trash_id))
        os.makedirs(trash_path, exist_ok=True)

        # Si es directorio, comprimir como tar.gz
        if os.path.isdir(full_path):
            archive_path = os.path.join(trash_path, 'data.tar.gz')
            with tarfile.open(archive_path, 'w:gz') as tar:
                tar.add(full_path, arcname=os.path.basename(full_path))
            # Contar archivos y directorios
            file_count, dir_count = self._count_contents(full_path)
        else:
            # Archivo individual
            shutil.copy2(full_path, os.path.join(trash_path, 'data'))
            file_count, dir_count = 1, 0

        # Calcular tamaño
        size_bytes = self._get_size(full_path)

        # Crear registro en BD
        config = TrashConfig.get_config()
        item = TrashItem.objects.create(
            trash_id=trash_id,
            original_path=path,
            original_name=os.path.basename(path),
            is_directory=os.path.isdir(full_path),
            size_bytes=size_bytes,
            file_count=file_count,
            dir_count=dir_count,
            deleted_by=user,
            expires_at=timezone.now() + timedelta(days=config.retention_days),
            status='stored'
        )

        # Eliminar original
        if os.path.isdir(full_path):
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)

        return item

    def restore_from_trash(self, trash_id: str, user, target_path=None) -> dict:
        """Restaura un item desde la papelera"""
        item = TrashItem.objects.get(trash_id=trash_id)

        if item.status != 'stored':
            return {'success': False, 'error': 'Item no disponible'}

        # Determinar ruta de restauración
        restore_path = target_path or item.original_path
        smb = SMBService()
        full_restore_path = smb.build_full_path(restore_path)

        # Verificar si existe (conflicto)
        if os.path.exists(full_restore_path):
            # Renombrar con sufijo
            base, ext = os.path.splitext(full_restore_path)
            counter = 1
            while os.path.exists(f"{base}_{counter}{ext}"):
                counter += 1
            full_restore_path = f"{base}_{counter}{ext}"

        # Restaurar
        trash_path = os.path.join(self.TRASH_BASE_PATH, str(trash_id))

        if item.is_directory:
            archive_path = os.path.join(trash_path, 'data.tar.gz')
            with tarfile.open(archive_path, 'r:gz') as tar:
                tar.extractall(os.path.dirname(full_restore_path))
        else:
            shutil.copy2(
                os.path.join(trash_path, 'data'),
                full_restore_path
            )

        # Actualizar registro
        item.status = 'restored'
        item.restored_by = user
        item.restored_at = timezone.now()
        item.restored_path = restore_path
        item.save()

        # Limpiar papelera
        shutil.rmtree(trash_path)

        return {
            'success': True,
            'restored_path': restore_path
        }
```

---

## 6.3 Sistema de Compartir Enlaces

### Descripción

Permite generar enlaces públicos para compartir archivos/directorios con usuarios externos.

### Modelo de Datos

```python
# sharing/models.py
class ShareLink(models.Model):
    """Enlace para compartir archivo/directorio"""
    PERMISSION_CHOICES = [
        ('view', 'Solo Ver'),
        ('download', 'Descargar'),
    ]

    token = models.CharField(max_length=64, unique=True, default=generate_token)
    path = models.CharField(max_length=2000)
    is_directory = models.BooleanField(default=False)

    permission = models.CharField(max_length=20, choices=PERMISSION_CHOICES)
    password = models.CharField(max_length=128, null=True, blank=True)
    require_email = models.BooleanField(default=False)
    allowed_domain = models.CharField(max_length=255, null=True)

    max_downloads = models.IntegerField(null=True)
    download_count = models.IntegerField(default=0)
    access_count = models.IntegerField(default=0)

    expires_at = models.DateTimeField(null=True)
    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    # Opcional: enlace a item de papelera
    trash_item = models.ForeignKey(TrashItem, null=True, on_delete=models.CASCADE)

    @property
    def is_valid(self) -> bool:
        if not self.is_active:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        if self.max_downloads and self.download_count >= self.max_downloads:
            return False
        return True

    @property
    def full_url(self) -> str:
        return f"{settings.SITE_URL}/share/{self.token}"


class ShareLinkAccess(models.Model):
    """Registro de accesos a enlaces compartidos"""
    share_link = models.ForeignKey(ShareLink, on_delete=models.CASCADE)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    email_provided = models.EmailField(null=True)
    action = models.CharField(max_length=20)  # view, download, denied
    success = models.BooleanField(default=True)
    error_message = models.TextField(null=True)
    accessed_at = models.DateTimeField(auto_now_add=True)
```

### Endpoints API

| Endpoint | Método | Acceso | Descripción |
|----------|--------|--------|-------------|
| `/api/sharing/` | GET | SuperAdmin | Listar todos los enlaces |
| `/api/sharing/create_share/` | POST | SuperAdmin | Crear enlace |
| `/api/sharing/{id}/deactivate/` | POST | SuperAdmin | Desactivar enlace |
| `/api/sharing/{id}/stats/` | GET | SuperAdmin | Estadísticas |
| `/api/shared/access/{token}/` | GET | Público | Acceder al enlace |
| `/api/shared/download/{token}/` | GET | Público | Descargar desde enlace |

### Flujo de Compartir

```
┌─────────────────────────────────────────────────────────────────┐
│                 FLUJO DE COMPARTIR ARCHIVO                      │
└─────────────────────────────────────────────────────────────────┘

SuperAdmin crea enlace
         │
         ▼
┌────────────────┐
│ ShareLinkModal │
│ - Ruta         │
│ - Permisos     │
│ - Contraseña   │
│ - Expiración   │
│ - Max descargas│
└────────┬───────┘
         │
         ▼
┌────────────────┐    POST /api/sharing/create_share/
│ Crear enlace   │─────────────────────────────────────►
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ URL generada:  │
│ /share/abc123  │
└────────┬───────┘
         │
    Copiar y enviar a usuario externo
         │
         ▼
┌────────────────┐
│ Usuario externo│
│ accede al link │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Validaciones:  │
│ - Token válido │
│ - No expirado  │
│ - Contraseña   │
│ - Email/Domain │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Ver/Descargar  │
│ archivo        │
└────────────────┘
```

---

## 6.4 Sistema de Notificaciones

### Descripción

Sistema completo de notificaciones y mensajería interna entre usuarios.

### Modelos de Datos

```python
# notifications/models.py

class Notification(models.Model):
    """Notificación individual"""
    TYPES = [
        ('system', 'Sistema'),
        ('admin_message', 'Mensaje Admin'),
        ('direct_message', 'Mensaje Directo'),
        ('file_shared', 'Archivo Compartido'),
        ('permission_granted', 'Permiso Otorgado'),
        ('permission_revoked', 'Permiso Revocado'),
    ]

    PRIORITIES = [
        ('low', 'Baja'),
        ('normal', 'Normal'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='sent_notifications')
    thread = models.ForeignKey('MessageThread', null=True, on_delete=models.CASCADE)

    notification_type = models.CharField(max_length=30, choices=TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITIES, default='normal')

    title = models.CharField(max_length=255)
    message = models.TextField()
    action_url = models.CharField(max_length=500, null=True)

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True)
    is_archived = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)


class MessageThread(models.Model):
    """Hilo de conversación entre usuarios"""
    TYPES = [
        ('direct', 'Mensaje Directo'),
        ('support', 'Ticket de Soporte'),
        ('announcement', 'Anuncio'),
    ]

    subject = models.CharField(max_length=255)
    thread_type = models.CharField(max_length=20, choices=TYPES)

    # Participantes (nuevo sistema)
    participant_1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='threads_as_p1')
    participant_2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='threads_as_p2')

    # Contadores de no leídos
    participant_1_unread = models.IntegerField(default=0)
    participant_2_unread = models.IntegerField(default=0)

    is_closed = models.BooleanField(default=False)
    closed_at = models.DateTimeField(null=True)
    closed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)

    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def get_or_create_direct_thread(cls, user1, user2, subject='Conversación'):
        """Obtiene o crea un hilo entre dos usuarios"""
        from django.db.models import Q

        # Buscar hilo existente
        thread = cls.objects.filter(
            Q(participant_1=user1, participant_2=user2) |
            Q(participant_1=user2, participant_2=user1),
            thread_type='direct'
        ).first()

        if thread:
            return thread, False

        # Crear nuevo
        return cls.objects.create(
            subject=subject,
            thread_type='direct',
            participant_1=user1,
            participant_2=user2
        ), True


class MessageAttachment(models.Model):
    """Archivo adjunto a un mensaje"""
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE)
    file = models.FileField(upload_to='message_attachments/')
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20)  # image, document, video, audio, other
    mime_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
```

### Endpoints API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/notifications/` | GET | Listar notificaciones |
| `/api/notifications/unread-count/` | GET | Contador de no leídas |
| `/api/notifications/{id}/mark-read/` | POST | Marcar como leída |
| `/api/notifications/mark-all-read/` | POST | Marcar todas como leídas |
| `/api/notifications/threads/` | GET | Listar conversaciones |
| `/api/notifications/{id}/thread/` | GET | Detalle de conversación |
| `/api/notifications/{id}/reply/` | POST | Responder en hilo |
| `/api/notifications/new-message/` | POST | Nuevo mensaje directo |
| `/api/notifications/send/` | POST | Enviar (solo admin) |

### Diagrama de Flujo de Mensajes

```
┌─────────────────────────────────────────────────────────────────┐
│                  FLUJO DE MENSAJERÍA                            │
└─────────────────────────────────────────────────────────────────┘

    Usuario A envía mensaje a Usuario B
              │
              ▼
    ┌─────────────────┐
    │ POST            │
    │ /new-message/   │
    │ recipient_id: B │
    │ message: "..."  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Buscar/Crear    │
    │ MessageThread   │
    │ entre A y B     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Crear           │
    │ Notification    │
    │ para B          │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Incrementar     │
    │ unread_count    │
    │ de B            │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Polling 30s     │  Frontend de B detecta
    │ fetchUnread()   │  nuevo mensaje
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Badge rojo      │
    │ en campanita    │
    └─────────────────┘
```

### Polling de Notificaciones

```typescript
// store/notificationStore.ts
export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  pollingInterval: 30000, // 30 segundos

  startPolling: () => {
    // Fetch inicial
    get().fetchUnreadCount();

    // Configurar interval
    setInterval(() => {
      get().fetchUnreadCount();
    }, get().pollingInterval);
  },

  fetchUnreadCount: async () => {
    const response = await notificationsApi.getUnreadCount();
    set({
      unreadCount: response.unread_count,
      hasUrgent: response.has_urgent
    });
  },
}));
```

---

## 6.5 Colores de Directorio

### Descripción

Permite personalizar el color de carpetas para organización visual.

### Modelo

```python
# files/models.py
class DirectoryColor(models.Model):
    """Color personalizado para directorio"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    path = models.CharField(max_length=2000)
    color = models.CharField(max_length=20)

    class Meta:
        unique_together = ['user', 'path']
```

### Colores Disponibles

```typescript
const DIRECTORY_COLORS = [
  { name: 'default', value: 'text-yellow-500' },
  { name: 'red', value: 'text-red-500' },
  { name: 'orange', value: 'text-orange-500' },
  { name: 'green', value: 'text-green-500' },
  { name: 'blue', value: 'text-blue-500' },
  { name: 'purple', value: 'text-purple-500' },
  { name: 'pink', value: 'text-pink-500' },
  { name: 'gray', value: 'text-gray-500' },
];
```

### Hook de Uso

```typescript
// hooks/useDirectoryColors.ts
export const useDirectoryColors = () => {
  const [colors, setColors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    directoryColorsApi.list().then(data => {
      const map = new Map(data.map(c => [c.path, c.color]));
      setColors(map);
    });
  }, []);

  const setColor = async (path: string, color: string) => {
    await directoryColorsApi.set(path, color);
    setColors(prev => new Map(prev).set(path, color));
  };

  return { colors, setColor, getColor: (p) => colors.get(p) };
};
```

---

## 6.6 Resumen de Módulos

| Módulo | Tablas BD | Endpoints | Permisos |
|--------|-----------|-----------|----------|
| **Favoritos** | 1 | 4 | Todos los usuarios |
| **Papelera** | 2 | 9 | Ver: según permisos, Gestionar: SuperAdmin |
| **Compartir** | 2 | 7 | SuperAdmin |
| **Notificaciones** | 4 | 15+ | Todos los usuarios |
| **Colores** | 1 | 3 | Todos los usuarios |

---

*Figura 6.1: Módulos Complementarios del Sistema*
