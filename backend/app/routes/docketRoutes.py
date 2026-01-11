# app/routes/docketRoutes.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.schema.docketSchema import DocketCreate
from app.services.docket import docket_crud, docket_list , docket_pdf

router = APIRouter(
    prefix="/api/dockets",
    tags=["Dockets"]
)

# --- CREATE NEW ID ---
@router.post("/new")
def create_docket_id(db: Session = Depends(get_db)):
    return docket_crud.generate_new_docket_id(db)

# --- SAVE / UPSERT DOCKET ---
@router.post("/saveDraft")
def save_docket(data: DocketCreate, db: Session = Depends(get_db)):
    return docket_crud.upsert_docket(db, data)

# --- READ / LIST ---
@router.get("/list")
def get_dockets(db: Session = Depends(get_db)):
    return docket_list.get_all_dockets_calculated(db)

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

# --- DELETE ---
@router.delete("/{docket_id}")
def delete_docket(docket_id: int, db: Session = Depends(get_db)):
    return docket_list.delete_docket(db, docket_id)