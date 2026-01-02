# backend/app/services/invoice/invoice_list.py

from sqlalchemy.orm import Session
from app.models.invoiceModels import Invoice

def get_all_invoices_calculated(db: Session):
    invoices = db.query(Invoice).all()
    results = []

    for inv in invoices:
        if inv.bill_to_name is None or inv.bill_to_name.strip() == "":
            continue

        # Calculate totals dynamically
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
            "invoice_date": inv.invoice_date,
            "total_amount": round(total, 2),
            "status": inv.status,
            "currency": inv.currency
        })

    return results