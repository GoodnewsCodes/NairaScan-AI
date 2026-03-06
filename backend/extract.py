"""
extract.py — Document ingestion pipeline
Converts PDFs and images into PIL Image objects ready for model inference.
"""
import io
import logging
from pathlib import Path
from typing import List

from PIL import Image

logger = logging.getLogger(__name__)


def load_images_from_file(file_path: str) -> List[Image.Image]:
    """
    Given a file path (PDF or image), return a list of PIL Images —
    one per page (for PDFs) or a single image (for images).
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".pdf":
        return _pdf_to_images(path)
    elif ext in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}:
        return [Image.open(path).convert("RGB")]
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _pdf_to_images(pdf_path: Path) -> List[Image.Image]:
    """
    Convert each page of a PDF to a PIL Image.
    Tries pdfplumber (fast, good for digital PDFs) first.
    Falls back to pdf2image (poppler) for scanned/image-based PDFs.
    """
    from config import PDF_DPI

    # Strategy 1: pdfplumber — lightweight, good for native PDFs
    try:
        import pdfplumber
        images = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Render page to image at target DPI
                img = page.to_image(resolution=PDF_DPI).original
                images.append(img.convert("RGB"))
        if images:
            logger.info(f"pdfplumber: extracted {len(images)} pages from {pdf_path.name}")
            return images
    except Exception as e:
        logger.warning(f"pdfplumber failed ({e}), trying pdf2image...")

    # Strategy 2: pdf2image — requires Poppler on PATH
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(str(pdf_path), dpi=PDF_DPI)
        logger.info(f"pdf2image: extracted {len(images)} pages from {pdf_path.name}")
        return [img.convert("RGB") for img in images]
    except Exception as e:
        raise RuntimeError(
            f"Could not convert PDF to images. "
            f"Ensure Poppler is installed and on PATH. Error: {e}"
        )


def image_to_bytes(image: Image.Image, format: str = "PNG") -> bytes:
    """Encode a PIL Image to raw bytes (useful for model input)."""
    buf = io.BytesIO()
    image.save(buf, format=format)
    return buf.getvalue()
