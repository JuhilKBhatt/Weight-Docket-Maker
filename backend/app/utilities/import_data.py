# backend/app/utilities/import_data.py

import csv
import sys
import os
from datetime import datetime

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
            # Read all rows first to ensure encoding is valid for the whole file
            reader = csv.reader(f)
            try:
                rows = list(reader)
            except UnicodeDecodeError:
                # Re-raise to be caught by the main loop
                raise 
            
            if not rows:
                print("Error: CSV file is empty")
                return True # Stop trying other encodings, file is just empty

            headers = rows[0]
            # Map headers: Indices 0-9 are customer details, 10+ are Metals
            metal_headers = headers[10:]
            print(f"Found {len(metal_headers)} metal columns.")
            
            count = 0
            # Iterate through data rows (skip header)
            for row_idx, row in enumerate(rows[1:], start=2):
                # Skip empty rows
                if not row or not row[0].strip():
                    continue
                    
                # Generate a unique Docket ID
                try:
                    scrdkt = generate_next_scrdkt(db)
                except Exception as e:
                    print(f"Error generating ID at row {row_idx}: {e}")
                    continue

                # Create Docket (Customer Details)
                # Ensure we handle missing columns if row is short
                def get_col(idx): return row[idx].strip() if idx < len(row) else ""

                docket = Docket(
                    scrdkt_number=scrdkt,
                    customer_name=get_col(0),
                    customer_address=get_col(1),
                    customer_dob=parse_date(get_col(2)),
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
                
                # Add Metal Prices as Items
                for i, metal_name in enumerate(metal_headers):
                    col_idx = 10 + i
                    val = get_col(col_idx)
                    if val:
                        try:
                            price = float(val)
                            if price > 0:
                                item = DocketItem(
                                    docket_id=docket.id,
                                    metal=metal_name.strip(),
                                    price=price,
                                    gross=0, 
                                    tare=0
                                )
                                db.add(item)
                        except ValueError:
                            pass
                
                db.commit()
                count += 1
                if count % 50 == 0:
                    print(f"Imported {count} dockets...")
            
            print(f"✅ Success! Imported {count} customer records using {encoding}.")
            return True # Success

    except Exception as e:
        # If it's NOT a decoding error, it's a real bug (DB error, logic error), so print it.
        if not isinstance(e, UnicodeDecodeError):
            print(f"❌ Error during processing: {e}")
        raise e # Re-raise to trigger the loop to try next encoding if applicable
    finally:
        db.close()

def import_csv(file_path):
    if not os.path.exists(file_path):
        print(f"❌ Error: File not found at {file_path}")
        return

    # List of encodings to try
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
            # If a non-encoding error occurred, stop trying.
            return

    print("❌ Failed to decode file with all attempted encodings.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python app/utilities/import_data.py <path_to_csv>")
    else:
        import_csv(sys.argv[1])