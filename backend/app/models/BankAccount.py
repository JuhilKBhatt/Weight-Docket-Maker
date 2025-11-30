# backend/app/models/BankAccount.py
from sqlalchemy import Column, Integer, String
from database import Base

class BankAccount(Base):
    __tablename__ = "bank_account"

    id = Column(Integer, primary_key=True)
    AccountName = Column(String)
    BankName = Column(String)
    BSB = Column(String)
    AccountNumber = Column(String)