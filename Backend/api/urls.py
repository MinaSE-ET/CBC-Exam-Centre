from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import auth

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'courses', views.CourseViewSet)
router.register(r'exams', views.ExamViewSet)
router.register(r'questions', views.QuestionViewSet)
router.register(r'options', views.OptionViewSet)
router.register(r'results', views.ExamAttemptViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', auth.login_view, name='login'),
    path('auth/logout/', auth.logout_view, name='logout'),
    path('auth/user/', auth.user_info, name='user-info'),
    path('dashboard/', views.dashboard_stats, name='dashboard-stats'),
    path('exams/user/<int:user_id>/', views.ExamViewSet.as_view({'get': 'list'}), name='user-exams'),
    path('results/user/<int:user_id>/', views.ExamAttemptViewSet.as_view({'get': 'list'}), name='user-results'),
] 