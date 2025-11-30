# backend/app/models/company.py
from sqlalchemy import Column, Integer, String
from database import Base

class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True)
    Name = Column(String)
    Phone = Column(String)
    Email = Column(String)
    ABN = Column(String)
    Address = Column(String)
    IsOurCompany = Column(Integer)  # 1 for True, 0 for False