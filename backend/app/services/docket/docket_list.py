# app/services/docket/docket_list.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from datetime import date
from app.models.docketModels import Docket, DocketItem

def get_dockets_paginated(
    db: Session, 
    page: int = 1, 
    limit: int = 10, 
    search: str = None,
    start_date: date = None, 
    end_date: date = None
):
    # Calculate offset
    skip = (page - 1) * limit

    # Base Query
    query = db.query(Docket)

    # --- FILTER: ONLY SHOW SAVED DOCKETS ---
    query = query.filter(Docket.is_saved == True)

    # --- FILTER EMPTY DOCKETS ---
    query = query.filter(
        or_(
            and_(Docket.customer_name.isnot(None), Docket.customer_name != ""),
            Docket.items.any() # Show if it has items, even if unnamed
        )
    )

    # 1. Apply Search Filter (if exists)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Docket.scrdkt_number.ilike(search_term),
                Docket.customer_name.ilike(search_term),
                Docket.company_name.ilike(search_term)
            )
        )

    # 2. Apply Date Filter
    if start_date:
        query = query.filter(Docket.docket_date >= start_date)
    if end_date:
        query = query.filter(Docket.docket_date <= end_date)

    # 3. Get Total Count (for frontend pagination)
    total = query.count()

    # 4. Apply Sorting, Pagination & Optimization
    dockets = query.order_by(Docket.id.desc())\
                   .options(joinedload(Docket.items), joinedload(Docket.deductions))\
                   .offset(skip)\
                   .limit(limit)\
                   .all()

    results = []

    # 5. Process results
    for dkt in dockets:
        # Filter out invalid drafts if needed (optional)
        if not dkt.scrdkt_number: continue

        # --- Calculate Totals ---
        items_total = 0
        for item in dkt.items:
            gross = item.gross or 0
            tare = item.tare or 0
            price = item.price or 0
            # Allow negative net weight
            net = gross - tare 
            items_total += (net * price)

        pre_deductions = sum([d.amount or 0 for d in dkt.deductions if d.type == "pre"])
        post_deductions = sum([d.amount or 0 for d in dkt.deductions if d.type == "post"])

        # Allow negative totals
        gross_total = items_total - pre_deductions
        
        gst_amount = 0
        if dkt.include_gst:
            gst_percent = (dkt.gst_percentage or 10) / 100
            gst_amount = gross_total * gst_percent

        final_total = gross_total + gst_amount - post_deductions

        display_name = dkt.company_name if dkt.docket_type == "Weight" else dkt.customer_name

        results.append({
            "id": dkt.id,
            "scrdkt_number": dkt.scrdkt_number,
            "docket_date": dkt.docket_date,
            "docket_time": dkt.docket_time,
            "customer_name": display_name,
            "docket_type": dkt.docket_type,
            "total_amount": round(final_total, 2),
            "status": dkt.status,
            "notes": dkt.notes,
        })

    # Return structure for Table
    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit
    }

def get_unique_customers(db: Session, search: str = None):
    """
    OPTIMIZED: Returns unique customers based on search.
    Filters by Name, ABN, PayID, or License No efficiently.
    """
    # 1. First, find distinct customer names matching the criteria.
    # We group by customer name to avoid fetching thousands of duplicate rows.
    name_query = db.query(Docket.customer_name)\
        .filter(Docket.is_saved == True)\
        .filter(Docket.customer_name != None, Docket.customer_name != "")

    if search:
        search_term = f"%{search}%"
        name_query = name_query.filter(
            or_(
                Docket.customer_name.ilike(search_term),
                Docket.customer_abn.ilike(search_term),
                Docket.customer_pay_id.ilike(search_term),
                Docket.customer_license_no.ilike(search_term)
            )
        )
    
    # Get top 10 distinct names, ordered by most recently used (Max ID)
    matching_names_rows = name_query.group_by(Docket.customer_name)\
        .order_by(func.max(Docket.id).desc())\
        .limit(10).all()
    
    results = []
    
    # 2. For each unique name, fetch the *LATEST* docket details.
    for row in matching_names_rows:
        name = row[0]
        
        # Fast lookup for the latest record of this customer
        d = db.query(Docket).filter(
            Docket.customer_name == name,
            Docket.is_saved == True
        ).order_by(Docket.id.desc()).first()
        
        if d:
            results.append({
                "value": name,
                "label": name,
                "customer_details": {
                    "name": d.customer_name,
                    "address": d.customer_address,
                    "phone": d.customer_phone,
                    "abn": d.customer_abn,
                    "licenseNo": d.customer_license_no,
                    "regoNo": d.customer_rego_no,
                    "dob": d.customer_dob,
                    "payId": d.customer_pay_id,
                    "bsb": d.bank_bsb,
                    "accNo": d.bank_account_number
                }
            })
            
    return results

def get_unique_metals(db: Session, search: str = None, customer_name: str = None):
    """
    Returns unique metals matching the search.
    If 'customer_name' is provided, the price returned is the latest price 
    for that specific customer.
    """
    # 1. Find distinct metals, prioritizing recently used ones
    # Joined with Docket to ensure we only look at relevant/saved data if needed,
    # and to use Docket.id for recency sorting.
    query = db.query(DocketItem.metal)\
        .join(Docket)\
        .filter(DocketItem.metal.isnot(None), DocketItem.metal != "")

    if search:
        query = query.filter(DocketItem.metal.ilike(f"%{search}%"))
    
    # Group by metal and order by the latest Docket ID (most recent first)
    # This ensures the dropdown shows metals we actually use often/recently
    unique_metals_rows = query.group_by(DocketItem.metal)\
        .order_by(func.max(Docket.id).desc())\
        .limit(6)\
        .all()
    
    results = []
    
    for row in unique_metals_rows:
        metal_name = row[0]
        price = 0.0
        
        # 2. If a customer is selected, fetch their specific last price for this metal
        if customer_name:
            last_price_row = db.query(DocketItem.price)\
                .join(Docket)\
                .filter(
                    DocketItem.metal == metal_name,
                    Docket.customer_name == customer_name,
                    Docket.is_saved == True
                )\
                .order_by(Docket.id.desc())\
                .first()
            
            if last_price_row:
                price = last_price_row[0]

        results.append({
            "value": metal_name,
            "label": metal_name,
            "price": price
        })
    
    return results

def delete_docket(db: Session, docket_id: int):
    docket = db.query(Docket).filter(Docket.id == docket_id).first()
    if not docket:
        return {"error": "Docket not found"}
        
    db.delete(docket)
    db.commit()
    return {"message": "Docket deleted"}