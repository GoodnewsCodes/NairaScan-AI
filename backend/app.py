"""
app.py — NairaScan AI FastAPI backend server
Runs on http://127.0.0.1:8765
"""
import asyncio
import json
import logging
import sys
from contextlib import asynccontextmanager
from typing import List

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import HOST, PORT
from extract import load_documents
from model import get_model, run_inference
from banks import get_extractor
from process import merge_page_results

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("nairascan")

# ─── State ────────────────────────────────────────────────────────────────────
_cancel_flag = False


# ─── Lifespan ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load the model on startup so the first request is instant."""
    try:
        logger.info("Pre-loading Gemma 3 model...")
        get_model()
        logger.info("Model ready. Server accepting requests.")
    except FileNotFoundError as e:
        logger.warning(f"Model not found — running in stub mode. ({e})")
    yield


# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="NairaScan AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "app://.", "file://"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ──────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    file_paths: List[str]


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _progress(message: str, progress: int) -> str:
    """Serialize a newline-delimited JSON progress event."""
    return json.dumps({"type": "progress", "message": message, "progress": progress}) + "\n"


# ─── Routes ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    from config import MODEL_PATH
    import os
    
    model_name = MODEL_PATH.name
    model_exists = MODEL_PATH.exists()
    
    # Check if singleton is initialized
    from model import _llm
    is_loaded = _llm is not None
    
    return {
        "status": "ok",
        "model": "gemma-3",
        "model_file": model_name,
        "model_exists": model_exists,
        "is_loaded": is_loaded,
        "version": "1.0.0"
    }


@app.get("/")
def root():
    return {"status": "ok", "message": "NairaScan AI Backend is running"}


@app.post("/cancel")
def cancel():
    global _cancel_flag
    _cancel_flag = True
    return {"cancelled": True}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Main analysis endpoint.
    Streams newline-delimited JSON progress events, then a final result JSON.
    """
    global _cancel_flag
    _cancel_flag = False

    if not req.file_paths:
        raise HTTPException(status_code=400, detail="No file paths provided.")

    async def event_stream():
        page_results = []
        total_files = len(req.file_paths)

        try:
            for file_idx, file_path in enumerate(req.file_paths):
                if _cancel_flag:
                    yield json.dumps({"type": "cancelled"}) + "\n"
                    return

                file_name = file_path.split("\\")[-1].split("/")[-1]
                yield _progress(f"Loading {file_name}...", 5)
                await asyncio.sleep(0)  # allow other coroutines to run

                # Load pages from file
                try:
                    pages = load_documents(file_path)
                except Exception as e:
                    yield json.dumps({"type": "error", "message": str(e)}) + "\n"
                    return

                total_pages = len(pages)
                
                # Detect bank from first 2 pages + filename for reliability
                detection_text = file_path + " " + " ".join([p["text"] for p in pages[:2]])
                extractor = get_extractor(detection_text)
                
                yield _progress(
                    f"{file_name} → {total_pages} page(s) loaded. Identified: {extractor.bank_name}. Starting AI...",
                    10 + (file_idx * 60 // total_files)
                )
                await asyncio.sleep(0)

                # Run inference on each page
                for page_idx, page_data in enumerate(pages):
                    if _cancel_flag:
                        yield json.dumps({"type": "cancelled"}) + "\n"
                        return

                    image = page_data["image"]
                    text_context = page_data["text"]

                    page_progress = int(
                        10 + ((file_idx + (page_idx + 1) / total_pages) / total_files) * 60
                    )
                    yield _progress(
                        f"Analyzing page {page_idx + 1}/{total_pages} of {file_name}...",
                        page_progress
                    )
                    await asyncio.sleep(0)

                    # Run model inference (Image + Text Map)
                    loop = asyncio.get_event_loop()
                    result = await loop.run_in_executor(
                        None, run_inference, image, page_idx + 1, text_context, extractor
                    )
                    page_results.append(result)

                yield _progress(
                    f"Finished {file_name}.",
                    10 + ((file_idx + 1) * 60 // total_files)
                )

            # Merge & process all pages
            yield _progress("Merging pages and computing analytics...", 75)
            await asyncio.sleep(0)

            loop = asyncio.get_event_loop()
            final_result = await loop.run_in_executor(None, merge_page_results, page_results)

            yield _progress("Detecting anomalies...", 90)
            await asyncio.sleep(0)

            yield _progress("Done!", 100)
            await asyncio.sleep(0)

            # Final payload — same line format, different type
            yield json.dumps({"type": "result", **final_result}) + "\n"

        except Exception as e:
            logger.exception("Unexpected error during analysis")
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
    )


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=HOST,
        port=PORT,
        reload=False,
        log_level="info",
    )
