#!/bin/sh

set -e

echo "================================================="
echo "             STRATO Deployment Script            "
echo "================================================="

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "[>] Detected OS: $MACHINE"

# Check for ChromeOS / crouton / crostini hints (basic check)
if [ -d "/opt/google/cros-containers" ] || grep -q "chromeos" /proc/version 2>/dev/null; then
    echo "[>] Detected ChromeOS environment."
fi

# Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "[!] Node.js is not installed. Installing Node 20..."
    if [ "$MACHINE" = "Linux" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$MACHINE" = "Mac" ]; then
        if command -v brew >/dev/null 2>&1; then
            brew install node@20
        else
            echo "[!] Homebrew not found. Please install Node 20 manually."
            exit 1
        fi
    else
        echo "[!] Unsupported OS for automatic Node installation. Please install Node 20 manually."
        exit 1
    fi
else
    NODE_VER=$(node -v)
    echo "[✓] Node.js is installed ($NODE_VER)."
    # Optional: check if version >= 18.0.0, but instructions say install 20 if *not present*.
fi

# Install pnpm if not present, but use corepack if available
if ! command -v pnpm >/dev/null 2>&1; then
    echo "[>] Enabling pnpm..."
    corepack enable pnpm || npm install -g pnpm
fi

echo "\n[>] Installing dependencies..."
pnpm install

if [ ! -f ".env" ]; then
    echo "\n[>] Setting up .env file..."
    cp .env.example .env

    # Generate random cookie secret
    SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    # Replace placeholder with actual secret
    if [ "$MACHINE" = "Mac" ]; then
        sed -i '' "s/COOKIE_SECRET=change_this_to_a_long_random_string/COOKIE_SECRET=$SECRET/" .env
    else
        sed -i "s/COOKIE_SECRET=change_this_to_a_long_random_string/COOKIE_SECRET=$SECRET/" .env
    fi
    echo "[✓] .env file created with a secure COOKIE_SECRET."
else
    echo "\n[✓] .env file already exists."
fi

echo "\n[>] Starting STRATO..."
npm start
