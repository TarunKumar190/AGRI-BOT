@echo off
REM ================================================
REM  KrishiMitra Offline Chatbot - Setup Script
REM  Run this on the NEW Windows device
REM ================================================

echo.
echo ========================================
echo   KrishiMitra Offline Chatbot Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo.
    echo Please install Python 3.9+ from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo [OK] Python found
python --version
echo.

REM Check if pip is available
pip --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pip not found!
    pause
    exit /b 1
)

echo [OK] pip found
pip --version
echo.

REM Create virtual environment
echo [STEP 1/4] Creating virtual environment...
if exist venv (
    echo Virtual environment already exists, skipping...
) else (
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)
echo.

REM Activate virtual environment
echo [STEP 2/4] Activating virtual environment...
call venv\Scripts\activate.bat
echo [OK] Virtual environment activated
echo.

REM Upgrade pip
echo [STEP 3/4] Upgrading pip...
python -m pip install --upgrade pip --quiet
echo [OK] pip upgraded
echo.

REM Install dependencies
echo [STEP 4/4] Installing dependencies (this may take 5-10 minutes)...
echo Please wait...
pip install -r requirements\requirements.txt

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install dependencies
    echo Try installing manually: pip install -r requirements\requirements.txt
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo You can now run the chatbot with:
echo   1. Double-click: START_CHATBOT.bat
echo   2. Or manually: streamlit run code\streamlit_app.py
echo.
echo To test: python code\offline_retrieval.py
echo.
pause
