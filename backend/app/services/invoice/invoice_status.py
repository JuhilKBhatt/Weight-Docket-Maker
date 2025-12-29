# backend/app/services/invoice/invoice_status.py

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.invoiceModels import Invoice

def update_status(db: Session, invoice_id: int, status_type: str):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Capitalize input (e.g. "paid" -> "Paid")
    new_status = status_type.capitalize()
    
    invoice.status = new_status
    db.commit()
    return {"message": f"status updated to {new_status}"}