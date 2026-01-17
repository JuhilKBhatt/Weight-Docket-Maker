# app/services/docket/docket_list.py

from sqlalchemy.orm import Session
from app.models.docketModels import Docket, DocketItem # CHANGED: Added DocketItem import

def get_all_dockets_calculated(db: Session):
    dockets = db.query(Docket).all()
    results = []

    for dkt in dockets:
        # Filter out empty/invalid dockets if necessary
        if not dkt.scrdkt_number:
            continue

        # Filter out unsaved dockets
        if not dkt.is_saved:
            continue

        # --- Calculate Totals Dynamically ---
        # 1. Items Total
        items_total = 0
        for item in dkt.items:
            gross = item.gross or 0
            tare = item.tare or 0
            price = item.price or 0
            net = max(0, gross - tare)
            items_total += (net * price)

        # 2. Deductions
        pre_deductions = sum([d.amount or 0 for d in dkt.deductions if d.type == "pre"])
        post_deductions = sum([d.amount or 0 for d in dkt.deductions if d.type == "post"])

        # 3. Final Calculation
        gross_total = max(0, items_total - pre_deductions)
        
        gst_amount = 0
        if dkt.include_gst:
            gst_percent = (dkt.gst_percentage or 10) / 100
            gst_amount = gross_total * gst_percent

        final_total = max(0, gross_total + gst_amount - post_deductions)

        # --- Determine "Name" to show (Company or Customer) ---
        display_name = dkt.company_name if dkt.docket_type == "Weight" else dkt.customer_name

        results.append({
            "id": dkt.id,
            "scrdkt_number": dkt.scrdkt_number,
            "docket_date": dkt.docket_date,
            "docket_time": dkt.docket_time,
            "customer_name": display_name, # Generic field for the table
            "docket_type": dkt.docket_type,
            "total_amount": round(final_total, 2),
            "status": dkt.status,
            "notes": dkt.notes,
        })

    return results

def get_unique_customers(db: Session, search: str = None):
    """
    Returns unique customers, prioritizing recent ones.
    If search is provided, filters by name.
    """
    query = db.query(Docket).order_by(Docket.id.desc())
    
    if search:
        query = query.filter(Docket.customer_name.ilike(f"%{search}%"))
    
    # Execute query
    dockets = query.all()
    
    seen_customers = {}
    results = []
    
    for d in dockets:
        name = d.customer_name
        if not name or not name.strip():
            continue
            
        # Check uniqueness
        if name in seen_customers:
            continue
            
        seen_customers[name] = True
        
        results.append({
            "value": name,
            "label": name,
            "customer_details": {
                "name": name,
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
        
        # Limit the number of suggestions returned to Frontend (e.g. 20)
        if len(results) >= 20:
            break
            
    return results

def get_unique_metals(db: Session, search: str = None, customer_name: str = None):
    """
    Returns unique metals matching the search.
    If 'customer_name' is provided, the price returned is the latest price 
    for that specific customer. If that customer hasn't used the metal, 
    price is returned as None/0.
    """
    # Base query: Join Item & Docket
    query = db.query(DocketItem.metal, DocketItem.price, Docket.customer_name)\
        .join(Docket)\
        .order_by(Docket.id.desc()) # Latest first
    
    if search:
        query = query.filter(DocketItem.metal.ilike(f"%{search}%"))
    
    # We fetch a larger batch to process in python, as complex deduplication 
    # with conditional pricing in SQL can be heavy.
    items = query.limit(500).all()
    
    seen_metals = {}
    results = []
    
    for metal, price, dkt_customer in items:
        if not metal or not metal.strip():
            continue
            
        key = metal.strip().lower()
        
        # Logic: 
        # 1. We want a list of unique metals.
        # 2. If we already have this metal in 'results', we might need to update its price
        #    if we found a "better" match (i.e., belonging to the specific customer).
        
        is_target_customer = (customer_name and dkt_customer and 
                              dkt_customer.lower() == customer_name.lower())

        if key not in seen_metals:
            # First time seeing this metal
            seen_metals[key] = {
                "value": metal,
                "label": metal,
                # Only set price if it matches the customer (or if no customer logic is needed)
                # But per requirement: "only load metal price based on name"
                "price": price if is_target_customer else 0,
                "found_for_customer": is_target_customer
            }
            results.append(seen_metals[key])
        else:
            # We have seen this metal. 
            # If the current entry IS for the target customer, and the previous one WAS NOT,
            # we update the entry to use this specific price.
            existing = seen_metals[key]
            if is_target_customer and not existing["found_for_customer"]:
                existing["price"] = price
                existing["found_for_customer"] = True
                # We essentially "upgraded" this metal entry to be customer-specific
    
    # Return top 20
    return results[:20]

def delete_docket(db: Session, docket_id: int):
    docket = db.query(Docket).filter(Docket.id == docket_id).first()
    if docket:
        db.delete(docket)
        db.commit()
        return {"message": "Docket deleted"}
    return {"error": "Docket not found"}