# backend/app/database.py
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from dotenv import load_dotenv
from app.utilities.backup_manager import create_on_update_backup
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@event.listens_for(Session, "after_commit")
def receive_after_commit(session):
    """Triggers whenever any session commits data to the DB"""
    try:
        create_on_update_backup()
    except Exception as e:
        print(f"Backup trigger failed: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()