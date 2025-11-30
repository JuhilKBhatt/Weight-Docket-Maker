# backend/app/main.py
from fastapi import FastAPI
from sqlalchemy import text
from .database import engine

app = FastAPI()

@app.on_event("startup")
def test_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
    except Exception as e:
        print("❌ Database connection failed:", e)
