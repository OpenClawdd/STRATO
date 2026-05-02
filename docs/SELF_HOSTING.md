# Self-Hosting STRATO — Adding Your Own Mirrors

STRATO uses a private config system to keep community URLs out of the public repo. This guide shows you how to add your own proxy mirrors and game hubs.

## Quick Start

### 1. Copy the environment template

```bash
cp .env.example .env
```

### 2. Fill in your URLs

Open `.env` and add your proxy/hub URLs:

```bash
# Good proxies
PROXY_SPLASH=https://splash.best/
PROXY_STRAWBERRY=https://school.agreca.com.ar/

# Recommended proxies
PROXY_SELENITE=http://selenite.cc
PROXY_SELENITE_ALT=https://g-65j.pages.dev/projects
PROXY_SME=https://startmyeducation.top/
PROXY_SME_ALT=http://startmyeducation.net/
PROXY_SME_PASSWORD=funni

# Game hubs
HUB_DAYDREAM=https://daydreamx.global.ssl.fastly.net/
HUB_EVEREST=https://everest.rip/
```

### 3. Alternative: Use games-private.json

If you prefer a JSON config instead of `.env`, create `src/config/games-private.json`:

```json
{
  "mirrors": {
    "splash": "https://splash.best/",
    "strawberry": "https://school.agreca.com.ar/",
    "selenite": ["http://selenite.cc", "https://g-65j.pages.dev/projects"],
    "sme": ["https://startmyeducation.top/", "http://startmyeducation.net/"]
  },
  "HUB_DAYDREAM": "https://daydreamx.global.ssl.fastly.net/",
  "HUB_EVEREST": "https://everest.rip/"
}
```

This file is gitignored and will never be committed.

### 4. Start the server

```bash
pnpm dev
```

The server will automatically resolve `${ENV_VAR}` placeholders in games.json and proxy-mirrors.json using your private config.

## URL Resolution Priority

1. **`.env` file** (highest priority) — Set via `PROXY_*` and `HUB_*` environment variables
2. **`games-private.json`** (medium priority) — JSON file in `src/config/`
3. **Template defaults** (fallback) — `${ENV_VAR}` placeholders remain unresolved; cards show "Configure in .env" overlay

## What Users See Without Config

| Scenario | UI Behavior |
|----------|-------------|
| No `.env` or private config | Cards with `${...}` URLs show a lock overlay: "Configure in .env". Standalone games still work. |
| Partial config | Resolved sites show normally. Unresolved ones show the lock overlay. |
| Full config | Everything works. URLs came from private sources. |

## Adding New Sites

1. Add an entry to `public/assets/games.json` with a `${ENV_VAR}` placeholder URL
2. Add the corresponding key to `.env.example` (with no value)
3. Add the real URL to your `.env` or `games-private.json`

Example — adding a new proxy called "CoolProxy":

**games.json:**
```json
{
  "id": "coolproxy",
  "name": "CoolProxy",
  "category": "proxies",
  "url": "${PROXY_COOL}",
  "tier": 2,
  "reliability": "green",
  "description": "A cool proxy site",
  "tags": ["proxy", "fast"],
  "proxy_tier": "recommended",
  "config_required": true
}
```

**.env.example:**
```bash
PROXY_COOL=
```

**Your .env:**
```bash
PROXY_COOL=https://coolproxy.example.com/
```

## Tab Cloak Presets

Community cloak presets use `${CLOAK_*_FAVICON}` placeholders for their favicons. To activate a community cloak:

1. Set the favicon URL in your `.env`:
   ```bash
   CLOAK_SCHOOL_AGRECA_FAVICON=https://school.agreca.com.ar/favicon.ico
   ```

2. The cloak will appear in the stealth bar dropdown and settings panel.

## Verifying Config

Check your config status at runtime:

```bash
curl http://localhost:8080/api/config/status
```

Returns:
```json
{
  "games": { "total": 70, "unresolved": ["PROXY_SPLASH"], "resolved": 5 },
  "mirrors": { "total": 12, "unresolved": [], "resolved": 12 },
  "privateConfigLoaded": true
}
```

## Security Notes

- `.env` and `games-private.json` are in `.gitignore` — they will never be committed
- The `/api/mirrors/status` endpoint only returns resolved URLs; placeholders are hidden
- The `/api/cloak/presets` endpoint falls back to `/favicon.ico` for unresolved favicons
- The `/assets/games.json` endpoint serves resolved config; placeholders never reach the client
