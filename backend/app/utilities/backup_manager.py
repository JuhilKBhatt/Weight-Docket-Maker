# backend/app/utilities/backup_manager.py

import os
import shutil
import subprocess
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
DB_HOST = "db"
DB_USER = os.getenv("POSTGRES_USER", "user")
DB_NAME = os.getenv("POSTGRES_DB", "weight_docket_db")
os.environ["PGPASSWORD"] = os.getenv("POSTGRES_PASSWORD", "password")

# MATCHES DOCKER VOLUME
BACKUP_ROOT = "/backups"

def run_pg_dump(target_path):
    """Core function to execute pg_dump for consistent logic across backup types."""
    try:
        command = [
            "pg_dump",
            "-h", DB_HOST,
            "-U", DB_USER,
            "-d", DB_NAME,
            "-f", target_path
        ]
        # Overwrites the file if it already exists at target_path
        subprocess.run(command, check=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Backup Failed: {e}")
        return False

def create_scheduled_backup():
    """Daily/Weekly/Monthly scheduled backup logic."""
    logger.info("⏳ Starting scheduled backup...")
    
    today = datetime.now()
    timestamp = today.strftime("%Y-%m-%d_%H%M%S")
    filename = f"scheduled_backup_{timestamp}.sql"
    
    daily_dir = os.path.join(BACKUP_ROOT, "daily")
    weekly_dir = os.path.join(BACKUP_ROOT, "weekly")
    monthly_dir = os.path.join(BACKUP_ROOT, "monthly")

    for folder in [daily_dir, weekly_dir, monthly_dir]:
        os.makedirs(folder, exist_ok=True)

    target_file = os.path.join(daily_dir, filename)

    if run_pg_dump(target_file):
        logger.info(f"✅ Daily backup created: {filename}")

        # Sunday = 6
        if today.weekday() == 6:
            shutil.copy2(target_file, os.path.join(weekly_dir, filename))
            logger.info(f"📅 Sunday: Copied to Weekly")

        # 1st of Month
        if today.day == 1:
            shutil.copy2(target_file, os.path.join(monthly_dir, filename))
            logger.info(f"📅 1st of Month: Copied to Monthly")

    # CLEANUP
    cleanup_old_files(daily_dir, days=7)
    cleanup_old_files(weekly_dir, days=30)
    cleanup_old_files(monthly_dir, days=365)

def create_on_update_backup():
    """Triggered whenever the database is successfully updated. Replaces the previous version."""
    update_dir = os.path.join(BACKUP_ROOT, "on_update")
    os.makedirs(update_dir, exist_ok=True)
    
    # Static filename so new backups replace the old one
    filename = "last_updated_backup.sql"
    target_path = os.path.join(update_dir, filename)
    
    if run_pg_dump(target_path):
        logger.info(f"💾 On-Update backup saved: {filename}")

def cleanup_old_files(directory, days):
    """Deletes SQL files in a directory older than a certain number of days."""
    cutoff_time = datetime.now() - timedelta(days=days)
    if not os.path.exists(directory): 
        return

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
    
    # Runs daily at 11:00 AM Local Time
    scheduler.add_job(create_scheduled_backup, 'cron', hour=11, minute=0)
    
    scheduler.start()
    logger.info("🚀 Backup Scheduler Initialized (Runs daily at 11:00 AM Local Time)")