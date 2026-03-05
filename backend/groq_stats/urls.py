from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GroqStatsViewSet

router = DefaultRouter()
router.register(r'groq-stats', GroqStatsViewSet, basename='groq-stats')

urlpatterns = [
    path('', include(router.urls)),
]
