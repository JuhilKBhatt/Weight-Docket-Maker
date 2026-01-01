# ./backend/app/utilities/show_data.py
from app.database import SessionLocal
from app.models.invoiceModels import Invoice

# create a DB session
db = SessionLocal()

invoices = db.query(Invoice).all()

for inv in invoices:
    print(f"Invoice: {inv.scrinv_number}")
    print(f"  ID: {inv.id}")
    print(f"  Currency: {inv.currency}")
    print(f"  Date: {inv.invoice_date}, Type: {inv.invoice_type}, Status: {inv.status}")
    print(f"  From: {inv.bill_from_name}, {inv.bill_from_address}, {inv.bill_from_abn}")
    print(f"  To: {inv.bill_to_name}, {inv.bill_to_address}, {inv.bill_to_abn}")
    print(f"  Bank: {inv.bank_name}, {inv.account_name}, {inv.bsb}, {inv.account_number}")
    print(f"  Notes: {inv.notes}")
    print("  Items:")
    for item in inv.items:
        print(f"    {item.description} — Qty: {item.quantity}, Price: ${item.price}")
        if item.seal:
            print(f"      Seal: {item.seal}")
        if item.container_number:
            print(f"      Container Number: {item.container_number}")
        if item.metal:
            print(f"      Metal: {item.metal}")
    print("  Transport Items:")
    for t in inv.transport_items:
        print(f"    {t.name} — {t.num_of_ctr} containers, ${t.price_per_ctr} each")
    print("  Deductions:")
    for d in inv.deductions:
        print(f"    {d.type} — {d.label}: ${d.amount}")
    print("-" * 40)