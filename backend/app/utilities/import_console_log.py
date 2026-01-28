# ./backend/app/utilities/import_console_log.py

import json
import sys
import os
import re
from datetime import datetime
from sqlalchemy import func

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.models.docketModels import Docket, DocketItem
from app.utilities.scrdkt_generator import generate_next_scrdkt

def parse_date(date_str):
    if not date_str: return None
    formats = ['%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d']
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None

def parse_time(time_str):
    if not time_str: return None
    try:
        return datetime.strptime(time_str.strip(), '%H:%M').time()
    except ValueError:
        try:
            return datetime.strptime(time_str.strip(), '%H:%M:%S').time()
        except ValueError:
            return None

def extract_general_notes(other_info_str):
    if not other_info_str: return ""
    match = re.search(r'Notes:\s*(.*)', other_info_str)
    if match:
        content = match.group(1)
        return content.split('|')[0].strip()
    return ""

def import_logs(file_path):
    print(f"Reading logs from {file_path}...")
    
    unique_entries = {}
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            try:
                json_start = line.find('{')
                if json_start == -1: continue
                
                json_str = line[json_start:].strip()
                data = json.loads(json_str)
                
                if "0" not in data or not isinstance(data["0"], list): continue
                
                meta = data["0"]
                if len(meta) < 8: continue

                name = meta[0]
                date_str = meta[1]
                time_str = meta[2]
                
                if not name or not date_str: continue

                d_obj = parse_date(date_str)
                t_obj = parse_time(time_str)
                
                if not d_obj or not t_obj: continue
                
                timestamp = datetime.combine(d_obj, t_obj)

                # --- NORMALIZE NAME (Remove extra spaces) ---
                # "  Taqi   " -> "Taqi"
                clean_name = " ".join(name.split())

                # Key is lowercased to ensure uniqueness in memory
                key = f"{clean_name.lower()}_{d_obj}"

                if key not in unique_entries:
                    unique_entries[key] = {
                        "timestamp": timestamp,
                        "data": data,
                        "meta": meta,
                        "d_obj": d_obj,
                        "t_obj": t_obj,
                        "clean_name": clean_name # Store the clean name
                    }
                else:
                    if timestamp > unique_entries[key]["timestamp"]:
                        unique_entries[key] = {
                            "timestamp": timestamp,
                            "data": data,
                            "meta": meta,
                            "d_obj": d_obj,
                            "t_obj": t_obj,
                            "clean_name": clean_name
                        }
            except json.JSONDecodeError:
                continue
            except Exception:
                continue

    print(f"Consolidated logs into {len(unique_entries)} unique daily records.")

    db = SessionLocal()
    imported_count = 0
    updated_count = 0

    try:
        sorted_entries = sorted(unique_entries.values(), key=lambda x: x['timestamp'])

        for entry in sorted_entries:
            data = entry["data"]
            meta = entry["meta"]
            d_obj = entry["d_obj"]
            
            # Use the normalized name calculated earlier
            customer_name = entry["clean_name"]

            # --- 1. CHECK FOR EXISTING DOCKET (Case Insensitive + Trimmed) ---
            # func.trim ensures database values with trailing spaces match clean input
            existing_docket = db.query(Docket).filter(
                func.lower(func.trim(Docket.customer_name)) == customer_name.lower(),
                Docket.docket_date == d_obj
            ).first()

            cust_details = meta[7] if isinstance(meta[7], dict) else {}
            
            # Helper: Only return new value if it's not empty/null
            def get_val(key, fallback):
                new_val = cust_details.get(key)
                if new_val and str(new_val).strip():
                    return new_val
                return fallback

            # Calculate GST
            raw_gst = meta[3]
            include_gst = False
            if isinstance(raw_gst, bool):
                include_gst = raw_gst
            elif isinstance(raw_gst, str):
                include_gst = raw_gst.lower() == 'true'

            docket = None

            if existing_docket:
                # --- UPDATE MODE ---
                docket = existing_docket
                
                # SAFE UPDATES: Only overwrite if log has data
                docket.customer_address = get_val("Address", docket.customer_address)
                docket.customer_phone = get_val("PhoneNo", docket.customer_phone)
                docket.customer_abn = get_val("ABN", docket.customer_abn)
                docket.customer_pay_id = get_val("PayID", docket.customer_pay_id)
                docket.customer_license_no = get_val("LicenseNo", docket.customer_license_no)
                docket.customer_rego_no = get_val("RegoNo", docket.customer_rego_no)
                
                new_dob = parse_date(cust_details.get("DOB"))
                if new_dob: 
                    docket.customer_dob = new_dob

                docket.bank_bsb = get_val("BSB", docket.bank_bsb)
                docket.bank_account_number = get_val("AccNo", docket.bank_account_number)
                
                # Metadata updates
                docket.docket_time = meta[2]
                docket.notes = extract_general_notes(meta[4])
                
                # Clear old items to re-import
                db.query(DocketItem).filter(DocketItem.docket_id == docket.id).delete()
                updated_count += 1
            else:
                # --- INSERT MODE ---
                
                # 2. ENFORCE CONSISTENT CASING FROM DB (if exists)
                existing_customer = db.query(Docket).filter(
                    func.lower(func.trim(Docket.customer_name)) == customer_name.lower()
                ).first()

                final_name = customer_name
                if existing_customer:
                    # Use the name exactly as it appears in DB (e.g. "Taqi")
                    final_name = existing_customer.customer_name
                else:
                    # Title Case for brand new customers (e.g. "john" -> "John")
                    final_name = customer_name.title() 

                scrdkt = generate_next_scrdkt(db)
                docket = Docket(
                    scrdkt_number=scrdkt,
                    docket_date=d_obj,
                    docket_time=meta[2], 
                    status="Imported",
                    is_saved=True,
                    docket_type=meta[5] if len(meta) > 5 else "Customer",
                    include_gst=include_gst,
                    gst_percentage=10.0 if include_gst else 0.0,
                    
                    customer_name=final_name, 
                    customer_address=cust_details.get("Address"),
                    customer_phone=cust_details.get("PhoneNo"),
                    customer_abn=cust_details.get("ABN"),
                    customer_pay_id=cust_details.get("PayID"),
                    customer_license_no=cust_details.get("LicenseNo"),
                    customer_rego_no=cust_details.get("RegoNo"),
                    customer_dob=parse_date(cust_details.get("DOB")),
                    bank_bsb=cust_details.get("BSB"),
                    bank_account_number=cust_details.get("AccNo"),
                    notes=extract_general_notes(meta[4])
                )
                db.add(docket)
                db.flush() 
                imported_count += 1

            # Process Items
            for k, v in data.items():
                if k == "0": continue 
                if not isinstance(v, list) or len(v) < 3: continue

                try:
                    gross = float(v[0]) if v[0] and str(v[0]).strip() != "" else 0
                    tare = float(v[1]) if v[1] and str(v[1]).strip() != "" else 0
                    metal = str(v[2]).strip()
                    price = float(v[3]) if v[3] and str(v[3]).strip() != "" else 0
                    row_notes = str(v[4]) if len(v) > 4 else ""

                    if metal or gross > 0 or tare > 0:
                        item = DocketItem(
                            docket_id=docket.id,
                            metal=metal,
                            gross=gross,
                            tare=tare,
                            price=price,
                            row_notes=row_notes
                        )
                        db.add(item)
                except (ValueError, TypeError):
                    continue
            
            db.commit()
            
            if (imported_count + updated_count) % 50 == 0:
                print(f"Processed {imported_count + updated_count} records...")

        print(f"✅ Finished! Created: {imported_count}. Updated: {updated_count}.")

    except Exception as e:
        print(f"❌ Critical Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python app/utilities/import_console_log.py <path_to_log>")
    else:
        import_logs(sys.argv[1])