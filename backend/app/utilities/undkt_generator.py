# app/utilities/undkt_generator.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.docketModels import Docket

def generate_next_undkt(db: Session) -> str:
    count = db.query(Docket).filter(Docket.scrdkt_number.like("UNDKT%")).count()
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

        if leading_digit > 9:
            raise ValueError("UNDKT range exhausted")

        # --- FORMATTING ---
        candidate_undkt = f"UNDKT{leading_digit}{letter_part}{digits_part:04d}"

        # --- COLLISION CHECK ---
        exists = db.query(Docket).filter(Docket.scrdkt_number == candidate_undkt).first()

        if not exists:
            return candidate_undkt
        
        next_idx += 1
