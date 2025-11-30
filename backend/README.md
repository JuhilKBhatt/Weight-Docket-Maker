To Run Flask-Server

Create venv: python3 -m venv venv

Run venv: source venv/bin/activate

Install Requirements: pip3 install -r requirements.txt


Update Database Connection URL in .env

Run via | uvicorn app.main:app --reload

---

backend/
│
├── app/
│   ├── main.py                      # Entry point for API (FastAPI app)
│   ├── config.py                    # Environment variables, settings
│   ├── database.py                  # PostgreSQL connection session
│   ├── email_service/
│   │   ├── __init__.py
│   │   ├── send_email.py            # Functions to send email + attachments
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── users.py             # Example route: /users
│   │   │   ├── records.py           # Example route: /records
│   │   │   ├── email.py             # Route to trigger email send
│   │   │
│   │   ├── dependencies.py          # Shared dependencies
│   │
│   ├── models/                      # Database models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── record.py
│   │
│   ├── schemas/                     # Pydantic request/response models
│   │   ├── __init__.py
│   │   ├── user_schema.py
│   │   ├── record_schema.py
│   │
│   ├── services/                    # Business logic
│   │   ├── __init__.py
│   │   ├── user_service.py
│   │   ├── record_service.py
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── file_handler.py          # Save/read/delete attachments
│   │   ├── helpers.py
│
├── tests/                           # Unit tests
│   ├── test_company_records.py
│   ├── test_invoice_records.py
│   ├── test_email.py
│
├── requirements.txt                 # Python dependencies
├── .env                             # DB credentials, SMTP credentials
├── README.md
