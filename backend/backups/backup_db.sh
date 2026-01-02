#!/bin/bash

# ./backend/backups/backup_db.sh

# -------------------------------------------------------
# SETUP VARIABLES
# -------------------------------------------------------

# 1. Get directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 2. Define path to .env
ENV_FILE="$SCRIPT_DIR/../.env"

# 3. Load .env
if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
else
  echo "Error: .env file not found at $ENV_FILE"
  exit 1
fi

# 4. Define GFS Directories (Inside your Google Drive path)
DAILY_DIR="$BACKUP_DIR/daily"
WEEKLY_DIR="$BACKUP_DIR/weekly"
MONTHLY_DIR="$BACKUP_DIR/monthly"

# Create directories if they don't exist
mkdir -p "$DAILY_DIR"
mkdir -p "$WEEKLY_DIR"
mkdir -p "$MONTHLY_DIR"

# -------------------------------------------------------
# PERFORM THE DUMP (THE "SON")
# -------------------------------------------------------

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
FILENAME="invoice_backup_$TIMESTAMP.sql"
TARGET_FILE="$DAILY_DIR/$FILENAME"

echo "--------------------------------------"
echo "Starting Backup: $TIMESTAMP"

# Dump directly to the Daily folder
docker exec -t $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > "$TARGET_FILE"

if [ $? -eq 0 ]; then
  echo "Daily Backup successful: $FILENAME"
else
  echo "Backup failed!"
  exit 1
fi

# -------------------------------------------------------
# ROTATION LOGIC
# -------------------------------------------------------

# Check Day of Week (1..7); 7 = Sunday
DAY_OF_WEEK=$(date +%u)

# Check Day of Month (01..31)
DAY_OF_MONTH=$(date +%d)

# --- FATHER (Weekly) ---
# If today is Sunday (7), copy to Weekly folder
if [ "$DAY_OF_WEEK" -eq 7 ]; then
  echo "It is Sunday. Creating Weekly (Father) backup..."
  cp "$TARGET_FILE" "$WEEKLY_DIR/$FILENAME"
fi

# --- GRANDFATHER (Monthly) ---
# If today is the 1st of the month, copy to Monthly folder
if [ "$DAY_OF_MONTH" -eq "01" ]; then
  echo "It is the 1st. Creating Monthly (Grandfather) backup..."
  cp "$TARGET_FILE" "$MONTHLY_DIR/$FILENAME"
fi

# -------------------------------------------------------
# RETENTION / CLEANUP
# -------------------------------------------------------
echo "Cleaning up old backups..."

# 1. Daily: Keep 7 days
find "$DAILY_DIR" -type f -name "*.sql" -mtime +7 -delete

# 2. Weekly: Keep 30 days (approx 4 weeks)
find "$WEEKLY_DIR" -type f -name "*.sql" -mtime +30 -delete

# 3. Monthly: Keep 365 days (1 year)
# Change +365 to a higher number if you want to keep them forever
find "$MONTHLY_DIR" -type f -name "*.sql" -mtime +365 -delete

echo "Backup process complete."