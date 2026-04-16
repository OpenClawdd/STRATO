@echo off
setlocal

echo ==============================================
echo  STRATO — Proxy ^& Arcade Launcher
echo ==============================================
echo.

:: Check if Node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please download it from https://nodejs.org/
    pause
    exit /b
)

:: Check for .env
if not exist ".env" (
    echo [INFO] No .env file found. Creating one from .env.example...
    copy .env.example .env
    echo [WARNING] Edit .env and set SITE_PASSWORD before starting!
    echo.
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

:: Start the server in a new window
echo Starting STRATO server...
start "STRATO Server" cmd /c "npm start & pause"

:: Check for cloudflared
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] cloudflared is not installed or not in your PATH.
    echo If you want to expose this server externally, download it from:
    echo https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    pause
    exit /b
)

:: Wait for the server to start
timeout /t 3 /nobreak >nul

:: Start Cloudflare tunnel
echo.
echo Starting Cloudflare Tunnel...
echo Look for the link ending in ".trycloudflare.com" in the output below!
echo Copy that link and share it with your friends.
echo.
cloudflared tunnel --url http://localhost:8080

pause
