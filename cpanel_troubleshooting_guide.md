# 403 Forbidden Error - cPanel Django Troubleshooting Guide

## What the Error Means

A 403 Forbidden error means the web server (Apache) is denying access to your Django application. This is usually caused by:

1. **File permissions** - Files/directories not readable by web server
2. **Python application not configured** - cPanel Python app not set up correctly
3. **Missing passenger_wsgi.py** - Entry point file missing or incorrect
4. **Directory structure** - Files in wrong location
5. **Apache configuration** - .htaccess conflicts or issues

## Step-by-Step Troubleshooting

### 1. Check File Permissions

**SSH into your server or use cPanel Terminal:**
```bash
cd /home/username/public_html/your-project-directory

# Set correct permissions
chmod 755 passenger_wsgi.py
chmod 644 .htaccess
chmod 755 manage.py
chmod 755 exam_platform/
chmod 755 accounts/
chmod 755 exams/
chmod 755 templates/
chmod 755 static/

# Set directory permissions recursively
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;

# Make sure passenger_wsgi.py is executable
chmod +x passenger_wsgi.py
```

### 2. Verify Python Application Setup

**In cPanel:**
1. Go to "Setup Python App"
2. Check if your app is listed and active
3. Verify the application root points to your project directory
4. Ensure Python version is 3.8 or higher
5. Check that the application URL matches your domain

**If app is not configured:**
1. Create new Python application
2. Set application root to: `/home/username/public_html/your-project-directory`
3. Set application URL to: `yourdomain.com`
4. Set Python version to 3.8+

### 3. Check File Structure

**Your directory structure should look like this:**
```
public_html/
└── your-project-directory/
    ├── passenger_wsgi.py          ← MUST BE HERE
    ├── .htaccess                  ← MUST BE HERE
    ├── manage.py
    ├── requirements.txt
    ├── exam_platform/
    │   ├── __init__.py
    │   ├── settings.py
    │   ├── urls.py
    │   └── wsgi.py
    ├── accounts/
    ├── exams/
    ├── templates/
    └── static/
```

### 4. Verify passenger_wsgi.py Content

**Check that passenger_wsgi.py contains:**
```python
import os
import sys

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_platform.settings')

# Import Django WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

### 5. Check .htaccess File

**Verify .htaccess content:**
```apache
# Django .htaccess for cPanel
RewriteEngine On

# Handle static files
RewriteCond %{REQUEST_URI} !^/static/
RewriteCond %{REQUEST_URI} !^/media/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Send all other requests to Django
RewriteRule ^(.*)$ /passenger_wsgi.py/$1 [QSA,L]
```

### 6. Test Python Environment

**SSH into server and test:**
```bash
cd /home/username/public_html/your-project-directory

# Test Python
python --version

# Test Django import
python -c "import django; print(django.get_version())"

# Test your settings
python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'exam_platform.settings'); import django; django.setup(); print('Django setup successful')"
```

### 7. Check Error Logs

**In cPanel:**
1. Go to "Error Logs"
2. Look for recent errors
3. Check both Apache and Python error logs

**Or via SSH:**
```bash
# Check Apache error log
tail -f /home/username/public_html/error_log

# Check Python app logs (if available)
tail -f /home/username/logs/python_app.log
```

### 8. Common Solutions

#### Solution A: Fix Directory Structure
```bash
# If files are in wrong location, move them
mv passenger_wsgi.py /home/username/public_html/
mv .htaccess /home/username/public_html/
mv manage.py /home/username/public_html/
# ... move other files as needed
```

#### Solution B: Restart Python Application
1. Go to cPanel → Setup Python App
2. Find your application
3. Click "Restart" or "Reload"

#### Solution C: Check for .htaccess Conflicts
```bash
# Temporarily rename .htaccess to test
mv .htaccess .htaccess.backup

# Test if site loads
# If it loads, the issue is in .htaccess
# If not, the issue is elsewhere
```

#### Solution D: Verify Domain Configuration
1. Check if your domain points to the correct directory
2. Ensure no conflicting .htaccess files in parent directories
3. Verify subdomain configuration if using subdomain

### 9. Alternative .htaccess for Testing

**Try this simplified .htaccess:**
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ passenger_wsgi.py/$1 [QSA,L]
```

### 10. Debug Mode

**Temporarily enable debug in settings.py:**
```python
DEBUG = True
ALLOWED_HOSTS = ['*']
```

**Then check the Django error page for more details.**

### 11. Check Python Dependencies

**Verify all packages are installed:**
```bash
pip list
pip install -r requirements.txt
```

### 12. Test with Simple Python File

**Create test.py in your project directory:**
```python
def application(environ, start_response):
    status = '200 OK'
    output = b'Hello World! Python is working!'
    
    response_headers = [('Content-type', 'text/plain'),
                       ('Content-Length', str(len(output)))]
    start_response(status, response_headers)
    
    return [output]
```

**Rename passenger_wsgi.py to passenger_wsgi.py.backup**
**Rename test.py to passenger_wsgi.py**
**Test if you see "Hello World!"**

## Quick Fix Checklist

- [ ] Set file permissions (755 for directories, 644 for files)
- [ ] Verify passenger_wsgi.py exists and is executable
- [ ] Check Python application is configured in cPanel
- [ ] Ensure files are in correct directory structure
- [ ] Restart Python application in cPanel
- [ ] Check error logs for specific error messages
- [ ] Test with simplified .htaccess
- [ ] Verify domain points to correct directory

## Still Getting 403?

1. **Contact your hosting provider** - They can check server-level configurations
2. **Check hosting plan** - Ensure Python applications are supported
3. **Try different Python version** - Some hosts have specific requirements
4. **Use subdomain** - Sometimes main domain has conflicts

## Success Indicators

When working correctly, you should see:
- Django admin page loads
- No 403 errors
- Python application shows as "Running" in cPanel
- Error logs show Django startup messages 