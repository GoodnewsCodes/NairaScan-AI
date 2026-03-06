"""
NairaScan AI — Backend Configuration
Edit MODEL_PATH to point at your downloaded GGUF model file.
"""
from pathlib import Path

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"

# ► Put your DeepSeek-VL2 GGUF file here, e.g.:
#   backend/models/deepseek-vl2-small-q4_k_m.gguf
MODEL_PATH = MODELS_DIR / "deepseek-vl2-small-q4_k_m.gguf"

# ─── Server ───────────────────────────────────────────────────────────────────
HOST = "127.0.0.1"
PORT = 8765

# ─── Inference ────────────────────────────────────────────────────────────────
N_CTX        = 4096    # context window tokens
N_GPU_LAYERS = -1      # -1 = offload all layers to GPU; set 0 for CPU-only
N_THREADS    = 8       # CPU threads used when GPU not available
MAX_TOKENS   = 2048    # max tokens for model response
TEMPERATURE  = 0.1     # low = more deterministic / factual

# ─── PDF → Image ──────────────────────────────────────────────────────────────
PDF_DPI = 200   # higher = more accurate OCR, slower
