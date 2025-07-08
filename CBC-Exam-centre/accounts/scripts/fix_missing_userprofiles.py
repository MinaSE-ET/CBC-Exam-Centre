from django.contrib.auth.models import User
from accounts.models import UserProfile

def fix_missing_userprofiles():
    created_count = 0
    for user in User.objects.all():
        profile, created = UserProfile.objects.get_or_create(user=user)
        if created:
            print(f"Created UserProfile for user: {user.username}")
            created_count += 1
    print(f"✅ Done. {created_count} UserProfiles created.")

if __name__ == "__main__":
    fix_missing_userprofiles() 