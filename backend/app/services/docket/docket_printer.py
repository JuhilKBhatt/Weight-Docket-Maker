# app/services/docket/docket_printer.py
import os
import time
from sqlalchemy.orm import Session
from app.services.docket.docket_pdf import generate_docket_pdf

# This path maps to "./backend/print_spool" on your computer
SPOOL_DIR = "/app/print_spool"

def print_docket_to_printer(db: Session, docket_id: int, copies: int = 1):
    # 1. Ensure the folder exists inside the container
    if not os.path.exists(SPOOL_DIR):
        os.makedirs(SPOOL_DIR)

    # 2. Generate PDF bytes
    pdf_buffer = generate_docket_pdf(db, docket_id)
    
    # 3. Create a filename with metadata (ID, Timestamp, Copies)
    # Filename format: "PRINT_Qty-2_ID-105.pdf"
    timestamp = int(time.time())
    filename = f"PRINT_Qty-{copies}_ID-{docket_id}_{timestamp}.pdf"
    file_path = os.path.join(SPOOL_DIR, filename)

    try:
        # 4. Save the file (The host script will see this immediately)
        with open(file_path, "wb") as f:
            f.write(pdf_buffer.read())
            
        print(f"✅ Dropped payload: {filename}")
        return {"message": f"Sent to printer queue ({copies} copies)."}

    except Exception as e:
        print(f"❌ Spool Error: {e}")
        return {"error": str(e)}