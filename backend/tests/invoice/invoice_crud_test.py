# ./backend/tests/invoice/invoice_crud_test.py

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException
from datetime import date

# Import your application code
from app.database import Base
from app.models.invoiceModels import Invoice, InvoiceItem
from app.schema.invoiceSchema import InvoiceCreate, ItemSchema, TransportSchema, DeductionSchema
from app.services.invoice import invoice_crud

# --- SETUP IN-MEMORY DATABASE FOR TESTS ---
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    """Creates a fresh database for every test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

# --- HELPER TO CREATE VALID INVOICE DATA ---
def create_dummy_invoice_data(scrinv_number="A0001", items=None):
    """Returns a valid InvoiceCreate object with all required fields filled."""
    if items is None:
        items = []
        
    return InvoiceCreate(
        scrinv_number=scrinv_number,
        status="Draft",
        invoice_type="General",
        currency="AUD",
        include_gst=True,
        show_transport=True,
        
        # UPDATED: Use a real date object, though string "2025-01-01" would also work now that Schema is fixed
        invoice_date=date(2025, 1, 1), 
        
        notes="Test Notes",
        
        # Bill From (Required)
        bill_from_name="My Company",
        bill_from_phone="0400000000",
        bill_from_email="me@test.com",
        bill_from_abn="11111111111",
        bill_from_address="123 Street",
        
        # Bill To (Required)
        bill_to_name="Client Company",
        bill_to_phone="0411111111",
        bill_to_email="client@test.com",
        bill_to_abn="22222222222",
        bill_to_address="456 Road",
        
        # Bank (Required)
        bank_name="Test Bank",
        account_name="My Account",
        bsb="000-000",
        account_number="12345678",
        
        items=items,
        transport_items=[],
        deductions=[]
    )

# ... (Keep the rest of your test functions exactly as they were) ...
# The tests below will now pass because 'data.invoice_date' is a proper python date object.

def test_generate_new_id(db):
    result = invoice_crud.generate_new_id(db)
    assert "scrinv_id" in result
    assert isinstance(result["scrinv_id"], str)

def test_upsert_create_new_invoice(db):
    items = [ItemSchema(description="Item 1", quantity=10, price=5, unit="kg")]
    data = create_dummy_invoice_data(scrinv_number="A0001", items=items)
    data.transport_items = [TransportSchema(name="Truck 1", num_of_ctr=1, price_per_ctr=100)]
    data.deductions = [DeductionSchema(type="pre", label="Discount", amount=10)]

    result = invoice_crud.upsert_invoice(db, data)
    
    assert result["message"] == "invoice saved"
    assert "id" in result

    inv = db.query(Invoice).first()
    assert inv is not None
    assert inv.scrinv_number == "A0001"
    
    # Optional: Verify date was saved correctly 
    assert inv.invoice_date == date(2025, 1, 1)

def test_upsert_update_existing_invoice(db):
    initial_data = create_dummy_invoice_data(scrinv_number="A0001")
    initial_data.items = [ItemSchema(description="Old Item", quantity=1, price=10)]
    invoice_crud.upsert_invoice(db, initial_data)

    update_data = create_dummy_invoice_data(scrinv_number="A0001")
    update_data.status = "Sent"
    update_data.notes = "Updated Notes"
    update_data.items = [
        ItemSchema(description="New Item", quantity=5, price=20)
    ]

    invoice_crud.upsert_invoice(db, update_data)

    inv = db.query(Invoice).filter(Invoice.scrinv_number == "A0001").first()
    assert inv.status == "Sent"
    assert inv.notes == "Updated Notes"
    assert len(inv.items) == 1 
    assert inv.items[0].description == "New Item"

def test_get_invoice_by_id(db):
    data = create_dummy_invoice_data(scrinv_number="A0005")
    data.items = [ItemSchema(description="Test", quantity=1, price=1)]
    
    res = invoice_crud.upsert_invoice(db, data)
    new_id = res["id"]

    invoice_dict = invoice_crud.get_invoice_by_id(db, new_id)

    assert invoice_dict["scrinv_number"] == "A0005"
    assert invoice_dict["status"] == "Draft"
    assert len(invoice_dict["line_items"]) == 1

def test_get_invoice_not_found(db):
    with pytest.raises(HTTPException) as excinfo:
        invoice_crud.get_invoice_by_id(db, 9999)
    assert excinfo.value.status_code == 404

def test_delete_invoice(db):
    data = create_dummy_invoice_data(scrinv_number="A0001")
    res = invoice_crud.upsert_invoice(db, data)
    inv_id = res["id"]

    response = invoice_crud.delete_invoice(db, inv_id)
    assert response == {"message": "deleted"}

    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    assert inv is None

def test_delete_invoice_not_found(db):
    with pytest.raises(HTTPException) as excinfo:
        invoice_crud.delete_invoice(db, 9999)
    assert excinfo.value.status_code == 404