# Exam Platform Backend

This is the backend for the Exam Platform, built with Django and PostgreSQL.

## Prerequisites

- Python 3.8 or higher
- PostgreSQL
- pip (Python package manager)

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
```bash
.\venv\Scripts\activate
```
- Unix/MacOS:
```bash
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a PostgreSQL database named 'exam_platform'

5. Update the `.env` file with your database credentials:
```
DEBUG=True
SECRET_KEY=your-secret-key-here
DB_NAME=exam_platform
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432
```

6. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

7. Create a superuser:
```bash
python manage.py createsuperuser
```

8. Run the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## API Endpoints

- `/api/courses/` - Course management
- `/api/exams/` - Exam management
- `/api/questions/` - Question management
- `/api/options/` - Option management
- `/api/exam-attempts/` - Exam attempt management

### Special Endpoints

- `POST /api/exam-attempts/start_exam/` - Start a new exam attempt
- `POST /api/exam-attempts/{id}/submit_answer/` - Submit an answer
- `POST /api/exam-attempts/{id}/complete_exam/` - Complete an exam attempt

## Authentication

The API uses Django's session authentication. All endpoints require authentication except for the login endpoint.

## Development

To run tests:
```bash
python manage.py test
```

To check for code style issues:
```bash
flake8
``` 