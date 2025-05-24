from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Course, Exam, Question, Option, ExamAttempt, Answer

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']
        read_only_fields = ['id']

    def get_role(self, obj):
        return 'admin' if obj.is_staff else 'student'

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    role = serializers.ChoiceField(choices=['admin', 'student'], required=True, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password', 'first_name', 'last_name', 'role']

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        role = validated_data.pop('role')
        password = validated_data.pop('password')
        
        user = User.objects.create(
            **validated_data,
            is_staff=(role == 'admin'),
            is_superuser=(role == 'admin')
        )
        user.set_password(password)
        user.save()
        return user

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['role'] = 'admin' if instance.is_staff else 'student'
        return data

class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'text', 'is_correct']
        read_only_fields = ['id']

class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)
    text = serializers.CharField(source='question_text')
    type = serializers.CharField(source='question_type')

    class Meta:
        model = Question
        fields = ['id', 'text', 'type', 'difficulty', 'score', 'category', 'options', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        options_data = self.context.get('options', [])
        question = Question.objects.create(
            question_text=validated_data['question_text'],
            question_type=validated_data['question_type'],
            difficulty=validated_data.get('difficulty', 'medium'),
            score=validated_data['score'],
            category=validated_data.get('category')
        )
        
        for option_data in options_data:
            Option.objects.create(
                question=question,
                text=option_data['text'],
                is_correct=option_data['is_correct']
            )
        
        return question

    def update(self, instance, validated_data):
        options_data = self.context.get('options', [])
        
        instance.question_text = validated_data.get('question_text', instance.question_text)
        instance.question_type = validated_data.get('question_type', instance.question_type)
        instance.difficulty = validated_data.get('difficulty', instance.difficulty)
        instance.score = validated_data.get('score', instance.score)
        instance.category = validated_data.get('category', instance.category)
        instance.save()
        
        # Update options
        if options_data:
            # Delete existing options
            instance.options.all().delete()
            # Create new options
            for option_data in options_data:
                Option.objects.create(
                    question=instance,
                    text=option_data['text'],
                    is_correct=option_data['is_correct']
                )
        
        return instance

class ExamSerializer(serializers.ModelSerializer):
    questions = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(),
        many=True,
        required=False
    )
    description = serializers.CharField(required=False, allow_blank=True)
    duration = serializers.IntegerField(source='duration_minutes')
    totalScore = serializers.IntegerField(source='total_marks')
    passingScore = serializers.IntegerField(source='passing_marks')
    assignedUsers = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_staff=False),
        many=True,
        required=False,
        source='assigned_users'
    )
    status = serializers.ChoiceField(choices=['draft', 'published', 'archived'])

    class Meta:
        model = Exam
        fields = ['id', 'title', 'description', 'course', 'duration', 'totalScore', 
                 'passingScore', 'questions', 'assignedUsers', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Extract the questions from the request data
        questions = validated_data.pop('questions', [])
        
        # Create the exam
        exam = Exam.objects.create(
            title=validated_data['title'],
            description=validated_data.get('description', ''),
            course=validated_data.get('course'),
            duration_minutes=validated_data['duration_minutes'],
            total_marks=validated_data['total_marks'],
            passing_marks=validated_data['passing_marks'],
            status=validated_data.get('status', 'draft')
        )
        
        # Add questions to the exam
        if questions:
            exam.questions.set(questions)
        
        # Add assigned users
        if 'assigned_users' in validated_data:
            exam.assigned_users.set(validated_data['assigned_users'])
        
        return exam

    def update(self, instance, validated_data):
        # Extract the questions from the request data
        questions = validated_data.pop('questions', None)
        
        # Update basic fields
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.course = validated_data.get('course', instance.course)
        instance.duration_minutes = validated_data.get('duration_minutes', instance.duration_minutes)
        instance.total_marks = validated_data.get('total_marks', instance.total_marks)
        instance.passing_marks = validated_data.get('passing_marks', instance.passing_marks)
        instance.status = validated_data.get('status', instance.status)
        instance.save()
        
        # Update questions
        if questions is not None:
            instance.questions.set(questions)
        
        # Update assigned users
        if 'assigned_users' in validated_data:
            instance.assigned_users.set(validated_data['assigned_users'])
        
        return instance

class CourseSerializer(serializers.ModelSerializer):
    exams = ExamSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'name', 'description', 'exams', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'question', 'selected_option', 'text_answer', 'marks_obtained']
        read_only_fields = ['id', 'marks_obtained']

class ExamAttemptSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)
    student = UserSerializer(read_only=True)
    exam = ExamSerializer(read_only=True)

    class Meta:
        model = ExamAttempt
        fields = ['id', 'student', 'exam', 'start_time', 'end_time', 
                 'score', 'is_completed', 'answers', 'created_at', 'updated_at']
        read_only_fields = ['id', 'start_time', 'end_time', 'score', 
                           'is_completed', 'created_at', 'updated_at'] 