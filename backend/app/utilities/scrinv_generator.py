# app/utilities/scrinv_generator.py

from sqlalchemy.orm import Session
from app.models.invoice import Invoice

def generate_next_scrinv(db: Session) -> str:
    last = (
        db.query(Invoice)
        .order_by(Invoice.scrinv_number.desc())
        .first()
    )

    if not last:
        return "A0001"

    letter = last.scrinv_number[0]
    number = int(last.scrinv_number[1:])

    if number < 9999:
        number += 1
        return f"{letter}{number:04d}"

    # rollover to next letter
    if letter == "Z":
        raise ValueError("SCRINV range exhausted")

    next_letter = chr(ord(letter) + 1)
    return f"{next_letter}0001"