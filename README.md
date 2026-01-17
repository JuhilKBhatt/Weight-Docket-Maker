docker system prune -a --volumes -f

docker compose up --build -d

docker compose exec backend alembic stamp head

**Printer**

chmod +x run_printer.sh

./run_printer.sh

lpstat -p

lpoptions -d <Your_Printer_Name>

lpstat -p

Add Printer via settings

Add Company In Bill Form Invoice

**To Update DB Models**

docker compose exec backend python manage_db.py

**To Import .csv Data**

docker compose exec backend python app/utilities/import_data.py "file"

**To Import console.log Data**

docker compose exec backend python app/utilities/import_console_log.py "file"
