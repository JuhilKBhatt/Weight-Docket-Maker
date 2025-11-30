from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from database import Base

class InvoiceItem(Base):
    __tablename__ = "invoice_item"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id", ondelete="CASCADE"))

    description = Column(String)
    seal_number = Column(String)
    container_number = Column(String)
    metal_name = Column(String)
    weight = Column(Numeric(10,3))
    price_per_ton = Column(Numeric(10,2))
    total = Column(Numeric(12,2))
