# app/services/invoice/selector_service.py

from sqlalchemy.orm import Session
from app.models.invoiceModels import Invoice, SavedBillFrom, SavedBillTo, SavedAccount
from fastapi import HTTPException

def get_and_sync_selectors(db: Session):
    # Check if we need to seed from history (Migration Logic)
    if db.query(SavedBillFrom).count() == 0 and db.query(Invoice).count() > 0:
        seed_selectors_from_invoices(db)

    return {
        "companies_from": db.query(SavedBillFrom).all(),
        "companies_to": db.query(SavedBillTo).all(),
        "accounts": db.query(SavedAccount).all(),
    }

def seed_selectors_from_invoices(db: Session):
    """
    Scans all invoices and populates the Saved tables with unique values.
    Only runs if Saved tables are empty.
    """
    invoices = db.query(Invoice).all()

    # Helpers
    def clean(obj: dict):
        # Only keep if it has at least a name
        if not obj.get('name') and not obj.get('bank_name'): return None
        return tuple(sorted((k, v) for k, v in obj.items() if v not in (None, "", " ")))

    seen_from = set()
    seen_to = set()
    seen_acc = set()

    for inv in invoices:
        # Bill From
        f_data = {
            "name": inv.bill_from_name, "phone": inv.bill_from_phone,
            "email": inv.bill_from_email, "abn": inv.bill_from_abn,
            "address": inv.bill_from_address
        }
        f_key = clean(f_data)
        if f_key and f_key not in seen_from:
            seen_from.add(f_key)
            db.add(SavedBillFrom(**f_data))

        # Bill To
        t_data = {
            "name": inv.bill_to_name, "phone": inv.bill_to_phone,
            "email": inv.bill_to_email, "abn": inv.bill_to_abn,
            "address": inv.bill_to_address
        }
        t_key = clean(t_data)
        if t_key and t_key not in seen_to:
            seen_to.add(t_key)
            db.add(SavedBillTo(**t_data))

        # Account
        a_data = {
            "bank_name": inv.bank_name, "account_name": inv.account_name,
            "bsb": inv.bsb, "account_number": inv.account_number
        }
        a_key = clean(a_data)
        if a_key and a_key not in seen_acc:
            seen_acc.add(a_key)
            db.add(SavedAccount(**a_data))
    
    db.commit()

def delete_selector(db: Session, type: str, id: int):
    model_map = {
        "from": SavedBillFrom,
        "to": SavedBillTo,
        "account": SavedAccount
    }
    
    model = model_map.get(type)
    if not model:
        raise HTTPException(status_code=400, detail="Invalid selector type")

    item = db.query(model).filter(model.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return {"message": "Deleted successfully"}

def update_selectors_from_invoice(db: Session, data):
    """
    Checks the incoming invoice data. If the company/account details 
    don't exist in the Saved tables, add them.
    """
    
    # 1. Bill From
    if data.bill_from_name:
        exists = db.query(SavedBillFrom).filter_by(
            name=data.bill_from_name,
            abn=data.bill_from_abn,
            address=data.bill_from_address,
            phone=data.bill_from_phone,
            email=data.bill_from_email
        ).first()
        
        if not exists:
            db.add(SavedBillFrom(
                name=data.bill_from_name,
                phone=data.bill_from_phone,
                email=data.bill_from_email,
                abn=data.bill_from_abn,
                address=data.bill_from_address
            ))

    # 2. Bill To
    if data.bill_to_name:
        exists = db.query(SavedBillTo).filter_by(
            name=data.bill_to_name,
            abn=data.bill_to_abn,
            address=data.bill_to_address,
            phone=data.bill_to_phone,
            email=data.bill_to_email
        ).first()

        if not exists:
            db.add(SavedBillTo(
                name=data.bill_to_name,
                phone=data.bill_to_phone,
                email=data.bill_to_email,
                abn=data.bill_to_abn,
                address=data.bill_to_address
            ))

    # 3. Account
    if data.account_name and data.bank_name:
        exists = db.query(SavedAccount).filter_by(
            bank_name=data.bank_name,
            account_name=data.account_name,
            bsb=data.bsb,
            account_number=data.account_number
        ).first()

        if not exists:
            db.add(SavedAccount(
                bank_name=data.bank_name,
                account_name=data.account_name,
                bsb=data.bsb,
                account_number=data.account_number
            ))