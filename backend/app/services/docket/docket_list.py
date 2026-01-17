# app/services/docket/docket_list.py

from sqlalchemy.orm import Session
from app.models.docketModels import Docket

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

def delete_docket(db: Session, docket_id: int):
    docket = db.query(Docket).filter(Docket.id == docket_id).first()
    if docket:
        db.delete(docket)
        db.commit()
        return {"message": "Docket deleted"}
    return {"error": "Docket not found"}