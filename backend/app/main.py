# backend/app/main.py
from fastapi import FastAPI
from sqlalchemy import text
from .database import engine
from .routes import invoiceRoutes
from fastapi.middleware.cors import CORSMiddleware
from .utilities.backup_manager import start_backup_scheduler

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(invoiceRoutes.router)

# Test DB connection on startup
@app.on_event("startup")
def test_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
    except Exception as e:
        print("❌ Database connection failed:", e)

# Scheduler for backups
@app.on_event("startup")
def start_scheduler():
    start_backup_scheduler()