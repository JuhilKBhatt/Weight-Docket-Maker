# backend/app/services/ocr/ocr_service.py

import asyncio
import logging
import time
from typing import List, Tuple, Type, TypeVar
from fastapi import HTTPException
from pydantic import BaseModel

from app.schema.ocrSchema import (
    DocketLineEntry,
    DocketLLMOutput,
    DocketOCRResponse,
    CustomerIDLLMOutput,
    CustomerIDOCRResponse,
)
from app.services.ocr.prompts import DOCKET_OCR_PROMPT, CUSTOMER_ID_OCR_PROMPT
from app.services.ocr.image_processor import preprocess_image_bytes
from app.services.ocr.gemini_client import (
    extract_with_gemini,
    GeminiInfrastructuralError,
    FALLBACK_GEMINI_MODEL,
)
from app.services.ocr.claude_client import extract_with_claude, ClaudeFailoverError
from app.services.ocr.validator import (
    validate_and_normalize_docket,
    validate_customer_id,
)

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def _extract_with_failover_sync(
    b64_image: str,
    mime_type: str,
    system_prompt: str,
    user_instruction: str,
    response_schema: Type[T],
) -> Tuple[T, str]:
    """
    Executes Step 1 (Gemini 4 Argon with low reasoning effort).
    If Gemini 4 Argon encounters an infrastructural error (429 rate limit, 5xx downtime,
    timeout, or malformed JSON):
    - Attempts HA failover to Claude Opus 5.5 if ANTHROPIC_API_KEY is configured.
    - Otherwise (or if Claude fails), falls back to Gemini 3.8 Flash using GEMINI_API_KEY.
    """
    try:
        return extract_with_gemini(
            b64_image=b64_image,
            mime_type=mime_type,
            system_prompt=system_prompt,
            user_instruction=user_instruction,
            response_schema=response_schema,
        )
    except GeminiInfrastructuralError as gemini_err:
        logger.warning(
            "Gemini 4 Argon failed (%s). Triggering HA failover...",
            str(gemini_err),
        )
        claude_err_msg = "not attempted"
        try:
            return extract_with_claude(
                b64_image=b64_image,
                mime_type=mime_type,
                system_prompt=system_prompt,
                user_instruction=user_instruction,
                response_schema=response_schema,
            )
        except ClaudeFailoverError as claude_err:
            claude_err_msg = str(claude_err)
            logger.warning(
                "Claude Opus 5.5 failover unavailable (%s). Trying fast fallback to %s...",
                claude_err_msg,
                FALLBACK_GEMINI_MODEL,
            )

        try:
            return extract_with_gemini(
                b64_image=b64_image,
                mime_type=mime_type,
                system_prompt=system_prompt,
                user_instruction=user_instruction,
                response_schema=response_schema,
                model_override=FALLBACK_GEMINI_MODEL,
            )
        except GeminiInfrastructuralError as flash_err:
            logger.error(
                "All OCR engines failed. Primary: %s | Claude: %s | Fallback (%s): %s",
                str(gemini_err),
                claude_err_msg,
                FALLBACK_GEMINI_MODEL,
                str(flash_err),
            )
            raise HTTPException(
                status_code=503,
                detail=(
                    "OCR service temporarily unavailable. Please enter items manually. "
                    f"(Details: {str(gemini_err)})"
                ),
            ) from flash_err


async def scan_docket_pages(raw_pages: List[bytes]) -> DocketOCRResponse:
    """
    Orchestrates single-page or multi-page (front/back/continuation) handwritten docket OCR:
    1. Preprocesses all page images in-memory (EXIF transpose, resize <=2000px, WebP).
    2. Extracts each page concurrently via Gemini 4 Argon (with HA failover to Claude Opus 5.5).
    3. Applies Header Inheritance (retains primary customer & date across continuation pages).
    4. Merges line entries sequentially across pages and runs deterministic validation.
    """
    if not raw_pages:
        raise HTTPException(status_code=400, detail="No docket images provided.")

    start_time = time.perf_counter()

    # 1. Preprocess all uploaded pages in-memory
    preprocessed_pages: List[Tuple[int, str, str]] = []
    for idx, raw_bytes in enumerate(raw_pages, start=1):
        _, b64_img, mime_type = preprocess_image_bytes(raw_bytes)
        preprocessed_pages.append((idx, b64_img, mime_type))

    # 2. Extract all pages (in parallel threads so multi-page takes ~2s total)
    async def _process_single_page(page_num: int, b64_img: str, mime: str) -> Tuple[int, DocketLLMOutput, str]:
        user_prompt = (
            f"Extract all handwritten scrap metal docket data from Page {page_num} "
            f"(of {len(preprocessed_pages)}). Return strictly valid JSON."
        )
        parsed_page, model_name = await asyncio.to_thread(
            _extract_with_failover_sync,
            b64_img,
            mime,
            DOCKET_OCR_PROMPT,
            user_prompt,
            DocketLLMOutput,
        )
        return page_num, parsed_page, model_name

    page_results = await asyncio.gather(
        *[_process_single_page(p_num, b64, mime) for p_num, b64, mime in preprocessed_pages]
    )

    # Sort by page number to guarantee sequential merging
    page_results.sort(key=lambda r: r[0])

    # 3. Header Inheritance & Sequential Item Merging
    inherited_customer = None
    inherited_date = None
    merged_entries: List[DocketLineEntry] = []
    merged_skipped_lines: List[int] = []
    models_used = []
    sequential_line_counter = 1

    for page_num, page_output, model_name in page_results:
        models_used.append(model_name)

        if not inherited_customer and page_output.customer and page_output.customer.strip():
            inherited_customer = page_output.customer.strip()

        if not inherited_date and page_output.date and page_output.date.strip():
            inherited_date = page_output.date.strip()

        for entry in page_output.entries:
            entry.page = page_num
            entry.line = sequential_line_counter
            sequential_line_counter += 1
            merged_entries.append(entry)

        for skipped in page_output.skipped_lines:
            merged_skipped_lines.append(skipped)

    if not merged_entries:
        raise HTTPException(
            status_code=422,
            detail="Image is too blurry or dark, or no valid docket entries were detected. Please retake with good lighting.",
        )

    unified_docket = DocketLLMOutput(
        customer=inherited_customer,
        date=inherited_date,
        entries=merged_entries,
        skipped_lines=merged_skipped_lines,
    )

    # 4. Run deterministic domain validation & normalization
    validated_docket, chaining_warnings = validate_and_normalize_docket(unified_docket)

    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
    primary_model_used = models_used[-1] if models_used else "gemini-4-argon"

    return DocketOCRResponse(
        success=True,
        model_used=primary_model_used,
        execution_time_ms=elapsed_ms,
        customer=validated_docket.customer,
        date=validated_docket.date,
        entries=validated_docket.entries,
        skipped_lines=validated_docket.skipped_lines,
        chaining_warnings=chaining_warnings,
        pages_processed=len(preprocessed_pages),
    )


async def scan_customer_id_card(raw_bytes: bytes) -> CustomerIDOCRResponse:
    """
    Orchestrates Customer ID / Driver's Licence OCR:
    1. Preprocesses card photo in-memory (never saved to disk).
    2. Extracts via Gemini 4 Argon (with HA failover to Claude Opus 5.5).
    3. Rejects non-ID images with HTTP 422.
    4. Runs deterministic Australian licence format, expiry, and age checks.
    """
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="No ID image provided.")

    start_time = time.perf_counter()

    _, b64_img, mime_type = preprocess_image_bytes(raw_bytes)

    user_prompt = (
        "Extract customer identity details from this Australian identity document "
        "(Driver's Licence, Photo Card, or Passport). Return strictly valid JSON."
    )

    raw_id_output, model_used = await asyncio.to_thread(
        _extract_with_failover_sync,
        b64_img,
        mime_type,
        CUSTOMER_ID_OCR_PROMPT,
        user_prompt,
        CustomerIDLLMOutput,
    )

    # Check if image is not an ID document at all
    if "not_an_id" in (raw_id_output.flags or []) and not any(
        [raw_id_output.name, raw_id_output.license_number, raw_id_output.dob, raw_id_output.address]
    ):
        raise HTTPException(
            status_code=422,
            detail="No valid document detected in this image. Please scan a Driver's Licence, Photo Card, or Passport.",
        )

    validated_id = validate_customer_id(raw_id_output)
    elapsed_ms = int((time.perf_counter() - start_time) * 1000)

    return CustomerIDOCRResponse(
        success=True,
        model_used=model_used,
        execution_time_ms=elapsed_ms,
        data=validated_id,
    )

