"""
Configuración de Celery para tareas asíncronas
"""
import os
from celery import Celery
from celery.schedules import crontab

# Establecer el módulo de configuración de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Crear instancia de Celery
app = Celery('netapp_bridge')

# Cargar configuración desde Django settings con prefijo CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-descubrir tareas en todos los archivos tasks.py de las apps instaladas
app.autodiscover_tasks()

# Configuración de tareas programadas (Celery Beat)
app.conf.beat_schedule = {
    # Limpiar items expirados de la papelera todos los días a las 3:00 AM
    'cleanup-expired-trash': {
        'task': 'trash.cleanup_expired',
        'schedule': crontab(hour=3, minute=0),
        'options': {'queue': 'default'}
    },
    # Verificar items por expirar (para reportes) todos los lunes a las 8:00 AM
    'check-expiring-soon': {
        'task': 'trash.check_expiring_soon',
        'schedule': crontab(hour=8, minute=0, day_of_week=1),
        'options': {'queue': 'default'}
    },
    # === NOTIFICACIONES AUTOMÁTICAS ===
    # Notificar expiración de papelera (7 y 3 días antes) - Diario a las 8:00 AM
    'send-trash-expiration-notifications': {
        'task': 'trash.tasks.send_trash_expiration_notifications',
        'schedule': crontab(hour=8, minute=0),
        'options': {'queue': 'default'}
    },
    # Notificar expiración de permisos (7 y 3 días antes) - Diario a las 8:30 AM
    'send-permission-expiration-notifications': {
        'task': 'notifications.tasks.send_permission_expiration_notifications',
        'schedule': crontab(hour=8, minute=30),
        'options': {'queue': 'default'}
    },
    # === LIMPIEZA DE ARCHIVOS ===
    # Limpiar archivos adjuntos del chat mayores a 6 meses - Diario a las 4:00 AM
    'cleanup-expired-attachments': {
        'task': 'notifications.tasks.cleanup_expired_attachments',
        'schedule': crontab(hour=4, minute=0),
        'options': {'queue': 'default'}
    },
    # Limpiar notificaciones antiguas (90 días leídas, 30 días archivadas) - Semanal domingos 5:00 AM
    'cleanup-old-notifications': {
        'task': 'notifications.tasks.cleanup_old_notifications',
        'schedule': crontab(hour=5, minute=0, day_of_week=0),
        'options': {'queue': 'default'}
    },
}

app.conf.timezone = 'America/Bogota'


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Tarea de debug para verificar que Celery funciona"""
    print(f'Request: {self.request!r}')
