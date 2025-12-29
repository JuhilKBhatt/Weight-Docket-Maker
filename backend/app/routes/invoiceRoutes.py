# app/routes/invoiceRoutes.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schema.invoiceSchema import InvoiceCreate

# Import the new separated services
from app.services.invoice import invoice_crud, invoice_list, invoice_status, invoice_data

router = APIRouter(
    prefix="/api/invoices",
    tags=["Invoices"]
)

# --- CREATE / SAVE ---
@router.post("/new")
def create_invoice(db: Session = Depends(get_db)):
    return invoice_crud.generate_new_id(db)

@router.post("/saveDraft")
def save_invoice(data: InvoiceCreate, db: Session = Depends(get_db)):
    return invoice_crud.upsert_invoice(db, data)

# --- READ / LIST ---
@router.get("/list")
def get_invoices(db: Session = Depends(get_db)):
    return invoice_list.get_all_invoices_calculated(db)

@router.get("/selectorsData")
def get_selectors_data(db: Session = Depends(get_db)):
    return invoice_data.get_unique_selectors(db)

@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    return invoice_crud.get_invoice_by_id(db, invoice_id)

# --- DELETE ---
@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    return invoice_crud.delete_invoice(db, invoice_id)

# --- UPDATE STATUS ---
@router.post("/{invoice_id}/status/{status_type}")
def update_invoice_status(invoice_id: int, status_type: str, db: Session = Depends(get_db)):
    return invoice_status.update_status(db, invoice_id, status_type)