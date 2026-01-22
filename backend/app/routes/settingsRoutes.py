# app/routes/settingsRoutes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.services import settings_service
from app.schema.settingsSchema import SettingUpdate, CurrencyCreate, UnitCreate, CompanyCreate, AccountCreate

router = APIRouter(
    prefix="/api/settings",
    tags=["Settings"]
)

# --- GLOBAL SETTINGS ---
@router.get("/defaults")
def get_defaults(db: Session = Depends(get_db)):
    return settings_service.get_all_settings(db)

@router.post("/defaults")
def update_defaults(payload: List[SettingUpdate], db: Session = Depends(get_db)):
    for s in payload:
        settings_service.update_setting(db, s.key, s.value)
    return {"message": "Defaults updated"}

# --- CURRENCIES ---
@router.get("/currencies")
def get_currencies(db: Session = Depends(get_db)):
    return settings_service.get_currencies(db)

@router.post("/currencies")
def add_currency(data: CurrencyCreate, db: Session = Depends(get_db)):
    return settings_service.add_currency(db, data)

@router.put("/currencies/{id}")
def update_currency(id: int, data: CurrencyCreate, db: Session = Depends(get_db)):
    return settings_service.update_currency(db, id, data)

@router.delete("/currencies/{id}")
def delete_currency(id: int, db: Session = Depends(get_db)):
    settings_service.delete_currency(db, id)
    return {"message": "Deleted"}

# --- UNITS ---
@router.get("/units")
def get_units(db: Session = Depends(get_db)):
    return settings_service.get_units(db)

@router.post("/units")
def add_unit(data: UnitCreate, db: Session = Depends(get_db)):
    return settings_service.add_unit(db, data)

@router.put("/units/{id}")
def update_unit(id: int, data: UnitCreate, db: Session = Depends(get_db)):
    return settings_service.update_unit(db, id, data)

@router.delete("/units/{id}")
def delete_unit(id: int, db: Session = Depends(get_db)):
    settings_service.delete_unit(db, id)
    return {"message": "Deleted"}

# --- COMPANIES (Manual Manage) ---
@router.post("/companies-from")
def add_comp_from(data: CompanyCreate, db: Session = Depends(get_db)):
    return settings_service.add_company_from(db, data)

@router.put("/companies-from/{id}")
def update_comp_from(id: int, data: CompanyCreate, db: Session = Depends(get_db)):
    return settings_service.update_company_from(db, id, data)

@router.post("/companies-to")
def add_comp_to(data: CompanyCreate, db: Session = Depends(get_db)):
    return settings_service.add_company_to(db, data)

@router.put("/companies-to/{id}")
def update_comp_to(id: int, data: CompanyCreate, db: Session = Depends(get_db)):
    return settings_service.update_company_to(db, id, data)

# --- ACCOUNTS ---
@router.post("/accounts")
def add_acc(data: AccountCreate, db: Session = Depends(get_db)):
    return settings_service.add_account(db, data)

@router.put("/accounts/{id}")
def update_acc(id: int, data: AccountCreate, db: Session = Depends(get_db)):
    return settings_service.update_account(db, id, data)