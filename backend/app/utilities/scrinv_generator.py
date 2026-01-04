# app/utilities/scrinv_generator.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.invoiceModels import Invoice

def generate_next_scrinv(db: Session) -> str:
    # 1. Start with the next predicted ID based on the table's max ID
    max_id = db.query(func.max(Invoice.id)).scalar()
    next_id = (max_id or 0) + 1

    CYCLE_SIZE = 9999

    # 2. Loop to find the first FREE scrinv_number
    while True:
        cycle_index = (next_id - 1) // CYCLE_SIZE
        letter_code = 65 + cycle_index
        letter = chr(letter_code)

        # Check limit (Stop after Z)
        if letter > 'Z':
            raise ValueError("SCRINV range exhausted (ID too high)")

        number_part = (next_id - 1) % CYCLE_SIZE + 1
        
        # Format the candidate (e.g., SCRINVA0007)
        candidate_scrinv = f"SCRINV{letter}{number_part:04d}"

        # 3. Check database for collision
        exists = db.query(Invoice).filter(Invoice.scrinv_number == candidate_scrinv).first()

        if not exists:
            # Found a unique number!
            return candidate_scrinv
        
        # 4. If taken, increment and try again
        next_id += 1