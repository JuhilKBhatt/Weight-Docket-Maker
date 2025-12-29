# backend/app/services/invoice/invoice_crud.py

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.invoiceModels import Invoice, InvoiceItem, TransportItem, Deduction
from app.schema.invoiceSchema import InvoiceCreate
from app.utilities.scrinv_generator import generate_next_scrinv

def generate_new_id(db: Session):
    scrinv = generate_next_scrinv(db)
    return {"scrinv_id": f"{scrinv}"}

def get_invoice_by_id(db: Session, invoice_id: int):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Manually constructing the dict to ensure all relationships are loaded
    return {
        "id": invoice.id,
        "scrinv_number": invoice.scrinv_number,
        "invoice_type": invoice.invoice_type,
        "include_gst": invoice.include_gst,
        "show_transport": invoice.show_transport,
        "notes": invoice.notes,
        "status": invoice.status,
        "invoice_date": invoice.invoice_date,
        "bill_from_name": invoice.bill_from_name,
        "bill_from_phone": invoice.bill_from_phone,
        "bill_from_email": invoice.bill_from_email,
        "bill_from_abn": invoice.bill_from_abn,
        "bill_from_address": invoice.bill_from_address,
        "bill_to_name": invoice.bill_to_name,
        "bill_to_phone": invoice.bill_to_phone,
        "bill_to_email": invoice.bill_to_email,
        "bill_to_abn": invoice.bill_to_abn,
        "bill_to_address": invoice.bill_to_address,
        "bank_name": invoice.bank_name,
        "account_name": invoice.account_name,
        "bsb": invoice.bsb,
        "account_number": invoice.account_number,
        "line_items": [{"id": i.id, "seal": i.seal, "container_number": i.container_number, "metal": i.metal, "description": i.description, "quantity": i.quantity, "price": i.price} for i in invoice.items],
        "transport_items": [{"id": t.id, "name": t.name, "num_of_ctr": t.num_of_ctr, "price_per_ctr": t.price_per_ctr} for t in invoice.transport_items],
        "pre_gst_deductions": [{"id": d.id, "type": d.type, "label": d.label, "amount": d.amount} for d in invoice.deductions if d.type == "pre"],
        "post_gst_deductions": [{"id": d.id, "type": d.type, "label": d.label, "amount": d.amount} for d in invoice.deductions if d.type == "post"],
    }

def delete_invoice(db: Session, invoice_id: int):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(invoice)
    db.commit()
    return {"message": "deleted"}

def upsert_invoice(db: Session, data: InvoiceCreate):
    # Check if exists
    invoice = db.query(Invoice).filter(Invoice.scrinv_number == data.scrinv_number).first()

    if invoice:
        # UPDATE fields
        invoice.status = data.status
        invoice.invoice_type = data.invoice_type
        invoice.include_gst = data.include_gst
        invoice.show_transport = data.show_transport
        invoice.invoice_date = data.invoice_date
        invoice.notes = data.notes
        
        # Update Billing & Bank
        invoice.bill_from_name = data.bill_from_name
        invoice.bill_from_phone = data.bill_from_phone
        invoice.bill_from_email = data.bill_from_email
        invoice.bill_from_abn = data.bill_from_abn
        invoice.bill_from_address = data.bill_from_address
        invoice.bill_to_name = data.bill_to_name
        invoice.bill_to_phone = data.bill_to_phone
        invoice.bill_to_email = data.bill_to_email
        invoice.bill_to_abn = data.bill_to_abn
        invoice.bill_to_address = data.bill_to_address
        invoice.bank_name = data.bank_name
        invoice.account_name = data.account_name
        invoice.bsb = data.bsb
        invoice.account_number = data.account_number

        # Clear old items
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()
        db.query(TransportItem).filter(TransportItem.invoice_id == invoice.id).delete()
        db.query(Deduction).filter(Deduction.invoice_id == invoice.id).delete()
    else:
        # CREATE new
        invoice = Invoice(
            scrinv_number=data.scrinv_number,
            status=data.status,
            invoice_type=data.invoice_type,
            include_gst=data.include_gst,
            show_transport=data.show_transport,
            invoice_date=data.invoice_date,
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
        db.flush()

    # Add Items (Common)
    for i in data.items:
        db.add(InvoiceItem(
            invoice_id=invoice.id, seal=i.seal, container_number=i.container_number,
            metal=i.metal, description=i.description, quantity=i.quantity, price=i.price
        ))
    for t in data.transport_items:
        db.add(TransportItem(
            invoice_id=invoice.id, name=t.name, num_of_ctr=t.num_of_ctr, price_per_ctr=t.price_per_ctr
        ))
    for d in data.deductions:
        db.add(Deduction(
            invoice_id=invoice.id, type=d.type, label=d.label, amount=d.amount
        ))

    db.commit()
    return {"message": "invoice saved", "id": invoice.id}