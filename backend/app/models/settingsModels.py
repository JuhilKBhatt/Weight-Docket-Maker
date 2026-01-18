# app/models/settingsModels.py

from sqlalchemy import Column, Integer, String
from app.database import Base

class GlobalSetting(Base):
    __tablename__ = "global_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, index=True) # e.g. "default_currency", "default_bill_from_id"
    value = Column(String(255)) 

class CurrencyOption(Base):
    __tablename__ = "currency_options"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True) # AUD
    symbol = Column(String(5)) # $
    label = Column(String(20)) # AUD$

class UnitOption(Base):
    __tablename__ = "unit_options"
    id = Column(Integer, primary_key=True, index=True)
    value = Column(String(10), unique=True) # kg
    label = Column(String(20)) # kg