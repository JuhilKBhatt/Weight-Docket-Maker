# backend/app/services/invoice/invoice_data.py

from sqlalchemy.orm import Session
from app.models.invoiceModels import Invoice

def get_unique_selectors(db: Session):
    invoices = db.query(Invoice).all()

    companies_from = []
    companies_to = []
    accounts = []

    def clean(obj: dict):
        return {k: v for k, v in obj.items() if v not in (None, "", " ")}

    for inv in invoices:
        from_company = clean({
            "name": inv.bill_from_name, "phone": inv.bill_from_phone,
            "email": inv.bill_from_email, "abn": inv.bill_from_abn,
            "address": inv.bill_from_address,
        })
        to_company = clean({
            "name": inv.bill_to_name, "phone": inv.bill_to_phone,
            "email": inv.bill_to_email, "abn": inv.bill_to_abn,
            "address": inv.bill_to_address,
        })
        account = clean({
            "bank_name": inv.bank_name, "account_name": inv.account_name,
            "bsb": inv.bsb, "account_number": inv.account_number,
        })

        if from_company and from_company not in companies_from:
            companies_from.append(from_company)

        if to_company and to_company not in companies_to:
            companies_to.append(to_company)

        if account and account not in accounts:
            accounts.append(account)

    return {
        "companies_from": companies_from,
        "companies_to": companies_to,
        "accounts": accounts,
    }