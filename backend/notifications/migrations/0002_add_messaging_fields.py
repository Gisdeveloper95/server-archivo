"""
Migration para agregar soporte de mensajería user-to-user.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def populate_participants(apps, schema_editor):
    """Poblar participant_1 y participant_2 desde admin y user"""
    MessageThread = apps.get_model("notifications", "MessageThread")
    for thread in MessageThread.objects.all():
        if thread.admin_id:
            thread.participant_1_id = thread.admin_id
        if thread.user_id:
            thread.participant_2_id = thread.user_id
        thread.save()


def reverse_populate(apps, schema_editor):
    """Reversa: no hacer nada"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("notifications", "0001_initial"),
    ]

    operations = [
        # 1. Agregar campos participant como nullable primero
        migrations.AddField(
            model_name="messagethread",
            name="participant_1",
            field=models.ForeignKey(
                help_text="Usuario que inició la conversación",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="threads_as_participant1",
                to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name="messagethread",
            name="participant_2",
            field=models.ForeignKey(
                help_text="Usuario destinatario",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="threads_as_participant2",
                to=settings.AUTH_USER_MODEL
            ),
        ),

        # 2. Agregar nuevos campos de contador
        migrations.AddField(
            model_name="messagethread",
            name="participant_1_unread",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="messagethread",
            name="participant_2_unread",
            field=models.IntegerField(default=0),
        ),

        # 3. Agregar campo assigned_to para soporte
        migrations.AddField(
            model_name="messagethread",
            name="assigned_to",
            field=models.ForeignKey(
                blank=True,
                help_text="Admin/Soporte asignado al ticket",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_support_threads",
                to=settings.AUTH_USER_MODEL
            ),
        ),

        # 4. Agregar campo last_message_preview
        migrations.AddField(
            model_name="messagethread",
            name="last_message_preview",
            field=models.CharField(blank=True, default="", max_length=100),
        ),

        # 5. Poblar participant_1 y participant_2 desde admin y user existentes
        migrations.RunPython(populate_participants, reverse_populate),

        # 6. Hacer los campos legacy nullable (para nuevos registros que solo usen participant_*)
        migrations.AlterField(
            model_name="messagethread",
            name="admin",
            field=models.ForeignKey(
                blank=True,
                help_text="(Legacy) Admin de la conversación",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="admin_threads",
                to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AlterField(
            model_name="messagethread",
            name="user",
            field=models.ForeignKey(
                blank=True,
                help_text="(Legacy) Usuario de la conversación",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="user_threads",
                to=settings.AUTH_USER_MODEL
            ),
        ),

        # 7. Actualizar thread_type para incluir direct
        migrations.AlterField(
            model_name="messagethread",
            name="thread_type",
            field=models.CharField(
                choices=[
                    ("warning", "Advertencia/Llamado de atención"),
                    ("info", "Información"),
                    ("support", "Soporte/Ayuda"),
                    ("direct", "Mensaje Directo")
                ],
                default="direct",
                max_length=20,
                verbose_name="Tipo"
            ),
        ),
    ]
