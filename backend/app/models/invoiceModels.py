# app/models/invoiceModels.py

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, ForeignKey
)
from sqlalchemy.orm import relationship
from app.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    # SCR Invoice ID (A0001 → B0001, etc.)
    scrinv_number = Column(String(10), unique=True)
    is_paid = Column(Boolean, default=False)

    # Invoice meta
    invoice_type = Column(String(50), default="Container")
    include_gst = Column(Boolean, default=True)
    show_transport = Column(Boolean, default=False)
    invoice_date = Column(Date, nullable=True)

    # BILL FROM / BILL TO
    bill_from_name = Column(String(255))
    bill_from_phone = Column(String(50))
    bill_from_email = Column(String(100))
    bill_from_abn = Column(String(50))
    bill_from_address = Column(String(255))

    bill_to_name = Column(String(255))
    bill_to_phone = Column(String(50))
    bill_to_email = Column(String(100))
    bill_to_abn = Column(String(50))
    bill_to_address = Column(String(255))

    # PAY TO (bank)
    bank_name = Column(String(255))
    account_name = Column(String(255))
    bsb = Column(String(50))
    account_number = Column(String(50))

    # Notes
    notes = Column(String)

    # RELATIONSHIPS
    items = relationship("InvoiceItem", cascade="all, delete-orphan", back_populates="invoice")
    transport_items = relationship("TransportItem", cascade="all, delete-orphan", back_populates="invoice")
    deductions = relationship("Deduction", cascade="all, delete-orphan", back_populates="invoice")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))

    seal = Column(String(100), nullable=True)
    container_number = Column(String(100), nullable=True)
    metal = Column(String(100), nullable=True)

    description = Column(String(255))
    quantity = Column(Float, default=0)
    price = Column(Float, default=0)

    invoice = relationship("Invoice", back_populates="items")

class TransportItem(Base):
    __tablename__ = "transport_items"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))

    name = Column(String(255))
    num_of_ctr = Column(Float, default=0)
    price_per_ctr = Column(Float, default=0)

    invoice = relationship("Invoice", back_populates="transport_items")

class Deduction(Base):
    __tablename__ = "deductions"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))

    type = Column(String(10))   # "pre" or "post"
    label = Column(String(255))
    amount = Column(Float, default=0)

    invoice = relationship("Invoice", back_populates="deductions")