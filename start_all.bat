@echo off
title FXEC OTP Attendance System - Launcher
echo ========================================================
echo   FXEC OTP Attendance System - Starting Services
echo ========================================================
echo.

:: 1. Start MySQL Server
echo [1/3] Checking MySQL Server...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MySQL is already running.
) else (
    echo Starting MySQL Server in background...
    start /b "" "C:\Users\0dani\AppData\Local\Programs\MySQL\bin\mysqld.exe" --console
    timeout /t 2 /nobreak >nul
    echo [OK] MySQL Server started on port 3306.
)
echo.

:: 2. Start Express Backend
echo [2/3] Starting Express API Server on port 5000...
start "FXEC Backend (Port 5000)" powershell -NoExit -ExecutionPolicy Bypass -File "c:\Users\0dani\Desktop\otp_att\start_server.ps1"
echo [OK] Express Backend launched.
echo.

:: 3. Start Vite Frontend Client
echo [3/3] Starting Vite Frontend Client on port 5173...
start "FXEC Client (Port 5173)" powershell -NoExit -ExecutionPolicy Bypass -File "c:\Users\0dani\Desktop\otp_att\start_client.ps1"
echo [OK] Vite Client launched.
echo.

:: Wait and open browser
echo ========================================================
echo   All services launched! Opening web browser...
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000/api/health
echo ========================================================
timeout /t 3 /nobreak >nul
start http://localhost:5173
