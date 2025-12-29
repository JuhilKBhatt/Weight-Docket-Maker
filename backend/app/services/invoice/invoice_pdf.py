# app/services/invoice/invoice_pdf.py
import os
from io import BytesIO
from fastapi import HTTPException
from sqlalchemy.orm import Session
from xhtml2pdf import pisa
from jinja2 import Environment, FileSystemLoader

# Import your CRUD to get the data
from app.services.invoice import invoice_crud

def generate_invoice_pdf(db: Session, invoice_id: int):
    # 1. Get Data
    # We use the existing function but need to convert it to a dict/object we can use
    inv_dict = invoice_crud.get_invoice_by_id(db, invoice_id)
    
    # 2. Calculate Totals (Python side math)
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

    # 3. Setup Template Environment
    # Assuming 'app/templates' is where your HTML file is
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("invoice_template.html")

    # 4. Render HTML with data
    html_content = template.render(invoice=inv_dict, totals=totals)

    # 5. Convert HTML to PDF
    pdf_buffer = BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_buffer)

    if pisa_status.err:
        raise HTTPException(status_code=500, detail="Error generating PDF")

    # Reset buffer position to beginning
    pdf_buffer.seek(0)
    return pdf_buffer