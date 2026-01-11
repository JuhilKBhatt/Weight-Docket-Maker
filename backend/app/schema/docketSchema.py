# app/schema/docketSchema.py

from pydantic import BaseModel
from typing import List, Optional
from datetime import date

# --- ITEM SCHEMA ---
class DocketItemSchema(BaseModel):
    metal: Optional[str] = None
    notes: Optional[str] = None # Row-level notes
    gross: float
    tare: float
    price: float

    class Config:
        from_attributes = True

# --- DEDUCTION SCHEMA ---
class DocketDeductionSchema(BaseModel):
    type: str # "pre" or "post"
    label: str
    amount: float

    class Config:
        from_attributes = True

# --- CREATE / UPDATE SCHEMA ---
class DocketCreate(BaseModel):
    scrdkt_number: Optional[str] = None
    docket_date: Optional[date] = None
    status: Optional[str] = "Draft"
    is_saved: bool = True
    print_qty: int = 0
    
    docket_type: str
    company_name: Optional[str] = None
    
    include_gst: bool
    gst_percentage: float = 10.0
    
    # Customer Details
    customer_name: Optional[str] = ""
    customer_address: Optional[str] = ""
    customer_phone: Optional[str] = ""
    customer_abn: Optional[str] = ""
    customer_license_no: Optional[str] = ""
    customer_rego_no: Optional[str] = ""
    customer_dob: Optional[date] = None
    customer_pay_id: Optional[str] = ""
    
    # Bank Details
    bank_bsb: Optional[str] = ""
    bank_account_number: Optional[str] = ""

    # General Notes
    notes: Optional[str] = ""

    # Relationships
    items: List[DocketItemSchema] = []
    deductions: List[DocketDeductionSchema] = []