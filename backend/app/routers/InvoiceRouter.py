from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.InvoiceSchema import InvoiceCreateSchema
from ..models.Invoice import Invoice
from ..models.InvoiceItem import InvoiceItem
from ..models.TransportCharge import TransportCharge
from ..models.InvoiceDeduction import InvoiceDeduction

router = APIRouter(prefix="/Invoice", tags=["Invoice"])


@router.post("/create")
def create_invoice(data: InvoiceCreateSchema, db: Session = Depends(get_db)):

    # 1. Create Invoice
    invoice = Invoice(
        SCRNumber=data.scrNumber,
        Date=data.date,
        InvoiceType=data.invoiceType,
        IncludeGST=data.includeGST,
        GrossTotal=data.grossTotal,
        GSTAmount=data.gstAmount,
        FinalTotal=data.finalTotal
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    invoice_id = invoice.SCRNumber

    # 2. Add Items
    for item in data.items:
        db_item = InvoiceItem(
            Invoiceid=invoice_id,
            Description=item.description,
            SealNumber=item.seal,
            ContainerNumber=item.container,
            Weight=item.weight,
            PricePerTon=item.price,
            Total=item.total,
        )
        db.add(db_item)

    # 3. Transport Charges
    for t in data.transportItems:
        db_t = TransportCharge(
            Invoiceid=invoice_id,
            ItemName=t.name,
            NumOffCTR=t.NumOfCTR,
            PricePerCTR=t.PricePreCTR
        )
        db.add(db_t)

    # 4. Deductions
    for d in data.preGstDeductions:
        db.add(InvoiceDeduction(
            Invoiceid=invoice_id,
            Label=d.label,
            Amount=d.amount,
            PostGST=False
        ))

    for d in data.postGstDeductions:
        db.add(InvoiceDeduction(
            Invoiceid=invoice_id,
            Label=d.label,
            Amount=d.amount,
            PostGST=True
        ))

    db.commit()

    return {"message": "Invoice saved", "invoice_id": invoice_id}
