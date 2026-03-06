# NairaScan AI

**Local AI-powered Bank Statement & Document Analyzer**  
Extract transactions, charges, figures → perform sums, categorizations, anomaly detection → generate clean reports — **100% offline & private**.

Built with **Electron** (desktop app), **DeepSeek-VL2** (vision-language model for document understanding), Python backend for heavy lifting.

**Key Goals**  
- Fully local (no cloud API calls)  
- Handles PDFs (digital + scanned), images of statements  
- Strong on tables, Nigerian bank formats (GTBank, Zenith, Access, UBA, etc.)  
- Arithmetic (totals, category sums, flags for large/unusual charges)  
- Beautiful, simple UI for drag-drop + report export

## Tech Stack Overview

| Layer              | Technology / Tool                              | Why? |
|---------------------|------------------------------------------------|------|
| Desktop App        | Electron + React / Vue / plain HTML+JS        | Cross-platform (Windows/macOS/Linux), familiar web tech |
| UI Framework       | React + Tailwind CSS (or shadcn/ui)           | Modern, responsive, component-based |
| PDF/Image Processing | pdf.js / pdf-lib / pdf2pic / pdfplumber (Python) | Text extraction + page-to-image conversion |
| Local AI Inference | llama.cpp (GGUF) or Transformers + DeepSeek-VL2 | Best local VLM support; GGUF = fastest quantized inference |
| Model              | DeepSeek-VL2-Small (or Tiny / Full)           | Excellent OCR + table + JSON-structured output on financial docs |
| Backend / Logic    | Python (FastAPI or simple HTTP server)        | Pandas for math, Pydantic for validation, easy integration |
| Communication      | IPC (Electron) + HTTP localhost (127.0.0.1)   | Reliable bridge between frontend & heavy Python process |
| Packaging          | electron-builder                              | Easy installers (.exe, .dmg, .deb) |

## Hardware Recommendations (March 2026)

| Model Variant       | Approx. VRAM (Q4/Q5 quant) | Recommended GPU          | CPU Fallback? | Expected Speed |
|---------------------|-----------------------------|---------------------------|---------------|----------------|
| DeepSeek-VL2-Tiny   | 4–7 GB                      | GTX 1660 / RTX 3050+      | Yes (slow)    | Very fast      |
| DeepSeek-VL2-Small  | 8–14 GB                     | RTX 3060 12GB / 4060 / 4070 | Marginal     | Good (~5–15s/page) |
| DeepSeek-VL2 (full) | 14–22 GB                    | RTX 4090 / 5090 / A6000   | No            | Best accuracy  |

→ Start with **DeepSeek-VL2-Small Q4_K_M** — sweet spot for most laptops/desktops in 2026.

## Step-by-Step Implementation Guide (From Scratch)
PNPM is our package manager
### 1. Project Setup & Folder Structure

```text
nairascan-ai/
├── backend/                  # Python logic + model inference
│   ├── app.py                # FastAPI server or simple Flask
│   ├── extract.py            # PDF → images + model calls
│   ├── process.py            # Pandas math + report generation
│   ├── requirements.txt
│   └── models/               # (git ignored) model weights if not using HF cache
├── public/                   # Static assets
├── src/                      # Electron + frontend
│   ├── main.js               # Electron main process
│   ├── preload.js
│   ├── renderer/             # React/Vue app
│   └── index.html
├── forge.config.js           # or electron-builder config
├── package.json
└── README.md