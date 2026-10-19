# backend/tests/ocr/test_ocr_pipeline.py

import io
import pytest
from PIL import Image
from fastapi import HTTPException

from app.schema.ocrSchema import (
    DocketLineEntry,
    DocketLLMOutput,
    CustomerIDLLMOutput,
)
from app.services.ocr.image_processor import preprocess_image_bytes
from app.services.ocr.validator import (
    normalize_material_name,
    normalize_date_str,
    validate_and_normalize_docket,
    validate_customer_id,
)
from app.services.ocr.ocr_service import scan_docket_pages, scan_customer_id_card
from app.services.ocr.gemini_client import GeminiInfrastructuralError


def _create_dummy_png_bytes(width: int = 800, height: int = 600) -> bytes:
    img = Image.new("RGB", (width, height), color=(240, 240, 240))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_image_processor_downscales_and_converts_to_webp():
    raw_png = _create_dummy_png_bytes(2600, 1800)
    processed_bytes, b64_str, mime_type = preprocess_image_bytes(raw_png, max_dimension=2000)

    assert mime_type == "image/webp"
    assert len(processed_bytes) > 0
    assert len(b64_str) > 0

    with Image.open(io.BytesIO(processed_bytes)) as out_img:
        assert max(out_img.size) <= 2000


def test_material_normalization_whitelist_and_abbreviations():
    assert normalize_material_name("M/Wir") == ("M. Wire", True)
    assert normalize_material_name("m.wir") == ("M. Wire", True)
    assert normalize_material_name("BTR") == ("Battery", True)
    assert normalize_material_name("Stel") == ("Steel", True)
    assert normalize_material_name("D. RD") == ("RD. D", True)
    assert normalize_material_name("Cutng") == ("Cutting", True)
    assert normalize_material_name("UnknownScrapXYZ") == ("UnknownScrapXYZ", False)


def test_date_normalization():
    assert normalize_date_str("19.10.26") == "19/10/2026"
    assert normalize_date_str("5-9-2026") == "05/09/2026"


def test_docket_validation_and_chaining():
    raw_docket = DocketLLMOutput(
        customer="John Doe",
        date="19.10.26",
        entries=[
            DocketLineEntry(
                line=1,
                raw_text="707 - 308 Stel",
                gross=707,
                tare=308,
                extra_deduction=None,
                material="Stel",
                confidence="high",
            ),
            DocketLineEntry(
                line=2,
                raw_text="635 [finger] 25 = Battry",
                gross=635,
                tare=None,
                extra_deduction=25,
                material="Battry",
                flags=["tare_hidden"],
                confidence="high",
            ),
            DocketLineEntry(
                line=3,
                raw_text="200 - 300 Steel",
                gross=200,
                tare=300,
                extra_deduction=None,
                material="Steel",
                confidence="high",
            ),
        ],
        skipped_lines=[4],
    )

    validated, _ = validate_and_normalize_docket(raw_docket)
    assert validated.date == "19/10/2026"
    assert validated.entries[0].material == "Steel"
    assert validated.entries[0].confidence == "high"

    # Finger occlusion entry must be forced to low confidence
    assert validated.entries[1].material == "Battery"
    assert validated.entries[1].confidence == "low"

    # Negative net weight (200 - 300 = -100) must add ambiguous_digit and low confidence
    assert validated.entries[2].confidence == "low"
    assert "ambiguous_digit" in validated.entries[2].flags


def test_customer_id_validation_expiry_and_state_regex():
    raw_id = CustomerIDLLMOutput(
        id_type="driver_license",
        jurisdiction="NSW",
        name="David Marcus ROBINSON",
        license_number="9842 1055",
        dob="24/09/1985",
        address="14 Carrington Street, Blacktown NSW 2148",
        expiry_date="01/01/2020",
        flags=[],
        confidence="high",
    )

    validated = validate_customer_id(raw_id)
    assert validated.license_number == "98421055"
    assert validated.is_expired is True
    assert "expired_id" in validated.flags
    assert validated.is_underage is False


import asyncio


def test_multi_page_header_inheritance_and_claude_ha_failover(monkeypatch):
    """
    Simulates a Gemini 5xx / timeout failure and verifies:
    1. High-Availability failover to Claude Opus 5.5 succeeds seamlessly.
    2. Multi-page Docket OCR inherits customer/date from Page 1 onto Page 2.
    3. Entries from both pages are merged sequentially.
    """
    def mock_gemini_fail(*args, **kwargs):
        raise GeminiInfrastructuralError("Simulated HTTP 503 Service Unavailable from Gemini")

    def mock_claude_success(b64_image, mime_type, system_prompt, user_instruction, response_schema):
        if "Page 1" in user_instruction:
            return (
                DocketLLMOutput(
                    customer="Sarah Jenkins",
                    date="19/10/2026",
                    entries=[
                        DocketLineEntry(
                            line=1,
                            raw_text="566 - 300 - 70 = Steel",
                            gross=566,
                            tare=300,
                            extra_deduction=70,
                            material="Steel",
                            confidence="high",
                        )
                    ],
                    skipped_lines=[],
                ),
                "claude-opus-5.5",
            )
        else:
            # Page 2 has null customer/date (reverse side of paper)
            return (
                DocketLLMOutput(
                    customer=None,
                    date=None,
                    entries=[
                        DocketLineEntry(
                            line=1,
                            raw_text="635 [finger] 25 = BTR",
                            gross=635,
                            tare=None,
                            extra_deduction=25,
                            material="BTR",
                            flags=["tare_hidden"],
                            confidence="low",
                        )
                    ],
                    skipped_lines=[2],
                ),
                "claude-opus-5.5",
            )

    monkeypatch.setattr("app.services.ocr.ocr_service.extract_with_gemini", mock_gemini_fail)
    monkeypatch.setattr("app.services.ocr.ocr_service.extract_with_claude", mock_claude_success)

    page1 = _create_dummy_png_bytes()
    page2 = _create_dummy_png_bytes()

    response = asyncio.run(scan_docket_pages([page1, page2]))

    assert response.success is True
    assert response.model_used == "claude-opus-5.5"
    assert response.customer == "Sarah Jenkins"
    assert response.date == "19/10/2026"
    assert response.pages_processed == 2
    assert len(response.entries) == 2
    assert response.entries[0].line == 1
    assert response.entries[0].page == 1
    assert response.entries[1].line == 2
    assert response.entries[1].page == 2
    assert response.entries[1].material == "Battery"
    assert response.entries[1].confidence == "low"


def test_non_id_image_rejected_with_422(monkeypatch):
    def mock_gemini_non_id(*args, **kwargs):
        return (
            CustomerIDLLMOutput(
                id_type="other",
                jurisdiction="OTHER",
                name=None,
                license_number=None,
                dob=None,
                address=None,
                expiry_date=None,
                flags=["not_an_id"],
                confidence="low",
            ),
            "gemini-4-argon",
        )

    monkeypatch.setattr("app.services.ocr.ocr_service.extract_with_gemini", mock_gemini_non_id)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(scan_customer_id_card(_create_dummy_png_bytes()))

    assert exc_info.value.status_code == 422
    assert "No valid document detected" in exc_info.value.detail
