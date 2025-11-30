# backend/app/models/InvoiceDeduction.py
from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey
from database import Base

class InvoiceDeduction(Base):
    __tablename__ = "invoice_deduction"

    id = Column(Integer, primary_key=True)
    Invoiceid = Column(Integer, ForeignKey("invoice.id", ondelete="CASCADE"))
    Label = Column(String)
    Amount = Column(Numeric(10,2))
    PostGST = Column(Boolean, default=False)
