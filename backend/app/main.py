# backend/app/main.py
from fastapi import FastAPI
from sqlalchemy import text
from .database import engine
from .routes import invoiceRoutes
from .routes import docketRoutes
from .routes import settingsRoutes
from fastapi.middleware.cors import CORSMiddleware
from .utilities.backup_manager import start_backup_scheduler

app = FastAPI()

origins = [
    "http://localhost:5173", # Dev
    "http://localhost:80",   # Prod
    "http://localhost",      # (Standard)
    "http://127.0.0.1"
]

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(invoiceRoutes.router)
app.include_router(docketRoutes.router)
app.include_router(settingsRoutes.router)

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