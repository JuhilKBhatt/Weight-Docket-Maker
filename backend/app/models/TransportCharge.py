from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from database import Base

class TransportCharge(Base):
    __tablename__ = "transport_charge"

    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoice.id", ondelete="CASCADE"))
    item_name = Column(String)
    num_of_ctr = Column(Integer)
    price_per_ctr = Column(Numeric(10,2))
