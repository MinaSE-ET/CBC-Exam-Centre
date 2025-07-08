from django.test import TestCase
import pytest
from django.urls import reverse
from django.contrib.auth.models import User
from django.test import Client

# Create your tests here.

@pytest.mark.django_db
def test_login_logout(client):
    user = User.objects.create_user(username='testuser', password='testpass123')
    # Invalid login
    response = client.post(reverse('login'), {'username': 'testuser', 'password': 'wrongpass'})
    assert 'Invalid username or password' in response.content.decode()
    # Valid login
    response = client.post(reverse('login'), {'username': 'testuser', 'password': 'testpass123'}, follow=True)
    assert response.status_code == 200
    assert response.wsgi_request.user.is_authenticated
    # Logout
    response = client.get(reverse('logout'), follow=True)
    assert not response.wsgi_request.user.is_authenticated

@pytest.mark.django_db
def test_user_creation_and_duplicate_email(client):
    admin = User.objects.create_user(username='admin', password='adminpass', is_staff=True)
    client.force_login(admin)
    url = reverse('create_user')
    # Missing fields
    response = client.post(url, {'username': '', 'email': '', 'password1': '', 'password2': ''})
    assert 'This field is required' in response.content.decode()
    # Valid user
    response = client.post(url, {
        'username': 'newuser',
        'email': 'newuser@example.com',
        'password1': 'strongpass123',
        'password2': 'strongpass123',
    }, follow=True)
    assert User.objects.filter(username='newuser').exists()
    # Duplicate email
    response = client.post(url, {
        'username': 'anotheruser',
        'email': 'newuser@example.com',
        'password1': 'strongpass123',
        'password2': 'strongpass123',
    })
    assert 'A user with that email already exists' in response.content.decode()

@pytest.mark.django_db
def test_profile_update(client):
    user = User.objects.create_user(username='profileuser', password='testpass123', email='profile@example.com')
    client.force_login(user)
    url = reverse('profile')
    response = client.post(url, {
        'username': 'profileuser',
        'email': 'profile@example.com',
        'first_name': 'Test',
        'last_name': 'User',
        'bio': 'Updated bio',
    }, follow=True)
    user.refresh_from_db()
    assert user.first_name == 'Test'
    assert user.userprofile.bio == 'Updated bio'
