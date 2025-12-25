# app/models/invoice.py
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    scrinv_number = Column(Integer, unique=True, index=True)
    created_at = Column(DateTime, server_default=func.now())