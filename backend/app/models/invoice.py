from sqlalchemy import Column, Integer, String, Boolean, Numeric, Date, ForeignKey
from database import Base

class Invoice(Base):
    __tablename__ = "invoice"

    id = Column(Integer, primary_key=True)
    scr_number = Column(Integer)
    invoice_type = Column(String)
    date = Column(Date)
    include_gst = Column(Boolean, default=True)
    gross_total = Column(Numeric(12,2))
    gst_amount = Column(Numeric(12,2))
    final_total = Column(Numeric(12,2))

    from_company_id = Column(Integer, ForeignKey("company.id"))
    to_company_id = Column(Integer, ForeignKey("company.id"))
    bank_account_id = Column(Integer, ForeignKey("bank_account.id"))
