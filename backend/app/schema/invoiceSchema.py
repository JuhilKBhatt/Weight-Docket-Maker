from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class ItemSchema(BaseModel):
    description: str
    quantity: float
    price: float
    seal: Optional[str] = None
    container_number: Optional[str] = None
    metal: Optional[str] = None
    unit: Optional[str] = "t"


class TransportSchema(BaseModel):
    name: str
    num_of_ctr: float
    price_per_ctr: float


class DeductionSchema(BaseModel):
    type: str
    label: str
    amount: float


class InvoiceCreate(BaseModel):
    scrinv_number: str
    invoice_date: Optional[date] = None
    status: Optional[str] = "Draft"
    invoice_type: str
    currency: str
    include_gst: bool
    gst_percentage: float = 10.0
    show_transport: bool
    notes: str
    private_notes: Optional[str] = ""

    bill_from_name: str
    bill_from_phone: str
    bill_from_email: str
    bill_from_abn: str
    bill_from_address: str

    bill_to_name: str
    bill_to_phone: str
    bill_to_email: str
    bill_to_abn: str
    bill_to_address: str

    bank_name: str
    account_name: str
    bsb: str
    account_number: str

    items: List[ItemSchema] = []
    transport_items: List[TransportSchema] = []
    deductions: List[DeductionSchema] = []