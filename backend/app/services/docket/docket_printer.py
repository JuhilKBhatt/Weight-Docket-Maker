# app/services/docket/docket_printer.py

import os
import time
from sqlalchemy.orm import Session
from app.services.docket.docket_pdf import generate_docket_pdf

SPOOL_DIR = "/app/print_spool"

def print_docket_to_printer(db: Session, docket_id: int, copies: int = 1):
    if not os.path.exists(SPOOL_DIR):
        os.makedirs(SPOOL_DIR)

    pdf_buffer = generate_docket_pdf(db, docket_id)
    
    timestamp = int(time.time())
    # Generate unique filename
    filename = f"PRINT_Qty-{copies}_ID-{docket_id}_{timestamp}.pdf"
    file_path = os.path.join(SPOOL_DIR, filename)

    try:
        with open(file_path, "wb") as f:
            f.write(pdf_buffer.read())
            
        print(f"✅ Dropped payload: {filename}")
        
        # CHANGED: Return the filename so frontend can track it
        return {
            "message": "Sent to print queue", 
            "filename": filename 
        }

    except Exception as e:
        print(f"❌ Spool Error: {e}")
        return {"error": str(e)}

# --- NEW FUNCTION ---
def check_print_status(filename: str):
    """
    Checks if the file still exists in the spool directory.
    If it is gone, it means the watcher script picked it up.
    """
    # Security: Prevent directory traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        return {"status": "error", "message": "Invalid filename"}

    file_path = os.path.join(SPOOL_DIR, filename)
    
    if os.path.exists(file_path):
        return {"status": "pending"} # File is still there (Watcher hasn't taken it)
    else:
        return {"status": "completed"} # File is gone (Watcher took it)