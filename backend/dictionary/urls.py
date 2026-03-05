"""
URLs para el diccionario de datos
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from dictionary.views import DictionaryViewSet

router = DefaultRouter()
router.register(r'', DictionaryViewSet, basename='dictionary')

urlpatterns = [
    path('', include(router.urls)),
]
