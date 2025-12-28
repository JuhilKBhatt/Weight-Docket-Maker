from pydantic import BaseModel
from typing import List, Optional


class ItemSchema(BaseModel):
    description: str
    quantity: float
    price: float
    seal: Optional[str] = None
    container_number: Optional[str] = None
    metal: Optional[str] = None


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
    invoice_date: Optional[str] = None
    status: Optional[str] = "Draft"
    invoice_type: str
    include_gst: bool
    show_transport: bool
    notes: str

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