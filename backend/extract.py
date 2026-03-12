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


def load_documents(file_path: str) -> List[dict]:
    """
    Given a file path, return a list of pages.
    Each page is a dict: {"image": PIL.Image, "text": "spatial text map"}
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".pdf":
        return _pdf_to_data(path)
    elif ext in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}:
        return [{"image": Image.open(path).convert("RGB"), "text": ""}]
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _pdf_to_data(pdf_path: Path) -> List[dict]:
    """
    Convert PDF pages to Image + Spatial Text.
    Optimized for Kuda Bank table layout.
    """
    from config import PDF_DPI

    pages_data = []
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # 1. Capture high-res image for visual context
                img = page.to_image(resolution=PDF_DPI).original
                
                # 2. Capture spatial text to help AI with horizontal alignment (Debit vs Credit)
                # layout=True preserves the physical spacing of the document
                text_map = page.extract_text(layout=True) or ""
                
                pages_data.append({
                    "image": img.convert("RGB"),
                    "text": text_map
                })
        if pages_data:
            logger.info(f"Extracted {len(pages_data)} pages with spatial text from {pdf_path.name}")
            return pages_data
    except Exception as e:
        logger.warning(f"Secondary extraction fallback due to: {e}")

    # Strategy 2: pdf2image fallback (Image only, no spatial text)
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(str(pdf_path), dpi=PDF_DPI)
        return [{"image": img.convert("RGB"), "text": ""} for img in images]
    except Exception as e:
        raise RuntimeError(f"PDF conversion failed: {e}")


def image_to_bytes(image: Image.Image, format: str = "PNG") -> bytes:
    """Encode a PIL Image to raw bytes (useful for model input)."""
    buf = io.BytesIO()
    image.save(buf, format=format)
    return buf.getvalue()
