# backend/app/schema/ocrSchema.py

from typing import List, Optional, Literal, Any
from pydantic import BaseModel, Field, field_validator


# --- DOCKET OCR SCHEMAS ---

DocketFlag = Literal[
    "gross_corrected",
    "tare_corrected",
    "material_corrected",
    "gross_crossed_out",
    "tare_crossed_out",
    "material_crossed_out",
    "tare_hidden",
    "material_partial",
    "ambiguous_digit",
    "maybe_voided",
]

ConfidenceLevel = Literal["high", "medium", "low"]


class DocketLineEntry(BaseModel):
    line: int = Field(default=1, description="1-indexed physical line number on the docket")
    raw_text: str = Field(
        default="",
        description="Exact transcription of what is visible on the line before normalisation",
    )
    gross: Optional[int] = Field(
        default=None, description="Gross weight as integer, or null if hidden/unreadable"
    )
    tare: Optional[int] = Field(
        default=None, description="Tare weight as integer, or null if hidden/unreadable"
    )
    extra_deduction: Optional[int] = Field(
        default=None,
        description="Extra deduction weight as integer if present, otherwise null",
    )
    material: Optional[str] = Field(
        default=None, description="Normalized scrap metal material name, or null"
    )
    price: Optional[float] = Field(
        default=None, description="Unit price if written on the line, otherwise null"
    )
    flags: List[str] = Field(
        default_factory=list,
        description="Flags from allowed list (e.g. tare_hidden, gross_corrected)",
    )
    confidence: ConfidenceLevel = Field(
        default="low", description="Confidence level: high, medium, or low"
    )
    page: Optional[int] = Field(
        default=1, description="1-indexed page number where this entry was found"
    )

    @field_validator("gross", "tare", "extra_deduction", mode="before")
    @classmethod
    def _coerce_int_weight(cls, v: Any) -> Optional[int]:
        if v is None or v == "" or v == "null":
            return None
        try:
            return int(round(float(v)))
        except (ValueError, TypeError):
            return None

    @field_validator("price", mode="before")
    @classmethod
    def _coerce_price(cls, v: Any) -> Optional[float]:
        if v is None or v == "" or v == "null":
            return None
        if isinstance(v, str):
            v = v.replace("$", "").strip()
        try:
            return float(v)
        except (ValueError, TypeError):
            return None

    @field_validator("flags", mode="before")
    @classmethod
    def _coerce_flags(cls, v: Any) -> List[str]:
        if not v or not isinstance(v, list):
            return []
        return [str(x).strip() for x in v if x]

    @field_validator("confidence", mode="before")
    @classmethod
    def _coerce_confidence(cls, v: Any) -> str:
        if not v or not isinstance(v, str):
            return "low"
        norm = v.strip().lower()
        return norm if norm in ("high", "medium", "low") else "low"


class DocketLLMOutput(BaseModel):
    customer: Optional[str] = Field(
        default=None, description="Customer name from top header, or null"
    )
    date: Optional[str] = Field(
        default=None, description="Docket date formatted as DD/MM/YYYY, or null"
    )
    entries: List[DocketLineEntry] = Field(
        default_factory=list, description="Extracted line items from the docket"
    )
    skipped_lines: List[int] = Field(
        default_factory=list,
        description="Physical line numbers of voided or struck-through lines",
    )

    @field_validator("skipped_lines", mode="before")
    @classmethod
    def _coerce_skipped_lines(cls, v: Any) -> List[int]:
        if not v or not isinstance(v, list):
            return []
        res = []
        for item in v:
            try:
                res.append(int(item))
            except (ValueError, TypeError):
                pass
        return res


class DocketOCRResponse(BaseModel):
    success: bool = True
    model_used: str
    execution_time_ms: int
    customer: Optional[str] = None
    date: Optional[str] = None
    entries: List[DocketLineEntry] = Field(default_factory=list)
    skipped_lines: List[int] = Field(default_factory=list)
    chaining_warnings: List[str] = Field(default_factory=list)
    pages_processed: int = 1


# --- CUSTOMER ID OCR SCHEMAS ---

IDType = Literal["driver_license", "photo_card", "passport", "other"]
JurisdictionType = Literal[
    "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT", "AUSTRALIA", "OTHER"
]

CustomerIDFlag = Literal[
    "glare_detected",
    "id_obscured",
    "expired_id",
    "ambiguous_character",
    "digital_license",
    "not_an_id",
]


class CustomerIDLLMOutput(BaseModel):
    id_type: IDType = Field(
        default="other",
        description="Document type: driver_license | photo_card | passport | other",
    )
    jurisdiction: JurisdictionType = Field(
        default="OTHER",
        description="Jurisdiction: NSW | VIC | QLD | WA | SA | TAS | ACT | NT | AUSTRALIA | OTHER",
    )
    name: Optional[str] = Field(
        default=None,
        description="Full name in [Given Names] [SURNAME] format, or null",
    )
    license_number: Optional[str] = Field(
        default=None,
        description="Primary licence/permit/ID number (distinct from card number), or null",
    )
    dob: Optional[str] = Field(
        default=None, description="Date of birth strictly as DD/MM/YYYY, or null"
    )
    address: Optional[str] = Field(
        default=None,
        description="Clean single-line residential address, or null",
    )
    expiry_date: Optional[str] = Field(
        default=None, description="Expiry date strictly as DD/MM/YYYY, or null"
    )
    flags: List[str] = Field(
        default_factory=list,
        description="Flags from allowed list (glare_detected, id_obscured, expired_id, ambiguous_character, digital_license, not_an_id)",
    )
    confidence: ConfidenceLevel = Field(
        default="low", description="Confidence level: high, medium, or low"
    )

    @field_validator("id_type", mode="before")
    @classmethod
    def _coerce_id_type(cls, v: Any) -> str:
        if not v or not isinstance(v, str):
            return "other"
        norm = v.strip().lower().replace("licence", "license")
        return norm if norm in ("driver_license", "photo_card", "passport", "other") else "other"

    @field_validator("jurisdiction", mode="before")
    @classmethod
    def _coerce_jurisdiction(cls, v: Any) -> str:
        if not v or not isinstance(v, str):
            return "OTHER"
        norm = v.strip().upper()
        allowed = {"NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT", "AUSTRALIA", "OTHER"}
        return norm if norm in allowed else "OTHER"

    @field_validator("flags", mode="before")
    @classmethod
    def _coerce_flags(cls, v: Any) -> List[str]:
        if not v or not isinstance(v, list):
            return []
        return [str(x).strip() for x in v if x]

    @field_validator("confidence", mode="before")
    @classmethod
    def _coerce_confidence(cls, v: Any) -> str:
        if not v or not isinstance(v, str):
            return "low"
        norm = v.strip().lower()
        return norm if norm in ("high", "medium", "low") else "low"


class CustomerIDData(CustomerIDLLMOutput):
    is_expired: bool = False
    is_underage: bool = False
    validation_warnings: List[str] = Field(default_factory=list)


class CustomerIDOCRResponse(BaseModel):
    success: bool = True
    model_used: str
    execution_time_ms: int
    data: CustomerIDData

