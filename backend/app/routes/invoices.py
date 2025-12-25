# app/routes/invoices.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.invoice import Invoice
from app.utilities.scrinv_generator import generate_next_scrinv

router = APIRouter(
    prefix="/api/invoices",
    tags=["Invoices"]
)

@router.post("/new")
def create_invoice(db: Session = Depends(get_db)):
    scrinv = generate_next_scrinv(db)

    invoice = Invoice(scrinv_number=scrinv)
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return {
        "scrinv_id": f"{invoice.scrinv_number}"
    }