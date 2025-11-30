# backend/app/models/Invoice.py
from sqlalchemy import Column, Integer, String, Boolean, Numeric, Date, ForeignKey
from database import Base

class Invoice(Base):
    __tablename__ = "invoice"

    SCRNumber = Column(Integer, primary_key=True)  # primary key
    InvoiceType = Column(String)
    Date = Column(Date)
    IncludeGST = Column(Boolean, default=True)
    GrossTotal = Column(Numeric(12,2))
    GSTAmount = Column(Numeric(12,2))
    FinalTotal = Column(Numeric(12,2))

    FromCompanyid = Column(Integer, ForeignKey("company.id"))
    ToCompanyid = Column(Integer, ForeignKey("company.id"))
    BankAccountid = Column(Integer, ForeignKey("bank_account.id"))

    IsPaid = Column(Boolean, default=False)