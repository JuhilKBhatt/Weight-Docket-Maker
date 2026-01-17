# ./backend/app/utilities/import_console_log.py

import json
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.models.docketModels import Docket, DocketItem
from app.utilities.scrdkt_generator import generate_next_scrdkt

def parse_date(date_str):
    if not date_str: return None
    for fmt in ('%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y'):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None

def parse_time(time_str):
    if not time_str: return None
    try:
        # Try HH:MM:SS first
        return datetime.strptime(time_str.strip(), '%H:%M:%S').time()
    except ValueError:
        try:
            # Try HH:MM
            return datetime.strptime(time_str.strip(), '%H:%M').time()
        except ValueError:
            return None

def import_logs(file_path):
    print(f"Reading logs from {file_path}...")
    
    raw_dockets = []
    
    # 1. READ & PARSE
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                # Find start of JSON
                json_start = line.find('{')
                if json_start == -1: continue
                
                data = json.loads(line[json_start:])
                
                # Check if this is a docket log (based on your structure)
                if "0" in data and isinstance(data["0"], list) and len(data["0"]) > 7:
                    # Extract Key Info for Deduplication
                    meta = data["0"]
                    customer_name = meta[0]
                    date_str = meta[1]
                    time_str = meta[2]
                    
                    if not customer_name: continue

                    # Create a sortable timestamp
                    dt_obj = datetime.min
                    if date_str and time_str:
                        try:
                            # Normalize date format for sorting
                            d = parse_date(date_str)
                            t = parse_time(time_str)
                            if d and t:
                                dt_obj = datetime.combine(d, t)
                        except:
                            pass

                    raw_dockets.append({
                        "timestamp": dt_obj,
                        "customer": customer_name,
                        "date_str": date_str,
                        "data": data
                    })
            except Exception:
                continue

    print(f"Found {len(raw_dockets)} raw docket entries.")

    # 2. DEDUPLICATE
    # Group by (Customer + Date) and take the one with the latest timestamp
    unique_map = {}
    
    for entry in raw_dockets:
        # Key = "Name_Date" (e.g., "Taqi_2026-01-17")
        # If date is missing, just use Name
        date_key = entry["date_str"] if entry["date_str"] else "NoDate"
        key = f"{entry['customer']}_{date_key}"
        
        if key not in unique_map:
            unique_map[key] = entry
        else:
            # Replace if this entry is newer
            if entry["timestamp"] > unique_map[key]["timestamp"]:
                unique_map[key] = entry
    
    final_dockets = list(unique_map.values())
    print(f"Consolidated into {len(final_dockets)} unique dockets.")

    # 3. INSERT INTO DB
    db = SessionLocal()
    try:
        count = 0
        for entry in final_dockets:
            data = entry["data"]
            meta = data["0"]
            customer_obj = meta[7] if isinstance(meta[7], dict) else {}
            
            # Generate ID
            scrdkt = generate_next_scrdkt(db)
            
            # Parse Date/Time for DB
            db_date = parse_date(meta[1])
            
            # Handle Time format "14:41" -> string or object? 
            # Model expects String(10), so we just pass the string.
            db_time = meta[2] 

            docket = Docket(
                scrdkt_number=scrdkt,
                docket_date=db_date,
                docket_time=db_time,
                status="Imported Log",
                is_saved=True,
                docket_type="Customer",
                
                # Customer Details from the nested object
                customer_name=customer_obj.get("Name") or meta[0],
                customer_address=customer_obj.get("Address"),
                customer_phone=customer_obj.get("PhoneNo"),
                customer_abn=customer_obj.get("ABN"),
                customer_pay_id=customer_obj.get("PayID"),
                customer_license_no=customer_obj.get("LicenseNo"),
                customer_rego_no=customer_obj.get("RegoNo"),
                customer_dob=parse_date(customer_obj.get("DOB")),
                
                # Bank
                bank_bsb=customer_obj.get("BSB"),
                bank_account_number=customer_obj.get("AccNo"),
                
                # Misc
                notes=meta[4] if len(meta) > 4 else ""
            )
            db.add(docket)
            db.flush()

            # Items are keys "1" to "24" (or more)
            # Structure: [Gross, Tare, Metal, Price, ??]
            for k, v in data.items():
                if k.isdigit() and k != "0" and isinstance(v, list) and len(v) >= 4:
                    gross = float(v[0]) if v[0] else 0
                    tare = float(v[1]) if v[1] else 0
                    metal = v[2]
                    price_val = v[3]
                    
                    # Only add if there is data
                    if metal or gross > 0:
                        try:
                            price = float(price_val) if price_val else 0
                        except:
                            price = 0
                            
                        item = DocketItem(
                            docket_id=docket.id,
                            metal=metal,
                            gross=gross,
                            tare=tare,
                            price=price
                        )
                        db.add(item)
            
            db.commit()
            count += 1
            if count % 10 == 0:
                print(f"Saved {count}...")

        print(f"✅ Successfully imported {count} dockets from logs.")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python app/utilities/import_console_log.py <path_to_log>")
    else:
        import_logs(sys.argv[1])