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

def create_backup():
    logger.info("⏳ Starting scheduled backup...")
    
    # datetime.now() will use the Container's Timezone (set in docker-compose)
    today = datetime.now()
    timestamp = today.strftime("%Y-%m-%d_%H%M%S")
    filename = f"invoice_backup_{timestamp}.sql"
    
    daily_dir = os.path.join(BACKUP_ROOT, "daily")
    weekly_dir = os.path.join(BACKUP_ROOT, "weekly")
    monthly_dir = os.path.join(BACKUP_ROOT, "monthly")

    for folder in [daily_dir, weekly_dir, monthly_dir]:
        os.makedirs(folder, exist_ok=True)

    target_file = os.path.join(daily_dir, filename)

    # 1. RUN PG_DUMP
    try:
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

    # 2. ROTATION LOGIC
    # Sunday = 6
    if today.weekday() == 6:
        shutil.copy2(target_file, os.path.join(weekly_dir, filename))
        logger.info(f"📅 Sunday: Copied to Weekly")

    # 1st of Month
    if today.day == 1:
        shutil.copy2(target_file, os.path.join(monthly_dir, filename))
        logger.info(f"📅 1st of Month: Copied to Monthly")

    # 3. CLEANUP
    cleanup_old_files(daily_dir, days=7)
    cleanup_old_files(weekly_dir, days=30)
    cleanup_old_files(monthly_dir, days=365)

def cleanup_old_files(directory, days):
    cutoff_time = datetime.now() - timedelta(days=days)
    if not os.path.exists(directory): return

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
    
    # CHANGED: Set to 11:00 AM
    # Because we set TZ in docker-compose, this is 11:00 AM Local Time
    scheduler.add_job(create_backup, 'cron', hour=11, minute=0)
    
    scheduler.start()
    logger.info("🚀 Backup Scheduler Initialized (Runs daily at 11:00 AM Local Time)")