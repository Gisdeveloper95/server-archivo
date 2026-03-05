"""
URLs para el Sistema de Notificaciones
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, serve_attachment

router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notifications')

urlpatterns = [
    # Servir archivos adjuntos con nombre original
    path('attachment-download/<int:attachment_id>/', serve_attachment, name='attachment-download'),
    path('', include(router.urls)),
]
