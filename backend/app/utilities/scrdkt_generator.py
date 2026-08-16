# app/utilities/scrdkt_generator.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.docketModels import Docket

def get_next_idx_from_string(scrdkt: str) -> int:
    if not scrdkt:
        return 0
    prefix = "SCR" if scrdkt.startswith("SCR") else "UN" if scrdkt.startswith("UN") else ""
    if not prefix: return 0
    
    rest = scrdkt[len(prefix):]
    if len(rest) < 6: return 0
    
    try:
        leading_digit = int(rest[0])
        letter_part = rest[1]
        digits_part = int(rest[2:])
        
        letter_val = ord(letter_part) - 65
        remainder_for_letter = (leading_digit - 1) * 26 + letter_val
        return remainder_for_letter * 10000 + digits_part
    except:
        return 0

def generate_next_scrdkt(db: Session, prefix: str = "SCR") -> str:
    dockets = db.query(Docket.scrdkt_number).filter(Docket.scrdkt_number.like(f"{prefix}%")).all()
    
    max_idx = 0
    for d in dockets:
        if d[0]:
            idx = get_next_idx_from_string(d[0])
            if idx > max_idx:
                max_idx = idx
                
    next_idx = max_idx + 1

    while True:
        digits_part = next_idx % 10000
        remainder_for_letter = next_idx // 10000
        letter_val = remainder_for_letter % 26
        letter_part = chr(65 + letter_val)
        leading_digit = (remainder_for_letter // 26) + 1

        if leading_digit > 9:
            raise ValueError(f"{prefix} range exhausted (Limit 9Z9999 reached)")

        candidate_scrdkt = f"{prefix}{leading_digit}{letter_part}{digits_part:04d}"

        exists = db.query(Docket).filter(Docket.scrdkt_number == candidate_scrdkt).first()
        if not exists:
            return candidate_scrdkt
        
        next_idx += 1