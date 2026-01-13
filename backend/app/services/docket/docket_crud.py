# app/services/docket/docket_crud.py

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.docketModels import Docket, DocketItem, DocketDeduction
from app.schema.docketSchema import DocketCreate
from app.utilities.scrdkt_generator import generate_next_scrdkt

def generate_new_docket_id(db: Session):
    # 1. Generate the unique ID
    scrdkt = generate_next_scrdkt(db)
    
    # 2. Create a placeholder record (Draft) to "reserve" it
    new_docket = Docket(scrdkt_number=scrdkt, status="Draft")
    db.add(new_docket)
    db.commit()
    
    # 3. Return it to the frontend
    return {"scrdkt_id": f"{scrdkt}"}

def upsert_docket(db: Session, data: DocketCreate):
    # Check if exists
    docket = db.query(Docket).filter(Docket.scrdkt_number == data.scrdkt_number).first()

    if docket:
        # --- UPDATE EXISTING ---
        docket.docket_date = data.docket_date
        docket.docket_time = data.docket_time
        docket.status = data.status
        docket.is_saved = data.is_saved
        docket.print_qty = data.print_qty
        docket.docket_type = data.docket_type
        docket.company_name = data.company_name
        docket.include_gst = data.include_gst
        docket.gst_percentage = data.gst_percentage
        docket.notes = data.notes

        # Customer Details
        docket.customer_name = data.customer_name
        docket.customer_address = data.customer_address
        docket.customer_phone = data.customer_phone
        docket.customer_abn = data.customer_abn
        docket.customer_license_no = data.customer_license_no
        docket.customer_rego_no = data.customer_rego_no
        docket.customer_dob = data.customer_dob
        docket.customer_pay_id = data.customer_pay_id
        
        # Bank Details
        docket.bank_bsb = data.bank_bsb
        docket.bank_account_number = data.bank_account_number

        # Clear old items to replace with new ones
        db.query(DocketItem).filter(DocketItem.docket_id == docket.id).delete()
        db.query(DocketDeduction).filter(DocketDeduction.docket_id == docket.id).delete()
    
    else:
        # --- CREATE NEW (Fallback) ---
        docket = Docket(
            scrdkt_number=data.scrdkt_number,
            docket_date=data.docket_date,
            docket_time=data.docket_time,
            status=data.status,
            is_saved=data.is_saved,
            print_qty=data.print_qty,
            docket_type=data.docket_type,
            company_name=data.company_name,
            include_gst=data.include_gst,
            gst_percentage=data.gst_percentage,
            notes=data.notes,
            customer_name=data.customer_name,
            customer_address=data.customer_address,
            customer_phone=data.customer_phone,
            customer_abn=data.customer_abn,
            customer_license_no=data.customer_license_no,
            customer_rego_no=data.customer_rego_no,
            customer_dob=data.customer_dob,
            customer_pay_id=data.customer_pay_id,
            bank_bsb=data.bank_bsb,
            bank_account_number=data.bank_account_number
        )
        db.add(docket)
        db.flush() # Flush to get the new docket.id

    # --- ADD ITEMS ---
    for i in data.items:
        db.add(DocketItem(
            docket_id=docket.id,
            metal=i.metal,
            row_notes=i.notes,
            gross=i.gross,
            tare=i.tare,
            price=i.price
        ))

    # --- ADD DEDUCTIONS ---
    for d in data.deductions:
        db.add(DocketDeduction(
            docket_id=docket.id,
            type=d.type,
            label=d.label,
            amount=d.amount
        ))

    db.commit()
    return {"message": "docket saved", "id": docket.id}