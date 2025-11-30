# backend/app/main.py
from fastapi import FastAPI
from sqlalchemy import text
from .database import engine
from .routers import InvoiceRouter
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()  # <-- define app first

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(InvoiceRouter.router)

# Test DB connection on startup
@app.on_event("startup")
def test_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
    except Exception as e:
        print("❌ Database connection failed:", e)
