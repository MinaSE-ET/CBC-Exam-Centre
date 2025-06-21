from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib import messages
from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.http import HttpResponseForbidden, JsonResponse
from django.utils import timezone
from django.db.models import Avg, F
from django.contrib.auth.models import User
from django.forms import inlineformset_factory
from django.db import models

from .models import Course, Question, Option, Exam, ExamAttempt, Answer, Subject
from .forms import CourseForm, QuestionForm, ExamForm, SubjectForm, OptionFormSet, QuestionSearchForm

@login_required
def dashboard(request):
    if request.user.is_staff:
        total_exams = Exam.objects.count()
        total_questions = Question.objects.count()
        total_students = User.objects.filter(is_staff=False).count()
        recent_attempts = ExamAttempt.objects.select_related('student', 'exam').order_by('-created_at')[:5]
        
        total_attempts = ExamAttempt.objects.count()
        completed_attempts = ExamAttempt.objects.filter(is_completed=True).count()
        avg_score = ExamAttempt.objects.filter(is_completed=True).aggregate(Avg('score'))['score__avg'] or 0
        
        context = {
            'total_exams': total_exams,
            'total_questions': total_questions,
            'total_students': total_students,
            'total_attempts': total_attempts,
            'completed_attempts': completed_attempts,
            'avg_score': round(avg_score, 2),
            'recent_attempts': recent_attempts,
        }
        return render(request, 'exams/admin_dashboard.html', context)
    else:
        assigned_exams = request.user.assigned_exams.filter(status='published')
        recent_attempts = request.user.exam_attempts.select_related('exam').order_by('-created_at')[:5]
        
        context = {
            'assigned_exams': assigned_exams,
            'recent_attempts': recent_attempts,
        }
        return render(request, 'exams/student_dashboard.html', context)

@login_required
def my_exams(request):
    if request.user.is_staff:
        return redirect('dashboard')
    
    assigned_exams = request.user.assigned_exams.filter(status='published')
    attempts = request.user.exam_attempts.select_related('exam').all()
    
    exam_attempts = {}
    for attempt in attempts:
        exam_attempts[attempt.exam.id] = attempt
    
    context = {
        'assigned_exams': assigned_exams,
        'exam_attempts': exam_attempts,
    }
    return render(request, 'exams/my_exams.html', context)

class CourseListView(LoginRequiredMixin, UserPassesTestMixin, ListView):
    model = Course
    template_name = 'exams/course_list.html'
    context_object_name = 'courses'
    
    def test_func(self):
        return self.request.user.is_staff
    
    def get_queryset(self):
        queryset = Course.objects.select_related('subject').prefetch_related('exams')
        
        # Search functionality
        search = self.request.GET.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(description__icontains=search) |
                models.Q(subject__name__icontains=search)
            )
        
        # Filter by subject
        subject = self.request.GET.get('subject')
        if subject:
            queryset = queryset.filter(subject_id=subject)
        
        return queryset.order_by('-created_at')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['subjects'] = Subject.objects.all()
        return context

class CourseCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    model = Course
    form_class = CourseForm
    template_name = 'exams/course_form.html'
    success_url = reverse_lazy('course_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def form_valid(self, form):
        messages.success(self.request, 'Course created successfully!')
        return super().form_valid(form)

class CourseUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Course
    form_class = CourseForm
    template_name = 'exams/course_form.html'
    success_url = reverse_lazy('course_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def form_valid(self, form):
        messages.success(self.request, 'Course updated successfully!')
        return super().form_valid(form)

class CourseDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Course
    template_name = 'exams/course_confirm_delete.html'
    success_url = reverse_lazy('course_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def delete(self, request, *args, **kwargs):
        messages.success(request, 'Course deleted successfully!')
        return super().delete(request, *args, **kwargs)

class QuestionListView(LoginRequiredMixin, UserPassesTestMixin, ListView):
    model = Question
    template_name = 'exams/question_list.html'
    context_object_name = 'questions'
    paginate_by = 20
    
    def test_func(self):
        return self.request.user.is_staff
    
    def get_queryset(self):
        queryset = Question.objects.select_related('created_by').prefetch_related('options')
        
        # Search functionality
        search = self.request.GET.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(question_text__icontains=search) |
                models.Q(category__icontains=search)
            )
        
        # Filter by question type
        question_type = self.request.GET.get('question_type')
        if question_type:
            queryset = queryset.filter(question_type=question_type)
        
        # Filter by difficulty
        difficulty = self.request.GET.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        
        # Filter by category
        category = self.request.GET.get('category')
        if category:
            queryset = queryset.filter(category__icontains=category)
        
        return queryset.order_by('-created_at')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['search_form'] = QuestionSearchForm(self.request.GET)
        return context

class QuestionCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    model = Question
    form_class = QuestionForm
    template_name = 'exams/question_form.html'
    success_url = reverse_lazy('question_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def form_valid(self, form):
        # Set the created_by field
        form.instance.created_by = self.request.user
        
        # Save the question first
        self.object = form.save()
        
        # Handle custom options data from JavaScript
        options_data = self.request.POST.get('options_data')
        if options_data:
            try:
                import json
                options = json.loads(options_data)
                
                # Clear existing options
                self.object.options.all().delete()
                
                # Create new options
                for i, option_data in enumerate(options):
                    Option.objects.create(
                        question=self.object,
                        text=option_data['text'],
                        is_correct=option_data['is_correct'],
                        order=i
                    )
            except (json.JSONDecodeError, KeyError, TypeError):
                if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'message': 'Error processing options data.'
                    })
                messages.error(self.request, 'Error processing options data.')
                return self.form_invalid(form)
        
        # Validate the question
        is_valid, error_message = self.object.validate_options()
        if not is_valid:
            if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': f"Question validation failed: {error_message}"
                })
            messages.error(self.request, f"Question validation failed: {error_message}")
            return self.form_invalid(form)
        
        # Handle AJAX request
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': 'Question created successfully!',
                'redirect_url': self.get_success_url()
            })
        
        messages.success(self.request, 'Question created successfully!')
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'Please correct the errors below.',
                'errors': form.errors
            })
        return super().form_invalid(form)

class QuestionDetailView(LoginRequiredMixin, UserPassesTestMixin, DetailView):
    model = Question
    template_name = 'exams/question_detail.html'
    context_object_name = 'question'
    
    def test_func(self):
        return self.request.user.is_staff
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['correct_options'] = self.object.get_correct_options()
        context['incorrect_options'] = self.object.get_incorrect_options()
        return context

class QuestionUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Question
    form_class = QuestionForm
    template_name = 'exams/question_form.html'
    success_url = reverse_lazy('question_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def form_valid(self, form):
        # Save the question first
        self.object = form.save()
        
        # Handle custom options data from JavaScript
        options_data = self.request.POST.get('options_data')
        if options_data:
            try:
                import json
                options = json.loads(options_data)
                
                # Clear existing options
                self.object.options.all().delete()
                
                # Create new options
                for i, option_data in enumerate(options):
                    Option.objects.create(
                        question=self.object,
                        text=option_data['text'],
                        is_correct=option_data['is_correct'],
                        order=i
                    )
            except (json.JSONDecodeError, KeyError, TypeError):
                if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'message': 'Error processing options data.'
                    })
                messages.error(self.request, 'Error processing options data.')
                return self.form_invalid(form)
        
        # Validate the question
        is_valid, error_message = self.object.validate_options()
        if not is_valid:
            if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': f"Question validation failed: {error_message}"
                })
            messages.error(self.request, f"Question validation failed: {error_message}")
            return self.form_invalid(form)
        
        # Handle AJAX request
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'message': 'Question updated successfully!',
                'redirect_url': self.get_success_url()
            })
        
        messages.success(self.request, 'Question updated successfully!')
        return super().form_valid(form)

    def form_invalid(self, form):
        if self.request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': False,
                'message': 'Please correct the errors below.',
                'errors': form.errors
            })
        return super().form_invalid(form)

class QuestionDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Question
    template_name = 'exams/question_confirm_delete.html'
    success_url = reverse_lazy('question_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def delete(self, request, *args, **kwargs):
        messages.success(request, 'Question deleted successfully!')
        return super().delete(request, *args, **kwargs)

class ExamListView(LoginRequiredMixin, UserPassesTestMixin, ListView):
    model = Exam
    template_name = 'exams/exam_list.html'
    context_object_name = 'exams'
    paginate_by = 20
    
    def test_func(self):
        return self.request.user.is_staff
    
    def get_queryset(self):
        queryset = Exam.objects.select_related('course').prefetch_related('questions', 'assigned_users')
        
        # Search functionality
        search = self.request.GET.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(description__icontains=search) |
                models.Q(course__name__icontains=search)
            )
        
        # Filter by status
        status = self.request.GET.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by course
        course = self.request.GET.get('course')
        if course:
            queryset = queryset.filter(course_id=course)
        
        return queryset.order_by('-created_at')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['courses'] = Course.objects.all()
        return context

class ExamCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    model = Exam
    form_class = ExamForm
    template_name = 'exams/exam_form.html'
    success_url = reverse_lazy('exam_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def form_valid(self, form):
        messages.success(self.request, 'Exam created successfully!')
        return super().form_valid(form)

class ExamDetailView(LoginRequiredMixin, UserPassesTestMixin, DetailView):
    model = Exam
    template_name = 'exams/exam_detail.html'
    context_object_name = 'exam'
    
    def test_func(self):
        return self.request.user.is_staff
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['attempts'] = self.object.attempts.select_related('student').order_by('-created_at')
        return context

class ExamUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Exam
    form_class = ExamForm
    template_name = 'exams/exam_form.html'
    success_url = reverse_lazy('exam_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def form_valid(self, form):
        messages.success(self.request, 'Exam updated successfully!')
        return super().form_valid(form)

class ExamDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Exam
    template_name = 'exams/exam_confirm_delete.html'
    success_url = reverse_lazy('exam_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def delete(self, request, *args, **kwargs):
        messages.success(request, 'Exam deleted successfully!')
        return super().delete(request, *args, **kwargs)

@login_required
def assign_questions_to_exam(request, pk):
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    exam = get_object_or_404(Exam, pk=pk)
    
    if request.method == 'POST':
        selected_questions = request.POST.getlist('questions')
        if selected_questions:
            # Clear existing questions and add new ones
            exam.questions.clear()
            exam.questions.add(*selected_questions)
            messages.success(request, f'Successfully assigned {len(selected_questions)} questions to the exam.')
        else:
            messages.warning(request, 'No questions were selected.')
        return redirect('exam_detail', pk=pk)
    
    # Get all available questions (excluding already assigned ones)
    available_questions = Question.objects.filter(is_active=True).exclude(exams=exam)
    
    context = {
        'exam': exam,
        'available_questions': available_questions,
    }
    return render(request, 'exams/assign_questions.html', context)

@login_required
def assign_users_to_exam(request, pk):
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    exam = get_object_or_404(Exam, pk=pk)
    
    if request.method == 'POST':
        selected_students = request.POST.getlist('students')
        if selected_students:
            # Clear existing assignments and add new ones
            exam.assigned_users.clear()
            exam.assigned_users.add(*selected_students)
            messages.success(request, f'Successfully assigned {len(selected_students)} students to the exam.')
        else:
            messages.warning(request, 'No students were selected.')
        return redirect('exam_detail', pk=pk)
    
    # Get all available students (non-staff users)
    available_students = User.objects.filter(is_staff=False, is_active=True)
    
    context = {
        'exam': exam,
        'available_students': available_students,
    }
    return render(request, 'exams/assign_users.html', context)

@login_required
def take_exam(request, pk):
    if request.user.is_staff:
        return HttpResponseForbidden()
    
    exam = get_object_or_404(Exam, pk=pk, status='published')
    return render(request, 'exams/take_exam.html', {'exam': exam})

@login_required
def exam_results(request, attempt_id):
    attempt = get_object_or_404(ExamAttempt, id=attempt_id)
    
    if not request.user.is_staff and request.user != attempt.student:
        return HttpResponseForbidden()
    
    return render(request, 'exams/exam_results.html', {'attempt': attempt})

@login_required
def all_results(request):
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    attempts = ExamAttempt.objects.select_related('student', 'exam').filter(is_completed=True).order_by('-created_at')
    
    exam_filter = request.GET.get('exam')
    if exam_filter:
        attempts = attempts.filter(exam_id=exam_filter)
    
    total_attempts = attempts.count()
    passed_attempts = attempts.filter(score__gte=F('exam__passing_marks')).count()
    avg_score = attempts.aggregate(Avg('score'))['score__avg'] or 0
    
    context = {
        'attempts': attempts,
        'total_attempts': total_attempts,
        'passed_attempts': passed_attempts,
        'avg_score': round(avg_score, 2),
        'exams': Exam.objects.all(),
        'selected_exam': exam_filter,
    }
    return render(request, 'exams/all_results.html', context)

class SubjectListView(LoginRequiredMixin, UserPassesTestMixin, ListView):
    model = Subject
    template_name = 'exams/subject_list.html'
    context_object_name = 'subjects'
    
    def test_func(self):
        return self.request.user.is_staff
    
    def get_queryset(self):
        queryset = Subject.objects.prefetch_related('courses')
        
        # Search functionality
        search = self.request.GET.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(description__icontains=search)
            )
        
        return queryset.order_by('-created_at')

class SubjectCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    model = Subject
    form_class = SubjectForm
    template_name = 'exams/subject_form.html'
    success_url = reverse_lazy('subject_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def form_valid(self, form):
        messages.success(self.request, 'Subject created successfully!')
        return super().form_valid(form)

class SubjectUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Subject
    form_class = SubjectForm
    template_name = 'exams/subject_form.html'
    success_url = reverse_lazy('subject_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def form_valid(self, form):
        messages.success(self.request, 'Subject updated successfully!')
        return super().form_valid(form)

class SubjectDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Subject
    template_name = 'exams/subject_confirm_delete.html'
    success_url = reverse_lazy('subject_list')
    
    def test_func(self):
        return self.request.user.is_staff
    
    def delete(self, request, *args, **kwargs):
        messages.success(request, 'Subject deleted successfully!')
        return super().delete(request, *args, **kwargs) 