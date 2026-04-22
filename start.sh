#!/usr/bin/env bash
# STRATO — Premium Startup Script
set -e

# Colors for better UX
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}==============================================${NC}"
echo -e "${CYAN}   STRATO — Proxy & Arcade Launcher        ${NC}"
echo -e "${CYAN}==============================================${NC}"
echo ""

# Check for --tunnel flag
START_TUNNEL=false
if [[ "$*" == *"--tunnel"* ]]; then
    START_TUNNEL=true
fi

# Check for Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed.${NC}"
    echo "Install it from https://nodejs.org/"
    exit 1
fi

# Check for .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}[INFO] No .env file found. Creating defaults...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo "PORT=8080" > .env
        echo "NODE_ENV=development" >> .env
    fi
    echo -e "${GREEN}[✓] .env created successfully.${NC}"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}[INFO] Installing dependencies (first run)...${NC}"
    if command -v pnpm &>/dev/null; then
        pnpm install
    else
        npm install
    fi
fi

# Handle Cloudflare Tunnel
if [ "$START_TUNNEL" = true ]; then
    if command -v cloudflared &>/dev/null; then
        echo -e "${GREEN}[INFO] Initializing Cloudflare tunnel (strato)...${NC}"
        # Run in background
        cloudflared tunnel run strato > /dev/null 2>&1 &
        TUNNEL_PID=$!
        echo -e "${GREEN}[✓] Tunnel process started (PID: $TUNNEL_PID)${NC}"
        
        # Ensure tunnel dies when script exits
        trap "kill $TUNNEL_PID 2>/dev/null || true; exit" SIGINT SIGTERM
    else
        echo -e "${YELLOW}[WARN] cloudflared not found. Tunnel skip.${NC}"
        echo -e "${YELLOW}[TIP] Run 'scripts/setup-tunnel.sh' to install it.${NC}"
    fi
fi

# Start the server
echo -e "${GREEN}[INFO] Launching STRATO server...${NC}"
node src/index.js
