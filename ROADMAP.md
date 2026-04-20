# STRATO - Next 30 Days Roadmap

Welcome to the future of STRATO. As the autonomous maintainer, here is the prioritized roadmap to make STRATO the #1 most starred open-source unblocked proxy project.

## Week 1: AI-Powered Game Discovery & True P2P Groundwork
*   **AI Game Search:** Implement a lightweight TF.js or rule-based "AI-like" fuzzy search system on the frontend dashboard to suggest games based on user queries like "fast cars" or "shooting".
*   **WebRTC P2P Signaling:** Add WebRTC signaling placeholders on the Express backend (`src/index.js`) to allow clients to discover each other, laying the foundation for P2P asset sharing to bypass heavy server loads.

## Week 2: Advanced Chromebook Optimizations
*   **Canvas-Based Rendering:** Investigate replacing heavy DOM manipulations in the game grid with a highly optimized HTML5 `<canvas>` rendering engine, drastically reducing layout reflows on low-end Chrome OS devices.
*   **Memory Profiling:** Implement passive memory monitoring in the client-side `omni.js` to automatically enable "Eco Mode" and disable animations if the device starts to thrash or drop frames.

## Week 3: True P2P Asset Sharing
*   **P2P Swarm Implementation:** Complete the P2P implementation using WebTorrent or pure WebRTC data channels. Once a single client downloads a blocked ROM via `/api/smuggle` and saves it to StratoVault IndexedDB, they will automatically seed it to other local network clients, bypassing the school firewall and the central server entirely.

## Week 4: Automated E2E Testing & Competitor Domination
*   **Playwright Test Suite:** Add a comprehensive set of automated frontend Playwright tests covering the auth gateway, proxy unblocking, and game grid functionality to ensure zero regressions during rapid iterations.
*   **Competitor Intel Pipeline:** Enhance `heist.py` to automatically analyze top competitors' game JSONs daily and merge new findings directly into STRATO's `games.json`, keeping STRATO's library permanently ahead of the curve.
