# app/services/docket/docket_list.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func, desc
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
    # joinedload prevents N+1 problem by fetching items in the same query
    dockets = query.order_by(Docket.id.desc())\
                   .options(joinedload(Docket.items), joinedload(Docket.deductions))\
                   .offset(skip)\
                   .limit(limit)\
                   .all()

    results = []

    # 5. Process only the fetched page (e.g., 10 items)
    for dkt in dockets:
        if not dkt.scrdkt_number: continue

        items_total = 0
        for item in dkt.items:
            gross = item.gross or 0
            tare = item.tare or 0
            price = item.price or 0
            net = gross - tare 
            items_total += (net * price)

        pre_deductions = sum([d.amount or 0 for d in dkt.deductions if d.type == "pre"])
        post_deductions = sum([d.amount or 0 for d in dkt.deductions if d.type == "post"])

        gross_total = items_total - pre_deductions
        
        gst_amount = 0
        if dkt.include_gst:
            gst_percent = (dkt.gst_percentage or 10) / 100
            gst_amount = gross_total * gst_percent

        final_total = gross_total + gst_amount - post_deductions

        display_name = dkt.customer_name if dkt.customer_name else dkt.company_name

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

    return {
        "data": results,
        "total": total,
        "page": page,
        "limit": limit
    }

def get_unique_customers(db: Session, search: str = None):
    """
    Returns unique customers based on search.
    Consolidates 'Taqi', 'TAQI', 'taqi ' into a single entry (latest used).
    """
    # 1. Subquery: Group by LOWER(TRIM(name)) to find unique entities
    # We select MAX(id) to get the most recent record for that normalized name
    subquery = db.query(func.max(Docket.id).label("max_id"))\
        .filter(Docket.is_saved == True)\
        .filter(Docket.customer_name != None, Docket.customer_name != "")

    if search:
        search_term = f"%{search}%"
        subquery = subquery.filter(
            or_(
                Docket.customer_name.ilike(search_term),
                Docket.customer_abn.ilike(search_term),
                Docket.customer_pay_id.ilike(search_term),
                Docket.customer_license_no.ilike(search_term)
            )
        )
    
    # Group by the normalized name to merge duplicates
    subquery = subquery.group_by(func.lower(func.trim(Docket.customer_name)))
    
    # 2. Main Query: Fetch full details for those specific latest IDs
    # This ensures we get the exact casing (e.g. "Taqi") used in the latest record
    latest_ids = subquery.limit(10).all() # Limit results for speed
    
    if not latest_ids:
        return []

    # Flatten list of IDs
    ids = [r[0] for r in latest_ids]

    dockets = db.query(Docket).filter(Docket.id.in_(ids)).order_by(Docket.id.desc()).all()
    
    results = []
    
    for d in dockets:
        results.append({
            "value": d.customer_name, 
            "label": d.customer_name,
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
    Consolidates casing and whitespace for metals too.
    Sorts price history by DATE, not ID, to handle imported data correctly.
    """
    # 1. Normalize metal names in the query
    normalized_metal = func.lower(func.trim(DocketItem.metal))
    
    # Select the MAX ID for each normalized metal to find the most recent usage
    query = db.query(func.max(DocketItem.id))\
        .join(Docket)\
        .filter(DocketItem.metal.isnot(None), DocketItem.metal != "")

    if search:
        query = query.filter(DocketItem.metal.ilike(f"%{search}%"))
    
    # Group by normalized metal name
    # Order by MAX(Docket.id) to prioritize metals used in recent dockets
    latest_metal_ids_rows = query.group_by(normalized_metal)\
        .order_by(func.max(DocketItem.id).desc())\
        .limit(4)\
        .all()
    
    if not latest_metal_ids_rows:
        return []

    ids = [r[0] for r in latest_metal_ids_rows]
    
    # 2. Fetch the actual metal strings using the IDs found
    # This gives us the "Copper" casing instead of "copper" if "Copper" was last used
    latest_items = db.query(DocketItem).filter(DocketItem.id.in_(ids)).all()
    
    # Sort them alphabetically
    latest_items.sort(key=lambda x: x.metal)

    results = []
    
    for item in latest_items:
        metal_name = item.metal
        price = 0.0
        
        # 3. If customer selected, find their specific last price for this normalized metal
        if customer_name:
            last_price_row = db.query(DocketItem.price)\
                .join(Docket)\
                .filter(
                    func.lower(func.trim(DocketItem.metal)) == metal_name.strip().lower(),
                    func.lower(func.trim(Docket.customer_name)) == customer_name.strip().lower(),
                    Docket.is_saved == True
                )\
                .order_by(Docket.docket_date.desc(), DocketItem.id.desc())\
                .first()
            
            if last_price_row:
                price = last_price_row[0]

        results.append({
            "value": metal_name,
            "label": metal_name,
            "price": price
        })
    
    return results

def get_customer_price_list(db: Session, customer_name: str):
    """
    Fetches the last price used for EVERY metal for a specific customer.
    Optimized for list views (no limit, just distinct metals).
    """
    if not customer_name:
        return []

    # 1. Fetch all items for this customer, ordered by newest first
    # We allow the DB to just dump the rows, and we filter in Python for speed
    items = db.query(DocketItem.metal, DocketItem.price)\
        .join(Docket)\
        .filter(
            func.lower(func.trim(Docket.customer_name)) == customer_name.strip().lower(),
            Docket.is_saved == True,
            DocketItem.metal.isnot(None), 
            DocketItem.metal != ""
        )\
        .order_by(Docket.docket_date.desc(), DocketItem.id.desc())\
        .all()
    
    # 2. Deduplicate in Python (Keep only the first occurrence -> latest date)
    seen_metals = set()
    results = []
    
    for metal, price in items:
        # Normalize for check, but return original casing
        norm_metal = metal.strip().lower()
        
        if norm_metal not in seen_metals:
            seen_metals.add(norm_metal)
            results.append({
                "label": metal, # Keep the original casing of the latest usage
                "price": price
            })
            
    # 3. Sort alphabetically for the user
    results.sort(key=lambda x: x['label'])
    
    return results

def delete_docket(db: Session, docket_id: int):
    docket = db.query(Docket).filter(Docket.id == docket_id).first()
    if not docket:
        return {"error": "Docket not found"}
        
    db.delete(docket)
    db.commit()
    return {"message": "Docket deleted"}