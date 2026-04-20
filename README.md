# STRATO

[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL_v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

A fast, secure proxy and arcade dashboard built on [SPLASH](https://github.com/rhenryw/SPLASH) (via `@mercuryworkshop/wisp-js`). Designed to run smoothly on low-end Chromebooks while your PC hosts the server.

![Strato Dashboard Preview](public/assets/strato-preview.jpg)

## 🌟 Features

- **Web Proxy** — Browse the web seamlessly through SPLASH, bypassing network restrictions.
- **Arcade Dashboard** — Self-hosted games and app shortcuts with dynamic integration.
- **Password Protection** — Secure gated access utilizing signed HttpOnly cookies.
- **Server-Side Smuggler** — Stream blocked ROMs and assets directly through your server to bypass restrictive firewalls.
- **StratoVault** — Local IndexedDB-based storage for downloaded assets to save bandwidth.
- **Cloudflare Tunnel Support** — Expose your server safely to the public without revealing your home IP address.
- **Lightweight & Performant** — Highly optimized for low-end devices like Chromebooks, utilizing a strict minimum of server RAM.

## 🏗️ Architecture Overview

STRATO utilizes an Express backend to serve the proxy engine, manage authentication, and handle asset smuggling.

- **Frontend:** HTML, CSS, JavaScript, interacting via `omni.js` to manage UI states, cloking, and service worker registration.
- **Backend:** Node.js Express server (`src/index.js`) providing routing, security, and WebSocket forwarding via Wisp.
- **Proxy Engines:** Employs Ultraviolet (`/uv/`) and Scramjet (`/surf/scram/`) through Bare-Mux.
- **Storage:** Uses IndexedDB via StratoVault for efficient local file management on the client.

## 🚀 Quick Start (Local Deployment)

### 1. Clone and Install

```bash
git clone https://github.com/OpenClawdd/STRATO.git
cd STRATO
pnpm install # or npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` to configure your instance:

| Variable         | Description                                 | Required |
| ---------------- | ------------------------------------------- | -------- |
| `SITE_PASSWORD`  | Password required to access the dashboard   | Yes      |
| `COOKIE_SECRET`  | Secret used to sign session cookies         | Yes      |
| `PORT`           | Port the server listens on (default `8080`) | No       |
| `SECURE_COOKIES` | Set to `"true"` if serving over HTTPS       | No       |

**Tip:** Generate a secure random cookie secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run

**Windows:**
Double-click `start.bat`

**Chrome OS / Linux / Mac:**

```bash
chmod +x start.sh
./start.sh
```

**Dev mode (auto-restart on file changes):**

```bash
pnpm run dev # or npm run dev
```

The server starts at `http://localhost:8080` by default.

## 🌍 Exposing to the Internet (Cloudflare Tunnels)

To share a link with friends without revealing your home IP:

1. Download `cloudflared` from [Cloudflare's website](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Place the binary in this folder (or in your system PATH).
3. Run: `cloudflared tunnel --url http://localhost:8080`
4. Copy the `*.trycloudflare.com` link from the output.

## 🐳 Docker & Cloud Deployment

### Docker Deployment

```bash
docker build -t strato .
docker run -p 8080:8080 --env-file .env strato
```

### HuggingFace Spaces

1. Create a new Space with the **Docker** SDK.
2. Set the **Port** to `8080` in the Space settings.
3. Push this repository to the Space.
4. Set your environment variables (`SITE_PASSWORD`, `COOKIE_SECRET`) as HuggingFace Secrets.
5. The application will build and deploy automatically.

### Replit

1. Import the repository into a new Repl.
2. The Repl will detect the Node.js environment.
3. Configure your environment variables using Replit's "Secrets" tool.
4. Click "Run". Replit handles port binding automatically.

## 🎮 Adding Games

Edit `config/games.json` to customize your arcade:

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

## 🛠️ Scripts

| Command          | Description                             |
| ---------------- | --------------------------------------- |
| `npm start`      | Start the server                        |
| `npm run dev`    | Start with auto-restart on file changes |
| `npm run lint`   | Check code style using ESLint           |
| `npm run format` | Auto-format code using Prettier         |
| `npm run test`   | Run the test suite                      |

## 🤝 Troubleshooting

- **Server won't start:** Ensure you have Node.js version >= 18.0.0 installed.
- **Save states are failing:** Verify the file being uploaded is not corrupted. The server accepts save states up to 50MB.
- **Blank page on games:** Ensure `blob:` URLs are allowed by your network if testing locally with stringent firewalls, though Strato smuggles them to bypass most.

## 📄 License

This project is licensed under the [GPL-3.0-or-later](LICENSE) License.
