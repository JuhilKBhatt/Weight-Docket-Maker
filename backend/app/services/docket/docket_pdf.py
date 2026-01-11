# app/services/docket/docket_pdf.py

import os
from io import BytesIO
from fastapi import HTTPException
from sqlalchemy.orm import Session
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.models.docketModels import Docket

def render_docket_html(db: Session, docket_id: int):
    # 1. Fetch Data
    dkt = db.query(Docket).filter(Docket.id == docket_id).first()
    if not dkt:
        raise HTTPException(status_code=404, detail="Docket not found")

    # 2. Prepare Items Data
    items_data = []
    items_total = 0
    
    for item in dkt.items:
        gross = item.gross or 0
        tare = item.tare or 0
        price = item.price or 0
        
        net = max(0, gross - tare)
        total = net * price
        items_total += total
        
        items_data.append({
            "metal": item.metal,
            "gross": gross,
            "tare": tare,
            "net": net,
            "price": price,
            "total": total,
            "notes": item.row_notes
        })

    # 3. Calculate Totals
    pre_deductions = sum([d.amount for d in dkt.deductions if d.type == 'pre'])
    gross_total = max(0, items_total - pre_deductions)
    
    gst_amount = 0
    if dkt.include_gst:
        gst_amount = gross_total * (dkt.gst_percentage / 100)
        
    post_deductions = sum([d.amount for d in dkt.deductions if d.type == 'post'])
    final_total = max(0, gross_total + gst_amount - post_deductions)

    # 4. Setup Template Environment
    # Assuming this file is in app/services/docket/
    # Templates are in app/services/templates/
    template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("docket_template.html")
    
    # Read CSS
    css_path = os.path.join(template_dir, "docket_template_styles.css")
    css_content = ""
    if os.path.exists(css_path):
        with open(css_path, 'r') as f:
            css_content = f.read()

    formatted_date = dkt.docket_date.strftime("%d/%m/%Y") if dkt.docket_date else "N/A"

    # 5. Render
    return template.render(
        docket=dkt,
        items=items_data,
        totals={
            "subtotal": gross_total,
            "gst": gst_amount,
            "total": final_total
        },
        formatted_date=formatted_date,
        css_content=css_content
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