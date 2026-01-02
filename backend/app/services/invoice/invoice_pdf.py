# app/services/invoice/invoice_pdf.py
import os
import base64
from io import BytesIO
from fastapi import HTTPException
from sqlalchemy.orm import Session
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
from datetime import datetime, timedelta

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

def get_image_base64(image_path):
    if not os.path.exists(image_path):
        return ""
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode('utf-8')

def render_invoice_html(db: Session, invoice_id: int):
    # 1. Get Data
    inv_dict = invoice_crud.get_invoice_by_id(db, invoice_id)
    
    # 2. Logic: Date Formatting (YYYY-MM-DD -> DD/MM/YYYY)
    formatted_date = ""
    formatted_due_date = ""
    if inv_dict.get('invoice_date'):
        try:
            date_obj = inv_dict['invoice_date']
            formatted_date = date_obj.strftime("%d/%m/%Y")
        except AttributeError:
            date_obj = datetime.strptime(str(inv_dict['invoice_date']), "%Y-%m-%d")
            formatted_date = date_obj.strftime("%d/%m/%Y")

    due_date_obj = date_obj + timedelta(days=2)
    formatted_due_date = due_date_obj.strftime("%d/%m/%Y")

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
    header_img_path = os.path.join(template_dir, "invoice_header_logo.png")
    footer_img_path = os.path.join(template_dir, "invoice_footer_logo.png")

    header_b64 = get_image_base64(header_img_path)
    footer_b64 = get_image_base64(footer_img_path)

    # 6. Render with new variables (formatted_date, symbol)
    return template.render(
        invoice=inv_dict, 
        totals=totals, 
        css_content=css_content,
        formatted_date=formatted_date,
        formatted_due_date=formatted_due_date,
        symbol=symbol,
        header_img_base64=header_b64, 
        footer_img_base64=footer_b64
    )

def generate_invoice_pdf(db: Session, invoice_id: int):
    """
    Uses WeasyPrint to generate PDF from HTML string.
    """
    try:
        # Get the HTML string
        html_content = render_invoice_html(db, invoice_id)

        # Create PDF buffer
        pdf_buffer = BytesIO()
        
        # Generate PDF using WeasyPrint
        HTML(string=html_content).write_pdf(pdf_buffer)
        
        pdf_buffer.seek(0)
        return pdf_buffer

    except Exception as e:
        print(f"PDF Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")