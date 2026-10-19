# backend/app/services/ocr/image_processor.py

import base64
import io
from typing import Tuple
from PIL import Image, ImageOps
from fastapi import HTTPException

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit per uploaded file
DEFAULT_MAX_DIMENSION = 1536
DEFAULT_WEBP_QUALITY = 82


def preprocess_image_bytes(
    raw_bytes: bytes,
    max_dimension: int = DEFAULT_MAX_DIMENSION,
    quality: int = DEFAULT_WEBP_QUALITY,
) -> Tuple[bytes, str, str]:
    """
    In-memory image preprocessor (Privacy by Design - never writes to disk).
    1. Checks file size <= 15MB.
    2. Auto-rotates image using EXIF orientation tags.
    3. Downscales image to max_dimension (2000px) preserving aspect ratio.
    4. Compresses to WebP format for fast multimodal upload.

    Returns:
        (processed_bytes, base64_str, mime_type)
    """
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image file exceeds the 15MB maximum size limit. Please upload a smaller image.",
        )

    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            # 1. Apply EXIF orientation transpose so sideways phone photos are upright
            img = ImageOps.exif_transpose(img)

            # 2. Convert to RGB (handles RGBA, P, CMYK, grayscale cleanly for WebP)
            if img.mode not in ("RGB", "L"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if "A" in img.getbands():
                    background.paste(img, mask=img.split()[-1])
                else:
                    background.paste(img)
                img = background
            elif img.mode == "L":
                img = img.convert("RGB")

            # 3. Downscale if width or height exceeds max_dimension
            width, height = img.size
            if width > max_dimension or height > max_dimension:
                img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

            # 4. Compress in-memory to WebP
            output_buffer = io.BytesIO()
            img.save(output_buffer, format="WEBP", quality=quality, method=4)
            processed_bytes = output_buffer.getvalue()
            b64_str = base64.b64encode(processed_bytes).decode("utf-8")
            return processed_bytes, b64_str, "image/webp"

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or corrupted image file: {str(exc)}",
        ) from exc

