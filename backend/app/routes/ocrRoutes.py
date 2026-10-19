# backend/app/routes/ocrRoutes.py

from typing import List
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.schema.ocrSchema import DocketOCRResponse, CustomerIDOCRResponse
from app.services.ocr.ocr_service import scan_docket_pages, scan_customer_id_card
from app.services.ocr.prompts import MATERIAL_WHITELIST

router = APIRouter(
    prefix="/api/ocr",
    tags=["OCR"],
)


@router.post("/scan-docket", response_model=DocketOCRResponse)
@router.post("/docket", response_model=DocketOCRResponse, include_in_schema=False)
async def scan_docket_endpoint(
    files: List[UploadFile] = File(..., description="1 to N photos of handwritten docket pages"),
):
    """
    Extracts customer name, date, and line entries (gross, tare, extra_deduction, material, price)
    from one or more handwritten scrap metal docket photos.
    Supports multi-page / double-sided dockets with automatic header inheritance.
    """
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one docket image.")

    raw_pages: List[bytes] = []
    for upload in files:
        content = await upload.read()
        if content:
            raw_pages.append(content)

    if not raw_pages:
        raise HTTPException(status_code=400, detail="Uploaded docket image files are empty.")

    return await scan_docket_pages(raw_pages)


@router.post("/scan-id", response_model=CustomerIDOCRResponse)
@router.post("/id", response_model=CustomerIDOCRResponse, include_in_schema=False)
async def scan_customer_id_endpoint(
    file: UploadFile = File(..., description="Photo of Australian Driver's Licence, Photo Card, or Passport"),
):
    """
    Extracts identity compliance details (name, license_number, dob, address, expiry_date)
    from an Australian Driver's Licence, Photo Card, or Passport in-memory.
    """
    if not file:
        raise HTTPException(status_code=400, detail="Please upload an ID card image.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded ID image file is empty.")

    return await scan_customer_id_card(content)


@router.get("/materials")
async def get_material_whitelist():
    """Returns the canonical normalized scrap metal material whitelist."""
    return {"materials": MATERIAL_WHITELIST}

