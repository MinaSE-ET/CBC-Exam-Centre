# Generated manually to fix missing role column

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[('student', 'Student'), ('admin', 'Administrator')],
                default='student',
                max_length=10
            ),
        ),
    ] 