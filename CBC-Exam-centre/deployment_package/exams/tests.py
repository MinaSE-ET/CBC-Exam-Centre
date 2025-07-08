from django.test import TestCase
import pytest
from django.urls import reverse
from django.contrib.auth.models import User
from exams.models import Course, Subject, Exam, Question, Option, ExamAttempt, Certification
from django.utils import timezone

# Create your tests here.

@pytest.mark.django_db
def test_exam_taking_and_results(client):
    # Setup users, course, exam, question, options
    student = User.objects.create_user(username='student', password='studpass')
    admin = User.objects.create_user(username='admin', password='adminpass', is_staff=True)
    subject = Subject.objects.create(name='Math')
    course = Course.objects.create(name='Algebra', subject=subject)
    exam = Exam.objects.create(title='Algebra Exam', course=course, duration_minutes=60, status='published')
    question = Question.objects.create(question_text='2+2=?', question_type='single_choice', score=5, created_by=admin)
    option1 = Option.objects.create(question=question, text='4', is_correct=True)
    option2 = Option.objects.create(question=question, text='3', is_correct=False)
    exam.questions.add(question)
    exam.assigned_users.add(student)
    # Student takes exam
    client.force_login(student)
    url = reverse('take_exam', args=[exam.pk])
    response = client.get(url)
    assert response.status_code == 200
    # Submit answer
    response = client.post(url, {'question_{}'.format(question.pk): option1.pk}, follow=True)
    assert ExamAttempt.objects.filter(student=student, exam=exam, is_completed=True).exists()
    # Results page
    attempt = ExamAttempt.objects.get(student=student, exam=exam)
    result_url = reverse('exam_results', args=[attempt.pk])
    response = client.get(result_url)
    assert response.status_code == 200
    assert str(attempt.score) in response.content.decode()

@pytest.mark.django_db
def test_exam_edge_cases(client):
    student = User.objects.create_user(username='student2', password='studpass')
    admin = User.objects.create_user(username='admin2', password='adminpass', is_staff=True)
    subject = Subject.objects.create(name='Science')
    course = Course.objects.create(name='Biology', subject=subject)
    exam = Exam.objects.create(title='Biology Exam', course=course, duration_minutes=60, status='published')
    # Not assigned user
    client.force_login(student)
    url = reverse('take_exam', args=[exam.pk])
    response = client.get(url, follow=True)
    assert 'You are not assigned to this exam' in response.content.decode()
    # Incomplete attempt
    exam.assigned_users.add(student)
    response = client.get(url)
    assert response.status_code == 200
    # Submit invalid answer
    response = client.post(url, {'question_999': 1})
    assert response.status_code == 200 or response.status_code == 400

@pytest.mark.django_db
def test_certificate_generation(client):
    student = User.objects.create_user(username='certstudent', password='certpass')
    admin = User.objects.create_user(username='certadmin', password='adminpass', is_staff=True)
    subject = Subject.objects.create(name='CertSubject')
    course = Course.objects.create(name='CertCourse', subject=subject)
    exam = Exam.objects.create(title='Cert Exam', course=course, duration_minutes=60, status='published')
    exam.assigned_users.add(student)
    attempt = ExamAttempt.objects.create(student=student, exam=exam, score=100, is_completed=True)
    cert = Certification.objects.create(student=student, exam_attempt=attempt, exam=exam, course=course, score=100, percentage_score=100)
    url = reverse('certification_detail', args=[cert.certificate_id])
    client.force_login(student)
    response = client.get(url)
    assert response.status_code == 200
    assert cert.certificate_id in response.content.decode()
