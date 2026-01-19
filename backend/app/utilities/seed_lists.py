# backend/app/utilities/seed_lists.py

import sys
import os

# Ensure we can import from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.models.settingsModels import CurrencyOption, UnitOption

def seed_lists():
    db = SessionLocal()
    
    # --- 1. CURRENCIES ---
    currencies = [
      { "code": 'AUD', "symbol": '$', "label": 'AUD$' },
      { "code": 'USD', "symbol": '$', "label": 'USD$' },
      { "code": 'EUR', "symbol": '€', "label": 'EUR€' },
      { "code": 'GBP', "symbol": '£', "label": 'GBP£' },
      { "code": 'JPY', "symbol": '¥', "label": 'JPY¥' },
      { "code": 'CNY', "symbol": '¥', "label": 'CNY¥' },
      { "code": 'NZD', "symbol": '$', "label": 'NZD$' },
    ]

    print("--- Seeding Currencies ---")
    for c in currencies:
        exists = db.query(CurrencyOption).filter_by(code=c["code"]).first()
        if not exists:
            db.add(CurrencyOption(code=c["code"], symbol=c["symbol"], label=c["label"]))
            print(f"✅ Added {c['code']}")
        else:
            print(f"⏭️  Skipped {c['code']} (Already exists)")

    # --- 2. UNITS ---
    units = [
      { "value": 't', "label": 't' },
      { "value": 'kg', "label": 'kg' },
      { "value": 'bin', "label": 'bin' },
      { "value": 'cnt', "label": 'cnt' },
      { "value": 'pcs', "label": 'pcs' },
      { "value": 'ltr', "label": 'ltr' },
      { "value": 'hrs', "label": 'hrs' },
      { "value": 'num', "label": 'num' },
    ]

    print("\n--- Seeding Units ---")
    for u in units:
        exists = db.query(UnitOption).filter_by(value=u["value"]).first()
        if not exists:
            db.add(UnitOption(value=u["value"], label=u["label"]))
            print(f"✅ Added {u['value']}")
        else:
            print(f"⏭️  Skipped {u['value']} (Already exists)")

    db.commit()
    db.close()
    print("\n✨ Seeding Complete!")

if __name__ == "__main__":
    seed_lists()