from django.contrib import admin
from .models import Notification, MessageThread, NotificationTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'recipient', 'notification_type', 'priority', 'is_read', 'created_at']
    list_filter = ['notification_type', 'priority', 'is_read', 'is_archived']
    search_fields = ['title', 'message', 'recipient__username', 'recipient__email']
    readonly_fields = ['created_at', 'read_at']
    ordering = ['-created_at']


@admin.register(MessageThread)
class MessageThreadAdmin(admin.ModelAdmin):
    list_display = ['subject', 'admin', 'user', 'thread_type', 'is_closed', 'created_at']
    list_filter = ['thread_type', 'is_closed']
    search_fields = ['subject', 'admin__username', 'user__username']
    readonly_fields = ['created_at', 'last_message_at', 'closed_at']
    ordering = ['-last_message_at']


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'template_id', 'notification_type', 'is_active', 'updated_at']
    list_filter = ['notification_type', 'is_active']
    search_fields = ['name', 'template_id', 'subject']
    ordering = ['name']
