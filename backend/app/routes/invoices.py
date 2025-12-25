# app/routes/invoices.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.invoice import Invoice

router = APIRouter(
    prefix="/api/invoices",
    tags=["Invoices"]
)

@router.post("/new")
def create_invoice(db: Session = Depends(get_db)):
    invoice = Invoice()
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return {
        "scrinv_id": f"{invoice.id:05d}"
    }