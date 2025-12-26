# app/routes/invoices.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from pydantic import BaseModel
from typing import List, Optional
from app.models.invoice import Invoice, InvoiceItem, TransportItem, Deduction
from app.utilities.scrinv_generator import generate_next_scrinv

router = APIRouter(
    prefix="/api/invoices",
    tags=["Invoices"]
)

class ItemSchema(BaseModel):
    description: str
    quantity: float
    price: float


class TransportSchema(BaseModel):
    name: str
    num_of_ctr: float
    price_per_ctr: float


class DeductionSchema(BaseModel):
    type: str
    label: str
    amount: float


class InvoiceCreate(BaseModel):
    scrinv_number: str
    invoice_type: str
    include_gst: bool
    show_transport: bool
    notes: Optional[str]

    bill_from_name: str
    bill_from_abn: str
    bill_from_address: str

    bill_to_name: str
    bill_to_abn: str
    bill_to_address: str

    bank_name: str
    account_name: str
    bsb: str
    account_number: str

    items: List[ItemSchema]
    transport_items: List[TransportSchema]
    deductions: List[DeductionSchema]

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

@router.post("/save")
def save_invoice(data: InvoiceCreate, db: Session = Depends(get_db)):
    invoice = Invoice(
        scrinv_number=data.scrinv_number,
        invoice_type=data.invoice_type,
        include_gst=data.include_gst,
        show_transport=data.show_transport,
        notes=data.notes,

        bill_from_name=data.bill_from_name,
        bill_from_phone=data.bill_from_phone,
        bill_from_email=data.bill_from_email,
        bill_from_abn=data.bill_from_abn,
        bill_from_address=data.bill_from_address,

        bill_to_name=data.bill_to_name,
        bill_to_phone=data.bill_to_phone,
        bill_to_email=data.bill_to_email,
        bill_to_abn=data.bill_to_abn,
        bill_to_address=data.bill_to_address,

        bank_name=data.bank_name,
        account_name=data.account_name,
        bsb=data.bsb,
        account_number=data.account_number,
        )

    db.add(invoice)
    db.flush()   # gets invoice.id before commit

    # Items
    for i in data.items:
        db.add(InvoiceItem(
            invoice_id=invoice.id,
            description=i.description,
            quantity=i.quantity,
            price=i.price
        ))

    # Transport
    for t in data.transport_items:
        db.add(TransportItem(
            invoice_id=invoice.id,
            name=t.name,
            num_of_ctr=t.num_of_ctr,
            price_per_ctr=t.price_per_ctr
        ))

    # Deductions
    for d in data.deductions:
        db.add(Deduction(
            invoice_id=invoice.id,
            type=d.type,
            label=d.label,
            amount=d.amount
        ))

    db.commit()
    return {"message": "invoice created", "id": invoice.id}