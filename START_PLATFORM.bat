@echo off
title EduAegis - Live Teaching & Anti-Piracy Platform
echo ======================================================================
echo           Welcome to EduAegis! Starting your platform...
echo ======================================================================
echo.
echo 1. Launching EduAegis Live Server...
cd /d "%~dp0"

REM Open the web browser automatically after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:4200"

REM Start the server
node dist/index.js

pause
