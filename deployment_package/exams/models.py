from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal

class Subject(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Subject"
        verbose_name_plural = "Subjects"

class Course(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='courses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Course"
        verbose_name_plural = "Courses"

class Question(models.Model):
    QUESTION_TYPES = [
        ('single_choice', 'Single Choice'),
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
    ]
    
    DIFFICULTY_LEVELS = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
        ('expert', 'Expert'),
    ]

    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='single_choice')
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_LEVELS, default='medium')
    score = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(100)])
    category = models.CharField(max_length=100, blank=True, null=True, help_text="Optional category/topic")
    explanation = models.TextField(blank=True, null=True, help_text="Explanation of the correct answer")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_questions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.question_text[:50]}... ({self.get_difficulty_display()})"

    def get_correct_options(self):
        """Get all correct options for this question"""
        return self.options.filter(is_correct=True)

    def get_incorrect_options(self):
        """Get all incorrect options for this question"""
        return self.options.filter(is_correct=False)

    def validate_options(self):
        """Validate that the question has appropriate options based on type"""
        if self.question_type in ['single_choice', 'multiple_choice', 'true_false']:
            options_count = self.options.count()
            if options_count < 2:
                return False, f"Question type '{self.question_type}' requires at least 2 options"
            
            correct_options = self.get_correct_options().count()
            if self.question_type == 'single_choice' and correct_options != 1:
                return False, "Single choice questions must have exactly 1 correct answer"
            elif self.question_type == 'multiple_choice' and correct_options < 1:
                return False, "Multiple choice questions must have at least 1 correct answer"
            elif self.question_type == 'true_false' and correct_options != 1:
                return False, "True/False questions must have exactly 1 correct answer"
        
        return True, "Question is valid"

    class Meta:
        verbose_name = "Question"
        verbose_name_plural = "Questions"
        ordering = ['-created_at']

class Option(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0, help_text="Order of the option")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.question.question_text[:30]} - {self.text[:30]}"

    class Meta:
        verbose_name = "Option"
        verbose_name_plural = "Options"
        ordering = ['order', 'id']

class Exam(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='exams')
    duration_minutes = models.PositiveIntegerField(help_text="Duration in minutes")
    passing_percentage = models.PositiveIntegerField(default=60, help_text="Passing percentage (e.g. 60 for 60%)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    questions = models.ManyToManyField(Question, related_name='exams')
    assigned_users = models.ManyToManyField(User, related_name='assigned_exams', blank=True)
    start_date = models.DateTimeField(blank=True, null=True)
    end_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def calculate_total_marks(self):
        if not self.pk:
            return 0
        return sum(q.score for q in self.questions.all())

    def calculate_passing_marks(self):
        total = self.calculate_total_marks()
        return round(total * (self.passing_percentage / 100)) if total else 0

    def total_marks_display(self):
        return self.calculate_total_marks()

    total_marks_display.short_description = 'Total Marks'

    def passing_marks_display(self):
        return self.calculate_passing_marks()

    passing_marks_display.short_description = 'Passing Marks'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Exam"
        verbose_name_plural = "Exams"

class ExamAttempt(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exam_attempts')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='attempts')
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(blank=True, null=True)
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.username} - {self.exam.title}"

    def calculate_score(self):
        """Calculate the total score for this attempt"""
        total_score = Decimal('0.0')
        for answer in self.answers.all():
            total_score += answer.marks_obtained or Decimal('0.0')
        self.score = total_score
        self.save()

    def get_percentage_score(self):
        """Get the percentage score"""
        total_marks = self.exam.calculate_total_marks()
        if total_marks > 0:
            return round((self.score / total_marks) * 100, 2)
        return 0

    def has_passed(self):
        """Check if the student has passed the exam"""
        return self.score >= self.exam.calculate_passing_marks()

    class Meta:
        verbose_name = "Exam Attempt"
        verbose_name_plural = "Exam Attempts"
        unique_together = ['student', 'exam']

class Answer(models.Model):
    exam_attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_options = models.ManyToManyField(Option, blank=True)
    text_answer = models.TextField(blank=True, null=True)
    marks_obtained = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.exam_attempt.student.username} - {self.question.question_text[:30]}"

    def calculate_marks(self):
        """Calculate marks for this answer"""
        if self.question.question_type == 'single_choice':
            correct_options = self.question.options.filter(is_correct=True)
            selected_correct = self.selected_options.filter(is_correct=True).count()
            if selected_correct == correct_options.count() and self.selected_options.count() == 1:
                self.marks_obtained = self.question.score
            else:
                self.marks_obtained = 0
        elif self.question.question_type == 'multiple_choice':
            correct_options = self.question.options.filter(is_correct=True)
            selected_correct = self.selected_options.filter(is_correct=True).count()
            selected_incorrect = self.selected_options.filter(is_correct=False).count()
            
            if selected_incorrect == 0 and selected_correct == correct_options.count():
                self.marks_obtained = self.question.score
            else:
                self.marks_obtained = 0
        
        self.save()

    class Meta:
        verbose_name = "Answer"
        verbose_name_plural = "Answers"
        unique_together = ['exam_attempt', 'question']

class Certification(models.Model):
    """Model to track student certifications"""
    certificate_id = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certifications')
    exam_attempt = models.OneToOneField(ExamAttempt, on_delete=models.CASCADE, related_name='certification')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='certifications')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certifications')
    score = models.DecimalField(max_digits=5, decimal_places=2)
    percentage_score = models.DecimalField(max_digits=5, decimal_places=2)
    issued_date = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField(blank=True, null=True)
    is_valid = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Certification {self.certificate_id} - {self.student.username} - {self.exam.title}"

    def save(self, *args, **kwargs):
        if not self.certificate_id:
            self.certificate_id = str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)

    def get_grade(self):
        """Get the grade based on percentage score"""
        if self.percentage_score >= 90:
            return "A+"
        elif self.percentage_score >= 80:
            return "A"
        elif self.percentage_score >= 70:
            return "B"
        elif self.percentage_score >= 60:
            return "C"
        elif self.percentage_score >= 50:
            return "D"
        else:
            return "F"

    def get_status_display(self):
        """Get the status display"""
        if not self.is_valid:
            return "Expired"
        elif self.expiry_date and timezone.now() > self.expiry_date:
            return "Expired"
        else:
            return "Valid"

    class Meta:
        verbose_name = "Certification"
        verbose_name_plural = "Certifications"
        ordering = ['-issued_date']

# Signal to automatically create certification when student completes an exam (regardless of pass/fail)
@receiver(post_save, sender=ExamAttempt)
def create_certification_on_pass(sender, instance, created, **kwargs):
    """Create certification when student passes an exam"""
    if instance.is_completed and instance.has_passed():
        # Check if certification already exists
        if not hasattr(instance, 'certification'):
            percentage_score = instance.get_percentage_score()
            Certification.objects.create(
                student=instance.student,
                exam_attempt=instance,
                exam=instance.exam,
                course=instance.exam.course,
                score=instance.score,
                percentage_score=percentage_score
            )
