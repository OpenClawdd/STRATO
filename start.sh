#!/usr/bin/env bash
set -e

echo "=============================================="
echo " STRATO — Proxy & Arcade Launcher"
echo "=============================================="
echo ""

# Check for Node.js
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Install it from https://nodejs.org/ or via your package manager."
    exit 1
fi

# Check for npm or pnpm
if ! command -v npm &>/dev/null && ! command -v pnpm &>/dev/null; then
    echo "[ERROR] Neither npm nor pnpm is installed. Please reinstall Node.js."
    exit 1
fi

# Check for .env
if [ ! -f .env ]; then
    echo "[INFO] No .env file found. Creating one from .env.example..."
    cp .env.example .env
    echo "[WARNING] Edit .env and set SITE_PASSWORD before starting!"
    echo ""
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the server
echo "Starting STRATO server..."
node src/index.js
