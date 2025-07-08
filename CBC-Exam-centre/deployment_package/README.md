# CBC Exam Platform

## Setup

1. Clone the repository
2. Create a virtual environment and activate it
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and fill in secrets (see below)
5. Run migrations:
   ```bash
   python manage.py migrate
   ```
6. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```
7. Run the development server:
   ```bash
   python manage.py runserver
   ```

## Environment Variables
- `DJANGO_SECRET_KEY`: Django secret key
- `DJANGO_ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `REDIS_URL`: Redis connection string (e.g., redis://127.0.0.1:6379/1)
- `SENTRY_DSN`: Sentry DSN for error tracking
- `DJANGO_LOG_FILE`: Path to log file (default: django.log)

## Deployment
- Set `DEBUG=False` in production
- Set `ALLOWED_HOSTS` to your domain(s)
- Use `gunicorn`/`uWSGI` + Nginx for production
- Run `python manage.py collectstatic` for static files
- Use Redis for caching
- Set up SSL/HTTPS and all `SECURE_*` settings
- Configure Sentry for error monitoring
- Set up health checks (see settings.py for optional health check app)

## Running Tests
- Run all tests:
  ```bash
  pytest
  ```

## Usage
- Admins can create users, assign exams, view results, and manage certificates
- Students can take assigned exams, view results, and download certificates

## Notes
- See `settings.py` for all production settings and security recommendations.
- For static asset minification/compression, use `django-compressor` or a build tool.
- For further customization, see the codebase docstrings and comments. 