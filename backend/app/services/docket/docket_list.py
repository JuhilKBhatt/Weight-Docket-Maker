import re
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func, desc, case
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
            net = round(gross - tare, 3)
            item_total = round(net * price, 2)
            items_total += item_total

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

def _norm_text(val) -> str:
    if not val:
        return ""
    return re.sub(r"\s+", " ", str(val).strip()).lower()


def _norm_code(val) -> str:
    if not val:
        return ""
    return re.sub(r"[\s\-]+", "", str(val).strip()).lower()


def _clean_str(val) -> str:
    if val is None:
        return ""
    return str(val).strip()


def _merge_docket_into_profile(profile: dict, d: Docket, lock_field: str = None):
    """
    Fills in any empty fields in `profile` using values from older/other docket `d`,
    without overwriting already-populated fields or locked search fields.
    """
    field_map = {
        "name": _clean_str(d.customer_name),
        "address": _clean_str(d.customer_address),
        "phone": _clean_str(d.customer_phone),
        "abn": _clean_str(d.customer_abn),
        "licenseNo": _clean_str(d.customer_license_no),
        "regoNo": _clean_str(d.customer_rego_no),
        "payId": _clean_str(d.customer_pay_id),
        "bsb": _clean_str(d.bank_bsb),
        "accNo": _clean_str(d.bank_account_number),
    }
    for k, v in field_map.items():
        if k == lock_field and profile.get(k):
            continue
        if not profile.get(k) and v:
            profile[k] = v

    if not profile.get("dob") and d.customer_dob is not None:
        profile["dob"] = d.customer_dob


def get_unique_customers(db: Session, search: str = None, field: str = None):
    """
    Returns unique customers based on search and optional target field
    ('name', 'licenseNo', 'payId', 'abn').
    - Filters strictly on the requested field when `field` is provided so typing in
      License No., PayID, or ABN never returns false matches from unrelated columns.
    - Ignores spaces/hyphens when matching License No., PayID, and ABN.
    - Prioritizes saved dockets over half-typed Draft dockets.
    - Merges non-empty customer fields across a customer's historical dockets so
      fields left blank on a recent docket are still autofilled from earlier dockets.
    """
    raw_q = (search or "").strip()
    compact_q = re.sub(r"[\s\-]+", "", raw_q)

    def _non_empty(col):
        return and_(col.isnot(None), func.trim(col) != "")

    def _col_matches(col):
        if not raw_q:
            return True
        stripped_col = func.replace(func.replace(func.coalesce(col, ""), " ", ""), "-", "")
        clauses = [col.ilike(f"%{raw_q}%")]
        if compact_q:
            clauses.append(stripped_col.ilike(f"%{compact_q}%"))
        return or_(*clauses)

    query = db.query(Docket)

    if field == "abn":
        query = query.filter(_non_empty(Docket.customer_abn))
        if raw_q:
            query = query.filter(_col_matches(Docket.customer_abn))
    elif field == "payId":
        query = query.filter(_non_empty(Docket.customer_pay_id))
        if raw_q:
            query = query.filter(_col_matches(Docket.customer_pay_id))
    elif field == "licenseNo":
        query = query.filter(_non_empty(Docket.customer_license_no))
        if raw_q:
            query = query.filter(_col_matches(Docket.customer_license_no))
    elif field == "name":
        query = query.filter(_non_empty(Docket.customer_name))
        if raw_q:
            query = query.filter(_col_matches(Docket.customer_name))
    else:
        query = query.filter(
            or_(
                _non_empty(Docket.customer_name),
                _non_empty(Docket.customer_abn),
                _non_empty(Docket.customer_pay_id),
                _non_empty(Docket.customer_license_no),
            )
        )
        if raw_q:
            query = query.filter(
                or_(
                    _col_matches(Docket.customer_name),
                    _col_matches(Docket.customer_abn),
                    _col_matches(Docket.customer_pay_id),
                    _col_matches(Docket.customer_license_no),
                )
            )

    non_draft_priority = case((Docket.status != "Draft", 1), else_=0)
    matched_dockets = (
        query.order_by(Docket.id.desc())
        .limit(150)
        .all()
    )

    if not matched_dockets:
        return []

    # Sort in Python so non-Draft dockets for the same customer take precedence when building initial profile,
    # while preserving highest Docket.id for recency ranking
    matched_sorted = sorted(
        matched_dockets,
        key=lambda d: (0 if (d.status == "Draft") else 1, d.id or 0),
        reverse=True,
    )

    profiles = []  # List of dicts: { "details": {...}, "max_id": int, "norm_name": str, "norm_lic": str, "norm_pay": str, "norm_abn": str }

    for d in matched_sorted:
        d_name = _norm_text(d.customer_name)
        d_lic = _norm_code(d.customer_license_no)
        d_pay = _norm_code(d.customer_pay_id)
        d_abn = _norm_code(d.customer_abn)

        target_profile = None

        for p in profiles:
            if field == "payId":
                if p["norm_pay"] == d_pay and (
                    p["norm_name"] == d_name or not p["norm_name"] or not d_name
                ):
                    target_profile = p
                    break
            elif field == "licenseNo":
                if p["norm_lic"] == d_lic and (
                    p["norm_name"] == d_name or not p["norm_name"] or not d_name
                ):
                    target_profile = p
                    break
            elif field == "abn":
                if p["norm_abn"] == d_abn and (
                    p["norm_name"] == d_name or not p["norm_name"] or not d_name
                ):
                    target_profile = p
                    break
            else:
                # Searching by 'name' (or general): merge if same normalized name AND no conflicting non-empty licenseNo
                if p["norm_name"] == d_name and d_name:
                    if not p["norm_lic"] or not d_lic or p["norm_lic"] == d_lic:
                        target_profile = p
                        break

        if target_profile is None:
            new_details = {
                "name": "",
                "address": "",
                "phone": "",
                "abn": "",
                "licenseNo": "",
                "regoNo": "",
                "dob": None,
                "payId": "",
                "bsb": "",
                "accNo": "",
            }
            _merge_docket_into_profile(new_details, d, lock_field=field)
            profiles.append({
                "details": new_details,
                "max_id": d.id or 0,
                "norm_name": d_name,
                "norm_lic": d_lic,
                "norm_pay": d_pay,
                "norm_abn": d_abn,
            })
        else:
            if (d.id or 0) > target_profile["max_id"]:
                target_profile["max_id"] = d.id or 0
            if not target_profile["norm_name"] and d_name:
                target_profile["norm_name"] = d_name
            if not target_profile["norm_lic"] and d_lic:
                target_profile["norm_lic"] = d_lic
            if not target_profile["norm_pay"] and d_pay:
                target_profile["norm_pay"] = d_pay
            if not target_profile["norm_abn"] and d_abn:
                target_profile["norm_abn"] = d_abn
            _merge_docket_into_profile(target_profile["details"], d, lock_field=field)

    # Backfill any still-missing fields (e.g. payId, abn, address, dob, bsb, accNo) from other historical dockets
    # belonging to the matched customer names or license numbers
    lookup_names = {p["norm_name"] for p in profiles if p["norm_name"]}
    if lookup_names:
        history_dockets = (
            db.query(Docket)
            .filter(
                Docket.customer_name.isnot(None),
                func.lower(func.trim(Docket.customer_name)).in_(lookup_names),
            )
            .order_by(non_draft_priority.desc(), Docket.id.desc())
            .limit(250)
            .all()
        )
        for p in profiles:
            for hd in history_dockets:
                hd_name = _norm_text(hd.customer_name)
                if hd_name != p["norm_name"]:
                    continue
                hd_lic = _norm_code(hd.customer_license_no)
                # Do not cross-merge two different people who share the same name but have different non-empty license numbers
                if p["norm_lic"] and hd_lic and p["norm_lic"] != hd_lic:
                    continue
                _merge_docket_into_profile(p["details"], hd, lock_field=field)

    # Sort profiles: prefix matches on the searched field first, then most recent max_id desc
    q_norm = compact_q.lower() if field in ("abn", "payId", "licenseNo") else raw_q.lower()

    def _sort_key(p):
        det = p["details"]
        if field == "abn":
            cand = _norm_code(det.get("abn"))
        elif field == "payId":
            cand = _norm_code(det.get("payId"))
        elif field == "licenseNo":
            cand = _norm_code(det.get("licenseNo"))
        else:
            cand = _norm_text(det.get("name"))
        is_exact = 1 if (q_norm and cand == q_norm) else 0
        is_prefix = 1 if (q_norm and cand.startswith(q_norm)) else 0
        return (is_exact, is_prefix, p["max_id"])

    profiles.sort(key=_sort_key, reverse=True)

    results = []
    for p in profiles[:15]:
        det = p["details"]
        results.append({
            "value": det["name"],
            "label": det["name"],
            "customer_details": det,
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
                    func.lower(func.trim(Docket.customer_name)) == customer_name.strip().lower()
                )\
                .order_by(Docket.docket_date.desc().nullslast(), DocketItem.id.desc())\
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
            DocketItem.metal.isnot(None), 
            DocketItem.metal != ""
        )\
        .order_by(Docket.docket_date.desc().nullslast(), DocketItem.id.desc())\
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