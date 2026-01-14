# app/services/docket/docket_printer.py

import os
import sys
import subprocess
import tempfile
from sqlalchemy.orm import Session
from app.services.docket.docket_pdf import generate_docket_pdf

def print_docket_to_printer(db: Session, docket_id: int, copies: int = 1):
    # 1. Generate PDF content
    pdf_buffer = generate_docket_pdf(db, docket_id)
    
    # 2. Save to a temporary file
    # We use delete=False so we can close it before printing (Windows requirement)
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
        tmp_file.write(pdf_buffer.read())
        tmp_path = tmp_file.name

    try:
        # 3. Loop and Print
        for _ in range(copies):
            send_to_os_printer(tmp_path)
            
        return {"message": f"Sent {copies} copies to printer"}
    except Exception as e:
        print(f"Printing Error: {e}")
        return {"error": str(e)}
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except:
                pass

def send_to_os_printer(file_path):
    """
    Platform agnostic print command.
    """
    platform = sys.platform
    
    if platform.startswith('win'):
        # Windows approach: Uses the default associated application for 'print' verb
        # Note: Windows 'startfile' uses the User's Default Printer Preferences.
        # To print mono/draft on Windows, you must set those defaults in the Control Panel.
        try:
            os.startfile(file_path, "print")
        except OSError:
            # Fallback for headless environments or if startfile fails: Powershell
            cmd = f'Start-Process -FilePath "{file_path}" -Verb Print -PassThru | %{{sleep 5;$_}} | kill'
            subprocess.run(["powershell", "-Command", cmd], shell=True)
            
    elif platform.startswith('linux') or platform.startswith('darwin'):
        # Linux / Mac (CUPS)
        # Ensure 'lp' (CUPS client) is installed in your Docker container
        # OPTIONS ADDED:
        # -o ColorModel=Gray   -> Forces Black & White
        # -o print-quality=3   -> Sets Draft Quality (Saves Ink)
        subprocess.run([
            "lp", 
            "-o", "ColorModel=Gray", 
            "-o", "print-quality=3", 
            file_path
        ], check=True)
    else:
        print("Unsupported OS for server-side printing")