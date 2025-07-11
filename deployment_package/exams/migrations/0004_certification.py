# Generated by Django 5.2 on 2025-06-22 14:43

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0003_remove_question_labels_remove_question_subject'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Certification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('certificate_id', models.CharField(default=uuid.uuid4, max_length=50, unique=True)),
                ('score', models.DecimalField(decimal_places=2, max_digits=5)),
                ('percentage_score', models.DecimalField(decimal_places=2, max_digits=5)),
                ('issued_date', models.DateTimeField(auto_now_add=True)),
                ('expiry_date', models.DateTimeField(blank=True, null=True)),
                ('is_valid', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='certifications', to='exams.course')),
                ('exam', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='certifications', to='exams.exam')),
                ('exam_attempt', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='certification', to='exams.examattempt')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='certifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Certification',
                'verbose_name_plural': 'Certifications',
                'ordering': ['-issued_date'],
            },
        ),
    ]
