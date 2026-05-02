# STRATO v12.0.0

**Liquid Glass in Deep Space**

STRATO is a web proxy and game hub designed for school Chromebooks. It combines a fast, sleek proxy experience with an arcade of 50+ games, an AI chat assistant, and a Snap & Solve feature that uses vision AI to solve homework questions from screenshots.

---

## Features

- **Web Proxy** — Browse the internet freely using Ultraviolet and Scramjet proxy engines with Wisp protocol support
- **Arcade** — 50+ unblocked games with search, categories, and favorites
- **AI Chat** — Built-in AI assistant powered by the Z AI SDK for homework help and general questions
- **Snap & Solve** — Screenshot a homework question, paste it, and get a step-by-step solution using vision AI
- **TOS Gate** — Terms of service acknowledgment wall before access
- **Rate Limiting** — API routes are rate-limited to prevent abuse
- **Compression** — gzip compression on all responses
- **Security** — Helmet middleware with configured CSP, cookie signing, and more

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Express 5, Node.js 18+ |
| Proxy Engines | Ultraviolet, Scramjet |
| Transport | Bare Server, Wisp, Epoxy TLS |
| AI | Z AI SDK (chat + vision) |
| Image Processing | Sharp |
| Real-time | ws (WebSocket) |

---

## Quick Start

### Prerequisites

- Node.js 18 or later
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repo
git clone https://github.com/OpenClawdd/STRATO.git
cd STRATO

# Install dependencies
pnpm install
# or: npm install

# Copy and configure environment
cp .env.example .env
```

### Environment Variables

Edit `.env` with your values:

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 8080) | No |
| `COOKIE_SECRET` | Secret for signing cookies | Yes |
| `CDN_BASE_URL` | CDN base URL for static assets | No |
| `AI_API_KEY` | API key for AI features | No |

Generate a secure cookie secret:

```bash
openssl rand -hex 32
```

### Running

```bash
# Production
pnpm start

# Development (auto-restart on file changes)
pnpm dev
```

The server starts at `http://localhost:8080` by default.

---

## Project Structure

```
STRATO/
├── public/                  # Static frontend files
│   ├── index.html           # Main SPA entry
│   ├── css/style.css        # Liquid Glass theme
│   ├── js/
│   │   ├── app.js           # Main app logic
│   │   └── transport-init.js # Proxy transport setup
│   ├── assets/
│   │   ├── games.json       # Game catalog data
│   │   └── thumbnails/      # Game thumbnail images
│   ├── favicon.ico
│   └── favicon.png
├── src/                     # Backend source
│   ├── index.js             # Server entry point
│   ├── middleware/auth.js   # TOS gate middleware
│   └── routes/
│       ├── proxy.js         # Proxy route handlers
│       ├── ai.js            # AI chat & vision endpoints
│       └── smuggle.js       # Smuggler route handlers
├── scripts/
│   └── setup-proxy.cjs     # Post-install proxy setup
├── .env.example            # Environment variable template
├── .gitignore
├── package.json
└── package-lock.json
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/api/ai/status` | GET | AI service status |
| `/api/ai/chat` | POST | AI chat completion |
| `/api/ai/vision` | POST | Snap & Solve (image + prompt) |

### AI Chat Example

```bash
curl -X POST http://localhost:8080/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is 2+2?"}]}'
```

### Snap & Solve Example

```bash
curl -X POST http://localhost:8080/api/ai/vision \
  -H "Content-Type: application/json" \
  -d '{"image":"data:image/png;base64,iVBOR...","prompt":"Solve this math problem"}'
```

---

## License

GPL-3.0
