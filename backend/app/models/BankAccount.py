from sqlalchemy import Column, Integer, String
from database import Base

class BankAccount(Base):
    __tablename__ = "bank_account"

    id = Column(Integer, primary_key=True)
    account_name = Column(String)
    bank_name = Column(String)
    bsb = Column(String)
    account_number = Column(String)