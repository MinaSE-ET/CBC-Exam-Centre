# cPanel Deployment Guide for CBC Exam Platform

## Prerequisites
- cPanel hosting with Python support
- MySQL database (if you want to switch from SQLite later)
- Domain or subdomain pointing to your hosting

## Step 1: Prepare Your Local Project

1. **Create a deployment package:**
   ```bash
   # Create a zip file excluding unnecessary files
   zip -r cbc-exam-platform.zip . -x "venv/*" "*.pyc" "__pycache__/*" ".git/*" "db.sqlite3" ".env"
   ```

2. **Or manually prepare these files for upload:**
   - All Python files (`.py`)
   - All template files (`templates/`)
   - All static files (`static/`)
   - `requirements.txt`
   - `manage.py`
   - `passenger_wsgi.py` (created for deployment)
   - `.htaccess` (created for deployment)

## Step 2: Upload to cPanel

1. **Access cPanel File Manager**
   - Log into your cPanel
   - Open File Manager
   - Navigate to your domain's public_html directory

2. **Upload Files**
   - Upload your project files to the root directory
   - Or create a subdirectory (e.g., `exam-platform/`) and upload there

3. **Set Permissions**
   ```bash
   # Set proper permissions
   chmod 755 passenger_wsgi.py
   chmod 644 .htaccess
   chmod 755 manage.py
   ```

## Step 3: Set Up Python Environment

1. **Create Python App in cPanel**
   - Go to "Setup Python App" in cPanel
   - Create a new Python application
   - Set Python version to 3.8 or higher
   - Set application root to your project directory
   - Set application URL to your domain

2. **Install Dependencies**
   ```bash
   # SSH into your server or use Terminal in cPanel
   cd /home/username/public_html/your-project-directory
   pip install -r requirements.txt
   ```

## Step 4: Database Setup

### Option A: Keep SQLite (Current Setup)
- Your current SQLite database will work fine
- Upload your `db.sqlite3` file to the project directory
- Set permissions: `chmod 644 db.sqlite3`

### Option B: Switch to MySQL (Recommended for Production)
1. **Create MySQL Database in cPanel**
   - Go to "MySQL Databases" in cPanel
   - Create a new database
   - Create a database user
   - Assign user to database with all privileges

2. **Update Database Settings**
   - Create a `.env` file in your project root:
   ```env
   DJANGO_SECRET_KEY=your-production-secret-key
   DEBUG=False
   ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
   DB_NAME=your_cpanel_db_name
   DB_USER=your_cpanel_db_user
   DB_PASSWORD=your_cpanel_db_password
   DB_HOST=localhost
   DB_PORT=3306
   ```

## Step 5: Configure Django for Production

1. **Create Production Settings (Optional)**
   - You can keep your current settings if using SQLite
   - For MySQL, you'll need to update the DATABASES setting

2. **Set Environment Variables**
   - Create `.env` file with your production settings
   - Set `DEBUG=False` for production
   - Set `ALLOWED_HOSTS` to your domain

## Step 6: Run Django Commands

1. **SSH into your server or use cPanel Terminal**
   ```bash
   cd /home/username/public_html/your-project-directory
   ```

2. **Run migrations (if using MySQL)**
   ```bash
   python manage.py migrate
   ```

3. **Collect static files**
   ```bash
   python manage.py collectstatic --noinput
   ```

4. **Create superuser (if needed)**
   ```bash
   python manage.py createsuperuser
   ```

## Step 7: Test Your Application

1. **Visit your domain** to see if the application loads
2. **Check error logs** in cPanel if there are issues
3. **Test admin login** at `yourdomain.com/admin/`

## Troubleshooting

### Common Issues:

1. **500 Internal Server Error**
   - Check error logs in cPanel
   - Verify `passenger_wsgi.py` exists and has correct permissions
   - Ensure all dependencies are installed

2. **Static Files Not Loading**
   - Run `python manage.py collectstatic`
   - Check `.htaccess` file is in place
   - Verify static files directory permissions

3. **Database Connection Issues**
   - Check database credentials in `.env`
   - Verify database exists and user has permissions
   - Check if MySQL service is running

4. **Import Errors**
   - Ensure all packages in `requirements.txt` are installed
   - Check Python version compatibility
   - Verify virtual environment is activated

### Error Logs Location:
- cPanel → Error Logs
- Or check `/home/username/public_html/error_log`

## Security Considerations

1. **Set DEBUG=False** in production
2. **Use strong SECRET_KEY**
3. **Set proper ALLOWED_HOSTS**
4. **Keep .env file secure** (not accessible via web)
5. **Regular backups** of your database and files

## Performance Optimization

1. **Enable caching** (Redis/Memcached if available)
2. **Use CDN** for static files
3. **Optimize database queries**
4. **Enable compression** in .htaccess

## Backup Strategy

1. **Database backups** (daily)
2. **File backups** (weekly)
3. **Configuration backups** (monthly)

## Support

If you encounter issues:
1. Check cPanel error logs
2. Verify file permissions
3. Test database connectivity
4. Review Django documentation for deployment 