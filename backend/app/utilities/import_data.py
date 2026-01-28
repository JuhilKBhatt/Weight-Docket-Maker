# backend/app/utilities/import_data.py

import csv
import sys
import os
from datetime import datetime
from sqlalchemy import func

# Add parent directory to path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.models.docketModels import Docket, DocketItem
from app.utilities.scrdkt_generator import generate_next_scrdkt

def parse_date(date_str):
    if not date_str or not date_str.strip():
        return None
    # Try common formats
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%d.%m.%Y'):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    return None

def process_import(file_path, encoding):
    print(f"Attempting import with encoding: {encoding}...")
    db = SessionLocal()
    try:
        with open(file_path, 'r', encoding=encoding) as f:
            reader = csv.reader(f)
            try:
                rows = list(reader)
            except UnicodeDecodeError:
                raise 
            
            if not rows:
                print("Error: CSV file is empty")
                return True 

            headers = rows[0]
            metal_headers = headers[10:]
            print(f"Found {len(metal_headers)} metal columns.")
            
            count = 0
            updated = 0
            
            for row_idx, row in enumerate(rows[1:], start=2):
                if not row or not row[0].strip():
                    continue
                
                # --- NORMALIZE NAME (Remove extra spaces) ---
                customer_name = " ".join(row[0].strip().split())
                
                dob_val = parse_date(row[2].strip() if len(row) > 2 else "")
                
                # --- 1. FIND EXISTING RECORD (Trimming DB value) ---
                query = db.query(Docket).filter(
                    func.lower(func.trim(Docket.customer_name)) == customer_name.lower()
                )
                
                if dob_val:
                    query = query.filter(Docket.customer_dob == dob_val)
                
                existing = query.order_by(Docket.id.desc()).first()

                def get_col(idx): return row[idx].strip() if idx < len(row) else ""

                docket = None

                if existing:
                    docket = existing
                    
                    # --- 2. SAFE UPDATE (Don't overwrite with empty) ---
                    addr = get_col(1)
                    if addr: docket.customer_address = addr
                    
                    if dob_val: docket.customer_dob = dob_val
                    
                    lic = get_col(3)
                    if lic: docket.customer_license_no = lic
                    
                    rego = get_col(4)
                    if rego: docket.customer_rego_no = rego
                    
                    phone = get_col(5)
                    if phone: docket.customer_phone = phone
                    
                    abn = get_col(6)
                    if abn: docket.customer_abn = abn
                    
                    payid = get_col(7)
                    if payid: docket.customer_pay_id = payid
                    
                    bsb = get_col(8)
                    if bsb: docket.bank_bsb = bsb
                    
                    acc = get_col(9)
                    if acc: docket.bank_account_number = acc
                    
                    updated += 1
                else:
                    # --- 3. CREATE NEW (Consistent Casing) ---
                    same_customer = db.query(Docket).filter(
                        func.lower(func.trim(Docket.customer_name)) == customer_name.lower()
                    ).first()
                    
                    final_name = same_customer.customer_name if same_customer else customer_name.title()

                    try:
                        scrdkt = generate_next_scrdkt(db)
                    except Exception as e:
                        print(f"Error generating ID at row {row_idx}: {e}")
                        continue

                    docket = Docket(
                        scrdkt_number=scrdkt,
                        customer_name=final_name,
                        customer_address=get_col(1),
                        customer_dob=dob_val,
                        customer_license_no=get_col(3),
                        customer_rego_no=get_col(4),
                        customer_phone=get_col(5),
                        customer_abn=get_col(6),
                        customer_pay_id=get_col(7),
                        bank_bsb=get_col(8),
                        bank_account_number=get_col(9),
                        status="Imported",
                        is_saved=True,
                        docket_type="Customer"
                    )
                    db.add(docket)
                    db.flush() 
                    count += 1
                
                # --- UPDATE ITEMS ---
                existing_items = {i.metal: i for i in docket.items}

                for i, metal_name in enumerate(metal_headers):
                    col_idx = 10 + i
                    val = get_col(col_idx)
                    if val:
                        try:
                            price = float(val)
                            clean_metal = metal_name.strip()
                            
                            if price > 0:
                                if clean_metal in existing_items:
                                    existing_items[clean_metal].price = price
                                else:
                                    item = DocketItem(
                                        docket_id=docket.id,
                                        metal=clean_metal,
                                        price=price,
                                        gross=0, 
                                        tare=0
                                    )
                                    db.add(item)
                        except ValueError:
                            pass
                
                db.commit()
                if (count + updated) % 50 == 0:
                    print(f"Processed {count + updated} dockets...")
            
            print(f"✅ Success! Created {count} new records, Updated {updated} existing records using {encoding}.")
            return True 

    except Exception as e:
        if not isinstance(e, UnicodeDecodeError):
            print(f"❌ Error during processing: {e}")
        raise e 
    finally:
        db.close()

def import_csv(file_path):
    if not os.path.exists(file_path):
        print(f"❌ Error: File not found at {file_path}")
        return

    encodings = ['utf-8-sig', 'cp1252', 'latin1', 'utf-8']
    
    for encoding in encodings:
        try:
            success = process_import(file_path, encoding)
            if success:
                return
        except UnicodeDecodeError:
            print(f"⚠️ Failed to decode with {encoding}. Retrying with next...")
            continue
        except Exception:
            return

    print("❌ Failed to decode file with all attempted encodings.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python app/utilities/import_data.py <path_to_csv>")
    else:
        import_csv(sys.argv[1])