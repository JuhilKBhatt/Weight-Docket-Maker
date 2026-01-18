# ./backend/app/utilities/reset_tables.py 
from app.database import engine, Base
from app.models.invoiceModels import Invoice, InvoiceItem, TransportItem, Deduction
from app.models.docketModels import Docket, DocketItem, DocketDeduction 
from app.models.settingsModels import GlobalSetting, CurrencyOption, UnitOption

print("Deleting & Creating New database tables...")
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print("Database tables created successfully.")