# backend/app/services/ocr/gemini_client.py

import json
import logging
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from typing import Optional, Type, TypeVar
from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

DEFAULT_GEMINI_MODEL = "gemini-4-argon"
FALLBACK_GEMINI_MODEL = "gemini-3.8-flash"
DEFAULT_SERVICE_TIER = os.getenv("GEMINI_SERVICE_TIER", "priority").strip().lower()
GEMINI_TIMEOUT_SECONDS = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "25.0"))

_CLIENT_CACHE = {}
_CLIENT_LOCK = threading.Lock()


class GeminiInfrastructuralError(Exception):
    """Raised when Gemini encounters 429, 5xx, timeout, or malformed schema output."""
    pass


def _get_genai_client(api_key: str):
    from google import genai

    with _CLIENT_LOCK:
        if api_key not in _CLIENT_CACHE:
            _CLIENT_CACHE[api_key] = genai.Client(api_key=api_key)
        return _CLIENT_CACHE[api_key]


def _strip_markdown_fences(text: str) -> str:
    """Removes optional ```json ... ``` wrappers or surrounding prose if present."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    # Extract outermost JSON object if any leading/trailing text exists
    if not cleaned.startswith("{"):
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            cleaned = cleaned[start : end + 1]
    return cleaned


def _extract_interaction_text(interaction) -> str:
    """Extracts text from an Interaction object via output_text or model_output steps."""
    if getattr(interaction, "output_text", None):
        return interaction.output_text

    steps = getattr(interaction, "steps", None) or []
    collected = []
    for step in steps:
        if getattr(step, "type", None) == "model_output":
            for block in getattr(step, "content", None) or []:
                if getattr(block, "type", None) == "text" and getattr(block, "text", None):
                    collected.append(block.text)
    return "\n".join(collected).strip()


def _call_gemini_sync(
    b64_image: str,
    mime_type: str,
    system_prompt: str,
    user_instruction: str,
    response_schema: Type[T],
    model_name: str,
    api_key: str,
) -> str:
    client = _get_genai_client(api_key)
    service_tier = (
        DEFAULT_SERVICE_TIER
        if DEFAULT_SERVICE_TIER in ("priority", "flex", "standard")
        else None
    )

    # Prefer the modern Interactions API (google-genai >= 2.0.0)
    # Note: We use response_format={"type": "text", "mime_type": "application/json"}
    # without passing the nested Pydantic $defs/anyOf/default schema into server-side
    # FSM grammar compilation (which can stall for 30-45s on complex Literal/Optional schemas),
    # because the system prompt already specifies the exact JSON structure and we validate
    # strictly with Pydantic on return.
    if hasattr(client, "interactions"):
        base_kwargs = {
            "model": model_name,
            "system_instruction": system_prompt,
            "input": [
                {
                    "type": "image",
                    "data": b64_image,
                    "mime_type": mime_type,
                },
                {
                    "type": "text",
                    "text": user_instruction,
                },
            ],
            "generation_config": {
                "thinking_level": "low",
                "temperature": 0.1,
            },
            "response_format": {
                "type": "text",
                "mime_type": "application/json",
            },
            "store": False,
        }

        if service_tier and service_tier != "standard":
            try:
                interaction = client.interactions.create(
                    **base_kwargs,
                    service_tier=service_tier,
                )
            except Exception as tier_err:
                err_text = str(tier_err).lower()
                if (
                    isinstance(tier_err, TypeError)
                    or "service_tier" in err_text
                    or "servicetier" in err_text
                    or "invalid_argument" in err_text
                    or "400" in err_text
                ):
                    logger.info(
                        "Model %s or SDK did not accept service_tier='%s' (%s); retrying with standard tier.",
                        model_name,
                        service_tier,
                        str(tier_err),
                    )
                    interaction = client.interactions.create(**base_kwargs)
                else:
                    raise
        else:
            interaction = client.interactions.create(**base_kwargs)

        output_text = _extract_interaction_text(interaction)
        if not output_text:
            raise GeminiInfrastructuralError("Gemini returned an empty response.")
        return output_text

    # Fallback if an older google-genai 1.x package is installed in the container
    import base64
    from google.genai import types

    image_bytes = base64.b64decode(b64_image)
    config_kwargs = {
        "system_instruction": system_prompt,
        "temperature": 0.1,
        "response_mime_type": "application/json",
    }
    if hasattr(types, "ThinkingConfig"):
        config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=1024)

    contents = [
        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        user_instruction,
    ]

    if service_tier and service_tier != "standard":
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs, service_tier=service_tier),
            )
        except Exception:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )
    else:
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(**config_kwargs),
        )
    if not response or not response.text:
        raise GeminiInfrastructuralError("Gemini returned an empty response.")
    return response.text


def extract_with_gemini(
    b64_image: str,
    mime_type: str,
    system_prompt: str,
    user_instruction: str,
    response_schema: Type[T],
    timeout_seconds: float = GEMINI_TIMEOUT_SECONDS,
    model_override: Optional[str] = None,
) -> tuple[T, str]:
    """
    Executes multimodal OCR extraction with Gemini 4 Argon (low thinking effort).
    Aborts and raises GeminiInfrastructuralError if execution exceeds timeout_seconds,
    hits HTTP 429/5xx, or produces malformed JSON violating the schema.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise GeminiInfrastructuralError("GEMINI_API_KEY is not configured.")

    model_name = (
        model_override
        or os.getenv("GEMINI_OCR_MODEL", DEFAULT_GEMINI_MODEL).strip()
        or DEFAULT_GEMINI_MODEL
    )

    executor = ThreadPoolExecutor(max_workers=1)
    try:
        future = executor.submit(
            _call_gemini_sync,
            b64_image,
            mime_type,
            system_prompt,
            user_instruction,
            response_schema,
            model_name,
            api_key,
        )
        raw_output = future.result(timeout=timeout_seconds)
    except FuturesTimeoutError as exc:
        executor.shutdown(wait=False, cancel_futures=True)
        raise GeminiInfrastructuralError(
            f"Gemini API call ({model_name}) timed out after {timeout_seconds}s."
        ) from exc
    except GeminiInfrastructuralError:
        executor.shutdown(wait=False)
        raise
    except Exception as exc:
        executor.shutdown(wait=False)
        raise GeminiInfrastructuralError(f"Gemini API error ({model_name}): {str(exc)}") from exc
    else:
        executor.shutdown(wait=False)

    try:
        cleaned_json = _strip_markdown_fences(raw_output)
        parsed_dict = json.loads(cleaned_json)
        validated_model = response_schema.model_validate(parsed_dict)
        return validated_model, model_name
    except Exception as exc:
        raise GeminiInfrastructuralError(
            f"Gemini ({model_name}) returned malformed JSON payload: {str(exc)}"
        ) from exc
