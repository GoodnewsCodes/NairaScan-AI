@echo off
REM NairaScan AI — Backend Startup Script (Windows)
REM Run this once to set up and start the Python backend.

echo.
echo ================================================
echo   NairaScan AI - Python Backend
echo ================================================
echo.

REM Check Python is available
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Python not found. Install Python 3.10+ from python.org
    pause
    exit /b 1
)

REM Create virtual environment if missing
IF NOT EXIST venv (
    echo [1/3] Creating virtual environment...
    python -m venv venv
)

REM Activate venv
call venv\Scripts\activate.bat

REM Install dependencies
echo [2/3] Installing dependencies...
pip install -r requirements.txt --quiet

REM Check if model exists
IF NOT EXIST models\deepseek-vl2-small-q4_k_m.gguf (
    echo.
    echo [WARNING] Model file not found at:
    echo   backend\models\deepseek-vl2-small-q4_k_m.gguf
    echo.
    echo Download from Hugging Face:
    echo   https://huggingface.co/bartowski/deepseek-ai_DeepSeek-VL2-Small-GGUF
    echo.
    echo The server will start in stub mode ^(no actual inference^).
    echo.
)

REM Start the server
echo [3/3] Starting FastAPI server on http://127.0.0.1:8765 ...
echo.
python app.py
