"""
URL configuration for exam_platform project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.conf import settings
from django.conf.urls.static import static
from exams.views import verify_certificate

def home_redirect(request):
    if request.user.is_authenticated:
        if request.user.is_staff:
            return redirect('/dashboard')
        else:
            return redirect('my_exams')
    return redirect('login')

def dashboard_redirect(request):
    return redirect('dashboard')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home_redirect, name='home'),
    path('dashboard/', dashboard_redirect, name='root_dashboard'),
    path('accounts/', include('accounts.urls')),
    path('exams/', include('exams.urls')),
    path('verify', verify_certificate, name='verify_certificate'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
