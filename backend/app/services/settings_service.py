# app/services/settings_service.py
from sqlalchemy.orm import Session
from app.models.settingsModels import GlobalSetting, CurrencyOption, UnitOption
from app.models.invoiceModels import SavedBillFrom, SavedBillTo, SavedAccount
from app.schema.settingsSchema import CurrencyCreate, UnitCreate, CompanyCreate, AccountCreate

# --- DEFAULTS ---
def get_all_settings(db: Session):
    settings = db.query(GlobalSetting).all()
    return {s.key: s.value for s in settings}

def update_setting(db: Session, key: str, value: str):
    setting = db.query(GlobalSetting).filter(GlobalSetting.key == key).first()
    if setting:
        setting.value = str(value)
    else:
        setting = GlobalSetting(key=key, value=str(value))
        db.add(setting)
    db.commit()
    return {"message": "Setting updated"}

# --- CURRENCY ---
def get_currencies(db: Session):
    return db.query(CurrencyOption).all()

def add_currency(db: Session, data: CurrencyCreate):
    curr = CurrencyOption(code=data.code, symbol=data.symbol, label=data.label)
    db.add(curr)
    db.commit()
    return curr

def delete_currency(db: Session, id: int):
    db.query(CurrencyOption).filter(CurrencyOption.id == id).delete()
    db.commit()

# --- UNITS ---
def get_units(db: Session):
    return db.query(UnitOption).all()

def add_unit(db: Session, data: UnitCreate):
    unit = UnitOption(value=data.value, label=data.label)
    db.add(unit)
    db.commit()
    return unit

def delete_unit(db: Session, id: int):
    db.query(UnitOption).filter(UnitOption.id == id).delete()
    db.commit()

# --- ENTITIES (Companies/Accounts) ---
# Leveraging existing models but adding explicit Create/Update logic

def add_company_from(db: Session, data: CompanyCreate):
    comp = SavedBillFrom(**data.dict())
    db.add(comp)
    db.commit()
    return comp

def update_company_from(db: Session, id: int, data: CompanyCreate):
    comp = db.query(SavedBillFrom).filter(SavedBillFrom.id == id).first()
    if comp:
        for k, v in data.dict().items():
            setattr(comp, k, v)
        db.commit()
    return comp

def add_company_to(db: Session, data: CompanyCreate):
    comp = SavedBillTo(**data.dict())
    db.add(comp)
    db.commit()
    return comp

def update_company_to(db: Session, id: int, data: CompanyCreate):
    comp = db.query(SavedBillTo).filter(SavedBillTo.id == id).first()
    if comp:
        for k, v in data.dict().items():
            setattr(comp, k, v)
        db.commit()
    return comp

def add_account(db: Session, data: AccountCreate):
    acc = SavedAccount(**data.dict())
    db.add(acc)
    db.commit()
    return acc

def update_account(db: Session, id: int, data: AccountCreate):
    acc = db.query(SavedAccount).filter(SavedAccount.id == id).first()
    if acc:
        for k, v in data.dict().items():
            setattr(acc, k, v)
        db.commit()
    return acc

def get_all_settings_dict(db: Session):
    """Helper to get settings as a simple dict for internal use"""
    settings = db.query(GlobalSetting).all()
    return {s.key: s.value for s in settings}