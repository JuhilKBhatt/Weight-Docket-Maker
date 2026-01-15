# app/routes/docketRoutes.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.database import get_db
from app.schema.docketSchema import DocketCreate
from app.services.docket import docket_crud, docket_list, docket_pdf, inventory_service, docket_printer

router = APIRouter(
    prefix="/api/dockets",
    tags=["Dockets"]
)

# --- CREATE NEW ID ---
@router.post("/new")
def create_docket_id(db: Session = Depends(get_db)):
    return docket_crud.generate_new_docket_id(db)

# --- SAVE / UPSERT DOCKET ---
@router.post("/saveDocket")
def save_docket(data: DocketCreate, db: Session = Depends(get_db)):
    return docket_crud.upsert_docket(db, data)

# --- READ / LIST ---
@router.get("/list")
def get_dockets(db: Session = Depends(get_db)):
    return docket_list.get_all_dockets_calculated(db)

@router.get("/{docket_id}")
def get_docket(docket_id: int, db: Session = Depends(get_db)):
    return docket_crud.get_docket_by_id(db, docket_id)

# --- INVENTORY REPORT ---
@router.get("/inventory-report")
def get_inventory_report(
    start_date: date, 
    end_date: date, 
    metal: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    return inventory_service.get_inventory_report(db, start_date, end_date, metal)

# --- PREVIEW (HTML) ---
@router.get("/{docket_id}/preview", response_class=HTMLResponse)
def preview_docket(docket_id: int, db: Session = Depends(get_db)):
    return docket_pdf.render_docket_html(db, docket_id)

# --- DOWNLOAD (PDF) ---
@router.get("/{docket_id}/download")
def download_docket(docket_id: int, db: Session = Depends(get_db)):
    pdf_buffer = docket_pdf.generate_docket_pdf(db, docket_id)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=docket_{docket_id}.pdf"}
    )

# --- PRINT TO PRINTER ---
@router.post("/{docket_id}/print")
def print_docket(docket_id: int, copies: int = 1, db: Session = Depends(get_db)):
    return docket_printer.print_docket_to_printer(db, docket_id, copies)

@router.get("/print-status/{filename}")
def check_print_status(filename: str):
    return docket_printer.check_print_status(filename)

# --- DELETE ---
@router.delete("/{docket_id}")
def delete_docket(docket_id: int, db: Session = Depends(get_db)):
    return docket_list.delete_docket(db, docket_id)