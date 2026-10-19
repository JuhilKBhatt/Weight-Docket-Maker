# backend/app/services/ocr/claude_client.py

import json
import os
import re
from typing import Tuple, Type, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

DEFAULT_CLAUDE_MODEL = "claude-opus-5.5"


class ClaudeFailoverError(Exception):
    """Raised when the Claude Opus 5.5 HA failover client also fails."""
    pass


def _strip_markdown_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def extract_with_claude(
    b64_image: str,
    mime_type: str,
    system_prompt: str,
    user_instruction: str,
    response_schema: Type[T],
    timeout_seconds: float = 15.0,
) -> Tuple[T, str]:
    """
    High-Availability (HA) failover OCR client using Claude Opus 5.5.
    Triggered strictly when Google Gemini experiences 429 rate limits,
    5xx downtime, >6s timeout, or malformed JSON responses.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise ClaudeFailoverError("ANTHROPIC_API_KEY is not configured for HA failover.")

    model_name = os.getenv("CLAUDE_OCR_MODEL", DEFAULT_CLAUDE_MODEL).strip() or DEFAULT_CLAUDE_MODEL

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key, timeout=timeout_seconds)
        response = client.messages.create(
            model=model_name,
            max_tokens=4096,
            temperature=0.1,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": b64_image,
                            },
                        },
                        {
                            "type": "text",
                            "text": (
                                f"{user_instruction}\n\n"
                                "Return ONLY valid JSON matching the required schema. "
                                "Do not wrap in markdown code fences."
                            ),
                        },
                    ],
                }
            ],
        )

        text_parts = [
            block.text for block in response.content if getattr(block, "type", None) == "text"
        ]
        raw_output = "\n".join(text_parts).strip()
        if not raw_output:
            raise ClaudeFailoverError("Claude Opus 5.5 returned an empty response.")

        cleaned_json = _strip_markdown_fences(raw_output)
        parsed_dict = json.loads(cleaned_json)
        validated_model = response_schema.model_validate(parsed_dict)
        return validated_model, model_name

    except ClaudeFailoverError:
        raise
    except Exception as exc:
        raise ClaudeFailoverError(f"Claude HA failover error: {str(exc)}") from exc

