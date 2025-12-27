# app/routes/invoiceRoutes.py
from fastapi import APIRouter, Depends
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
        # remove None, empty strings, spaces
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

        # Only append if there's at least 1 real value
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