# app/models/docketModels.py

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, ForeignKey
)
from sqlalchemy.orm import relationship
from app.database import Base

class Docket(Base):
    __tablename__ = "dockets"

    id = Column(Integer, primary_key=True, index=True)

    # SCR Docket ID (e.g. SCRDKT1A0001)
    scrdkt_number = Column(String(15), unique=True)
    docket_date = Column(Date, nullable=True)
    status = Column(String(20), default="Draft") # Draft, Final, Printed, etc.
    
    # Meta
    docket_type = Column(String(50), default="Customer") # "Customer" or "Weight"
    company_name = Column(String(255), nullable=True)    # From "Company" selector
    
    # Financials
    include_gst = Column(Boolean, default=False)
    gst_percentage = Column(Float, default=10.0)

    # CUSTOMER DETAILS
    customer_name = Column(String(255))
    customer_address = Column(String(255))
    customer_phone = Column(String(50))
    customer_abn = Column(String(50))
    
    customer_license_no = Column(String(50))
    customer_rego_no = Column(String(50))
    customer_dob = Column(Date, nullable=True)
    customer_pay_id = Column(String(100))

    # BANK DETAILS (For payment to customer)
    bank_bsb = Column(String(20))
    bank_account_number = Column(String(50))

    # Notes
    notes = Column(String)  # Maps to 'paperNotes'

    # RELATIONSHIPS
    items = relationship("DocketItem", cascade="all, delete-orphan", back_populates="docket")
    deductions = relationship("DocketDeduction", cascade="all, delete-orphan", back_populates="docket")


class DocketItem(Base):
    __tablename__ = "docket_items"

    id = Column(Integer, primary_key=True)
    docket_id = Column(Integer, ForeignKey("dockets.id"))

    metal = Column(String(100), nullable=True)
    row_notes = Column(String(255), nullable=True)
    
    # Weights (kg)
    gross = Column(Float, default=0.0)
    tare = Column(Float, default=0.0)
    # Net is derived (gross - tare), usually not stored, but can be if required. 
    # For DB normalization we usually store inputs only.

    # Financials
    price = Column(Float, default=0.0) # Price per unit (usually per kg)

    docket = relationship("Docket", back_populates="items")


class DocketDeduction(Base):
    __tablename__ = "docket_deductions"

    id = Column(Integer, primary_key=True)
    docket_id = Column(Integer, ForeignKey("dockets.id"))

    type = Column(String(10))   # "pre" or "post"
    label = Column(String(255))
    amount = Column(Float, default=0.0)

    docket = relationship("Docket", back_populates="deductions")