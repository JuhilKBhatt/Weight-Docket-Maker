# app/utilities/scrinv_generator.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.invoiceModels import Invoice

def generate_next_scrinv(db: Session) -> str:
    max_id = db.query(func.max(Invoice.id)).scalar()
    
    #Predict the next ID (if table is empty, start at 1)
    next_id = (max_id or 0) + 1

    CYCLE_SIZE = 9999
    cycle_index = (next_id - 1) // CYCLE_SIZE
    letter_code = 65 + cycle_index
    letter = chr(letter_code)

    # Check limit (Stop after Z)
    if letter > 'Z':
        raise ValueError("SCRINV range exhausted (ID too high)")

    number_part = (next_id - 1) % CYCLE_SIZE + 1

    # 4. Format (e.g., A0005)
    return f"{letter}{number_part:04d}"