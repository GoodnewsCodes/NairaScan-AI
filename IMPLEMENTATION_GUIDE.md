# NairaScan AI

**Local AI-powered Bank Statement & Document Analyzer**  
Extract transactions, charges, figures → perform sums, categorizations, anomaly detection → generate clean reports — **100% offline & private**.

Built with **Electron** (desktop app), **Gemma 3** (multimodal AI for document understanding), Python backend for heavy lifting.

**Key Goals**  
- Fully local (no cloud API calls)  
- Handles PDFs (digital + scanned), images of statements  
- Strong on tables, bank formats (GTBank, Zenith, Access, UBA, etc.)  
- Arithmetic (totals, category sums, flags for large/unusual charges)  
- Beautiful, simple UI for drag-drop + report export

## Tech Stack Overview

| Layer              | Technology / Tool                              | Why? |
|---------------------|------------------------------------------------|------|
| Desktop App        | Electron + React / Vue / plain HTML+JS        | Cross-platform (Windows/macOS/Linux), familiar web tech |
| UI Framework       | React + Tailwind CSS (or shadcn/ui)           | Modern, responsive, component-based |
| PDF/Image Processing | pdf.js / pdf-lib / pdf2pic / pdfplumber (Python) | Text extraction + page-to-image conversion |
| Local AI Inference | llama.cpp (GGUF) or Transformers + Gemma 3   | Best local VLM support; GGUF = fastest quantized inference |
| Model              | Gemma-3-4B-IT (or Gemma-3-12B / 1B)         | Excellent OCR + table + JSON-structured output on financial docs |
| Backend / Logic    | Python (FastAPI or simple HTTP server)        | Pandas for math, Pydantic for validation, easy integration |
| Communication      | IPC (Electron) + HTTP localhost (127.0.0.1)   | Reliable bridge between frontend & heavy Python process |
| Auto-Start         | Child Process (spawn) in Electron Main        | Automatically starts/stops backend for non-technical users |
| Packaging          | electron-builder                              | Easy installers (.exe, .dmg, .deb) |

## Hardware Recommendations (March 2026)

| Model Variant       | Approx. RAM (Q4 quant)      | Recommended Specs         | CPU Fallback? | Expected Speed |
|---------------------|-----------------------------|---------------------------|---------------|----------------|
| Gemma-3-1B-IT       | ~1 GB                       | Intel i3 / i5 (all gen)   | Yes (fast)    | Instant        |
| Gemma-3-4B-IT       | ~3 GB                       | Intel i5+ / 8GB RAM       | Yes (good)    | Very fast      |
| Gemma-3-12B-IT      | ~8 GB                       | 16GB RAM / RTX 3060+      | Yes (medium)  | Good           |

→ Use **Gemma-3-4B-IT Q4_K_M** — perfect for 6GB-8GB RAM PCs in 2026. Use **1B** for ultra-light text analysis.

## Project Structure

```text
nairascan-ai/
├── backend/                  # Python logic + model inference
│   ├── app.py                # FastAPI server
│   ├── extract.py            # PDF → images + model calls
│   ├── process.py            # Pandas math + report generation
│   ├── requirements.txt
│   └── models/               # (git ignored) model weights
├── public/                   # Static assets
├── src/                      # Electron + frontend
│   ├── main.js               # Electron main process (Manages Backend)
│   ├── preload.js
│   ├── renderer/             # React/Vue app
│   └── index.html
├── forge.config.js
├── package.json
└── README.md
```

### 2. Automatic Backend Management
The Electron main process (`src/main.js`) is responsible for managing the lifecycle of the Python backend:
- **Startup**: On `app.ready`, it searches for a Python virtual environment in `backend/venv`. If found, it uses that; otherwise, it falls back to the system `python`.
- **Health Check**: It polls `http://127.0.0.1:8765/health` to ensure the server is ready before allowing requests.
- **Graceful Shutdown**: On app exit, it ensures the Python process is cleaned up (using `taskkill` on Windows).

### 3. Setup & Development
To run locally during development:
1. **Backend**: 
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. **Frontend**:
   ```bash
   pnpm install
   pnpm run dev
   ```
3. **Run App**:
   ```bash
   pnpm start
   ```
   *Note: Electron will now start the backend for you if it's not already running.*