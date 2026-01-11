# app/utilities/scrdkt_generator.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.docketModels import Docket

def generate_next_scrdkt(db: Session) -> str:
    # 1. Start with the next predicted ID based on the table's max ID
    max_id = db.query(func.max(Docket.id)).scalar()
    # Start at 1 if DB is empty, otherwise continue from last ID
    next_idx = (max_id or 0) + 1

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
            raise ValueError("SCRDKT range exhausted (Limit 9Z9999 reached)")

        # --- FORMATTING ---
        # Format: SCRDKT + 1 + A + 0001
        candidate_scrdkt = f"SCRDKT{leading_digit}{letter_part}{digits_part:04d}"

        # --- COLLISION CHECK ---
        exists = db.query(Docket).filter(Docket.scrdkt_number == candidate_scrdkt).first()

        if not exists:
            # Found a unique number!
            return candidate_scrdkt
        
        # 4. If taken, increment and try again
        next_idx += 1