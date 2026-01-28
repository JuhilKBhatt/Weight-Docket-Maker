
# Weight Docket Maker

A application for managing weight dockets and invoices, featuring automated printing and email integration.

---

# 1 - Environment Setup

Before running the application, you must configure your environment variables.

### 1.1 - Root Environment Variables

Create a file named `.env` in the root directory `./`:

```ini
# ./env

# Database Credentials
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=weight_docket_db
DATABASE_URL=postgresql://your_user:your_password@db:5432/weight_docket_db

# Host Paths (For Google Drive Sync)
GOOGLE_DRIVE_PATH=/path/to/your/google/drive
```

### 1.2 - Backend Environment Variables

```
# ./backend/.env

# Should match the URL in the root .env
DATABASE_URL=postgresql://your_user:your_password@db:5432/weight_docket_db

# ---------------- Backup Configuration ----------------
CONTAINER_NAME=weight-docket-backend
DB_USER=your_user
DB_NAME=weight_docket_db
BACKUP_DIR=/backups
```

---

# 2 - Start Application

### 2.1 - Development

Run the application eith hot reloading enabled

```
docker compose up --build -d
```

### 2.2 - Production

Run the optimised production build

```
# First, ensure the standard containers are down if switching modes
docker compose down

# Run using the production compose file
docker-compose -f docker-compose.prod.yml up --build -d
```

**Note for Windows Users:** Standard startup apps often wait for other background processes. To ensure Docker starts early and with authority:

1. Open **Task Scheduler** .
2. Click **Create Task** .
3. **General:** Name it "Docker High Priority" and check **Run with highest privileges** .
4. **Triggers:** Set to **At log on** .
5. **Actions:** - Program: `cmd.exe`
   * Arguments: `/c start "" /high "C:\Program Files\Docker\Docker\Docker Desktop.exe"`
6. **Settings:** Uncheck "Stop the task if it runs longer than 3 days".

### 2.3 - Database Initialisation (Only For First Run)

After starting the containers for the first time, you must initialise the database schema.

```
# 1. Sync Alembic migrations
docker compose exec backend alembic stamp head

# 2. Update/Create Database Models
docker compose exec backend python manage_db.py

# 3. Seed Default Lists (Currencies/Units)
docker compose exec backend python app/utilities/seed_lists.py

# 4. Apply final migrations
docker compose exec backend alembic upgrade head
```

---

# 3 - Printer Configuration

Set up the automated printing service based on your operating system.

### 3.1 - Linux / Mac

1. **Add Printer:** Add your printer via System Settings.
2. **Get Printer Name:**

   ```
   lpstat -p
   ```
3. **Set Default Printer:**

   ```
   lpoptions -d <Your_Printer_Name>
   ```
4. **Configure Startup Script:**

   ```
   # Make the script executable
   chmod +x backend/run_printer.sh

   # Run once to test
   ./backend/run_printer.sh
   ```
5. **Automate with Cron:**

   ```
   VISUAL=nano crontab -e
   ```

   Add the following line to the bottom of the file:

   ```
   @reboot /full/system/path/to/Weight-Docket-Maker/backend/run_printer.sh
   ```

   *Save and exit (Ctrl+O, Enter, Ctrl+X).*

### 3.2 - Windows

1. **Printer Settings:** - Turn off "Allow Windows to manage my default printer".
   * Set your desired printer as **Default** .
   * Edit `backend/run_printer.bat` and ensure it references the correct printer name if required by the script logic.
2. **Task Scheduler:**
   * Create a **New Task** .
   * **General:** "Run only when user is logged on" & "Run with highest privileges".
   * **Triggers:** New -> Begin the task: ****At Startup** &** **At Log on** .
   * **Actions:** New -> Start a program -> Browse and select `backend/run_printer.bat`.
   * Click OK to save.
   * Right-click the new task and select **Run** to start it immediately.

---

# 4 - Data Management

Commands to import data or manage the database manually.

**Import CSV Data:**

```
docker compose exec backend python app/utilities/import_data.py "path/to/file.csv"
```

**Import Console Logs:**

```
docker compose exec backend python app/utilities/import_console_log.py "path/to/logfile.log"
```

**Seed Default Lists:**

```
docker compose exec backend python app/utilities/seed_lists.py
```

**Update DB Models (Manual Trigger):**

```
docker compose exec backend python manage_db.py
```

---

# 5 - Runtime Configuration

Once the application is running, navigate to **`http://localhost:5173` (or** `http://localhost` in Prod) and configure the following in the UI:

1. **Settings -> Bill From:** Add your company details.
2. **Settings -> Bank Accounts:** Add your banking details.
3. **Settings -> Email Config:** Setup SMTP server details and email templates.
4. **Settings -> Defaults:** Configure default units, currency, and tax settings.

---

# 6 - Maintenance & Troubleshooting

**Clean Docker System (Destructive):** If you need to completely reset Docker (removes all stopped containers, networks, and images):

```
docker system prune -a --volumes -f
```

**Reset Database Migrations:** If Alembic gets out of sync:

```
docker compose exec backend alembic stamp head
```
