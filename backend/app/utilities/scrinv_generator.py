# app/utilities/scrinv_generator.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.invoiceModels import Invoice

def generate_next_scrinv(db: Session) -> str:
    # 1. Start with the next predicted ID based on the count of existing SCRINV invoices
    count = db.query(Invoice).filter(Invoice.scrinv_number.like("SCRINV%")).count()
    next_idx = count + 1

    while True:
        # 1. Last 4 Digits (0000-9999)
        digits_part = next_idx % 10000
        
        # 2. Letter (A-Z)
        remainder_for_letter = next_idx // 10000
        letter_val = remainder_for_letter % 26
        letter_part = chr(65 + letter_val)

        # 3. Leading Digit (1-9)
        leading_digit = (remainder_for_letter // 26) + 1

        # Check for Exhaustion (if we go past 9Z9999)
        if leading_digit > 9:
            raise ValueError("SCRINV range exhausted (Limit 9Z9999 reached)")

        # --- FORMATTING ---
        candidate_scrinv = f"SCRINV{leading_digit}{letter_part}{digits_part:04d}"

        # --- COLLISION CHECK ---
        exists = db.query(Invoice).filter(Invoice.scrinv_number == candidate_scrinv).first()

        if not exists:
            # Found a unique number!
            return candidate_scrinv
        
        # 4. If taken, increment and try again
        next_idx += 1