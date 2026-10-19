# Architecture & Implementation Plan: Dual-Pipeline AI OCR (Docket & Customer ID)

## 1. Executive Summary & Strategy
This document outlines the complete production implementation plan for the AI-assisted OCR system in the **Weight Docket Maker** application. The system provides two primary vision extraction capabilities:
1. **Handwritten Docket OCR**: Transcribes fast handwriting on scrap metal scale tickets, extracts gross/tare/deduction arithmetic, normalizes metal materials, and detects corrections or bleed-through.
2. **Customer ID & Driver's Licence OCR**: Extracts identity details from Australian Driver's Licences, Photo Cards, and Passports to automate customer intake and satisfy statutory scrap metal compliance without manual typing.

### Core Architectural Principles
* **Primary Engine — Gemini 4 Argon (`gemini-4-argon`)**: Native multimodal vision with low reasoning effort (`thinking_budget: 1024`). Delivers rapid turnaround (~1.5–2.5s) for smooth interactive scale operations.
* **Human-in-the-Loop Validation**: Smudges, obscured numbers (`tare_hidden`), or ambiguous digits are immediately returned to the UI with `confidence: "low"`. The UI visually highlights the affected row in amber for 1-click confirmation by the weighbridge operator holding the physical ticket. (No redundant, slow fallback to a second model to guess illegible ink).
* **High-Availability (HA) Backup Engine — Claude Opus 5.5 (`claude-opus-5.5`)**: Retained strictly as an **infrastructure failover** if Google Gemini encounters server downtime (5xx), quota exhaustion (429), or network timeouts (>6s), guaranteeing 99.9% uptime at the weighbridge.
* **Server-Side Execution**: All model calls, image downscaling, and API secrets are managed inside the FastAPI backend.
* **Zero-Typing Camera Initiation**: Operators trigger scanning by snapping photos directly on mobile/tablet cameras or dropping files.

```
                  ┌──────────────────────────────────────────────┐
                  │ Scale Operator takes Docket or ID Card Photo │
                  └───────────────────────┬──────────────────────┘
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │    Client / Backend Preprocessor (PIL)       │
                  │   (EXIF Auto-Rotate, Compress to WebP)       │
                  └───────────────────────┬──────────────────────┘
                                          ▼
                         Choose Endpoint Route
                                 │      │
            ┌────────────────────┘      └───────────────────┐
            ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│ Route 1: POST /api/ocr/docket │               │  Route 2: POST /api/ocr/id    │
└───────────────┬───────────────┘               └───────────────┬───────────────┘
                │                                               │
                └───────────────────────┬───────────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │  Step 1: Gemini 4 Argon (Low) │
                        └───────┬───────────────┬───────┘
                                │               │ Google 5xx / 429 / Timeout
                 Normal Response│               ▼
                                │       ┌─────────────────────────────┐
                                │       │ High-Availability Failover: │
                                │       │ Claude Opus 5.5 (Low)       │
                                │       └──────────────┬──────────────┘
                                ▼                      │
                        ┌───────────────────────────────┐
                        │ Deterministic Domain Checks   │◄┘
                        │ (Math, Chaining / ID Regex)   │
                        └───────────────┬───────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │ Return Extracted JSON Payload │
                        └───────────────┬───────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
    ┌───────────────────────────────┐       ┌───────────────────────────────┐
    │ Docket: Side-by-Side Workspace│       │ ID: Card Confirmation Alert   │
    │ (Amber row highlights)        │       │ (1-click auto-fill)           │
    └───────────────────────────────┘       └───────────────────────────────┘
```

---

## 2. High-Availability (HA) Failover Conditions

Claude Opus 5.5 serves exclusively as an infrastructure safety net:

| Trigger Category | Trigger Condition | System Action |
| :--- | :--- | :--- |
| **API Rate Limit** | Google Gemini returns HTTP `429 Too Many Requests`. | Seamless failover to Claude Opus 5.5. |
| **Service Downtime** | Google Gemini returns HTTP `500`, `502`, `503`, or `504`. | Seamless failover to Claude Opus 5.5. |
| **Network Timeout** | Gemini API call exceeds 6.0 seconds without response. | Abort call and failover to Claude Opus 5.5. |
| **Malformed Payload** | Upstream Gemini response violates JSON schema and cannot be parsed. | Re-try extraction via Claude Opus 5.5. |

*Normal extraction with low confidence or smudges does NOT call Opus—it returns instantly to the operator for fast human verification.*

---

## 3. System Architecture & Directory Structure

```text
backend/app/
├── schema/
│   └── ocrSchema.py             # Pydantic schemas for Docket & ID extraction requests/responses
├── services/
│   └── ocr/
│       ├── __init__.py
│       ├── prompts.py           # System prompts for Docket & ID (matching docs/OCR_Prompt.md)
│       ├── image_processor.py   # EXIF rotation, resizing, and WebP compression
│       ├── gemini_client.py     # Gemini 4 Argon primary client (structured output, low thinking)
│       ├── claude_client.py     # Claude Opus 5.5 HA failover client
│       ├── validator.py         # Deterministic checks (docket math, scale chaining, licence regex)
│       └── ocr_service.py       # Orchestrator managing pipeline execution & failovers
└── routes/
    └── ocrRoutes.py             # Endpoints: POST /api/ocr/scan-docket, POST /api/ocr/scan-id

frontend/src/
├── services/
│   └── ocrService.js            # Axios client calls (scanDocket, scanCustomerId)
├── components/
│   ├── ocr/
│   │   ├── OCRScanModal.jsx     # Camera capture / drag-and-drop dialog for Dockets
│   │   ├── OCRProgressModal.jsx # Rapid 3-stage progress modal during extraction
│   │   ├── OCRExtractionReview.jsx # Side-by-side workspace (image viewer + review table)
│   │   └── IDScanModal.jsx      # Camera card-alignment overlay modal for Customer ID
│   └── docket/
│       └── CustomerDetails.jsx  # Contains "Scan Customer ID / Licence" button
├── styles/
│   └── ocr.css                  # Low-confidence row highlighting & Amber alert accents
└── pages/
    └── docket/
        └── DocketForm.jsx       # Main form: Scan trigger button & auto-populate state handlers
```

---

## 4. Feature Specifications & Capabilities

### Feature A: Handwritten Weight Docket OCR
* **Input**: Photo of paper scale ticket (often wrinkled, bleed-through paper, smudged ink).
* **Extraction Output**:
  * Customer name (if written in header).
  * Date (formatted as `DD/MM/YYYY`).
  * Line entries: `gross`, `tare`, `extra_deduction`, `material` (normalized against whitelist), and `price`.
  * Physical line tracking and list of voided/skipped lines (`skipped_lines`).
* **Side-by-Side Review Workspace**:
  * **Left Side (50%)**: Zoomable, pannable, and rotatable view of the original photo.
  * **Right Side (50%)**: Interactive data table.
* **Low-Confidence Row Highlighting**:
  * High-confidence lines render normally with a green check tag.
  * Low-confidence lines (`confidence == "low"` or flags like `tare_hidden`, `ambiguous_digit`) are highlighted in amber tint (`background-color: #fffbe6; border-left: 4px solid #faad14`) with a `<Tag color="warning">⚠️ Low Confidence - Check Image</Tag>`.
* **Deduction & Tare Merging**:
  * Because `DocketItemsTable.jsx` only has `Gross` and `Tare` columns (no dedicated extra deduction column), any extracted third-column extra deduction is automatically added directly into the line's tare: `effective_tare = (tare or 0) + (extra_deduction or 0)`.
  * If tare was occluded by a finger (e.g. `635 [finger] 25 = Battery`), the captured extra deduction becomes the tare (`tare = 25`).
  * This guarantees that the existing calculation `Net = Gross - Tare` produces the exact intended weight (`566 - (300 + 70) = 196 kg`) without modifying the table schema or adding unnecessary form fields.
  * Warns operator if scale chaining is broken (`Tare[i] != Gross[i+1]` on mixed bin unloads).
* **Multi-Page & Double-Sided Dockets (Both Sides of Paper / Separate Sheets)**:
  * A single customer delivery often spans multiple physical docket pages—either written on both sides (front and back) of a sheet or across multiple separate papers.
  * **Header Inheritance**: Continuation pages and reverse sides frequently omit the header (`customer: null`, `date: null`). The system automatically retains and applies the customer header from the primary/first page across all lines.
  * **Sequential Item Merging**: Line entries from both sides / multiple sheets are merged into a single sequential list.
* **Dynamic Table Expansion (Beyond the Default 20 Rows)**:
  * `DocketForm.jsx` initializes with a default minimum of 20 rows (`generateInitialRows(20)`).
  * If a large delivery across multiple pages contains more than 20 items (e.g., 28 or 35 lines), the form **dynamically expands `dataSource`** by generating and appending additional row objects so every item is loaded without truncation.

### Feature B: Customer ID & Driver's Licence OCR
* **Regulatory Purpose**: Scrap metal dealers in Australia are legally obligated to record identity details (full name, address, DOB, licence number) prior to payout.
* **Supported Documents**:
  * Australian Driver's Licences (NSW, VIC, QLD, WA, SA, TAS, ACT, NT) - physical cards or digital app screenshots (Service NSW, myVicRoads, etc.).
  * Proof of Age / Photo Cards (state-issued 18+ cards).
  * Passports (Australian & international personal details page).
* **Extracted Fields**:
  * `name`: Formatted in Title Case with surname capitalized (e.g. `David Marcus ROBINSON`).
  * `license_number`: Primary licence/permit number (distinct from the 8-10 digit card number).
  * `dob`: Date of birth (`DD/MM/YYYY`).
  * `address`: Clean single-line address (`"14 Carrington Street, Blacktown NSW 2148"`).
  * `expiry_date`: Format `DD/MM/YYYY`.
* **Validation & Alerts**:
  * State regex format check (e.g., NSW 8 digits, VIC 9 digits, WA 7 digits).
  * Adult age check ($\ge 18$ years old).
  * Expiry warning if `expiry_date < today`.
* **Privacy by Design**:
  * ID photos are processed **in-memory only**; images are never written to disk or public storage.
  * Face photos and card security codes are excluded from extraction.

---

## 5. API Endpoint Contracts & Schemas

### 5.1 Docket Extraction Endpoint
`POST /api/ocr/scan-docket`
* **Request**: `multipart/form-data` with `files: List[UploadFile]` (supports 1 to $N$ page photos; front, back, continuation sheets)
* **Response**:
```json
{
  "success": true,
  "model_used": "gemini-4-argon",
  "execution_time_ms": 2180,
  "customer": "John Doe",
  "date": "19/10/2026",
  "entries": [
    {
      "line": 1,
      "raw_text": "707 - 308 Steel",
      "gross": 707,
      "tare": 308,
      "extra_deduction": null,
      "material": "Steel",
      "price": null,
      "flags": [],
      "confidence": "high"
    },
    {
      "line": 2,
      "raw_text": "635 [finger] 25 = Battery",
      "gross": 635,
      "tare": null,
      "extra_deduction": 25,
      "material": "Battery",
      "price": null,
      "flags": ["tare_hidden"],
      "confidence": "low"
    }
  ],
  "skipped_lines": []
}
```

### 5.2 Customer ID Extraction Endpoint
`POST /api/ocr/scan-id`
* **Request**: `multipart/form-data` with `file: UploadFile`
* **Response**:
```json
{
  "success": true,
  "model_used": "gemini-4-argon",
  "execution_time_ms": 1850,
  "data": {
    "id_type": "driver_license",
    "jurisdiction": "NSW",
    "name": "David Marcus ROBINSON",
    "license_number": "98421055",
    "dob": "24/09/1985",
    "address": "14 Carrington Street, Blacktown NSW 2148",
    "expiry_date": "24/09/2028",
    "flags": [],
    "confidence": "high",
    "is_expired": false
  }
}
```

---

## 6. Frontend UI / UX & Staged Capture Flows

The capture flow is intentionally designed with a **Capture $\to$ Inspect $\to$ Send** pattern so operators verify image quality (no blur, proper lighting) before calling the backend.

### 6.1 Customer ID Flow (`IDScanModal.jsx`)
```
[User clicks "Scan Customer ID"]
             │
             ▼
[Camera View with Card Alignment Guide] ──► User takes photo
             │
             ▼
[Inspection Screen]
   ├── Preview full image clearly
   ├── [Retake] (if blurry, flash glare, or finger cover)
   └── [Send to OCR]
             │
             ▼
[Backend extracts data (~1.8s)]
             │
             ▼
[Confirmation Card] ──► User clicks [Populate Customer Fields]
                         (Auto-fills Name, Licence No, DOB, Address)
```
1. **Trigger**: User clicks `"Scan Customer ID / Licence"` in the `CustomerDetails.jsx` header.
2. **Capture**: A modal opens with a camera viewfinder and a rectangular guide box matching standard Australian ID card aspect ratios (85.6mm $\times$ 53.98mm).
3. **Inspect**: The captured photo is immediately shown in a high-resolution preview frame.
   - If the operator notices flash glare over the licence number or an accidental finger covering the address, they click **"Retake"**.
   - If the image is clear and readable, they click **"Send to OCR"**.
4. **Populate**: Backend processes the card in ~1.8s. A confirmation alert displays the extracted details (`name`, `license_number`, `dob`, `address`) with an **"Apply to Customer"** button to auto-populate form fields.

---

### 6.2 Multi-Page Docket Flow (`OCRScanModal.jsx`)
```
[User clicks "Scan Docket (AI OCR)"]
             │
             ▼
[Page 1 Capture Box] ──► User snaps or uploads Page 1 (Front)
             │
             ▼
[Page 1 Preview Thumbnail Appears]
   ├── Inspect / Zoom Page 1
   └── [+ Add Page 2 (Back / Next Sheet)] button appears
             │
             ▼ (Optional: User adds Page 2, Page 3, etc.)
[Inspection Gallery]
   ├── Shows sequential cards: [Page 1], [Page 2], [Page 3]...
   ├── Rotate 90° / Retake / Remove buttons per page
   └── Prominent Button: [Process All Pages (OCR)]
             │
             ▼
[FastAPI batches all pages with Gemini 4 Argon (~2–3s)]
             │
             ▼
[Side-by-Side Review Workspace opens with unified extracted table]
```
1. **Trigger**: User clicks `"Scan Docket (AI OCR)"` in the main toolbar.
2. **Page 1 Capture**: The modal prompts the user to take a photo of **Page 1 (Front Side)**.
3. **Progressive Page Addition**:
   - Once Page 1 is captured, a thumbnail preview appears with its label: *"Page 1 (Front)"*.
   - An active **"+ Add Page 2 (Back / Next Sheet)"** button appears directly beneath it.
   - If the user clicks **"+ Add Page 2"**, a second capture prompt opens for Page 2. Once taken, **"+ Add Page 3"** becomes available, allowing unlimited continuation sheets.
4. **Inspection & Pre-Flight Review**:
   - Before any API request is sent, all captured pages are displayed in an inspection carousel/gallery.
   - The operator can:
     - Click any page thumbnail to inspect it in full zoom.
     - Click **Rotate 90°** if the phone took the picture sideways.
     - Click **Delete / Retake** if a page is unreadable.
5. **Batch Submission**:
   - The operator clicks **"Process All Pages (OCR)"** (e.g. *"Process 2 Pages"*).
   - All images are sent together via `POST /api/ocr/scan-docket`.
6. **Side-by-Side Review Workspace (`OCRExtractionReview.jsx`)**:
   - Opens full-width (`95vw`).
   - **Left Pane**: Tabbed viewer to switch between or zoom into **Page 1**, **Page 2**, etc.
   - **Right Pane**: One continuous, unified table with all line items ordered sequentially.
   - Low-confidence lines are highlighted in amber.
   - Operator clicks **"Apply to Docket Form"** to load all items into the main form, dynamically expanding rows beyond 20 if needed.

---

### 6.3 Rapid 3-Stage Progress Modal (`OCRProgressModal.jsx`)
```jsx
<Modal open={isProcessing} footer={null} closable={false} centered>
  <div style={{ textAlign: "center", padding: "20px" }}>
    <Spin size="large" />
    <h3 style={{ marginTop: 16 }}>{currentStepTitle}</h3>
    <Progress percent={progressPercent} status="active" strokeColor="#1b5e20" />
    <Steps
      size="small"
      current={currentStepIndex}
      style={{ marginTop: 24 }}
      items={[
        { title: 'Upload & Optimize', description: 'Compressing pages' },
        { title: 'Gemini 4 Argon', description: 'Reading handwriting' },
        { title: 'Ready', description: 'Opening review workspace' },
      ]}
    />
  </div>
</Modal>
```

---

## 7. Data Mapping into `DocketForm` State

### Docket Data Mapping
| OCR Payload Field | Target `DocketForm` State | Mapping & Transform Rule |
| :--- | :--- | :--- |
| `customer` | `formState.customer_name` | Direct string assignment; fallback to `""` if `null`. |
| `date` | `formState.docket_date` | Parse `DD/MM/YYYY` via `dayjs` into `docket_date`. |
| `entries[i].gross` | `items[i].gross` | Float/Int weight. |
| `entries[i].tare` + `entries[i].extra_deduction` | `items[i].tare` | **Summed into Tare**: `effective_tare = (tare or 0) + (extra_deduction or 0)`. (e.g., `566 - 300 - 70` $\to$ Gross: `566`, Tare: `370`). |
| `entries[i].material` | `items[i].metal` | Whitelist-normalized scrap material name. |
| `entries[i].price` | `items[i].price` | Float price if captured; defaults to `0.00`. |

### Customer ID Data Mapping
| ID Payload Field | Target `DocketForm` State | Mapping & Transform Rule |
| :--- | :--- | :--- |
| `name` | `customer_name` | Direct string assignment. |
| `license_number` | `customer_license_no` | Direct string assignment. |
| `dob` | `customer_dob` | Parsed via `dayjs(dob, "DD/MM/YYYY")`. |
| `address` | `customer_address` | Direct string assignment. |

### 7.3 Scope Boundary: Calculations, PDF Generation & Printing Run As-Is
The OCR system operates strictly as a **fast data-entry accelerator** for the form. It only populates:
1. `CustomerDetails.jsx` (`name`, `licenseNo`, `dob`, `address`).
2. `DocketItemsTable.jsx` row inputs (`gross`, `tare` [with extra deduction merged], `metal`, `price`).

### 7.4 Dynamic Row Expansion Logic (Handling > 20 Items)
`DocketForm.jsx` defaults to 20 initial empty rows. When loading OCR data with >20 items (e.g., multi-page / double-sided dockets), the form expands dynamically:
```javascript
const applyOcrEntries = (ocrEntries) => {
  setDataSource(prevRows => {
    const updated = [...prevRows];
    ocrEntries.forEach((entry, idx) => {
      const effectiveTare = (entry.tare || 0) + (entry.extra_deduction || 0);
      const rowData = {
        metal: entry.material || '',
        gross: entry.gross ?? '',
        tare: effectiveTare || '',
        price: entry.price ?? 0,
        unit: defaultUnit || 'kg'
      };
      if (idx < updated.length) {
        updated[idx] = { ...updated[idx], ...rowData };
      } else {
        // Dynamically expand beyond initial 20 rows
        updated.push({
          key: String(Date.now() + idx),
          scrdkt_item_id: null,
          ...rowData
        });
      }
    });
    return updated;
  });
};
```

Once populated into state, **all downstream application logic runs completely untouched and as-is**:
* **Net Weight & Arithmetic**: Calculated automatically by the existing `useDocketCalculations` hook (`Net = Gross - Tare`). Because `extra_deduction` is added directly into `tare`, the net weight computes accurately without any schema changes.
* **Financial Calculations**: Subtotals, GST (10%), deductions, and grand totals calculate identically.
* **Database Persistence**: Saved via the existing `docketRoutes.py` / SQLAlchemy models.
* **PDF Generation**: Rendered using the existing Jinja2 / HTML / Weasyprint docket templates.
* **Printing Infrastructure**: Spooled and printed as-is via `SumatraPDF` / `run_printer.sh`.

No changes are made to how weights are computed, how money is calculated, how PDFs are formatted, or how dockets are printed.

---

## 8. Comprehensive Error Handling & Edge Cases

| Scenario / Failure | Root Cause | Handling Strategy & Operator UI Feedback |
| :--- | :--- | :--- |
| **Excessive File Size / Resolution** | Phone camera shoots 48MP raw image (>25MB). | Browser canvas downscaling to max 2000px before upload + FastAPI 15MB limit. |
| **Severe Blur / Glare / Dark Photo** | Scale shed poor lighting or hand tremor. | If model returns empty entries, return HTTP 422: *"Image is too blurry or dark. Please retake with good lighting."* |
| **Laminate Hologram Glare on ID** | Warehouse light hits card coat of arms. | Prompt instructs model not to guess obscured digits; flags `glare_detected` and returns `confidence: "low"`. |
| **Gemini 4 Argon Rate Limit / 5xx** | Google API downtime or quota exhaustion. | Failover seamlessly to Claude Opus 5.5 without failing the user request. |
| **Both APIs Fail** | Severe global network or credentials issue. | Return clean error modal: *"OCR service temporarily unavailable. Please enter items manually."* |
| **Non-Docket / Non-ID Photo** | User accidentally selected wrong picture (e.g. truck). | Prompt detects missing structure; returns `{ "not_an_id": true }` $\to$ Alert: *"No valid document detected in this image."* |
| **Network Disconnection** | Mobile dropped signal during upload. | Axios timeout set to 60s; displays retry button with preserved cached image. |

---

## 9. Engineering Implementation Roadmap

1. **Phase 1: Backend Dependencies & Environment Setup**
   - Add `google-genai`, `anthropic`, and `Pillow` to `backend/requirements.txt`.
   - Update `backend/.env` with `GEMINI_API_KEY` and `ANTHROPIC_API_KEY`.
2. **Phase 2: Schemas & Domain Prompts**
   - Create `backend/app/schema/ocrSchema.py` (Pydantic models for Docket and ID extraction).
   - Create `backend/app/services/ocr/prompts.py` (storing docket & customer ID prompt definitions).
3. **Phase 3: Core OCR Services**
   - `image_processor.py`: EXIF auto-rotation and dimension optimization.
   - `gemini_client.py`: Primary Gemini 4 Argon low-reasoning client.
   - `claude_client.py`: Claude Opus 5.5 high-availability failover client.
   - `validator.py`: Arithmetic, chaining, and state licence regex evaluation.
   - `ocr_service.py`: Pipeline orchestrator with try/except failover.
4. **Phase 4: FastAPI Router & Endpoints**
   - Create `backend/app/routes/ocrRoutes.py` (`POST /api/ocr/scan-docket`, `POST /api/ocr/scan-id`).
   - Mount router in `backend/app/main.py`.
5. **Phase 5: Frontend UI in `DocketForm.jsx` & `CustomerDetails.jsx`**
   - Implement `frontend/src/services/ocrService.js`.
   - Add "Scan Docket" and "Scan Customer ID" trigger buttons.
   - Build `OCRProgressModal.jsx`, `OCRExtractionReview.jsx`, and `IDScanModal.jsx`.
   - Implement `ocr.css` for low-confidence row highlighting.
   - Connect auto-population handlers to form fields.
6. **Phase 6: End-to-End Testing & Field Trials**
   - Test against clean dockets, struck-through dockets, and occluded/finger dockets.
   - Test against Australian Driver's Licences (NSW, VIC, QLD, WA) and photo cards.
   - Simulate Gemini 5xx outage and verify Claude Opus 5.5 recovers seamlessly.