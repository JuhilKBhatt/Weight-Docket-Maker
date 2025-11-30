# backend/app/models/InvoiceItem.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from database import Base

class InvoiceItem(Base):
    __tablename__ = "invoice_item"

    id = Column(Integer, primary_key=True)
    Invoiceid = Column(Integer, ForeignKey("invoice.SCRNumber", ondelete="CASCADE"))

    Description = Column(String)
    SealNumber = Column(String)
    ContainerNumber = Column(String)
    MetalName = Column(String)
    Weight = Column(Numeric(10,3))
    PricePerTon = Column(Numeric(10,2))
    Total = Column(Numeric(12,2))