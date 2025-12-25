# app/create_tables.py
from app.database import engine, Base
from app.models.invoice import Invoice

Base.metadata.create_all(bind=engine)