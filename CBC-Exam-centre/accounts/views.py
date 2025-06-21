from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.views import LoginView
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.models import User
from django.contrib import messages
from django.urls import reverse_lazy
from django.views.generic import ListView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from .forms import UserLoginForm, UserProfileForm, UserUpdateForm, CustomUserCreationForm
from .models import UserProfile

class CustomLoginView(LoginView):
    template_name = 'accounts/login.html'
    redirect_authenticated_user = True
    
    def get_success_url(self):
        if self.request.user.is_staff:
            return '/dashboard'
        return reverse_lazy('my_exams')

def is_admin(user):
    return user.is_staff

@user_passes_test(is_admin)
def user_list(request):
    users = User.objects.all().order_by('username')
    return render(request, 'accounts/user_list.html', {'users': users})

def login_view(request):
    print(f"DEBUG: Login view called. Method: {request.method}")
    print(f"DEBUG: User authenticated: {request.user.is_authenticated}")
    
    if request.user.is_authenticated:
        # Check if there's a next parameter, otherwise redirect to dashboard
        next_url = request.GET.get('next')
        print(f"DEBUG: User already authenticated. Next URL: {next_url}")
        if next_url:
            return redirect(next_url)
        return redirect('/dashboard')
    
    if request.method == 'POST':
        print("DEBUG: Processing POST request")
        form = AuthenticationForm(request, data=request.POST)
        print(f"DEBUG: Form is valid: {form.is_valid()}")
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            print(f"DEBUG: Attempting authentication for username: {username}")
            user = authenticate(request, username=username, password=password)
            print(f"DEBUG: Authentication result: {user}")
            if user is not None:
                login(request, user)
                print(f"DEBUG: User logged in successfully: {user.username}")
                messages.success(request, f'Welcome back, {user.username}!')
                
                # Check if there's a next parameter, otherwise redirect to dashboard
                next_url = request.GET.get('next')
                print(f"DEBUG: Redirecting to next URL: {next_url}")
                if next_url:
                    return redirect(next_url)
                return redirect('/dashboard')
            else:
                print("DEBUG: Authentication failed")
                messages.error(request, 'Invalid username or password.')
        else:
            print(f"DEBUG: Form errors: {form.errors}")
    else:
        form = AuthenticationForm()
        
    return render(request, 'accounts/login.html', {'form': form})

def logout_view(request):
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect('login')

@login_required
def profile(request):
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        user_form = UserUpdateForm(request.POST, instance=request.user)
        profile_form = UserProfileForm(request.POST, request.FILES, instance=user_profile)
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Your profile has been updated successfully!')
            return redirect('profile')
    else:
        user_form = UserUpdateForm(instance=request.user)
        profile_form = UserProfileForm(instance=user_profile)
        
    context = {
        'user_form': user_form,
        'profile_form': profile_form
    }
    return render(request, 'accounts/profile.html', context)

@login_required
def update_profile(request):
    # Your view logic here
    pass

class UserListView(LoginRequiredMixin, UserPassesTestMixin, ListView):
    model = User
    template_name = 'accounts/user_list.html'
    context_object_name = 'users'
    paginate_by = 20
    
    def test_func(self):
        return self.request.user.is_staff
    
    def get_queryset(self):
        queryset = User.objects.select_related('userprofile').all()
        search = self.request.GET.get('search')
        if search:
            queryset = queryset.filter(
                username__icontains=search
            ) | queryset.filter(
                first_name__icontains=search
            ) | queryset.filter(
                last_name__icontains=search
            ) | queryset.filter(
                email__icontains=search
            )
        return queryset
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['search'] = self.request.GET.get('search', '')
        return context

@user_passes_test(is_admin)
def create_user(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            messages.success(request, f"User '{user.username}' has been created successfully.")
            return redirect('user_list')
    else:
        form = CustomUserCreationForm()
    return render(request, 'accounts/create_user.html', {'form': form})
