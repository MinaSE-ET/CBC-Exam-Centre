from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.dashboard, name='dashboard'),
    
    # Subject Management (Admin)
    path('subjects/', views.SubjectListView.as_view(), name='subject_list'),
    path('subjects/new/', views.SubjectCreateView.as_view(), name='subject_create'),
    path('subjects/<int:pk>/edit/', views.SubjectUpdateView.as_view(), name='subject_update'),
    path('subjects/<int:pk>/delete/', views.SubjectDeleteView.as_view(), name='subject_delete'),
    
    # Course Management (Admin)
    path('courses/', views.CourseListView.as_view(), name='course_list'),
    path('courses/new/', views.CourseCreateView.as_view(), name='course_create'),
    path('courses/<int:pk>/edit/', views.CourseUpdateView.as_view(), name='course_update'),
    path('courses/<int:pk>/delete/', views.CourseDeleteView.as_view(), name='course_delete'),
    
    # Question Management (Admin)
    path('questions/', views.QuestionListView.as_view(), name='question_list'),
    path('questions/new/', views.QuestionCreateView.as_view(), name='question_create'),
    path('questions/<int:pk>/', views.QuestionDetailView.as_view(), name='question_detail'),
    path('questions/<int:pk>/edit/', views.QuestionUpdateView.as_view(), name='question_update'),
    path('questions/<int:pk>/delete/', views.QuestionDeleteView.as_view(), name='question_delete'),
    
    # Exam Management (Admin)
    path('exams/', views.ExamListView.as_view(), name='exam_list'),
    path('exams/new/', views.ExamCreateView.as_view(), name='exam_create'),
    path('exams/<int:pk>/', views.ExamDetailView.as_view(), name='exam_detail'),
    path('exams/<int:pk>/edit/', views.ExamUpdateView.as_view(), name='exam_update'),
    path('exams/<int:pk>/delete/', views.ExamDeleteView.as_view(), name='exam_delete'),
    path('exams/<int:pk>/assign-questions/', views.assign_questions_to_exam, name='assign_questions'),
    path('exams/<int:pk>/assign-users/', views.assign_users_to_exam, name='assign_users'),
    
    # Student Views
    path('my-exams/', views.my_exams, name='my_exams'),
    path('take-exam/<int:pk>/', views.take_exam, name='take_exam'),
    path('exam-results/<int:attempt_id>/', views.exam_results, name='exam_results'),
    
    # Results (Admin)
    path('all-results/', views.all_results, name='all_results'),
] 