"""
URLs para la Papelera de Reciclaje
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TrashViewSet

router = DefaultRouter()
router.register(r'', TrashViewSet, basename='trash')

# Crear instancia del viewset para las rutas de configuración
trash_viewset = TrashViewSet.as_view({
    'get': 'config',
})

trash_config_update = TrashViewSet.as_view({
    'put': 'config_update',
    'patch': 'config_update',
})

urlpatterns = [
    # Rutas explícitas para configuración (antes del router)
    path('config/', trash_viewset, name='trash-config'),
    path('config/update/', trash_config_update, name='trash-config-update'),
    # Router para el resto
    path('', include(router.urls)),
]
