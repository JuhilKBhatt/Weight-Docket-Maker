# ./backend/app/utilities/create_tables.py
from app.database import engine, Base
from app.models.invoiceModels import Invoice, InvoiceItem, TransportItem, Deduction

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)