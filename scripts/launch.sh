#!/usr/bin/env bash
# STRATO — Dev Launch & Test
set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${CYAN}==============================================${NC}"
echo -e "${CYAN}   STRATO Dev Launcher                     ${NC}"
echo -e "${CYAN}==============================================${NC}"

# Kill stale processes on 8080
echo -e "${CYAN}[1/3] Cleaning up port 8080...${NC}"
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Launch server in background
echo -e "${CYAN}[2/3] Starting STRATO in Dev Mode...${NC}"
# Use npm or pnpm depending on what's available
if command -v pnpm &>/dev/null; then
    pnpm run dev &
else
    npm run dev &
fi

# Wait for boot
echo -e "${CYAN}[3/3] Waiting for server to initialize...${NC}"
sleep 3

# Open in browser
echo -e "${GREEN}[✓] Opening http://localhost:8080${NC}"
open http://localhost:8080

# Keep script alive to show logs
echo -e "${GREEN}--- Logs Follow ---${NC}"
wait
