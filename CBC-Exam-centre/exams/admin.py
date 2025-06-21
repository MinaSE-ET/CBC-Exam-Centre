from django.contrib import admin
from .models import Course, Question, Option, Exam, ExamAttempt, Answer, Subject

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']
    list_filter = ['created_at']
    ordering = ['name']

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['name', 'subject', 'description', 'created_at']
    list_filter = ['subject', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']

class OptionInline(admin.TabularInline):
    model = Option
    extra = 4
    fields = ['text', 'is_correct', 'order']

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = [
        'question_text', 'question_type', 'difficulty', 'score', 
        'category', 'is_active', 'created_by', 'created_at'
    ]
    list_filter = [
        'question_type', 'difficulty', 'is_active', 
        'created_at', 'created_by'
    ]
    search_fields = ['question_text', 'category']
    readonly_fields = ['created_by', 'created_at', 'updated_at']
    inlines = [OptionInline]
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by for new questions
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by')

@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    list_display = ['text', 'question', 'is_correct', 'order']
    list_filter = ['is_correct', 'question__question_type']
    search_fields = ['text', 'question__question_text']
    ordering = ['question', 'order']

@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'course', 'status', 'duration_minutes', 
        'total_marks', 'passing_marks', 'start_date', 'end_date'
    ]
    list_filter = ['status', 'course', 'start_date', 'end_date']
    search_fields = ['title', 'description']
    filter_horizontal = ['questions', 'assigned_users']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(ExamAttempt)
class ExamAttemptAdmin(admin.ModelAdmin):
    list_display = [
        'student', 'exam', 'start_time', 'end_time', 
        'score', 'is_completed'
    ]
    list_filter = ['is_completed', 'exam', 'start_time']
    search_fields = ['student__username', 'student__email', 'exam__title']
    readonly_fields = ['start_time', 'created_at', 'updated_at']

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = [
        'exam_attempt', 'question', 'marks_obtained', 'created_at'
    ]
    list_filter = ['question__question_type', 'created_at']
    search_fields = [
        'exam_attempt__student__username', 
        'question__question_text'
    ]
    readonly_fields = ['created_at', 'updated_at']
