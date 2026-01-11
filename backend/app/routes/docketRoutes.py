# app/routes/docketRoutes.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schema.docketSchema import DocketCreate
from app.services.docket import docket_crud

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