# backend/tests/invoice/invoice_services_test.py

import pytest
from datetime import date
from unittest.mock import MagicMock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

# Import Models & Logic
from app.database import Base
from app.models.invoiceModels import Invoice, InvoiceItem, TransportItem, Deduction
from app.services.invoice import invoice_data, invoice_list, invoice_status, invoice_pdf

# --- SETUP DATABASE ---
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

# ==========================================
# 1. TEST: invoice_status.py
# ==========================================
def test_update_status_success(db):
    # Setup
    inv = Invoice(scrinv_number="A001", status="Draft")
    db.add(inv)
    db.commit()

    # Action
    result = invoice_status.update_status(db, inv.id, "paid")

    # Assert
    assert result["message"] == "status updated to Paid"
    db.refresh(inv)
    assert inv.status == "Paid"

def test_update_status_not_found(db):
    with pytest.raises(HTTPException) as exc:
        invoice_status.update_status(db, 999, "paid")
    assert exc.value.status_code == 404

# ==========================================
# 2. TEST: invoice_list.py (Calculations)
# ==========================================
def test_get_all_invoices_calculated(db):
    # Setup: Create complex invoice
    # 10 * 10 = 100 (Items)
    # 2 * 50 = 100 (Transport)
    # Pre-Deduct = 20
    # Subtotal = 100 + 100 - 20 = 180
    # GST (10%) = 18
    # Post-Deduct = 10
    # Total = 180 + 18 - 10 = 188
    
    inv = Invoice(scrinv_number="CALC01", bill_to_name="Client A", include_gst=True, currency="AUD")
    db.add(inv)
    db.flush()

    db.add(InvoiceItem(invoice_id=inv.id, quantity=10, price=10))
    db.add(TransportItem(invoice_id=inv.id, num_of_ctr=2, price_per_ctr=50))
    db.add(Deduction(invoice_id=inv.id, type="pre", amount=20))
    db.add(Deduction(invoice_id=inv.id, type="post", amount=10))
    db.commit()

    # Action
    results = invoice_list.get_all_invoices_calculated(db)

    # Assert
    assert len(results) == 1
    data = results[0]
    assert data["scrinv_number"] == "CALC01"
    assert data["total_amount"] == 188.0

# ==========================================
# 3. TEST: invoice_data.py (Unique Selectors)
# ==========================================
def test_get_unique_selectors(db):
    # Setup: 2 Invoices with some shared data
    inv1 = Invoice(
        bill_from_name="My Co", bill_from_email="a@co.com",
        bill_to_name="Client X", bill_to_email="x@client.com",
        bank_name="Bank A", account_number="111"
    )
    inv2 = Invoice(
        bill_from_name="My Co", bill_from_email="a@co.com", # Duplicate From
        bill_to_name="Client Y", bill_to_email="y@client.com", # New To
        bank_name="Bank A", account_number="111" # Duplicate Bank
    )
    db.add_all([inv1, inv2])
    db.commit()

    # Action
    data = invoice_data.get_unique_selectors(db)

    # Assert
    # Should de-duplicate "My Co"
    assert len(data["companies_from"]) == 1 
    assert data["companies_from"][0]["name"] == "My Co"

    # Should keep both clients
    assert len(data["companies_to"]) == 2

    # Should de-duplicate Bank
    assert len(data["accounts"]) == 1
    assert data["accounts"][0]["bank_name"] == "Bank A"

# ==========================================
# 4. TEST: invoice_pdf.py (Mocking)
# ==========================================
# We assume WeasyPrint is hard to run in some test environments, 
# so we check if the HTML renders and variables are passed correctly.

@patch("app.services.invoice.invoice_pdf.HTML") # Mock WeasyPrint
def test_generate_invoice_pdf_success(mock_html, db):
    # Setup Data
    inv = Invoice(
        scrinv_number="PDF001", 
        invoice_date=date(2025, 5, 20),
        currency="USD",
        include_gst=False
    )
    db.add(inv)
    db.flush()
    db.add(InvoiceItem(invoice_id=inv.id, quantity=1, price=100)) # Total 100
    db.commit()

    # Mock the write_pdf method
    mock_html.return_value.write_pdf = MagicMock()

    # Action
    result_buffer = invoice_pdf.generate_invoice_pdf(db, inv.id)

    # Assert
    assert result_buffer is not None
    # Verify WeasyPrint was called
    mock_html.assert_called_once()
    
    # Verify Date Formatting Logic in HTML logic (indirectly)
    # We can inspect the arguments passed to HTML constructor if needed,
    # but for now, ensuring no crash means Jinja template rendered successfully.

def test_render_html_logic(db):
    """Test specifically the dictionary preparation for the template"""
    inv = Invoice(
        scrinv_number="HTML01", 
        invoice_date=date(2025, 12, 25), # YYYY-MM-DD
        currency="EUR", 
        include_gst=True
    )
    db.add(inv)
    db.commit()

    # We patch environment loading to avoid needing real template files
    with patch("app.services.invoice.invoice_pdf.Environment") as mock_env:
        mock_template = MagicMock()
        mock_env.return_value.get_template.return_value = mock_template
        
        # Action
        invoice_pdf.render_invoice_html(db, inv.id)
        
        # Assert arguments passed to render
        call_args = mock_template.render.call_args[1]
        
        # Check Date Formatting Logic
        assert call_args["formatted_date"] == "25/12/2025" 
        
        # Check Currency Symbol Logic
        assert call_args["symbol"] == "EUR€"