# app/utilities/seed_data.py

from datetime import date
from app.database import SessionLocal
from app.models.invoiceModels import Invoice, InvoiceItem, TransportItem, Deduction

def seed_database():
    db = SessionLocal()

    print("🌱 Seeding data...")

    # --- Invoice 1: A Paid Container Invoice (AUD) ---
    inv1 = Invoice(
        scrinv_number="DEMO-001",
        invoice_date=date(2025, 5, 20),
        status="Paid",
        invoice_type="Container",
        currency="AUD",
        include_gst=True,
        gst_percentage=10.0,
        show_transport=True,
        notes="Thank you for your business!",
        private_notes="Paid on time, good client.",
        
        # Bill From
        bill_from_name="Safari Copper Recycling",
        bill_from_phone="0400 123 456",
        bill_from_email="accounts@safari.com.au",
        bill_from_abn="11 222 333 444",
        bill_from_address="123 Scrap Yard Rd, Sydney NSW",

        # Bill To
        bill_to_name="Global Exports Pty Ltd",
        bill_to_phone="0411 987 654",
        bill_to_email="admin@globalexports.com",
        bill_to_abn="99 888 777 666",
        bill_to_address="456 Port Drive, Melbourne VIC",

        # Bank
        bank_name="CommonBank",
        account_name="Safari Copper Recycling",
        bsb="062-000",
        account_number="1234 5678"
    )

    # Items for Inv1
    inv1.items.append(InvoiceItem(
        seal="S1001", container_number="CONT-A1", description="Copper Berry/Candy",
        quantity=22.5, price=9200.00, unit="t"
    ))
    inv1.items.append(InvoiceItem(
        seal="S1002", container_number="CONT-A2", description="PVC Copper Wire",
        quantity=18.2, price=4500.00, unit="t"
    ))

    # Transport for Inv1
    inv1.transport_items.append(TransportItem(
        name="Cartage to Port", num_of_ctr=2, price_per_ctr=350.00
    ))
    
    # Deductions for Inv1
    inv1.deductions.append(Deduction(
        type="pre", label="Moisture Claim", amount=500.00
    ))


    # --- Invoice 2: A Draft Pickup Invoice (USD) ---
    inv2 = Invoice(
        scrinv_number="DEMO-002",
        invoice_date=date(2025, 6, 1),
        status="Draft",
        invoice_type="Pickup",
        currency="USD",
        include_gst=False,
        gst_percentage=0.0,
        show_transport=False,
        notes="Pending confirmation on rates.",
        private_notes="Waiting for market prices to stabilize.",

        bill_from_name="Safari Copper Recycling",
        bill_to_name="US Metal Traders LLC",
        bill_to_address="789 Industrial Ave, Texas USA",
    )
    
    inv2.items.append(InvoiceItem(
        metal="Aluminum", description="Taint Tabor", quantity=10.0, price=1800.00, unit="t"
    ))


    # --- Invoice 3: Unpaid Invoice ---
    inv3 = Invoice(
        scrinv_number="DEMO-003",
        invoice_date=date(2025, 6, 15),
        status="Unpaid",
        invoice_type="Other",
        currency="AUD",
        include_gst=True,
        gst_percentage=10.0,
        show_transport=False,
        notes="Please pay within 7 days.",
        
        bill_from_name="Safari Copper Recycling",
        bill_to_name="Local Scrapyard",
    )
    
    inv3.items.append(InvoiceItem(
        description="Consulting Fees", quantity=5.0, price=100.00, unit="hrs"
    ))


    # --- Add to DB ---
    try:
        db.add(inv1)
        db.add(inv2)
        db.add(inv3)
        db.commit()
        print("✅ Successfully injected 3 example invoices!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error injecting data (records might already exist): {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()