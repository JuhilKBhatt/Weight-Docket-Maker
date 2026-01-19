docker system prune -a --volumes -f

docker compose up --build -d

docker compose exec backend alembic stamp head

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

Add Company In Bill Form Invoice
