docker compose up --build -d

docker compose exec backend python -m app.utilities.create_tables

docker system prune -a --volumes -f

chmod +x run_printer.sh

./run_printer.sh

lpstat -p

lpoptions -d <Your_Printer_Name>

lpstat -p

Add Printer via settings
