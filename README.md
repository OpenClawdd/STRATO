# STRATO

A fast, secure proxy and arcade dashboard built on [SPLASH](https://github.com/rhenryw/SPLASH) (via `@mercuryworkshop/wisp-js`). Designed to run smoothly on low-end Chromebooks while your PC hosts the server.

## Features

- **Web Proxy** — Browse the web through SPLASH, bypassing restrictions
- **Arcade Dashboard** — Self-hosted games and app shortcuts
- **Password Protection** — Secure gated access with signed cookies
- **Server-Side Smuggler** — Stream blocked ROMs/assets through your server to bypass firewalls
- **StratoVault** — IndexedDB-based storage for downloaded assets
- **Cloudflare Tunnel Support** — Expose your server safely without revealing your home IP
- **Lightweight** — Optimized for Chromebook clients and minimal server RAM usage

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/OpenClawdd/STRATO.git
cd STRATO
npm install
```

### 2. Configure

Copy the example environment file and set your password:

```bash
cp .env.example .env
```

Edit `.env` and change at minimum:

```
SITE_PASSWORD=your_password_here
COOKIE_SECRET=some_long_random_string
```

Generate a cookie secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run

**Windows:** Double-click `start.bat`

**Chrome OS / Linux / Mac:**

```bash
chmod +x start.sh
./start.sh
```

**Dev mode (auto-restart on file changes):**

```bash
npm run dev
```

The server starts at `http://localhost:8080` by default.

## Exposing to the Internet (Cloudflare Tunnels)

To share a link with friends without revealing your home IP:

1. Download `cloudflared` from [Cloudflare's website](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
2. Place the binary in this folder (or in your system PATH)
3. Run: `cloudflared tunnel --url http://localhost:8080`
4. Copy the `*.trycloudflare.com` link from the output

## Adding Games

Edit `config/games.json`:

```json
[
  { "n": "Tetris", "e": "🎮", "u": "/games/tetris/" },
  { "n": "YouTube", "e": "📺", "u": "https://youtube.com" }
]
```

- `n` — Display name
- `e` — Emoji icon
- `u` — URL (relative for self-hosted, absolute for external)

### Self-Hosting Games

Drop game files into `public/games/<game-name>/` and point the URL to `/games/<game-name>/`.

## Docker Deployment (HuggingFace / Self-Hosted)

```bash
docker build -t strato .
docker run -p 8080:8080 --env-file .env strato
```

**HuggingFace Spaces:**
1. Create a new Space with **Docker** SDK
2. Set the **Port** to `8080` in Space settings
3. Push this repo (set your env vars as HuggingFace Secrets)
4. It will build and deploy automatically

## Project Structure

```
STRATO/
├── src/
│   ├── index.js      # Main server (Express + Wisp + Smuggler)
│   └── auth.js       # Login page generator
├── public/
│   ├── index.html    # Frontend dashboard
│   └── 404.html      # Error page
├── config/
│   └── games.json    # Game/app definitions
├── .env.example      # Environment variable template
├── start.sh          # Linux/ChromeOS launcher
├── start.bat         # Windows launcher
├── Dockerfile        # Docker build config
└── package.json
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the server |
| `npm run dev` | Start with auto-restart on file changes |
| `npm run lint` | Check code style |
| `npm run format` | Auto-format code |

## License

[GPL-3.0-or-later](LICENSE)
