"""
model.py — DeepSeek-VL2 model loader and inference
Loads the GGUF model once and reuses it across requests.
"""
import base64
import io
import json
import logging
from typing import Optional

from PIL import Image

logger = logging.getLogger(__name__)

_llm = None  # Module-level singleton


def get_model():
    """
    Lazy-load and cache the LLM.
    Raises FileNotFoundError if the model GGUF is missing.
    """
    global _llm
    if _llm is not None:
        return _llm

    from config import MODEL_PATH, N_CTX, N_GPU_LAYERS, N_THREADS
    from llama_cpp import Llama

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found at: {MODEL_PATH}\n"
            f"Download a DeepSeek-VL2 GGUF and place it in backend/models/.\n"
            f"Recommended: deepseek-vl2-small-q4_k_m.gguf (~8GB)"
        )

    logger.info(f"Loading model from {MODEL_PATH} ...")
    _llm = Llama(
        model_path=str(MODEL_PATH),
        n_ctx=N_CTX,
        n_gpu_layers=N_GPU_LAYERS,
        n_threads=N_THREADS,
        verbose=False,
    )
    logger.info("Model loaded successfully.")
    return _llm


def image_to_base64(image: Image.Image) -> str:
    """Convert PIL image to base64 string for embedding in the prompt."""
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


SYSTEM_PROMPT = """You are a financial document analysis AI specializing in Nigerian bank statements.
Your job is to extract ALL transactions from the provided bank statement image and return them as structured JSON.

Rules:
- Extract every row from transaction tables
- Include: date, description/narration, debit amount, credit amount, balance
- Normalize Nigerian date formats (e.g. "28-Oct-2025" → "2025-10-28")
- Remove currency symbols and commas from amounts; use plain numbers
- If a field is missing, use null
- Return ONLY valid JSON — no explanations, no markdown

Output format:
{
  "bank": "bank name if visible",
  "account_number": "last 4 digits if visible",
  "statement_period": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"},
  "opening_balance": 0.00,
  "closing_balance": 0.00,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "narration text",
      "debit": 0.00,
      "credit": 0.00,
      "balance": 0.00
    }
  ]
}"""


def run_inference(image: Image.Image, page_num: int = 1) -> dict:
    """
    Run the model on a single bank statement page image.
    Returns parsed transaction JSON.
    """
    from config import MAX_TOKENS, TEMPERATURE

    llm = get_model()
    img_b64 = image_to_base64(image)

    prompt = (
        f"<image_start><image_data>{img_b64}</image_end>\n\n"
        f"This is page {page_num} of a Nigerian bank statement. "
        f"Extract all transactions visible on this page as JSON."
    )

    logger.info(f"Running inference on page {page_num}...")
    response = llm(
        prompt,
        max_tokens=MAX_TOKENS,
        temperature=TEMPERATURE,
        stop=["</s>", "<|end|>"],
    )

    raw = response["choices"][0]["text"].strip()

    # Strip any accidental markdown code fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Model returned invalid JSON on page {page_num}: {e}")
        logger.debug(f"Raw output: {raw[:500]}")
        return {"transactions": [], "_parse_error": str(e), "_raw": raw[:500]}
