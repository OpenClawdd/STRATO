@echo off
setlocal

echo ==============================================
echo  NoRedInk (Unblocked Proxy ^& Arcade) Launcher
echo ==============================================
echo.

:: Check if Node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please download it from https://nodejs.org/
    pause
    exit /b
)

:: Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please reinstall Node.js.
    pause
    exit /b
)

:: Check if cloudflared is installed
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] cloudflared is not installed or not in your PATH.
    echo Please download cloudflared for Windows from:
    echo https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    echo Once downloaded, place 'cloudflared.exe' in this folder or in a folder in your PATH.
    pause
    exit /b
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

:: Start the server in a new window
echo Starting local server...
start "NoRedInk Server" cmd /c "npm start & pause"

:: Wait a few seconds for the server to start
timeout /t 3 /nobreak >nul

:: Start Cloudflare tunnel
echo.
echo Starting Cloudflare Tunnel...
echo Look for the link ending in ".trycloudflare.com" in the output below!
echo Copy that link and share it with your friends.
echo.
cloudflared tunnel --url http://localhost:8080

pause
