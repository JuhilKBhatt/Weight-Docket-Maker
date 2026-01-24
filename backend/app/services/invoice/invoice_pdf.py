# app/services/invoice/invoice_pdf.py
import os
import base64
from io import BytesIO
from fastapi import HTTPException
from sqlalchemy.orm import Session
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
from datetime import datetime, timedelta, date

from app.services.invoice import invoice_crud
from app.models.settingsModels import CurrencyOption

def get_file_base64(file_path):
    if not os.path.exists(file_path):
        return ""
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')

def render_invoice_html(db: Session, invoice_id: int):
    # 1. Get Data
    inv_dict = invoice_crud.get_invoice_by_id(db, invoice_id)
    
    # 2. Logic: Date Formatting
    date_obj = datetime.now() 
    if inv_dict.get('invoice_date'):
        try:
            if isinstance(inv_dict['invoice_date'], (datetime, date)):
                date_obj = inv_dict['invoice_date']
            else:
                date_obj = datetime.strptime(str(inv_dict['invoice_date']), "%Y-%m-%d")
        except Exception:
            date_obj = datetime.now()

    formatted_date = date_obj.strftime("%d/%m/%Y")
    
    if not isinstance(date_obj, (datetime, date)):
         date_obj = datetime.now()
         
    due_date_obj = date_obj + timedelta(days=2)
    formatted_due_date = due_date_obj.strftime("%d/%m/%Y")

    # 3. Logic: Currency Symbol (Updated to use DB Label)
    currency_code = inv_dict.get('currency', 'AUD')
    
    # Query database for custom symbol/label
    currency_option = db.query(CurrencyOption).filter(CurrencyOption.code == currency_code).first()
    
    symbol = '$' # Default fallback
    if currency_option:
        # Prioritize Label (e.g. "INR₹") over Symbol (e.g. "₹")
        if currency_option.label:
            symbol = currency_option.label
        elif currency_option.symbol:
            symbol = currency_option.symbol

    # 4. Calculate Totals
    items_total = sum([i['quantity'] * i['price'] for i in inv_dict['line_items']])
    trans_total = sum([t['num_of_ctr'] * t['price_per_ctr'] for t in inv_dict['transport_items']])

    gross_items_transport = items_total + trans_total

    pre_deductions = sum([d['amount'] for d in inv_dict['pre_gst_deductions']])
    post_deductions = sum([d['amount'] for d in inv_dict['post_gst_deductions']])

    # Taxable Amount
    subtotal = gross_items_transport - pre_deductions
    
    gst_percent = inv_dict.get('gst_percentage', 10)
    gst = subtotal * (gst_percent/100) if inv_dict['include_gst'] else 0

    total_inc_gst = subtotal + gst
    total = total_inc_gst - post_deductions

    totals = {
        "grossItems": gross_items_transport,
        "subtotal": subtotal,
        "gst": gst,
        "totalIncGst": total_inc_gst,
        "total": total
    }

    # 5. Setup Template
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("invoice_template.html")
    
    # --- FONT EMBEDDING ---
    font_path = os.path.join(template_dir, "Lexend-VariableFont_wght.ttf")
    font_b64 = get_file_base64(font_path)
    
    font_face_css = f"""
    @font-face {{
        font-family: 'Lexend';
        src: url(data:font/ttf;base64,{font_b64}) format('truetype');
        font-weight: 100 900;
        font-style: normal;
    }}
    """

    # Load CSS and prepend font face
    css_path = os.path.join(template_dir, "invoice_template_styles.css")
    css_content = ""
    if os.path.exists(css_path):
        with open(css_path, 'r') as css_file:
            css_content = font_face_css + css_file.read()
            
    header_img_path = os.path.join(template_dir, "invoice_header_logo.png")
    footer_img_path = os.path.join(template_dir, "invoice_footer_logo.png")

    header_b64 = get_file_base64(header_img_path)
    footer_b64 = get_file_base64(footer_img_path)

    # 6. Render
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
    try:
        html_content = render_invoice_html(db, invoice_id)
        pdf_buffer = BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        return pdf_buffer
    except Exception as e:
        print(f"PDF Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")