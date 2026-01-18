# ./backend/app/services/email_service.py

import requests
import smtplib
import imaplib
import time
from email.utils import formatdate  # <--- FIXED IMPORT
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from app.services.settings_service import get_all_settings_dict
from app.services.invoice.invoice_pdf import generate_invoice_pdf

# --- HELPER: robust URL cleaner ---
def get_clean_api_url(url_setting):
    if not url_setting:
        return ""
    url = url_setting.strip().rstrip('/')
    remove_paths = ['/api/v1/login', '/api/v1', '/api']
    for path in remove_paths:
        if url.endswith(path):
            url = url[:-len(path)]
    if not url.startswith("http"):
        url = f"https://{url}"
    return url.rstrip('/')

def send_invoice_email(db, invoice_id, recipient_email, subject=None, body=None):
    settings = get_all_settings_dict(db)
    provider = settings.get("email_provider", "SMTP") 
    sender_email = settings.get("email_from_address", "")

    if not sender_email:
        return {"error": "Sender email address not configured in Settings."}

    # Generate PDF
    try:
        pdf_buffer = generate_invoice_pdf(db, invoice_id)
        pdf_content = pdf_buffer.getvalue()
        filename = f"Invoice_{invoice_id}.pdf"
    except Exception as e:
        return {"error": f"Failed to generate PDF: {str(e)}"}

    # Route
    if provider == "Axigen":
        return send_via_axigen(settings, sender_email, recipient_email, subject, body, filename, pdf_content)
    else:
        return send_via_smtp(settings, sender_email, recipient_email, subject, body, filename, pdf_content)

def send_via_smtp(settings, sender, recipient, subject, body, filename, pdf_content):
    # Load SMTP Settings
    smtp_host = settings.get("smtp_host", "smtp.gmail.com")
    # Default to 465 if not set
    try:
        smtp_port = int(settings.get("smtp_port", "465"))
    except ValueError:
        smtp_port = 465
        
    smtp_user = settings.get("smtp_user", "")
    smtp_password = settings.get("smtp_password", "")

    if not smtp_user or not smtp_password:
        return {"error": "SMTP credentials missing in Settings."}

    try:
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = recipient
        msg['Subject'] = subject or "Invoice"
        msg['Date'] = formatdate(localtime=True) # <--- FIXED USAGE

        msg.attach(MIMEText(body or "Please find invoice attached.", 'plain'))

        part = MIMEApplication(pdf_content, Name=filename)
        part['Content-Disposition'] = f'attachment; filename="{filename}"'
        msg.attach(part)

        # 1. SEND via SMTP
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
        
        # 2. SAVE to Sent Folder via IMAP
        try:
            # VentraIP / Axigen typically uses port 993 for IMAP SSL
            imap = imaplib.IMAP4_SSL(smtp_host, 993)
            imap.login(smtp_user, smtp_password)
            
            # Try standard folder names
            sent_folder = 'Sent'
            status, _ = imap.select(sent_folder)
            if status != 'OK':
                sent_folder = 'Sent Items'
                status, _ = imap.select(sent_folder)
            
            if status == 'OK':
                # Append the message
                imap.append(sent_folder, '\\Seen', imaplib.Time2Internaldate(time.time()), msg.as_bytes())
                imap.logout()
                print("✅ Email saved to Sent folder.")
            else:
                print(f"⚠️ Could not find Sent folder to save email. Available: {imap.list()}")
                
        except Exception as imap_err:
            print(f"⚠️ Sent via SMTP, but failed to save to Sent folder: {imap_err}")

        return {"message": f"Email sent successfully via {smtp_host}"}

    except Exception as e:
        return {"error": f"SMTP Error ({smtp_host}): {str(e)}"}

def send_via_axigen(settings, sender, recipient, subject, body, filename, pdf_content):
    base_url = get_clean_api_url(settings.get("axigen_api_url", ""))
    username = settings.get("axigen_user", "")
    password = settings.get("axigen_password", "")

    if not base_url or not username or not password:
        return {"error": "Axigen configuration missing."}

    try:
        session = requests.Session()
        login_url = f"{base_url}/api/v1/login"
        
        login_resp = session.post(
            login_url,
            json={"username": username, "password": password},
            headers={"Content-Type": "application/json"}
        )
        
        if login_resp.status_code != 200:
            return {"error": f"Axigen Login Failed [{login_resp.status_code}]. Server said: {login_resp.text}"}
        
        headers = {"X-Axigen-Session": login_resp.json().get("sessid")}

        files = {'file': (filename, pdf_content, 'application/pdf')}
        attach_resp = session.post(f"{base_url}/api/v1/attachments", headers=headers, files=files)
        
        if attach_resp.status_code != 200:
            return {"error": f"Upload Failed: {attach_resp.text}"}
        
        attachment_id = attach_resp.json().get("id")

        payload = {
            "from": {"email": sender},
            "to": [{"email": recipient}],
            "subject": subject or "Invoice",
            "body": {"html": body or "Please find invoice attached."},
            "temporaryAttachments": [{"id": attachment_id, "fileName": filename}],
            "saveInSent": True 
        }
        send_resp = session.post(f"{base_url}/api/v1/mails/send", headers={**headers, "Content-Type": "application/json"}, json=payload)

        if send_resp.status_code != 200:
            return {"error": f"Axigen Send Failed: {send_resp.text}"}

        return {"message": "Email sent successfully via Axigen API"}

    except Exception as e:
        return {"error": f"Axigen Error: {str(e)}"}