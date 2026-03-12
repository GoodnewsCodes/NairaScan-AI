# 🚀 NairaScan-AI — Build & Run Guide

This is an **Electron + React** desktop app with a **Python (FastAPI)** backend and a local **Gemma 3** AI model.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **pnpm** | 10+ | `npm install -g pnpm` |
| **Python** | 3.10+ | [python.org](https://python.org) |

---

## Step 1 — Download the AI Model

Before anything else, download the Gemma 3 GGUF model and place it in `backend/models/`:

```
Model file : gemma-3-4b-it-q4_k_m.gguf
Download   : https://huggingface.co/bartowski/gemma-3-4b-it-GGUF
Place at   : backend\models\gemma-3-4b-it-q4_k_m.gguf
```

> **Hardware note:** The 4B Q4 model needs ~3 GB RAM. For lower-spec machines, use the 1B variant instead.

---

## Step 2 — Set Up the Python Backend

Open a terminal in `backend\` and run:

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

> **Or** just double-click `backend\start.bat` — it does all of the above automatically.

---

## Step 3 — Install Frontend / Electron Dependencies

From the **project root** (`NairaScan-AI\`):

```cmd
pnpm install
```

---

## Step 4 — Run in Development Mode

```cmd
pnpm start
```

This single command:
1. Starts the **Vite dev server** (React UI at `localhost:5173`)
2. Waits for Vite to be ready, then launches **Electron**
3. Electron automatically **starts the Python backend** on `http://127.0.0.1:8765`

---

## Step 5 (Optional) — Build a Distributable `.exe`

```cmd
pnpm dist:win
```

This bundles everything into a Windows installer. Output goes to `dist\`.

---

## Quick Reference — All Scripts

| Command | What it does |
|---------|-------------|
| `pnpm start` | **Dev mode** — Vite + Electron together |
| `pnpm build` | Build React/Vite frontend only |
| `pnpm dist:win` | Package as Windows `.exe` installer |
| `pnpm dist:mac` | Package as macOS `.dmg` |
| `pnpm dist:linux` | Package as Linux AppImage |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **Electron not found** | Run `pnpm install` again; if it fails, delete `node_modules\electron` and reinstall |
| **Backend won't start** | Make sure `venv` exists in `backend\`. Run `start.bat` first |
| **Model not found warning** | App runs in stub mode (no real AI). Place the `.gguf` file in `backend\models\` |
| **`llama-cpp-python` install fails** | Install [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) |
| **`pandas` install is very slow** | It's building from source — see note below |

### Why is `pandas` (or any package) slow to install?

pip is **compiling pandas from source** instead of downloading a pre-built binary wheel.
This happens when pip cannot find a matching wheel for your exact Python version + platform.
It triggers a full C/Cython build which can take **3–10 minutes**.

**Fix — upgrade pip first, then reinstall:**

```cmd
python -m pip install --upgrade pip
pip install -r requirements.txt
```

A modern pip is much better at finding pre-built wheels on PyPI and avoids source builds.
If it still builds from source, you can pin a slightly different patch version that has wheels:

```cmd
pip install "pandas>=2.2.2,<2.3" --prefer-binary
```
