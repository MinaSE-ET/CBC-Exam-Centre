from django import forms
from django.forms import inlineformset_factory
from .models import Question, Option, Exam, Course, ExamAttempt, Answer, Subject

class SubjectForm(forms.ModelForm):
    class Meta:
        model = Subject
        fields = ['name', 'description']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }

class CourseForm(forms.ModelForm):
    class Meta:
        model = Course
        fields = ['name', 'description', 'subject']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }

class QuestionForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = [
            'question_text', 'question_type', 'difficulty', 'score', 
            'category', 'explanation', 'is_active'
        ]
        widgets = {
            'question_text': forms.Textarea(attrs={
                'rows': 4, 
                'placeholder': 'Enter your question here...',
                'class': 'form-control'
            }),
            'category': forms.TextInput(attrs={
                'placeholder': 'e.g., Algebra, Calculus, Geometry',
                'class': 'form-control'
            }),
            'explanation': forms.Textarea(attrs={
                'rows': 3,
                'placeholder': 'Explanation of the correct answer (optional)',
                'class': 'form-control'
            }),
            'question_type': forms.Select(attrs={'class': 'form-control'}),
            'difficulty': forms.Select(attrs={'class': 'form-control'}),
            'score': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '1',
                'max': '100'
            }),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

    def clean_score(self):
        score = self.cleaned_data.get('score')
        if score < 1 or score > 100:
            raise forms.ValidationError("Score must be between 1 and 100.")
        return score

class OptionForm(forms.ModelForm):
    class Meta:
        model = Option
        fields = ['text', 'is_correct', 'order']
        widgets = {
            'text': forms.TextInput(attrs={
                'placeholder': 'Enter option text',
                'class': 'form-control'
            }),
            'is_correct': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'order': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '0'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make order field optional
        self.fields['order'].required = False

# Inline formset for options with better configuration
OptionFormSet = inlineformset_factory(
    Question, Option,
    form=OptionForm,
    extra=4,
    min_num=2,
    max_num=8,
    can_delete=True,
    validate_min=True,
    validate_max=True,
    fields=['text', 'is_correct', 'order']
)

class ExamForm(forms.ModelForm):
    class Meta:
        model = Exam
        fields = [
            'title', 'description', 'course', 'duration_minutes', 
            'total_marks', 'passing_marks', 'status', 'start_date', 'end_date'
        ]
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter exam title'
            }),
            'description': forms.Textarea(attrs={
                'rows': 3,
                'class': 'form-control',
                'placeholder': 'Enter exam description'
            }),
            'course': forms.Select(attrs={'class': 'form-control'}),
            'duration_minutes': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '1',
                'placeholder': 'Duration in minutes'
            }),
            'total_marks': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '1',
                'placeholder': 'Total marks'
            }),
            'passing_marks': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '1',
                'placeholder': 'Passing marks'
            }),
            'status': forms.Select(attrs={'class': 'form-control'}),
            'start_date': forms.DateTimeInput(attrs={
                'type': 'datetime-local',
                'class': 'form-control'
            }),
            'end_date': forms.DateTimeInput(attrs={
                'type': 'datetime-local',
                'class': 'form-control'
            }),
        }
    
    def clean(self):
        cleaned_data = super().clean()
        passing_marks = cleaned_data.get('passing_marks')
        total_marks = cleaned_data.get('total_marks')
        
        if passing_marks and total_marks and passing_marks > total_marks:
            raise forms.ValidationError("Passing marks cannot be greater than total marks.")
        
        return cleaned_data

class ExamQuestionAssignmentForm(forms.ModelForm):
    class Meta:
        model = Exam
        fields = ['questions']
        widgets = {
            'questions': forms.CheckboxSelectMultiple(attrs={'class': 'form-check-input'}),
        }

class ExamUserAssignmentForm(forms.ModelForm):
    class Meta:
        model = Exam
        fields = ['assigned_users']
        widgets = {
            'assigned_users': forms.CheckboxSelectMultiple(attrs={'class': 'form-check-input'}),
        }

class ExamTakingForm(forms.Form):
    def __init__(self, question, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.question = question
        
        if question.question_type == 'single_choice':
            self.fields['answer'] = forms.ChoiceField(
                choices=[(option.id, option.text) for option in question.options.all()],
                widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
                label=question.question_text,
                required=True
            )
        elif question.question_type == 'multiple_choice':
            self.fields['answer'] = forms.MultipleChoiceField(
                choices=[(option.id, option.text) for option in question.options.all()],
                widget=forms.CheckboxSelectMultiple(attrs={'class': 'form-check-input'}),
                label=question.question_text,
                required=True
            )
        elif question.question_type == 'true_false':
            self.fields['answer'] = forms.ChoiceField(
                choices=[(option.id, option.text) for option in question.options.all()],
                widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
                label=question.question_text,
                required=True
            )
        elif question.question_type == 'short_answer':
            self.fields['answer'] = forms.CharField(
                widget=forms.Textarea(attrs={
                    'rows': 3,
                    'class': 'form-control',
                    'placeholder': 'Enter your answer here...'
                }),
                label=question.question_text,
                required=True
            )

class ExamSearchForm(forms.Form):
    search = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Search exams...',
            'class': 'form-control'
        })
    )
    status = forms.ChoiceField(
        choices=[('', 'All Statuses')] + Exam.STATUS_CHOICES,
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    course = forms.ModelChoiceField(
        queryset=Course.objects.all(),
        required=False,
        empty_label="All Courses",
        widget=forms.Select(attrs={'class': 'form-control'})
    )

class QuestionSearchForm(forms.Form):
    search = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Search questions...',
            'class': 'form-control'
        })
    )
    question_type = forms.ChoiceField(
        choices=[('', 'All Types')] + Question.QUESTION_TYPES,
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    difficulty = forms.ChoiceField(
        choices=[('', 'All Difficulties')] + Question.DIFFICULTY_LEVELS,
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    category = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Filter by category...',
            'class': 'form-control'
        })
    ) 