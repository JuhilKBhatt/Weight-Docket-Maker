# backend/app/models/TransportCharge.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from ..database import Base

class TransportCharge(Base):
    __tablename__ = "transport_charge"

    id = Column(Integer, primary_key=True)
    Invoiceid = Column(Integer, ForeignKey("invoice.SCRNumber", ondelete="CASCADE"))

    ItemName = Column(String)
    NumOffCTR = Column(Integer)
    PricePerCTR = Column(Numeric(10,2))