# app/services/invoice/invoice_pdf.py
import os
from io import BytesIO
from fastapi import HTTPException
from sqlalchemy.orm import Session
from xhtml2pdf import pisa
from jinja2 import Environment, FileSystemLoader

from app.services.invoice import invoice_crud

CURRENCY_SYMBOLS = {
  'AUD': 'AUD$',
  'USD': 'USD$',
  'EUR': 'EUR€',
  'GBP': 'GBP£',
  'JPY': 'JPY¥',
  'CNY': 'CNY¥',
  'NZD': 'NZD$',
}

def render_invoice_html(db: Session, invoice_id: int):
    # 1. Get Data
    inv_dict = invoice_crud.get_invoice_by_id(db, invoice_id)
    
    # 2. Logic: Date Formatting (YYYY-MM-DD -> DD/MM/YYYY)
    formatted_date = ""
    if inv_dict.get('invoice_date'):
        # Assuming it comes as a date object or string. 
        # If it's a date object from SQLAlchemy:
        try:
            formatted_date = inv_dict['invoice_date'].strftime("%d/%m/%Y")
        except AttributeError:
            # If it's already a string, parse then format
            d = datetime.strptime(str(inv_dict['invoice_date']), "%Y-%m-%d")
            formatted_date = d.strftime("%d/%m/%Y")

    # 3. Logic: Currency Symbol
    currency_code = inv_dict.get('currency', 'AUD')
    symbol = CURRENCY_SYMBOLS.get(currency_code, '$')

    # 4. Calculate Totals
    items_total = sum([i['quantity'] * i['price'] for i in inv_dict['line_items']])
    trans_total = sum([t['num_of_ctr'] * t['price_per_ctr'] for t in inv_dict['transport_items']])
    pre_deductions = sum([d['amount'] for d in inv_dict['pre_gst_deductions']])
    post_deductions = sum([d['amount'] for d in inv_dict['post_gst_deductions']])

    subtotal = items_total + trans_total - pre_deductions
    gst = subtotal * 0.10 if inv_dict['include_gst'] else 0
    total = subtotal + gst - post_deductions

    totals = {
        "subtotal": subtotal,
        "gst": gst,
        "total": total
    }

    # 5. Setup Template
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("invoice_template.html")
    
    css_path = os.path.join(template_dir, "invoice_template_styles.css")
    with open(css_path, 'r') as css_file:
        css_content = css_file.read()

    # 6. Render with new variables (formatted_date, symbol)
    return template.render(
        invoice=inv_dict, 
        totals=totals, 
        css_content=css_content,
        formatted_date=formatted_date, # Pass this
        symbol=symbol # Pass this
    )

def generate_invoice_pdf(db: Session, invoice_id: int):
    """
    Uses the HTML string to generate a PDF buffer.
    """
    # Get the HTML using the helper above
    html_content = render_invoice_html(db, invoice_id)

    # Convert HTML to PDF
    pdf_buffer = BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)

    if pisa_status.err:
        raise HTTPException(status_code=500, detail="Error generating PDF")

    pdf_buffer.seek(0)
    return pdf_buffer