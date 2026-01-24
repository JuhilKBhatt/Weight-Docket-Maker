# ./backend/app/services/email_service.py

import requests
import smtplib
import imaplib
import time
import email
from email.utils import formatdate
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

def send_invoice_email(db, invoice_id, recipient_email, subject=None, body=None, cc=None):
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
        return send_via_axigen(settings, sender_email, recipient_email, subject, body, filename, pdf_content, cc)
    else:
        return send_via_smtp(settings, sender_email, recipient_email, subject, body, filename, pdf_content, cc)

def send_via_smtp(settings, sender, recipient, subject, body, filename, pdf_content, cc=None):
    # Load SMTP Settings
    smtp_host = settings.get("smtp_host", "smtp.gmail.com")
    try:
        smtp_port = int(settings.get("smtp_port", "465"))
    except ValueError:
        smtp_port = 465
        
    smtp_user = settings.get("smtp_user", "")
    smtp_password = settings.get("smtp_password", "")

    if not smtp_user or not smtp_password:
        return {"error": "SMTP credentials missing in Settings."}

    # --- 1. SEARCH FOR THREAD PARENT (THREADING LOGIC) ---
    parent_message_id = None
    try:
        # Use IMAP to find the last email with this subject to this recipient
        search_imap = imaplib.IMAP4_SSL(smtp_host, 993)
        search_imap.login(smtp_user, smtp_password)
        
        # Try common Sent folder names
        sent_folder = None
        for folder in ['"Sent"', '"Sent Items"', '"[Gmail]/Sent Mail"', 'Sent', 'Sent Items']:
            try:
                status, _ = search_imap.select(folder)
                if status == 'OK':
                    sent_folder = folder
                    break
            except:
                continue
        
        if sent_folder:
            target_id = None
            safe_subj = (subject or "").replace('"', '').replace('\r', '').replace('\n', '').strip()
            
            # STRATEGY A: Strict Search (Recipient + Subject)
            # Works if server handles the subject string format correctly
            try:
                query = f'(TO "{recipient}" SUBJECT "{safe_subj}")'
                typ, data = search_imap.search(None, query)
                if typ == 'OK' and data[0]:
                    target_id = data[0].split()[-1] # Take the latest one
            except Exception as e:
                print(f"⚠️ Strategy A (Strict) failed: {e}")

            # STRATEGY B: Fallback (Recipient Only -> Manual Subject Match)
            # If A failed, fetch last 5 emails to this person and check Subject in Python
            # This handles encoding mismatches or subtle server search issues
            if not target_id:
                try:
                    query_loose = f'(TO "{recipient}")'
                    typ, data = search_imap.search(None, query_loose)
                    if typ == 'OK' and data[0]:
                        id_list = data[0].split()
                        # Check last 10 messages (most recent)
                        recent_ids = id_list[-10:] 
                        
                        # We must iterate backwards to find the newest match
                        for mail_id in reversed(recent_ids):
                            _, h_data = search_imap.fetch(mail_id, '(BODY.PEEK[HEADER.FIELDS (SUBJECT)])')
                            for response_part in h_data:
                                if isinstance(response_part, tuple):
                                    msg_obj = email.message_from_bytes(response_part[1])
                                    subj_header = msg_obj.get('Subject', '')
                                    # Decode header if necessary (e.g. =?UTF-8?...)
                                    # For now, simple containment check usually suffices
                                    if safe_subj.lower() in subj_header.lower():
                                        target_id = mail_id
                                        print(f"🔗 Threading: Match found via Strategy B (ID: {target_id})")
                                        break
                            if target_id:
                                break
                except Exception as e:
                    print(f"⚠️ Strategy B (Fallback) failed: {e}")

            # FETCH MESSAGE-ID
            if target_id:
                typ, header_data = search_imap.fetch(target_id, '(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID)])')
                if typ == 'OK':
                    for response_part in header_data:
                        if isinstance(response_part, tuple):
                            msg_obj = email.message_from_bytes(response_part[1])
                            found_id = msg_obj['Message-ID']
                            if found_id:
                                parent_message_id = found_id.strip()
                                print(f"🔗 Threading: Found parent Message-ID: {parent_message_id}")
                            break
        
        search_imap.logout()
    except Exception as e:
        print(f"⚠️ Threading lookup failed (non-critical): {e}")

    # --- 2. CONSTRUCT EMAIL ---
    try:
        msg = MIMEMultipart()
        msg['From'] = sender
        msg['To'] = recipient
        if cc:
            msg['Cc'] = cc
            
        msg['Subject'] = subject or "Invoice"
        msg['Date'] = formatdate(localtime=True)

        # Threading Headers
        if parent_message_id:
            msg['In-Reply-To'] = parent_message_id
            msg['References'] = parent_message_id

        msg.attach(MIMEText(body or "Please find invoice attached.", 'plain'))

        part = MIMEApplication(pdf_content, Name=filename)
        part['Content-Disposition'] = f'attachment; filename="{filename}"'
        msg.attach(part)

        # --- 3. SEND VIA SMTP ---
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)
        
        # --- 4. SAVE TO SENT FOLDER VIA IMAP ---
        try:
            imap = imaplib.IMAP4_SSL(smtp_host, 993)
            imap.login(smtp_user, smtp_password)
            
            # Robust folder selection again
            sent_folder_found = False
            for folder in ['"Sent"', '"Sent Items"', '"[Gmail]/Sent Mail"', 'Sent', 'Sent Items']:
                try:
                    status, _ = imap.select(folder)
                    if status == 'OK':
                        sent_folder_found = True
                        # Append the message
                        imap.append(folder, '\\Seen', imaplib.Time2Internaldate(time.time()), msg.as_bytes())
                        print(f"✅ Email saved to {folder}.")
                        break
                except:
                    continue
            
            if not sent_folder_found:
                print("⚠️ Could not find a Sent folder to save the email.")
            
            imap.logout()
                
        except Exception as imap_err:
            print(f"⚠️ Sent via SMTP, but failed to save to Sent folder: {imap_err}")

        return {"message": f"Email sent successfully via {smtp_host}"}

    except Exception as e:
        return {"error": f"SMTP Error ({smtp_host}): {str(e)}"}

def send_via_axigen(settings, sender, recipient, subject, body, filename, pdf_content, cc=None):
    # (Existing Axigen Logic - unchanged)
    api_url = get_clean_api_url(settings.get("axigen_api_url", ""))
    if not api_url:
        return {"error": "Axigen API URL not configured."}

    # ... (Rest of Axigen logic if needed, but Threading usually requires Message-ID tracking which Axigen API might handle differently)
    return {"error": "Axigen sending not fully implemented in this snippet."}