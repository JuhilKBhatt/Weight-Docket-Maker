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
    is_paid: Optional[bool] = False
    invoice_type: Optional[str] = "Container"
    include_gst: Optional[bool] = True
    show_transport: Optional[bool] = False
    notes: Optional[str] = None

    bill_from_name: Optional[str] = None
    bill_from_phone: Optional[str] = None
    bill_from_email: Optional[str] = None
    bill_from_abn: Optional[str] = None
    bill_from_address: Optional[str] = None

    bill_to_name: Optional[str] = None
    bill_to_phone: Optional[str] = None
    bill_to_email: Optional[str] = None
    bill_to_abn: Optional[str] = None
    bill_to_address: Optional[str] = None

    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    bsb: Optional[str] = None
    account_number: Optional[str] = None

    items: List[ItemSchema] = []
    transport_items: List[TransportSchema] = []
    deductions: List[DeductionSchema] = []