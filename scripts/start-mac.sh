#!/usr/bin/env bash
# STRATO — Mac Optimized Launcher
# This script ensures dependencies are met on macOS and starts the server + tunnel.

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}--- STRATO Mac Launcher ---${NC}"

# 1. Check for Homebrew
if ! command -v brew &>/dev/null; then
    echo -e "${YELLOW}[!] Homebrew not found. It's highly recommended for Mac users.${NC}"
fi

# 2. Check for cloudflared
if ! command -v cloudflared &>/dev/null; then
    echo -e "${YELLOW}[!] cloudflared not installed.${NC}"
    if command -v brew &>/dev/null; then
        echo -e "${CYAN}[?] Would you like to install cloudflared via Homebrew? (y/n)${NC}"
        read -r install_cf
        if [[ "$install_cf" == "y" ]]; then
            brew install cloudflare/cloudflare/cloudflared
        fi
    fi
fi

# 3. Check for .env and SITE_PASSWORD
if [ ! -f .env ]; then
    echo -e "${YELLOW}[!] .env missing. Creating one...${NC}"
    cp .env.example .env
fi

# 4. Prompt for tunnel
echo -e "${CYAN}[?] Start Cloudflare tunnel alongside server? (y/n)${NC}"
read -r use_tunnel

if [[ "$use_tunnel" == "y" ]]; then
    ./start.sh --tunnel
else
    ./start.sh
fi
