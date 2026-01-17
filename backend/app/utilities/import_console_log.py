# ./backend/app/utilities/import_console_log.py

import json
import sys
import os
import re
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.models.docketModels import Docket, DocketItem
from app.utilities.scrdkt_generator import generate_next_scrdkt

def parse_date(date_str):
    if not date_str: return None
    # Add formats matching your logs (e.g. 17-1-2026)
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
    """Extracts text after 'Notes: ' from the pipe-separated string"""
    if not other_info_str: return ""
    match = re.search(r'Notes:\s*(.*)', other_info_str)
    if match:
        content = match.group(1)
        return content.split('|')[0].strip()
    return ""

def import_logs(file_path):
    print(f"Reading logs from {file_path}...")
    
    # --- STEP 1: READ & PARSE INTO MEMORY ---
    unique_entries = {}
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            try:
                # Extract JSON part
                json_start = line.find('{')
                if json_start == -1: continue
                
                json_str = line[json_start:].strip()
                data = json.loads(json_str)
                
                # Validation
                if "0" not in data or not isinstance(data["0"], list):
                    continue
                
                meta = data["0"]
                # Structure: [Name, Date, Time, gst, otherInfo, Type, Save, DetailsObj, PrintNum]
                if len(meta) < 8: continue

                name = meta[0]
                date_str = meta[1]
                time_str = meta[2]
                
                if not name or not date_str: continue

                d_obj = parse_date(date_str)
                t_obj = parse_time(time_str)
                
                if not d_obj or not t_obj: continue
                
                timestamp = datetime.combine(d_obj, t_obj)

                # Deduplication Key: Name + Date (Time ignored for grouping)
                key = f"{name.lower().strip()}_{d_obj}"

                if key not in unique_entries:
                    unique_entries[key] = {
                        "timestamp": timestamp,
                        "data": data,
                        "meta": meta,
                        "d_obj": d_obj,
                        "t_obj": t_obj
                    }
                else:
                    # Keep only the LATEST entry for that day
                    if timestamp > unique_entries[key]["timestamp"]:
                        unique_entries[key] = {
                            "timestamp": timestamp,
                            "data": data,
                            "meta": meta,
                            "d_obj": d_obj,
                            "t_obj": t_obj
                        }
            except json.JSONDecodeError:
                continue
            except Exception:
                continue

    print(f"Consolidated logs into {len(unique_entries)} unique daily records.")

    # --- STEP 2: INSERT INTO DB ---
    db = SessionLocal()
    imported_count = 0
    skipped_count = 0

    try:
        sorted_entries = sorted(unique_entries.values(), key=lambda x: x['timestamp'])

        for entry in sorted_entries:
            data = entry["data"]
            meta = entry["meta"]
            d_obj = entry["d_obj"]
            
            customer_name = meta[0]

            # Check for duplicates in DB (Same Name + Same Date = Duplicate)
            exists = db.query(Docket).filter(
                Docket.customer_name == customer_name,
                Docket.docket_date == d_obj
            ).first()

            if exists:
                skipped_count += 1
                continue

            cust_details = meta[7] if isinstance(meta[7], dict) else {}
            
            # --- GST LOGIC ---
            # Index 3 is gstValue (boolean true/false)
            raw_gst = meta[3]
            include_gst = False
            if isinstance(raw_gst, bool):
                include_gst = raw_gst
            elif isinstance(raw_gst, str):
                include_gst = raw_gst.lower() == 'true'

            # Generate new ID
            scrdkt = generate_next_scrdkt(db)

            docket = Docket(
                scrdkt_number=scrdkt,
                docket_date=d_obj,
                docket_time=meta[2], 
                status="Imported Log",
                is_saved=True,
                docket_type=meta[5] if len(meta) > 5 else "Customer",
                
                # Financials
                include_gst=include_gst,
                gst_percentage=10.0 if include_gst else 0.0,
                
                # Customer Details
                customer_name=cust_details.get("Name") or customer_name,
                customer_address=cust_details.get("Address"),
                customer_phone=cust_details.get("PhoneNo"),
                customer_abn=cust_details.get("ABN"),
                customer_pay_id=cust_details.get("PayID"),
                customer_license_no=cust_details.get("LicenseNo"),
                customer_rego_no=cust_details.get("RegoNo"),
                customer_dob=parse_date(cust_details.get("DOB")),
                
                # Bank
                bank_bsb=cust_details.get("BSB"),
                bank_account_number=cust_details.get("AccNo"),
                
                # Notes
                notes=extract_general_notes(meta[4])
            )
            db.add(docket)
            db.flush()

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
            imported_count += 1
            
            if imported_count % 50 == 0:
                print(f"Imported {imported_count}...")

        print(f"✅ Finished! Imported: {imported_count}. Skipped (Already in DB): {skipped_count}.")

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