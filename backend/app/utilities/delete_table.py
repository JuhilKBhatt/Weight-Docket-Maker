from app.database import engine
from app.models.invoice import Invoice

Invoice.__table__.drop(engine, checkfirst=True)