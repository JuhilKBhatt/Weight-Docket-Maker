# app/schema/settingsSchema.py
from pydantic import BaseModel
from typing import Optional, List

class SettingUpdate(BaseModel):
    key: str
    value: str

class CurrencyCreate(BaseModel):
    code: str
    symbol: str
    label: str

class UnitCreate(BaseModel):
    value: str
    label: str

class CompanyCreate(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    abn: Optional[str] = ""
    address: Optional[str] = ""

class AccountCreate(BaseModel):
    bank_name: str
    account_name: str
    bsb: str
    account_number: str

# For bulk updates if needed
class SettingsPayload(BaseModel):
    settings: List[SettingUpdate]