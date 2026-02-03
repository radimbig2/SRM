@echo off
cd /d "%~dp0backend"
.\.venv\Scripts\python.exe -m uvicorn main:app --port 8000
pause
