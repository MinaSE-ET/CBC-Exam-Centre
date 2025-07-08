#!/usr/bin/env python
"""
Deployment preparation script for cPanel
This script helps prepare your Django project for cPanel deployment
"""
import os
import shutil
import zipfile
from pathlib import Path

def create_deployment_package():
    """Create a deployment package for cPanel"""
    
    # Define source and destination directories
    source_dir = Path('.')
    deploy_dir = Path('deployment_package')
    
    # Files and directories to include
    include_patterns = [
        '*.py',
        'templates/',
        'static/',
        'accounts/',
        'exams/',
        'exam_platform/',
        'requirements.txt',
        'manage.py',
        'passenger_wsgi.py',
        '.htaccess',
        'README.md',
        'cpanel_deployment_guide.md'
    ]
    
    # Files and directories to exclude
    exclude_patterns = [
        'venv/',
        '__pycache__/',
        '*.pyc',
        '.git/',
        '.env',
        'db.sqlite3',
        'deployment_package/',
        '*.log',
        'test_*.py',
        'check_*.py',
        'fix_*.py',
        'reset_*.py'
    ]
    
    print("🚀 Creating cPanel Deployment Package")
    print("=" * 50)
    
    # Create deployment directory
    if deploy_dir.exists():
        shutil.rmtree(deploy_dir)
    deploy_dir.mkdir()
    
    # Copy files
    files_copied = 0
    for pattern in include_patterns:
        if pattern.endswith('/'):
            # Directory
            dir_path = source_dir / pattern.rstrip('/')
            if dir_path.exists():
                dest_path = deploy_dir / pattern.rstrip('/')
                shutil.copytree(dir_path, dest_path, ignore=shutil.ignore_patterns(*exclude_patterns))
                files_copied += len(list(dest_path.rglob('*')))
                print(f"✅ Copied directory: {pattern}")
        else:
            # File
            file_path = source_dir / pattern
            if file_path.exists():
                shutil.copy2(file_path, deploy_dir)
                files_copied += 1
                print(f"✅ Copied file: {pattern}")
    
    # Create zip file
    zip_filename = 'cbc_exam_platform_cpanel.zip'
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(deploy_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(deploy_dir)
                zipf.write(file_path, arcname)
    
    print(f"\n📦 Deployment package created successfully!")
    print(f"   Files copied: {files_copied}")
    print(f"   Package location: {zip_filename}")
    print(f"   Unpacked location: {deploy_dir}")
    
    return zip_filename, deploy_dir

def create_env_template():
    """Create a template .env file for production"""
    
    env_template = """# Production Environment Variables for cPanel
# Copy this to .env and update with your actual values

# Django Settings
DJANGO_SECRET_KEY=your-production-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database (SQLite - current setup)
# No additional database settings needed for SQLite

# Optional: MySQL Database (if you want to switch later)
# DB_NAME=your_cpanel_db_name
# DB_USER=your_cpanel_db_user
# DB_PASSWORD=your_cpanel_db_password
# DB_HOST=localhost
# DB_PORT=3306

# Redis Cache (Optional)
# REDIS_URL=redis://localhost:6379/0

# Sentry (Optional - for error tracking)
# SENTRY_DSN=your-sentry-dsn-here
"""
    
    with open('deployment_package/.env.template', 'w') as f:
        f.write(env_template)
    
    print("✅ Created .env.template for production")

def create_deployment_checklist():
    """Create a deployment checklist"""
    
    checklist = """# cPanel Deployment Checklist

## Pre-Deployment
- [ ] Test application locally
- [ ] Backup current database (if any)
- [ ] Update requirements.txt if needed
- [ ] Set DEBUG=False for production

## cPanel Setup
- [ ] Access cPanel
- [ ] Create Python application
- [ ] Set Python version (3.8+)
- [ ] Configure application root
- [ ] Set application URL

## File Upload
- [ ] Upload deployment package to public_html
- [ ] Extract files in correct directory
- [ ] Set file permissions:
  - [ ] passenger_wsgi.py (755)
  - [ ] .htaccess (644)
  - [ ] manage.py (755)
  - [ ] db.sqlite3 (644) - if using SQLite

## Environment Setup
- [ ] Create .env file from .env.template
- [ ] Update .env with production values
- [ ] Install dependencies: pip install -r requirements.txt
- [ ] Run migrations: python manage.py migrate
- [ ] Collect static files: python manage.py collectstatic
- [ ] Create superuser: python manage.py createsuperuser

## Testing
- [ ] Test homepage loads
- [ ] Test admin login
- [ ] Test user registration/login
- [ ] Test exam functionality
- [ ] Check error logs

## Security
- [ ] Verify DEBUG=False
- [ ] Check .env file is not web accessible
- [ ] Test admin interface
- [ ] Verify HTTPS (if available)

## Performance
- [ ] Enable caching (if available)
- [ ] Optimize static files
- [ ] Monitor error logs
- [ ] Set up backups

## Post-Deployment
- [ ] Update DNS if needed
- [ ] Test all functionality
- [ ] Monitor performance
- [ ] Set up monitoring
"""
    
    with open('deployment_package/DEPLOYMENT_CHECKLIST.md', 'w') as f:
        f.write(checklist)
    
    print("✅ Created deployment checklist")

def main():
    """Main deployment preparation function"""
    
    print("🎯 CBC Exam Platform - cPanel Deployment Preparation")
    print("=" * 60)
    
    # Create deployment package
    zip_file, deploy_dir = create_deployment_package()
    
    # Create additional files
    create_env_template()
    create_deployment_checklist()
    
    print("\n🎉 Deployment preparation completed!")
    print("\n📋 Next Steps:")
    print("1. Upload the zip file to your cPanel File Manager")
    print("2. Extract it in your public_html directory")
    print("3. Follow the DEPLOYMENT_CHECKLIST.md guide")
    print("4. Set up Python application in cPanel")
    print("5. Configure your .env file with production settings")
    
    print(f"\n📁 Files created:")
    print(f"   - {zip_file} (upload this to cPanel)")
    print(f"   - {deploy_dir}/ (local copy for reference)")
    print(f"   - {deploy_dir}/.env.template (production environment template)")
    print(f"   - {deploy_dir}/DEPLOYMENT_CHECKLIST.md (step-by-step guide)")

if __name__ == "__main__":
    main() 