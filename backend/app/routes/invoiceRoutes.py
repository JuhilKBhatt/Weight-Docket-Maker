# app/routes/invoiceRoutes.py

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse, HTMLResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.schema.invoiceSchema import InvoiceCreate
from pydantic import BaseModel

from app.services.invoice import invoice_crud, invoice_list, invoice_status, invoice_pdf, selector_service
from app.services import email_service
class NoteUpdate(BaseModel):
    private_notes: str

router = APIRouter(
    prefix="/api/invoices",
    tags=["Invoices"]
)

# --- CREATE / SAVE ---
@router.post("/new")
def create_invoice(db: Session = Depends(get_db)):
    return invoice_crud.generate_new_id(db)

@router.post("/saveDraft")
def save_invoice(data: InvoiceCreate, db: Session = Depends(get_db)):
    return invoice_crud.upsert_invoice(db, data)

@router.get("/{invoice_id}/preview", response_class=HTMLResponse)
def preview_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    return invoice_pdf.render_invoice_html(db, invoice_id)

@router.get("/{invoice_id}/download")
def download_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    pdf_buffer = invoice_pdf.generate_invoice_pdf(db, invoice_id)
    
    # Return as a file download
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=invoice_{invoice_id}.pdf"}
    )

# --- READ / LIST ---
@router.get("/list")
def get_invoices(db: Session = Depends(get_db)):
    return invoice_list.get_all_invoices_calculated(db)

@router.get("/selectorsData")
def get_selectors_data(db: Session = Depends(get_db)):
    return selector_service.get_and_sync_selectors(db)

@router.delete("/selectors/{type}/{id}")
def delete_selector_item(type: str, id: int, db: Session = Depends(get_db)):
    return selector_service.delete_selector(db, type, id)

@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    return invoice_crud.get_invoice_by_id(db, invoice_id)

# --- DELETE INVOICE ---
@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    return invoice_crud.delete_invoice(db, invoice_id)

# --- UPDATE STATUS ---
@router.post("/{invoice_id}/status/{status_type}")
def update_invoice_status(invoice_id: int, status_type: str, db: Session = Depends(get_db)):
    return invoice_status.update_status(db, invoice_id, status_type)

@router.patch("/{invoice_id}/private-notes")
def update_private_notes_route(invoice_id: int, note_data: NoteUpdate, db: Session = Depends(get_db)):
    return invoice_crud.update_private_notes(db, invoice_id, note_data.private_notes)

class EmailRequest(BaseModel):
    recipient: str
    subject: str
    body: str

@router.post("/{invoice_id}/email")
def send_invoice_email_route(invoice_id: int, email_data: EmailRequest, db: Session = Depends(get_db)):
    result = email_service.send_invoice_email(
        db, 
        invoice_id, 
        email_data.recipient, 
        email_data.subject, 
        email_data.body
    )
    
    if "error" in result:
        # We return 200 with error message to handle it gracefully in frontend
        return {"success": False, "message": result["error"]}
        
    # Update status to Sent
    invoice_status.update_status(db, invoice_id, "sent")
    
    return {"success": True, "message": "Email sent successfully"}