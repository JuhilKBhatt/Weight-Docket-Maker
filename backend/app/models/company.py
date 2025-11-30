from sqlalchemy import Column, Integer, String
from database import Base

class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    phone = Column(String)
    email = Column(String)
    abn = Column(String)
    address = Column(String)
    isOurCompany = Column(Integer)  # 1 for True, 0 for False