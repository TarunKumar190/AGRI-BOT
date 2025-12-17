@echo off
REM ================================================
REM  KrishiMitra Offline Chatbot - Start Script
REM ================================================

echo.
echo ========================================
echo   Starting KrishiMitra Chatbot...
echo ========================================
echo.

REM Activate virtual environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    echo [OK] Virtual environment activated
) else (
    echo [WARNING] Virtual environment not found!
    echo Please run SETUP.bat first
    pause
    exit /b 1
)

echo.
echo [INFO] Starting Streamlit app...
echo [INFO] The app will open in your browser automatically
echo [INFO] Press Ctrl+C to stop the server
echo.

REM Start Streamlit
streamlit run code\streamlit_app.py

pause
