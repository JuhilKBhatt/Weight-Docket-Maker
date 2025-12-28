# app/routes/invoiceRoutes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.invoiceModels import Invoice, InvoiceItem, TransportItem, Deduction
from app.schema.invoiceSchema import InvoiceCreate
from app.utilities.scrinv_generator import generate_next_scrinv

router = APIRouter(
    prefix="/api/invoices",
    tags=["Invoices"]
)

@router.post("/new")
def create_invoice(db: Session = Depends(get_db)):
    scrinv = generate_next_scrinv(db)

    return {
        "scrinv_id": f"{scrinv}"
    }

@router.post("/saveDraft")
def save_invoice(data: InvoiceCreate, db: Session = Depends(get_db)):
    print("Received invoice data:", data)
    
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
    db.flush()   # gets invoice.id before commit

    # Items
    for i in data.items:
        db.add(InvoiceItem(
            invoice_id=invoice.id,
            seal=i.seal,
            container_number=i.container_number,
            metal=i.metal,
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

@router.get("/selectorsData")
def get_selectors_data(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).all()

    companies_from = []
    companies_to = []
    accounts = []

    def clean(obj: dict):
        return {k: v for k, v in obj.items() if v not in (None, "", " ")}

    for inv in invoices:
        from_company = clean({
            "name": inv.bill_from_name,
            "phone": inv.bill_from_phone,
            "email": inv.bill_from_email,
            "abn": inv.bill_from_abn,
            "address": inv.bill_from_address,
        })

        to_company = clean({
            "name": inv.bill_to_name,
            "phone": inv.bill_to_phone,
            "email": inv.bill_to_email,
            "abn": inv.bill_to_abn,
            "address": inv.bill_to_address,
        })

        account = clean({
            "bank_name": inv.bank_name,
            "account_name": inv.account_name,
            "bsb": inv.bsb,
            "account_number": inv.account_number,
        })

        if from_company and from_company not in companies_from:
            companies_from.append(from_company)

        if to_company and to_company not in companies_to:
            companies_to.append(to_company)

        if account and account not in accounts:
            accounts.append(account)

    return {
        "companies_from": companies_from,
        "companies_to": companies_to,
        "accounts": accounts,
    }

@router.get("/list")
def get_invoices(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).all()
    results = []

    for inv in invoices:
        items_total = sum([(i.quantity or 0) * (i.price or 0) for i in inv.items])
        transport_total = sum([(t.num_of_ctr or 0) * (t.price_per_ctr or 0) for t in inv.transport_items])
        pre_deductions = sum([d.amount or 0 for d in inv.deductions if d.type == "pre"])
        post_deductions = sum([d.amount or 0 for d in inv.deductions if d.type == "post"])

        subtotal = items_total + transport_total - pre_deductions
        gst = subtotal * 0.10 if inv.include_gst else 0
        total = subtotal + gst - post_deductions

        results.append({
            "id": inv.id,
            "scrinv_number": inv.scrinv_number,
            "bill_to_name": inv.bill_to_name,
            "total_amount": round(total, 2),
            "status": inv.status,
        })

    return results

@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(invoice)
    db.commit()
    return {"message": "deleted"}

@router.post("/{invoice_id}/paid")
def mark_invoice_paid(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = "Paid"
    db.commit()
    return {"message": "marked paid"}

@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "id": invoice.id,
        "scrinv_number": invoice.scrinv_number,
        "invoice_type": invoice.invoice_type,
        "include_gst": invoice.include_gst,
        "show_transport": invoice.show_transport,
        "notes": invoice.notes,
        "status": invoice.status, # Draft, Sent, Unpaid, Paid
        "invoice_date": invoice.invoice_date,

        # Billing
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

        # Bank
        "bank_name": invoice.bank_name,
        "account_name": invoice.account_name,
        "bsb": invoice.bsb,
        "account_number": invoice.account_number,

        "items": [
            {
                "id": i.id,
                "seal": i.seal,
                "container_number": i.container_number,
                "metal": i.metal,
                "description": i.description,
                "quantity": i.quantity,
                "price": i.price,
            }
            for i in invoice.items
        ],
        "transport_items": [
            {
                "id": t.id,
                "name": t.name,
                "num_of_ctr": t.num_of_ctr,
                "price_per_ctr": t.price_per_ctr,
            }
            for t in invoice.transport_items
        ],
        "pre_gst_deductions": [
            { "id": d.id, "type": d.type, "label": d.label, "amount": d.amount }
            for d in invoice.deductions if d.type == "pre"
        ],
        "post_gst_deductions": [
            { "id": d.id, "type": d.type, "label": d.label, "amount": d.amount }
            for d in invoice.deductions if d.type == "post"
        ],
    }