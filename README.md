docker compose up --build -d


docker compose exec backend python -m app.utilities.create_tables


docker system prune -a --volumes -f
