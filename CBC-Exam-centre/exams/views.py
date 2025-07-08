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
from django.db.models import Avg, F, Q
from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import uuid
import json
from datetime import datetime, timedelta
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse
from django import forms

from .models import Course, Question, Option, Exam, ExamAttempt, Answer, Subject, Certification
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
        certifications = request.user.certifications.select_related('exam', 'course').order_by('-issued_date')[:3]
        
        # Calculate student statistics
        total_attempts = request.user.exam_attempts.count()
        completed_attempts = request.user.exam_attempts.filter(is_completed=True).count()
        passed_exams = sum(
            1 for attempt in request.user.exam_attempts.filter(is_completed=True)
            if attempt.score >= attempt.exam.calculate_passing_marks()
        )
        total_certifications = request.user.certifications.count()
        
        context = {
            'assigned_exams': assigned_exams,
            'recent_attempts': recent_attempts,
            'certifications': certifications,
            'total_attempts': total_attempts,
            'completed_attempts': completed_attempts,
            'passed_exams': passed_exams,
            'total_certifications': total_certifications,
        }
        return render(request, 'exams/student_dashboard.html', context)

@login_required
def my_exams(request):
    if request.user.is_staff:
        return redirect('dashboard')
    
    assigned_exams = request.user.assigned_exams.filter(status='published')
    attempts = request.user.exam_attempts.select_related('exam').all()
    
    exam_attempts = {}
    completed_count = 0
    total_score = 0
    
    for attempt in attempts:
        exam_attempts[attempt.exam.id] = attempt
        if attempt.is_completed:
            completed_count += 1
            total_score += attempt.score
    
    # Calculate statistics
    total_attempts = len(exam_attempts)
    pending_exams = assigned_exams.count() - total_attempts
    avg_score = round(total_score / completed_count, 1) if completed_count > 0 else 0
    
    context = {
        'assigned_exams': assigned_exams,
        'exam_attempts': exam_attempts,
        'total_attempts': total_attempts,
        'completed_count': completed_count,
        'pending_exams': pending_exams,
        'avg_score': avg_score,
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
        exam = self.object
        
        # Get all attempts for this exam
        attempts = exam.attempts.select_related('student').order_by('-created_at')
        
        # Calculate statistics
        total_attempts = attempts.count()
        completed_attempts = attempts.filter(is_completed=True).count()
        in_progress_attempts = attempts.filter(is_completed=False).count()
        
        context.update({
            'attempts': attempts,
            'total_attempts': total_attempts,
            'completed_attempts': completed_attempts,
            'in_progress_attempts': in_progress_attempts,
        })
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
    
    # Calculate completed attempts for this exam
    completed_attempts = exam.attempts.filter(is_completed=True).count()
    
    context = {
        'exam': exam,
        'available_students': available_students,
        'completed_attempts': completed_attempts,
    }
    return render(request, 'exams/assign_users.html', context)

@login_required
def take_exam(request, pk):
    if request.user.is_staff:
        return HttpResponseForbidden()
    exam = get_object_or_404(Exam, pk=pk, status='published')
    if request.user not in exam.assigned_users.all():
        messages.error(request, 'You are not assigned to this exam.')
        return redirect('my_exams')
    
    # Always get or create, never create duplicate
    attempt, created = ExamAttempt.objects.get_or_create(student=request.user, exam=exam)
    if attempt.is_completed:
        messages.warning(request, 'You have already completed this exam.')
        return redirect('exam_results', attempt_id=attempt.id)
    
    # Server-side timer enforcement
    now = timezone.now()
    allowed_end_time = attempt.start_time + timezone.timedelta(minutes=exam.duration_minutes)
    time_left = (allowed_end_time - now).total_seconds()
    if time_left <= 0:
        if not attempt.is_completed:
            attempt.is_completed = True
            attempt.end_time = allowed_end_time
            attempt.calculate_score()
            attempt.save()
        messages.error(request, 'Time is up! Your exam has been submitted.')
        return redirect('exam_results', attempt_id=attempt.id)
    
    questions = list(exam.questions.all().prefetch_related('options'))
    total_questions = len(questions)
    
    if not questions:
        messages.error(request, 'No questions are assigned to this exam.')
        return redirect('my_exams')
    
    # Get current question number from URL parameter
    current_question_num = request.GET.get('q', 1)
    try:
        current_question_num = int(current_question_num)
        if current_question_num < 1 or current_question_num > total_questions:
            current_question_num = 1
    except ValueError:
        current_question_num = 1
    
    current_question = questions[current_question_num - 1]
    
    if request.method == 'POST':
        action = request.POST.get('action')
        # Re-check timer on POST
        now = timezone.now()
        time_left = (allowed_end_time - now).total_seconds()
        if time_left <= 0:
            if not attempt.is_completed:
                attempt.is_completed = True
                attempt.end_time = allowed_end_time
                attempt.calculate_score()
                attempt.save()
            messages.error(request, 'Time is up! Your exam has been submitted.')
            return redirect('exam_results', attempt_id=attempt.id)
        
        # Save current question answer
        key = f'q_{current_question.id}'
        if current_question.question_type == 'multiple_choice':
            selected = request.POST.getlist(key)
        else:
            selected = request.POST.get(key)
        
        answer_obj, _ = Answer.objects.get_or_create(exam_attempt=attempt, question=current_question)
        if current_question.question_type == 'short_answer':
            answer_obj.text_answer = selected or ''
            answer_obj.selected_options.clear()
        else:
            answer_obj.text_answer = ''
            answer_obj.selected_options.clear()
            if selected:
                if isinstance(selected, list):
                    answer_obj.selected_options.set(selected)
                else:
                    answer_obj.selected_options.set([selected])
        answer_obj.calculate_marks()
        answer_obj.save()
        
        # Handle navigation
        if action == 'next':
            if current_question_num < total_questions:
                return redirect(f"{reverse('take_exam', args=[exam.pk])}?q={current_question_num + 1}")
            else:
                # This is the last question, submit the exam
                attempt.is_completed = True
                attempt.end_time = timezone.now()
                attempt.calculate_score()
                attempt.refresh_from_db()
                attempt.save()
                # Remove student from assigned_users after completion
                exam.assigned_users.remove(request.user)
                return redirect('exam_results', attempt_id=attempt.id)
        elif action == 'previous':
            if current_question_num > 1:
                return redirect(f"{reverse('take_exam', args=[exam.pk])}?q={current_question_num - 1}")
        elif action == 'submit':
            # Submit the exam
            attempt.is_completed = True
            attempt.end_time = timezone.now()
            attempt.calculate_score()
            attempt.refresh_from_db()
            attempt.save()
            # Remove student from assigned_users after completion
            exam.assigned_users.remove(request.user)
            return redirect('exam_results', attempt_id=attempt.id)
    
    # Get saved answer for current question
    saved_answer = None
    try:
        saved_answer = Answer.objects.get(exam_attempt=attempt, question=current_question)
    except Answer.DoesNotExist:
        pass
    
    # Calculate progress
    progress_percentage = (current_question_num / total_questions) * 100
    
    context = {
        'exam': exam,
        'attempt': attempt,
        'current_question': current_question,
        'current_question_num': current_question_num,
        'total_questions': total_questions,
        'progress_percentage': progress_percentage,
        'saved_answer': saved_answer,
        'is_first_question': current_question_num == 1,
        'is_last_question': current_question_num == total_questions,
    }
    return render(request, 'exams/take_exam_single.html', context)

@login_required
def exam_results(request, attempt_id):
    attempt = get_object_or_404(ExamAttempt, id=attempt_id)
    
    if not request.user.is_staff and request.user != attempt.student:
        return HttpResponseForbidden()
    
    # Calculate statistics
    total_answers = attempt.answers.count()
    correct_answers = attempt.answers.filter(marks_obtained__gt=0).count()
    incorrect_answers = attempt.answers.filter(marks_obtained=0).count()
    
    context = {
        'attempt': attempt,
        'total_answers': total_answers,
        'correct_answers': correct_answers,
        'incorrect_answers': incorrect_answers,
    }
    return render(request, 'exams/exam_results.html', context)

@login_required
def all_results(request):
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    attempts = ExamAttempt.objects.select_related('student', 'exam').filter(is_completed=True).order_by('-created_at')
    
    exam_filter = request.GET.get('exam')
    if exam_filter:
        attempts = attempts.filter(exam_id=exam_filter)
    
    total_attempts = attempts.count()
    # Calculate passed_attempts in Python
    passed_attempts = 0
    attempt_list = []
    for attempt in attempts:
        passing_marks = attempt.exam.calculate_passing_marks()
        if attempt.score >= passing_marks:
            passed_attempts += 1
        # Calculate duration (if end_time exists)
        duration = None
        if attempt.end_time and attempt.start_time:
            duration = attempt.end_time - attempt.start_time
        attempt_list.append({
            'obj': attempt,
            'passing_marks': passing_marks,
            'duration': duration,
        })
    avg_score = attempts.aggregate(Avg('score'))['score__avg'] or 0
    
    context = {
        'attempts': attempt_list,
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

@login_required
def my_certifications(request):
    """View for students to see their certifications"""
    if request.user.is_staff:
        return redirect('dashboard')
    
    certifications = request.user.certifications.select_related('exam', 'course').order_by('-issued_date')
    
    context = {
        'certifications': certifications,
    }
    return render(request, 'exams/my_certifications.html', context)

@login_required
def certification_detail(request, certificate_id):
    """View for detailed certification information"""
    certification = get_object_or_404(Certification, certificate_id=certificate_id)
    
    # Ensure only the certificate owner or admin can view
    if not request.user.is_staff and certification.student != request.user:
        return HttpResponseForbidden("You don't have permission to view this certification.")
    
    context = {
        'certification': certification,
    }
    return render(request, 'exams/certification_detail.html', context)

def generate_certification_pdf(certification):
    """Generate a PDF certificate for the given certification"""
    buffer = io.BytesIO()
    
    # Create the PDF object using ReportLab
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Create custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1a2a3a')
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#b21b2c')
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=14,
        spaceAfter=12,
        alignment=TA_CENTER
    )
    
    name_style = ParagraphStyle(
        'CustomName',
        parent=styles['Heading2'],
        fontSize=24,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1a2a3a')
    )
    
    # Add decorative border
    border_data = [['']]  # Empty table for border
    border_table = Table(border_data, colWidths=[7*inch], rowHeights=[10*inch])
    border_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 3, colors.HexColor('#1a2a3a')),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),
    ]))
    
    # Add logo and header
    try:
        # Get the logo path
        logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'img', 'logo.png')
        if os.path.exists(logo_path):
            # Add logo image with better sizing
            logo_img = Image(logo_path, width=2*inch, height=2*inch)
            logo_img.hAlign = 'CENTER'
            story.append(logo_img)
            story.append(Spacer(1, 15))
        else:
            # Fallback if logo not found
            story.append(Paragraph("Cambridge Business College", title_style))
    except Exception as e:
        # Fallback if logo loading fails
        story.append(Paragraph("Cambridge Business College", title_style))
    
    story.append(Paragraph("Excellence in Education", subtitle_style))
    story.append(Spacer(1, 40))
    
    # Add certificate title with decorative line
    story.append(Paragraph("Certificate of Completion", title_style))
    
    # Add decorative line
    line_data = [['']]
    line_table = Table(line_data, colWidths=[3*inch])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 2, colors.HexColor('#b21b2c')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(line_table)
    story.append(Spacer(1, 30))
    
    # Add certificate content
    story.append(Paragraph("This is to certify that", body_style))
    story.append(Paragraph(
        certification.student.get_full_name() or certification.student.username, 
        name_style
    ))
    story.append(Paragraph("has successfully completed the examination for", body_style))
    story.append(Paragraph(certification.exam.title, subtitle_style))
    story.append(Paragraph("in the course", body_style))
    story.append(Paragraph(certification.course.name, subtitle_style))
    story.append(Spacer(1, 40))
    
    # Add performance details with enhanced styling
    performance_data = [
        ['Final Score', f"{certification.percentage_score}%"],
        ['Grade', certification.get_grade()],
        ['Marks Obtained', f"{certification.score}/{certification.exam.calculate_total_marks()}"],
    ]
    
    performance_table = Table(performance_data, colWidths=[2.5*inch, 2.5*inch])
    performance_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ffffff')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#1a2a3a')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#1a2a3a')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
    ]))
    
    story.append(performance_table)
    story.append(Spacer(1, 40))
    
    # Add certificate details
    story.append(Paragraph(f"Certificate ID: {certification.certificate_id}", body_style))
    story.append(Paragraph(f"Issued on: {certification.issued_date.strftime('%B %d, %Y')}", body_style))
    story.append(Spacer(1, 50))
    
    # Add signatures with enhanced styling
    signature_data = [
        ['Academic Director', 'Course Instructor'],
        ['Cambridge Business College', certification.course.name],
    ]
    
    signature_table = Table(signature_data, colWidths=[3*inch, 3*inch])
    signature_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (0, 0), 2, colors.HexColor('#1a2a3a')),
        ('LINEBELOW', (1, 0), (1, 0), 2, colors.HexColor('#1a2a3a')),
        ('TOPPADDING', (0, 0), (-1, -1), 30),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    story.append(signature_table)
    
    # Build the PDF
    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()
    
    return pdf_data

@login_required
def download_certification(request, certificate_id):
    """View to download certification as PDF"""
    certification = get_object_or_404(Certification, certificate_id=certificate_id)
    
    # Ensure only the certificate owner or admin can download
    if not request.user.is_staff and certification.student != request.user:
        return HttpResponseForbidden("You don't have permission to download this certification.")
    
    # Generate PDF
    pdf_data = generate_certification_pdf(certification)
    
    # Create response
    response = HttpResponse(pdf_data, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="CBC_Certificate_{certification.certificate_id}.pdf"'
    
    return response

@login_required
def verify_certification(request, certificate_id):
    """Public view to verify certification"""
    certification = get_object_or_404(Certification, certificate_id=certificate_id)
    
    context = {
        'certification': certification,
        'is_verified': True,
    }
    return render(request, 'exams/verify_certification.html', context)

# Certificate Management Views (Admin Only)
@login_required
def certificate_management(request):
    """Admin view for certificate management"""
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    # Get all certifications with filters
    certifications = Certification.objects.select_related('student', 'exam', 'course').order_by('-issued_date')
    
    # Filter by student
    student_filter = request.GET.get('student')
    if student_filter:
        certifications = certifications.filter(
            models.Q(student__username__icontains=student_filter) |
            models.Q(student__first_name__icontains=student_filter) |
            models.Q(student__last_name__icontains=student_filter)
        )
    
    # Filter by exam
    exam_filter = request.GET.get('exam')
    if exam_filter:
        certifications = certifications.filter(exam_id=exam_filter)
    
    # Filter by course
    course_filter = request.GET.get('course')
    if course_filter:
        certifications = certifications.filter(course_id=course_filter)
    
    # Filter by status
    status_filter = request.GET.get('status')
    if status_filter:
        if status_filter == 'valid':
            certifications = certifications.filter(is_valid=True)
        elif status_filter == 'expired':
            certifications = certifications.filter(is_valid=False)
    
    # Filter by grade
    grade_filter = request.GET.get('grade')
    if grade_filter:
        # This would need a custom filter or annotation
        pass
    
    # Statistics
    total_certifications = certifications.count()
    valid_certifications = certifications.filter(is_valid=True).count()
    expired_certifications = certifications.filter(is_valid=False).count()
    
    # Grade distribution
    grade_stats = {}
    for cert in certifications:
        grade = cert.get_grade()
        grade_stats[grade] = grade_stats.get(grade, 0) + 1
    
    context = {
        'certifications': certifications,
        'total_certifications': total_certifications,
        'valid_certifications': valid_certifications,
        'expired_certifications': expired_certifications,
        'grade_stats': grade_stats,
        'exams': Exam.objects.all(),
        'courses': Course.objects.all(),
        'selected_exam': exam_filter,
        'selected_course': course_filter,
        'selected_status': status_filter,
        'selected_student': student_filter,
    }
    return render(request, 'exams/certificate_management.html', context)

@login_required
def certificate_detail_admin(request, certificate_id):
    """Admin view for detailed certification information"""
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    certification = get_object_or_404(Certification, certificate_id=certificate_id)
    
    context = {
        'certification': certification,
        'is_admin': True,
    }
    return render(request, 'exams/certification_detail_admin.html', context)

@login_required
def revoke_certification(request, certificate_id):
    """Admin view to revoke a certification"""
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    certification = get_object_or_404(Certification, certificate_id=certificate_id)
    
    if request.method == 'POST':
        certification.is_valid = False
        certification.save()
        messages.success(request, f'Certification {certification.certificate_id} has been revoked.')
        return redirect('certificate_management')
    
    context = {
        'certification': certification,
    }
    return render(request, 'exams/revoke_certification.html', context)

@login_required
def restore_certification(request, certificate_id):
    """Admin view to restore a revoked certification"""
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    certification = get_object_or_404(Certification, certificate_id=certificate_id)
    
    if request.method == 'POST':
        certification.is_valid = True
        certification.save()
        messages.success(request, f'Certification {certification.certificate_id} has been restored.')
        return redirect('certificate_management')
    
    context = {
        'certification': certification,
    }
    return render(request, 'exams/restore_certification.html', context)

@login_required
def bulk_certificate_actions(request):
    """Admin view for bulk certificate actions"""
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    if request.method == 'POST':
        action = request.POST.get('action')
        certificate_ids = request.POST.getlist('certificate_ids')
        
        if action and certificate_ids:
            certifications = Certification.objects.filter(certificate_id__in=certificate_ids)
            
            if action == 'revoke':
                certifications.update(is_valid=False)
                messages.success(request, f'{certifications.count()} certifications have been revoked.')
            elif action == 'restore':
                certifications.update(is_valid=True)
                messages.success(request, f'{certifications.count()} certifications have been restored.')
            elif action == 'delete':
                count = certifications.count()
                certifications.delete()
                messages.success(request, f'{count} certifications have been deleted.')
    
    return redirect('certificate_management')

@login_required
def certificate_analytics(request):
    """Admin view for certificate analytics and reports"""
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    # Get all certifications
    certifications = Certification.objects.select_related('student', 'exam', 'course')
    
    # Monthly statistics
    monthly_stats = {}
    for cert in certifications:
        month_key = cert.issued_date.strftime('%Y-%m')
        if month_key not in monthly_stats:
            monthly_stats[month_key] = 0
        monthly_stats[month_key] += 1
    
    # Course statistics
    course_stats = {}
    for cert in certifications:
        course_name = cert.course.name
        if course_name not in course_stats:
            course_stats[course_name] = 0
        course_stats[course_name] += 1
    
    # Grade distribution
    grade_distribution = {}
    for cert in certifications:
        grade = cert.get_grade()
        if grade not in grade_distribution:
            grade_distribution[grade] = 0
        grade_distribution[grade] += 1
    
    # Top performing students
    student_stats = {}
    for cert in certifications:
        student_name = cert.student.get_full_name() or cert.student.username
        if student_name not in student_stats:
            student_stats[student_name] = {'count': 0, 'avg_score': 0}
        student_stats[student_name]['count'] += 1
        student_stats[student_name]['avg_score'] += float(cert.percentage_score)
    
    # Calculate averages
    for student in student_stats:
        student_stats[student]['avg_score'] = round(student_stats[student]['avg_score'] / student_stats[student]['count'], 2)
    
    # Sort by count and get top 10
    top_students = sorted(student_stats.items(), key=lambda x: x[1]['count'], reverse=True)[:10]
    
    context = {
        'monthly_stats': monthly_stats,
        'course_stats': course_stats,
        'grade_distribution': grade_distribution,
        'top_students': top_students,
        'total_certifications': certifications.count(),
        'valid_certifications': certifications.filter(is_valid=True).count(),
        'avg_score': certifications.aggregate(Avg('percentage_score'))['percentage_score__avg'] or 0,
    }
    return render(request, 'exams/certificate_analytics.html', context)

@receiver(post_save, sender=Certification)
def create_pdf_on_certification_save(sender, instance, **kwargs):
    if kwargs.get('created', False):
        generate_certification_pdf(instance)

@csrf_exempt  # Allow public access (if needed, or remove if CSRF is not an issue)
def verify_certificate(request):
    certificate = None
    error = None
    if request.method == 'POST':
        cert_id = request.POST.get('certificate_id', '').strip()
        if cert_id:
            from .models import Certification
            try:
                certificate = Certification.objects.select_related('student', 'exam', 'course').get(certificate_id=cert_id)
            except Certification.DoesNotExist:
                error = 'Certificate not found. Please check the ID and try again.'
        else:
            error = 'Please enter a certificate ID.'
    return render(request, 'exams/verify_certificate.html', {'certificate': certificate, 'error': error}) 

class ShortAnswerMarkingForm(forms.Form):
    def __init__(self, *args, **kwargs):
        answers = kwargs.pop('answers')
        super().__init__(*args, **kwargs)
        for answer in answers:
            self.fields[f'answer_{answer.id}'] = forms.DecimalField(
                label=answer.question.question_text,
                min_value=0,
                max_value=answer.question.score,
                initial=answer.marks_obtained,
                required=True,
                help_text=f"Max: {answer.question.score} marks"
            )

@login_required
def review_attempt(request, attempt_id):
    attempt = get_object_or_404(ExamAttempt, id=attempt_id)
    if not request.user.is_staff:
        return HttpResponseForbidden()
    # Only short answer answers
    short_answers = attempt.answers.filter(question__question_type='short_answer')
    if request.method == 'POST':
        form = ShortAnswerMarkingForm(request.POST, answers=short_answers)
        if form.is_valid():
            for answer in short_answers:
                marks = form.cleaned_data.get(f'answer_{answer.id}')
                answer.marks_obtained = marks
                answer.save()
            attempt.calculate_score()
            messages.success(request, 'Short answer marks updated and total score recalculated.')
            return redirect('exam_results', attempt_id=attempt.id)
    else:
        form = ShortAnswerMarkingForm(answers=short_answers)
    context = {
        'attempt': attempt,
        'form': form,
        'short_answers': short_answers,
    }
    return render(request, 'exams/review_attempt.html', context) 