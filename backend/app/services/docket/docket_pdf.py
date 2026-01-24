# app/services/docket/docket_pdf.py

import os
import base64
from io import BytesIO
from fastapi import HTTPException
from sqlalchemy.orm import Session
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.models.docketModels import Docket

# --- Helper to load images/files ---
def get_file_base64(file_path):
    if not os.path.exists(file_path):
        return ""
    with open(file_path, "rb") as f:
        return base64.b64encode(f.read()).decode('utf-8')

def render_docket_html(db: Session, docket_id: int):
    # 1. Fetch Data
    dkt = db.query(Docket).filter(Docket.id == docket_id).first()
    if not dkt:
        raise HTTPException(status_code=404, detail="Docket not found")

    # 2. Prepare Items Data
    items_data = []
    
    for item in dkt.items:
        gross = item.gross or 0
        tare = item.tare or 0
        price = item.price or 0
        
        net = gross - tare
        total = net * price
        
        items_data.append({
            "metal": item.metal,
            "gross": gross,
            "tare": tare,
            "net": net,
            "price": price,
            "total": total,
            "notes": item.row_notes,
            "unit": item.unit or "kg"
        })

    # 3. Calculate Totals
    items_total = sum([i['total'] for i in items_data])

    # Filter Deductions
    pre_deductions = [d for d in dkt.deductions if d.type == 'pre']
    post_deductions = [d for d in dkt.deductions if d.type == 'post']

    pre_deductions_amount = sum([d.amount for d in pre_deductions])
    post_deductions_amount = sum([d.amount for d in post_deductions])

    # Gross (Taxable) Total
    gross_total = items_total - pre_deductions_amount
    
    gst_amount = 0
    if dkt.include_gst:
        gst_amount = gross_total * (dkt.gst_percentage / 100)

    total_inc_gst = gross_total + gst_amount
        
    final_total = total_inc_gst - post_deductions_amount

    # 4. Use Stored Currency Symbol
    currency_code = dkt.currency or 'AUD'
    sym = dkt.currency_symbol or '$'
    
    # Construct the display label: e.g. "AUD$"
    currency_label = f"{currency_code}{sym}"

    # 5. Setup Template Environment
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("docket_template.html")
    
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

    # Read CSS and prepend font
    css_path = os.path.join(template_dir, "docket_template_styles.css")
    css_content = ""
    if os.path.exists(css_path):
        with open(css_path, 'r') as f:
            css_content = font_face_css + f.read()

    # --- Load Icon ---
    icon_path = os.path.join(template_dir, "Recycling_Icon.png")
    recycling_icon_b64 = get_file_base64(icon_path)

    formatted_date = dkt.docket_date.strftime("%d/%m/%Y") if dkt.docket_date else "N/A"

    # 6. Render
    return template.render(
        docket=dkt,
        items=items_data,
        pre_deductions=pre_deductions,
        post_deductions=post_deductions,
        totals={
            "itemsTotal": items_total,
            "grossTotal": gross_total,
            "gstAmount": gst_amount,
            "totalIncGst": total_inc_gst,
            "finalTotal": final_total  
        },
        formatted_date=formatted_date,
        css_content=css_content,
        recycling_icon=recycling_icon_b64,
        currency_label=currency_label 
    )

def generate_docket_pdf(db: Session, docket_id: int):
    try:
        html_content = render_docket_html(db, docket_id)
        pdf_buffer = BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        return pdf_buffer
    except Exception as e:
        print(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))