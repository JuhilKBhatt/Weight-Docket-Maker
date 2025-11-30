from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey
from database import Base

class InvoiceDeduction(Base):
    __tablename__ = "invoice_deduction"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id", ondelete="CASCADE"))
    label = Column(String)
    amount = Column(Numeric(10,2))
    post_gst = Column(Boolean, default=False)
