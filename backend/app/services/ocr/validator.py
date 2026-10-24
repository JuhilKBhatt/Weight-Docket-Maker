# backend/app/services/ocr/validator.py

import re
from datetime import datetime, date
from typing import List, Optional, Tuple
from app.schema.ocrSchema import (
    DocketLineEntry,
    DocketLLMOutput,
    CustomerIDLLMOutput,
    CustomerIDData,
)
from app.services.ocr.prompts import MATERIAL_WHITELIST, MATERIAL_ABBREVIATIONS


def _normalize_alnum_key(text: str) -> str:
    """Strips spaces, dots, slashes, and punctuation and lowercases for fuzzy whitelist matching."""
    return re.sub(r"[^a-z0-9]", "", text.lower())


# Precompute lookup map from normalized alphanumeric key -> canonical material name
_WHITELIST_LOOKUP = {_normalize_alnum_key(m): m for m in MATERIAL_WHITELIST}


def normalize_material_name(raw_material: Optional[str]) -> Tuple[Optional[str], bool]:
    """
    Normalizes a material string against the exact MATERIAL_WHITELIST and known abbreviations.
    Returns (normalized_material, matched_whitelist).
    """
    if not raw_material or not raw_material.strip():
        return None, False

    cleaned = raw_material.strip()
    key = _normalize_alnum_key(cleaned)
    if not key:
        return None, False

    # 1. Exact alphanumeric match in whitelist (e.g. "m/wir" or "m.wire" -> "M. Wire")
    if key in _WHITELIST_LOOKUP:
        return _WHITELIST_LOOKUP[key], True

    # 2. Known abbreviations (e.g. "btr" -> "Battery", "mwir" -> "M. Wire", "crd" -> "RD. C")
    if key in MATERIAL_ABBREVIATIONS:
        return MATERIAL_ABBREVIATIONS[key], True

    # 3. Handle prefix/suffix "wir" -> "wire" or "stel" -> "steel" combinations
    key_expanded = (
        key.replace("mwir", "mwire")
        .replace("lwir", "lwire")
        .replace("hwir", "hwire")
        .replace("cwir", "cwire")
        .replace("carwir", "carwire")
        .replace("lstel", "lsteel")
        .replace("mstel", "msteel")
        .replace("hstel", "hsteel")
    )
    if key_expanded in _WHITELIST_LOOKUP:
        return _WHITELIST_LOOKUP[key_expanded], True

    # Not in whitelist: preserve raw transcription and mark unmatched
    return cleaned, False


def normalize_date_str(raw_date: Optional[str]) -> Optional[str]:
    """
    Normalizes DD/MM, DD/MM/YY, or DD/MM/YYYY (separated by /, ., ,, or -) into DD/MM/YYYY.
    """
    if not raw_date or not raw_date.strip():
        return None

    cleaned = raw_date.strip()
    parts = re.split(r"[/\.,\-]", cleaned)
    parts = [p.strip() for p in parts if p.strip()]

    today = date.today()
    try:
        if len(parts) == 2:
            day, month = int(parts[0]), int(parts[1])
            year = today.year
            dt = date(year, month, day)
            return dt.strftime("%d/%m/%Y")
        elif len(parts) == 3:
            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
            if year < 100:
                year += 2000 if year < 70 else 1900
            dt = date(year, month, day)
            return dt.strftime("%d/%m/%Y")
    except ValueError:
        pass

    return cleaned


def _parse_ddmmyyyy(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    normalized = normalize_date_str(date_str)
    if not normalized:
        return None
    try:
        return datetime.strptime(normalized, "%d/%m/%Y").date()
    except ValueError:
        return None


LOW_CONFIDENCE_DOCKET_FLAGS = {
    "gross_crossed_out",
    "tare_crossed_out",
    "material_crossed_out",
    "tare_hidden",
    "material_partial",
    "ambiguous_digit",
    "maybe_voided",
}


DITTO_MATERIAL_TOKENS = {
    "|",
    "||",
    "| |",
    "|  |",
    '"',
    '""',
    '" "',
    "''",
    "' '",
    "”",
    "“",
    "ditto",
    "same",
    "11",
    "1 1",
    "ii",
    "i i",
    "ll",
    "l l",
    "//",
    "/ /",
}


def _is_ditto_material(raw_material: Optional[str], raw_text: Optional[str]) -> bool:
    """
    Detects when an entry represents a handwritten '| |' (two vertical lines / ditto mark)
    repeating the material name from the line above.
    """
    if raw_material and raw_material.strip():
        cleaned = raw_material.strip().lower()
        if cleaned in DITTO_MATERIAL_TOKENS:
            return True
        if re.match(r"^[\|\'\"”‟“/\\1Il\s]{1,5}$", raw_material.strip()):
            return True

    if (not raw_material or not raw_material.strip()) and raw_text:
        if re.search(r"(?:\|\s*\||\"\"|''|”)\s*$", raw_text.strip()):
            return True

    return False


def validate_and_normalize_docket(
    docket: DocketLLMOutput,
) -> Tuple[DocketLLMOutput, List[str]]:
    """
    Runs deterministic domain rules on extracted Docket OCR output:
    1. Normalizes date to DD/MM/YYYY.
    2. Resolves '| |' ditto marks from preceding lines and normalizes material names against whitelist.
    3. Validates Gross - Tare - Extra Deduction >= 0.
    4. Enforces low confidence if required fields are null or low-confidence flags exist.
    5. Checks scale chaining across sequential entries and generates operator warnings.
    """
    docket.date = normalize_date_str(docket.date)
    if docket.customer is not None:
        docket.customer = docket.customer.strip() or None

    chaining_warnings: List[str] = []
    skipped_set = set(docket.skipped_lines or [])
    last_valid_material: Optional[str] = None
    last_valid_matched: bool = False

    for entry in docket.entries:
        flags_set = set(entry.flags or [])

        # Resolve "| |" ditto marks (inherits material from the line above, including across pages)
        if _is_ditto_material(entry.material, entry.raw_text) and last_valid_material:
            entry.material = last_valid_material
            if not last_valid_matched:
                entry.confidence = "low"
            elif entry.confidence == "low" and not flags_set.intersection(LOW_CONFIDENCE_DOCKET_FLAGS):
                entry.confidence = "high"
        elif entry.material:
            norm_mat, matched = normalize_material_name(entry.material)
            entry.material = norm_mat
            last_valid_material = norm_mat
            last_valid_matched = matched
            if not matched:
                entry.confidence = "low"
        else:
            entry.confidence = "low"

        # Check missing weights
        if entry.gross is None:
            entry.confidence = "low"

        if entry.tare is None and entry.extra_deduction is None:
            entry.confidence = "low"

        # Check arithmetic: Gross - Tare - Extra Deduction >= 0
        if entry.gross is not None:
            effective_tare = (entry.tare or 0) + (entry.extra_deduction or 0)
            net_weight = entry.gross - effective_tare
            if net_weight < 0:
                flags_set.add("ambiguous_digit")
                entry.confidence = "low"

        # Enforce low confidence when any low-confidence flag is present
        if flags_set.intersection(LOW_CONFIDENCE_DOCKET_FLAGS):
            entry.confidence = "low"

        entry.flags = sorted(list(flags_set))

    # Scale chaining check (detects broken unloading chains when mixed bins are unloaded)
    # Only warn if previous pair chained cleanly and the next consecutive line breaks chaining
    # without a voided line in between.
    if len(docket.entries) >= 3:
        for i in range(1, len(docket.entries) - 1):
            prev_e = docket.entries[i - 1]
            curr_e = docket.entries[i]
            next_e = docket.entries[i + 1]

            # Only compare lines on the same page with no skipped line in between
            if (
                prev_e.page == curr_e.page == next_e.page
                and prev_e.tare is not None
                and prev_e.tare > 0
                and curr_e.gross is not None
                and curr_e.tare is not None
                and curr_e.tare > 0
                and next_e.gross is not None
            ):
                prev_chained = prev_e.tare == curr_e.gross
                lines_between = set(range(curr_e.line + 1, next_e.line))
                has_void_between = bool(lines_between.intersection(skipped_set))

                if (
                    prev_chained
                    and not has_void_between
                    and curr_e.tare != next_e.gross
                    and curr_e.tare != next_e.tare
                ):
                    chaining_warnings.append(
                        f"Line {curr_e.line} → Line {next_e.line}: Tare ({curr_e.tare}) does not match "
                        f"next Gross ({next_e.gross}). Verify if bin unload sequence changed."
                    )

    return docket, chaining_warnings


STATE_LICENCE_PATTERNS = {
    "NSW": (r"^[A-Z0-9]{6,9}$", "NSW licence numbers are typically 8 digits (or 6–9 alphanumeric)."),
    "VIC": (r"^\d{8,9}$", "VIC licence numbers are typically 8–9 digits."),
    "QLD": (r"^\d{8,9}$", "QLD licence numbers are 8 or 9 digits."),
    "WA": (r"^\d{7}$", "WA licence numbers are typically 7 digits."),
    "SA": (r"^[A-Z]?\d{5,6}$", "SA licence numbers are 6 digits or a letter followed by 5–6 digits."),
    "TAS": (r"^[A-Z0-9]{6,9}$", "TAS licence numbers are 6 to 9 characters."),
    "ACT": (r"^[A-Z0-9]{6,9}$", "ACT licence numbers are 6 to 9 digits."),
    "NT": (r"^[A-Z0-9]{6,9}$", "NT licence numbers are 6 to 9 digits."),
}


def validate_customer_id(raw_id: CustomerIDLLMOutput) -> CustomerIDData:
    """
    Runs deterministic compliance checks on extracted Customer ID data:
    1. Cleans licence number (removes spaces/hyphens).
    2. Normalizes DOB and Expiry Date to DD/MM/YYYY.
    3. Validates state licence number format regex.
    4. Checks expiry date (< today -> is_expired=True, adds expired_id flag).
    5. Checks adult age (>= 18 years old).
    """
    flags_set = set(raw_id.flags or [])
    warnings: List[str] = []
    confidence = raw_id.confidence

    # Clean license number
    clean_lic = None
    if raw_id.license_number:
        clean_lic = re.sub(r"[\s\-]", "", raw_id.license_number).upper() or None

    norm_dob = normalize_date_str(raw_id.dob)
    norm_expiry = normalize_date_str(raw_id.expiry_date)

    today = date.today()
    is_expired = False
    is_underage = False

    # Check expiry date
    expiry_dt = _parse_ddmmyyyy(norm_expiry)
    if expiry_dt and expiry_dt < today:
        is_expired = True
        flags_set.add("expired_id")
        warnings.append(f"ID document expired on {norm_expiry}.")
    elif "expired_id" in flags_set:
        is_expired = True
        warnings.append("ID document appears to be expired.")

    # Check adult age (>= 18 years)
    dob_dt = _parse_ddmmyyyy(norm_dob)
    if dob_dt:
        age = today.year - dob_dt.year - ((today.month, today.day) < (dob_dt.month, dob_dt.day))
        if age < 18:
            is_underage = True
            warnings.append(f"Customer is under 18 years old (DOB: {norm_dob}, Age: {age}).")

    # State regex validation for driver licences
    if clean_lic and raw_id.id_type == "driver_license" and raw_id.jurisdiction in STATE_LICENCE_PATTERNS:
        pattern, msg = STATE_LICENCE_PATTERNS[raw_id.jurisdiction]
        if not re.match(pattern, clean_lic):
            warnings.append(f"Licence format note ({raw_id.jurisdiction}): {msg}")

    # Check core compliance fields
    if not raw_id.name or not clean_lic or not norm_dob:
        confidence = "low"

    if flags_set.intersection({"glare_detected", "id_obscured", "not_an_id", "ambiguous_character"}):
        confidence = "low"

    return CustomerIDData(
        id_type=raw_id.id_type,
        jurisdiction=raw_id.jurisdiction,
        name=raw_id.name.strip() if raw_id.name else None,
        license_number=clean_lic,
        dob=norm_dob,
        address=raw_id.address.strip() if raw_id.address else None,
        expiry_date=norm_expiry,
        flags=sorted(list(flags_set)),
        confidence=confidence,
        is_expired=is_expired,
        is_underage=is_underage,
        validation_warnings=warnings,
    )

