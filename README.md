docker system prune -a --volumes -f

docker compose up --build -d

docker compose exec backend alembic stamp head

Update Google Drive path in .env file

**Printer - Mac/Linux**

Add Printer via settings

lpstat -p

lpoptions -d <Your_Printer_Name>

lpstat -p

chmod +x backend/run_printer.sh

backend/run_printer.sh

VISUAL=nano crontab -e

@reboot {Full System Path}/backend/run_printer.sh

Esc then :w

:wq

**Printer - Windows**

Add Default Printer Via Settings and Change Printing Settings

Task Scheduler

Create Task (not "Create Basic Task")

**To Update DB Models**

docker compose exec backend python manage_db.py

**To Import .csv Data**

docker compose exec backend python app/utilities/import_data.py "file"

**To Import console.log Data**

docker compose exec backend python app/utilities/import_console_log.py "file"

**To Import List Data**

docker compose exec backend python app/utilities/seed_lists.py

**To Add Email Support**

Go to Settings -> Email Config

---

# 1 - How to Setup

## 1.1 - Setup Environment

### 1.1.1 - Import .env at ./

```
# Docker Environment Variables for Weight Docket Maker
#./env

# Database Credentials
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DATABASE_URL=

# Host Paths (Your Google Drive)
GOOGLE_DRIVE_PATH=
```

### 1.1.2 - Import .env at ./backend

```
# ./backend/.env

DATABASE_URL=""

# ---------------- Backup Configuration ----------------
CONTAINER_NAME=""
DB_USER=""
DB_NAME=""
BACKUP_DIR=""
```

### 1.1.3 - Import console.log and Customer Details.csv

### 1.1.4 - Setup Google Drive

1. Install & Setup Google Drive Desktop Application
2. Create a folder for backup data

## 1.2 - Start Application

1) Install & Setup Docker Application
2) Make Sure Docker Application Open at login/restart
3) Open Terminal at /Weight-Docket-Maker
4) docker compose up --build -d
5) docker compose exec backend alembic stamp head
docker compose exec backend alembic upgrade head
6) Update the Models: docker compose exec backend python manage_db.py
7) docker compose exec backend python app/utilities/seed_lists.py

## 1.3 - Start Printer File

Add default printer via settings and setup print format defaults

### 1.3.1 - Linux/Mac

Run Commands from ./

1. lpstat -p

2. lpoptions -d <Your_Printer_Name>

3. lpstat -p

4. chmod +x backend/run_printer.sh

5. backend/run_printer.sh

6. VISUAL=nano crontab -e

7. @reboot {Full System Path}/backend/run_printer.sh

8. Esc then :w

9. :wq

### 1.3.2 - Windows - This is not Working
Turn off Allow Windows to manage my default printer
Select printer and set as default

1. Open Task Scheduler
2. Create Task (not "Create Basic Task")
3. Give Name & Description
4. Run user is logged on & Run with highest privileges
5. Go to Triggers & Click New
6. Change Begin the task to At Startup & At Log On
7. Go to Actions & Click New
8. Click on Browse & select the run_printer.bat
Edit Conditions & Settings
9. Click Ok/Done
10. Right click on task and click run

## 1.4 - Setup Runtime Vars
Go To: localhost:5173

1. Add Company In Bill Form Invoice
2. Add Bank Accounts
3. Add Email Server Config & Email Template
4. Setup Settings Defaults
