#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_platform.settings')
django.setup()

from django.contrib.auth.models import User

print("🗑️  Removing all existing users...")

# Remove all users except the one created by Django (if any)
users = User.objects.all()
for user in users:
    print(f"   - Deleting user: {user.username}")
    user.delete()

print(f"✅ Deleted {users.count()} users")

print("\n👤 Creating new admin user...")

# Create new admin user
try:
    new_user = User.objects.create_superuser(
        username='admin',
        email='admin@cbc.com',
        password='admin123'
    )
    print(f"✅ Created admin user: {new_user.username}")
    print(f"   - Email: {new_user.email}")
    print(f"   - Password: admin123")
    print(f"   - Is staff: {new_user.is_staff}")
    print(f"   - Is superuser: {new_user.is_superuser}")
    
except Exception as e:
    print(f"❌ Error creating user: {e}")

print("\n🔐 Login credentials:")
print("   Username: admin")
print("   Password: admin123")
print("   URL: http://127.0.0.1:8000/accounts/login/") 