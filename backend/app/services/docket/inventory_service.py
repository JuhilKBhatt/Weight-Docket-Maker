# app/services/docket/inventory_service.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from app.models.docketModels import Docket, DocketItem

def get_inventory_report(db: Session, start_date: date, end_date: date, metal_search: str = None):
    # 1. Base Query: Join Dockets and Items
    query = db.query(Docket, DocketItem).join(DocketItem, Docket.id == DocketItem.docket_id)

    # 2. Apply Filters
    # Only saved dockets
    query = query.filter(Docket.is_saved == True)
    
    # Date Range
    if start_date and end_date:
        query = query.filter(Docket.docket_date >= start_date, Docket.docket_date <= end_date)
    
    # Metal Search (Case insensitive)
    if metal_search:
        query = query.filter(DocketItem.metal.ilike(f"%{metal_search}%"))

    results = query.all()

    # 3. Aggregation Logic (Python-side for consistency with Docket List logic)
    aggregates = {}

    for docket, item in results:
        # Skip if no metal name
        metal_name = item.metal.strip() if item.metal else "Unspecified"
        
        # Calculate Net
        gross = item.gross or 0
        tare = item.tare or 0
        price = item.price or 0
        
        net_weight = max(0, gross - tare)
        item_value = net_weight * price

        # Initialize if new metal
        if metal_name not in aggregates:
            aggregates[metal_name] = {
                "metal": metal_name,
                "netWeight": 0.0,
                "value": 0.0,
                "count": 0
            }

        # Add to totals
        aggregates[metal_name]["netWeight"] += net_weight
        aggregates[metal_name]["value"] += item_value
        aggregates[metal_name]["count"] += 1

    # 4. Convert dict to list and sort by Metal name
    report_data = list(aggregates.values())
    report_data.sort(key=lambda x: x['metal'])

    # 5. Calculate Grand Total
    grand_total = {
        "netWeight": sum(r['netWeight'] for r in report_data),
        "value": sum(r['value'] for r in report_data)
    }

    return {
        "data": report_data,
        "grandTotal": grand_total
    }