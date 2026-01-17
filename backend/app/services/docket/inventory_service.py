# app/services/docket/inventory_service.py

from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import date
from app.models.docketModels import Docket, DocketItem

def get_inventory_report(db: Session, start_date: date, end_date: date, metal_search: str = None):
    # 1. Define the "Net Weight" expression for SQL
    # Net = Gross - Tare. Use greatest(0, ...) to ensure no negative weights mess up totals
    net_weight_expr = func.greatest(0, DocketItem.gross - DocketItem.tare)
    
    # 2. Define Value expression (Net * Price)
    value_expr = net_weight_expr * DocketItem.price

    # 3. Build the Aggregate Query
    query = db.query(
        DocketItem.metal,
        func.sum(net_weight_expr).label("total_net_weight"),
        func.sum(value_expr).label("total_value")
    ).join(Docket, Docket.id == DocketItem.docket_id)

    # 4. Apply Filters
    filters = [Docket.is_saved == True]
    
    if start_date and end_date:
        filters.append(Docket.docket_date >= start_date)
        filters.append(Docket.docket_date <= end_date)
    
    if metal_search:
        filters.append(DocketItem.metal.ilike(f"%{metal_search}%"))

    # Apply all filters
    query = query.filter(*filters)

    # 5. Group by Metal
    # This makes the DB do the work of collapsing 8000 rows into just the unique metals
    query = query.group_by(DocketItem.metal)
    
    # 6. Execute
    results = query.all()

    # 7. Format results
    report_data = []
    grand_total_weight = 0
    grand_total_value = 0

    for metal, total_weight, total_val in results:
        # Handle None/Nulls from DB sums
        w = total_weight or 0
        v = total_val or 0
        
        # Skip empty metal names or zero stats if desired
        if not metal or (w == 0 and v == 0):
            continue

        report_data.append({
            "metal": metal,
            "netWeight": w,
            "value": v
        })
        
        grand_total_weight += w
        grand_total_value += v

    # Sort alphabetically
    report_data.sort(key=lambda x: x['metal'])

    return {
        "data": report_data,
        "grandTotal": {
            "netWeight": grand_total_weight,
            "value": grand_total_value
        }
    }