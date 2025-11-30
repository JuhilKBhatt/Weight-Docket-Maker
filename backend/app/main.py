# backend/app/main.py
from fastapi import FastAPI
from sqlalchemy import text
from .database import engine
from .routers import InvoiceRouter
from fastapi.middleware.cors import CORSMiddleware

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

# Test that the /invoice/create route exists
@app.on_event("startup")
def test_invoice_route_exists():
    if "/invoice/create" in [route.path for route in app.routes]:
        print("✅ /invoice/create route is registered!")
    else:
        print("❌ /invoice/create route is NOT registered!")
