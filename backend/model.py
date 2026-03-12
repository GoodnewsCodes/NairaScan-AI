"""
model.py — Gemma 3 model loader and inference
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
            f"Download a Gemma 3 GGUF (e.g. gemma-3-4b-it) and place it in backend/models/.\n"
            f"See backend/models/README.txt for instructions."
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


def run_inference(image: Image.Image, page_num: int = 1, text_context: str = "", extractor=None) -> dict:
    """
    Run the model on a single bank statement page.
    Uses an extractor class to determine the correct prompts.
    """
    from config import MAX_TOKENS, TEMPERATURE
    from banks import BankExtractor

    if extractor is None:
        extractor = BankExtractor()

    llm = get_model()
    
    model_name = str(MODEL_PATH).lower()
    is_multimodal = "4b" in model_name or "12b" in model_name or "27b" in model_name
    
    system_prompt = extractor.get_system_prompt()
    user_prompt = extractor.get_user_prompt(page_num, text_context)

    if is_multimodal:
        img_b64 = image_to_base64(image)
        prompt = (
            f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|>"
            f"<|start_header_id|>user<|end_header_id|>\n\n<image>\n"
            f"{user_prompt}<|eot_id|>"
            f"<|start_header_id|>assistant<|end_header_id|>\n\n"
        )
    else:
        prompt = (
            f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|>"
            f"<|start_header_id|>user<|end_header_id|>\n\n"
            f"[Page {page_num}] {user_prompt}<|eot_id|>"
            f"<|start_header_id|>assistant<|end_header_id|>\n\n"
        )

    logger.info(f"Running inference on page {page_num} using {'multimodal' if is_multimodal else 'text-only'} prompt...")
    response = llm(
        prompt,
        max_tokens=MAX_TOKENS,
        temperature=TEMPERATURE,
        stop=["<|eot_id|>", "</s>"],
    )

    raw = response["choices"][0]["text"].strip()
    logger.debug(f"Raw AI Output: {raw[:300]}...")

    # Robust JSON extraction using regex
    import re
    try:
        # Find everything between the first '{' and the last '}'
        match = re.search(r'(\{.*\})', raw, re.DOTALL)
        if match:
            json_str = match.group(1)
            return json.loads(json_str)
        else:
            # Fallback if no braces found
            return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Model returned invalid JSON on page {page_num}: {e}")
        # Log a bit of the problematic output for debugging
        logger.debug(f"Failed JSON string: {raw[:500]}")
        return {"transactions": [], "_parse_error": str(e), "_raw": raw[:500]}
