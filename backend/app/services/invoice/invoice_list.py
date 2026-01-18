# backend/app/services/invoice/invoice_list.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, case, func
from app.models.invoiceModels import Invoice
from typing import Optional
from datetime import date

def get_invoices_paginated(
    db: Session, 
    page: int = 1, 
    limit: int = 10, 
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    # Calculate offset
    skip = (page - 1) * limit

    # Base Query
    query = db.query(Invoice)

    # --- FILTER EMPTY INVOICES ---
    # Only include invoices that have a valid 'bill_to_name' (not None, not empty, not just whitespace)
    query = query.filter(
        Invoice.bill_to_name != None,
        Invoice.bill_to_name != "",
        func.trim(Invoice.bill_to_name) != ""
    )

    # --- 1. SEARCH FILTER ---
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Invoice.scrinv_number.ilike(search_term),
                Invoice.bill_to_name.ilike(search_term),
            )
        )

    # --- 2. DATE FILTER ---
    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)
    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)

    # --- 3. GET TOTAL COUNT ---
    # This count now reflects only the non-empty invoices
    total = query.count()

    # --- 4. SORTING ---
    is_paid_order = case((Invoice.status == 'Paid', True), else_=False)
    
    query = query.order_by(
        is_paid_order,              # Unpaid first
        Invoice.invoice_date.desc(), # Newest date first
        Invoice.id.desc()            # Tie-breaker
    )

    # --- 5. PAGINATION ---
    invoices = query.options(
        joinedload(Invoice.items), 
        joinedload(Invoice.transport_items),
        joinedload(Invoice.deductions)
    ).offset(skip).limit(limit).all()

    results = []

    # --- 6. CALCULATE TOTALS ---
    for inv in invoices:
        items_total = sum([(i.quantity or 0) * (i.price or 0) for i in inv.items])
        transport_total = sum([(t.num_of_ctr or 0) * (t.price_per_ctr or 0) for t in inv.transport_items])
        
        pre_deductions = sum([d.amount or 0 for d in inv.deductions if d.type == "pre"])
        post_deductions = sum([d.amount or 0 for d in inv.deductions if d.type == "post"])

        subtotal = items_total + transport_total - pre_deductions
        
        gst_percent = (inv.gst_percentage or 10) / 100
        gst = subtotal * gst_percent if inv.include_gst else 0
        
        final_total = subtotal + gst - post_deductions

        results.append({
            "id": inv.id,
            "scrinv_number": inv.scrinv_number,
            "bill_to_name": inv.bill_to_name,
            "invoice_date": inv.invoice_date,
            "total_amount": round(final_total, 2),
            "status": inv.status,
            "currency": inv.currency,
            "private_notes": inv.private_notes,
        })

    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit
    }