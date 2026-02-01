# backend/app/utilities/reset_tables.py 
from app.database import engine, Base
# Import all models to ensure they are registered with Base.metadata
from app.models.invoiceModels import (
    Invoice, InvoiceItem, TransportItem, Deduction, 
    SavedBillFrom, SavedBillTo, SavedAccount
)
from app.models.docketModels import Docket, DocketItem, DocketDeduction 
from app.models.settingsModels import GlobalSetting, CurrencyOption, UnitOption

# Define groups of tables for selective resetting
TABLE_GROUPS = {
    "dockets": [
        Docket.__table__, 
        DocketItem.__table__, 
        DocketDeduction.__table__
    ],
    "invoices": [
        Invoice.__table__, 
        InvoiceItem.__table__, 
        TransportItem.__table__, 
        Deduction.__table__,
        SavedBillFrom.__table__, 
        SavedBillTo.__table__, 
        SavedAccount.__table__
    ],
    "settings": [
        GlobalSetting.__table__, 
        CurrencyOption.__table__, 
        UnitOption.__table__
    ]
}

def reset_database(groups=None):
    """
    Resets tables based on the list of group keys provided.
    If groups is None or empty, resets ALL tables.
    """
    tables_to_process = []

    if not groups:
        print("⚠️  Targeting ALL tables...")
        print("Deleting ALL tables...")
        Base.metadata.drop_all(bind=engine)
        print("Creating ALL tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ All database tables reset successfully.")
        return

    # Collect specific tables based on selected groups
    for key in groups:
        if key in TABLE_GROUPS:
            tables_to_process.extend(TABLE_GROUPS[key])

    if not tables_to_process:
        print("❌ No valid tables selected to reset.")
        return

    print(f"🔄 Resetting tables for: {', '.join(groups).upper()}...")
    
    # Drop specific tables
    Base.metadata.drop_all(bind=engine, tables=tables_to_process)
    
    # Recreate specific tables
    Base.metadata.create_all(bind=engine, tables=tables_to_process)
    
    print("✅ Selected tables reset successfully.")

if __name__ == "__main__":
    # Allow running directly for a full reset (backward compatibility)
    print("⚠️  Running reset_tables.py directly will reset ALL tables.")
    confirm = input("Are you sure? (yes/no): ")
    if confirm.lower() == "yes":
        reset_database()
    else:
        print("Cancelled.")