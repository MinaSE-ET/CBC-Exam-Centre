from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count
from django.contrib.auth.models import User
from .models import Course, Exam, Question, Option, ExamAttempt, Answer
from .serializers import (
    CourseSerializer, ExamSerializer, QuestionSerializer,
    OptionSerializer, ExamAttemptSerializer, AnswerSerializer,
    UserSerializer, UserCreateSerializer
)

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Exam.objects.all()
        return Exam.objects.filter(assigned_users=user, status='published')

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Question.objects.all()
        exam_id = self.request.query_params.get('exam_id', None)
        if exam_id is not None:
            queryset = queryset.filter(exam_id=exam_id)
        return queryset

    def create(self, request, *args, **kwargs):
        options_data = request.data.pop('choices', [])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Add options data to serializer context
        serializer.context['options'] = options_data
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        options_data = request.data.pop('choices', [])
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Add options data to serializer context
        serializer.context['options'] = options_data
        
        self.perform_update(serializer)
        return Response(serializer.data)

class OptionViewSet(viewsets.ModelViewSet):
    queryset = Option.objects.all()
    serializer_class = OptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Option.objects.all()
        question_id = self.request.query_params.get('question_id', None)
        if question_id is not None:
            queryset = queryset.filter(question_id=question_id)
        return queryset

class ExamAttemptViewSet(viewsets.ModelViewSet):
    queryset = ExamAttempt.objects.all()
    serializer_class = ExamAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return ExamAttempt.objects.all()
        return ExamAttempt.objects.filter(student=user)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import traceback
            print("Exception in ExamAttemptViewSet.create:", e)
            traceback.print_exc()
            return Response(
                {"error": str(e), "traceback": traceback.format_exc()},
                status=500
            )

    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        exam_attempt = self.get_object()
        
        if exam_attempt.is_completed:
            return Response(
                {'error': 'Exam attempt is already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        question_id = request.data.get('question_id')
        selected_option = request.data.get('selected_option')
        text_answer = request.data.get('text_answer')

        try:
            question = Question.objects.get(id=question_id)
            # Check if the question belongs to the exam
            if not exam_attempt.exam.questions.filter(id=question_id).exists():
                return Response({'error': 'Question does not belong to this exam'}, status=status.HTTP_400_BAD_REQUEST)
        except Question.DoesNotExist:
            return Response(
                {'error': 'Question not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        answer, created = Answer.objects.get_or_create(
            exam_attempt=exam_attempt,
            question=question,
            defaults={
                'selected_option_id': selected_option,
                'text_answer': text_answer
            }
        )

        if not created:
            answer.selected_option_id = selected_option
            answer.text_answer = text_answer
            answer.save()

        return Response(AnswerSerializer(answer).data)

    @action(detail=True, methods=['post'])
    def complete_exam(self, request, pk=None):
        exam_attempt = self.get_object()
        
        if exam_attempt.is_completed:
            return Response(
                {'error': 'Exam attempt is already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate score for single_choice and multiple_choice questions
        answers = exam_attempt.answers.all()
        total_score = 0

        for answer in answers:
            if answer.question.question_type in ['single_choice', 'multiple_choice']:
                if answer.selected_option and answer.selected_option.is_correct:
                    total_score += answer.question.score

        exam_attempt.score = total_score
        exam_attempt.end_time = timezone.now()
        exam_attempt.is_completed = True
        exam_attempt.save()

        return Response(ExamAttemptSerializer(exam_attempt).data)

    @action(detail=False, methods=['post'])
    def start_exam(self, request):
        exam_id = request.data.get('exam_id')
        try:
            exam = Exam.objects.get(id=exam_id)
        except Exam.DoesNotExist:
            return Response(
                {'error': 'Exam not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if there's already an incomplete attempt
        existing_attempt = ExamAttempt.objects.filter(
            student=request.user,
            exam=exam,
            is_completed=False
        ).first()

        if existing_attempt:
            return Response(
                ExamAttemptSerializer(existing_attempt).data,
                status=status.HTTP_200_OK
            )

        exam_attempt = ExamAttempt.objects.create(
            student=request.user,
            exam=exam
        )

        return Response(
            ExamAttemptSerializer(exam_attempt).data,
            status=status.HTTP_201_CREATED
        )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    
    if user.is_staff:
        # Admin dashboard stats
        total_users = User.objects.count()
        total_admins = User.objects.filter(is_staff=True).count()
        total_students = User.objects.filter(is_staff=False).count()
        total_exams = Exam.objects.count()
        total_questions = Question.objects.count()
        total_results = ExamAttempt.objects.filter(is_completed=True).count()
        
        # Get exam stats
        published_exams = Exam.objects.filter(status='published').count()
        draft_exams = Exam.objects.filter(status='draft').count()
        
        # Calculate pass rate
        completed_exams = ExamAttempt.objects.filter(is_completed=True)
        if completed_exams.exists():
            pass_rate = (completed_exams.filter(score__gte=Exam.objects.first().passing_marks).count() / completed_exams.count()) * 100
        else:
            pass_rate = 0
        
        # Get recent exams and results
        recent_exams = Exam.objects.order_by('-created_at')[:5]
        recent_results = ExamAttempt.objects.filter(is_completed=True).order_by('-end_time')[:5]
        
        return Response({
            'totalUsers': total_users,
            'totalAdmins': total_admins,
            'totalStudents': total_students,
            'totalExams': total_exams,
            'publishedExams': published_exams,
            'draftExams': draft_exams,
            'totalQuestions': total_questions,
            'totalResults': total_results,
            'passRate': pass_rate,
            'recentExams': ExamSerializer(recent_exams, many=True).data,
            'recentResults': ExamAttemptSerializer(recent_results, many=True).data
        })
    else:
        # Student dashboard stats
        assigned_exams = Exam.objects.filter(assigned_users=user, status='published').count()
        completed_exams = ExamAttempt.objects.filter(student=user, is_completed=True).count()
        pending_exams = assigned_exams - completed_exams
        
        # Calculate student's pass rate
        student_completed = ExamAttempt.objects.filter(student=user, is_completed=True)
        if student_completed.exists():
            pass_rate = (student_completed.filter(score__gte=Exam.objects.first().passing_marks).count() / student_completed.count()) * 100
        else:
            pass_rate = 0
        
        # Get student's recent exams and results
        recent_exams = Exam.objects.filter(assigned_users=user, status='published').order_by('-created_at')[:5]
        recent_results = ExamAttempt.objects.filter(student=user, is_completed=True).order_by('-end_time')[:5]
        
        return Response({
            'assignedExams': assigned_exams,
            'completedExams': completed_exams,
            'pendingExams': pending_exams,
            'passRate': pass_rate,
            'recentExams': ExamSerializer(recent_exams, many=True).data,
            'recentResults': ExamAttemptSerializer(recent_results, many=True).data
        })

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        if not self.request.user.is_staff:
            return User.objects.filter(id=self.request.user.id)
        return User.objects.all()

    def create(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {'error': 'Only admin users can create new users'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not request.user.is_staff and request.user.id != int(kwargs['pk']):
            return Response(
                {'error': 'You can only update your own profile'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {'error': 'Only admin users can delete users'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs) 