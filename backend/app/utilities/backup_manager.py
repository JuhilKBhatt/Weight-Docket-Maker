# backend/app/utilities/backup_manager.py

import os
import shutil
import subprocess
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal # Assuming you want to read configs, but we will use Env vars

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
# We read these from the environment variables passed to Docker
DB_HOST = "db" # The service name in docker-compose
DB_USER = os.getenv("POSTGRES_USER", "user")
DB_NAME = os.getenv("POSTGRES_DB", "weight_docket_db")
# PGPASSWORD is handled automatically if passed in env, or we can set it explicitly:
os.environ["PGPASSWORD"] = os.getenv("POSTGRES_PASSWORD", "password")

# CRITICAL: This path must match the VOLUME mount in docker-compose (see Step 3)
BACKUP_ROOT = "/backups"

def create_backup():
    logger.info("⏳ Starting scheduled backup...")
    
    today = datetime.now()
    timestamp = today.strftime("%Y-%m-%d_%H%M%S")
    filename = f"invoice_backup_{timestamp}.sql"
    
    # Define Folders
    daily_dir = os.path.join(BACKUP_ROOT, "daily")
    weekly_dir = os.path.join(BACKUP_ROOT, "weekly")
    monthly_dir = os.path.join(BACKUP_ROOT, "monthly")

    # Ensure directories exist
    for folder in [daily_dir, weekly_dir, monthly_dir]:
        os.makedirs(folder, exist_ok=True)

    target_file = os.path.join(daily_dir, filename)

    # 1. RUN PG_DUMP
    try:
        # We run pg_dump connecting to the 'db' container
        command = [
            "pg_dump",
            "-h", DB_HOST,
            "-U", DB_USER,
            "-d", DB_NAME,
            "-f", target_file
        ]
        subprocess.run(command, check=True)
        logger.info(f"✅ Daily backup created: {filename}")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Backup Failed: {e}")
        return

    # 2. ROTATION LOGIC (GFS)
    
    # Weekly (Father): If today is Sunday (weekday() == 6)
    if today.weekday() == 6:
        shutil.copy2(target_file, os.path.join(weekly_dir, filename))
        logger.info(f"📅 Sunday: Copied to Weekly")

    # Monthly (Grandfather): If today is the 1st
    if today.day == 1:
        shutil.copy2(target_file, os.path.join(monthly_dir, filename))
        logger.info(f"📅 1st of Month: Copied to Monthly")

    # 3. CLEANUP (Retention Policy)
    cleanup_old_files(daily_dir, days=7)
    cleanup_old_files(weekly_dir, days=30)
    cleanup_old_files(monthly_dir, days=365)

def cleanup_old_files(directory, days):
    """Deletes files in a directory older than X days."""
    cutoff_time = datetime.now() - timedelta(days=days)
    
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        if os.path.isfile(file_path) and filename.endswith(".sql"):
            file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
            if file_time < cutoff_time:
                os.remove(file_path)
                logger.info(f"🗑️ Deleted old backup: {filename}")

# --- SCHEDULER START ---
def start_backup_scheduler():
    scheduler = BackgroundScheduler()
    # Schedule to run every day at 23:30 (11:30 PM)
    scheduler.add_job(create_backup, 'cron', hour=23, minute=30)
    scheduler.start()
    logger.info("🚀 Backup Scheduler Initialized (Runs daily at 23:30)")