# app/services/docket/inventory_service.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from app.models.docketModels import Docket, DocketItem

# Added docket_type parameter
def get_inventory_report(db: Session, start_date: date, end_date: date, metal_search: str = None, docket_type: str = None):
    # 1. Define the "Net Weight" expression for SQL
    net_weight_expr = func.greatest(0, DocketItem.gross - DocketItem.tare)
    
    # 2. Define Value expression (Net * Price)
    value_expr = net_weight_expr * DocketItem.price

    # 3. Build the Aggregate Query
    query = db.query(
        DocketItem.metal,
        DocketItem.unit,
        Docket.currency,
        Docket.currency_symbol,
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

    # --- NEW: Filter by Docket Type ---
    if docket_type and docket_type != "All":
        filters.append(Docket.docket_type == docket_type)

    # Apply all filters
    query = query.filter(*filters)

    # 5. Group by Metal, Unit, Currency
    query = query.group_by(
        DocketItem.metal, 
        DocketItem.unit, 
        Docket.currency, 
        Docket.currency_symbol
    )
    
    # 6. Execute
    results = query.all()

    # 7. Format results
    report_data = []
    
    grand_totals_weight = {} 
    grand_totals_value = {}

    for metal, unit, currency, symbol, total_weight, total_val in results:
        w = total_weight or 0
        v = total_val or 0
        
        if not metal or (w == 0 and v == 0):
            continue

        u_label = unit or "kg"
        c_code = currency or "AUD"
        c_sym = symbol or "$"

        report_data.append({
            "metal": metal,
            "unit": u_label,
            "currency": c_code,
            "currencySymbol": c_sym,
            "netWeight": w,
            "value": v
        })
        
        # Accumulate Weight Totals
        grand_totals_weight[u_label] = grand_totals_weight.get(u_label, 0) + w
        
        # Accumulate Value Totals
        if c_code not in grand_totals_value:
            grand_totals_value[c_code] = { "amount": 0, "symbol": c_sym }
        grand_totals_value[c_code]["amount"] += v

    # Sort alphabetically
    report_data.sort(key=lambda x: x['metal'])

    return {
        "data": report_data,
        "grandTotals": {
            "weights": grand_totals_weight,
            "values": grand_totals_value
        }
    }