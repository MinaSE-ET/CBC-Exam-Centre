# cPanel Deployment Checklist

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
