from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from decimal import Decimal


class InvoiceItemSchema(BaseModel):
    description: str
    seal: Optional[str]
    container: Optional[str]
    weight: Decimal
    price: Decimal
    total: Decimal


class TransportChargeSchema(BaseModel):
    name: str
    NumOfCTR: int
    PricePreCTR: Decimal


class DeductionSchema(BaseModel):
    label: str
    amount: Decimal


class InvoiceCreateSchema(BaseModel):
    scrNumber: int
    date: date
    invoiceType: str
    includeGST: bool
    grossTotal: Decimal
    gstAmount: Decimal
    finalTotal: Decimal

    fromCompany: dict
    toCompany: dict
    bankAccount: dict

    items: List[InvoiceItemSchema]
    transportItems: List[TransportChargeSchema] = []
    preGstDeductions: List[DeductionSchema] = []
    postGstDeductions: List[DeductionSchema] = []