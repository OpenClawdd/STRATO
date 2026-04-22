# STRATO Architecture

STRATO is a fast, secure proxy and arcade dashboard engineered to run efficiently, prioritizing low-end hardware compatibility and security.

## System Diagram

```text
+----------------+      HTTP/WS       +----------------+
|                |  <-------------->  |                |
|    Browser     |                    |    Express     |
|   (Frontend)   |                    |   (Backend)    |
|                |                    |                |
+-------+--------+                    +-------+--------+
        |                                     |
        v                                     v
+----------------+                    +----------------+
|                |                    |                |
|  ServiceWorker |                    |  ProxyManager  |
|                |                    |                |
+-------+--------+                    +-------+--------+
        |                                     |
        |                                     |
        v                                     v
+----------------+                    +----------------+
|                |                    |                |
| IndexedDB Vault|                    |  WISP Backends |
| (StratoVault)  |                    |   (Scramjet)   |
|                |                    |                |
+----------------+                    +----------------+
```

## Major Modules

### `stealth.js`
Handles the cloaking mechanisms for STRATO. This module ensures the frontend can operate discreetly by setting up an `about:blank` stealth wrapper, masking tab titles and favicons (like Google Drive or Google Classroom), and intercepting inputs (like the 'Escape' Panic Button).

### `game-engine.js`
The core engine for the arcade dashboard. It processes the game library, fetches external game data, handles metadata sanitization (preventing XSS), and manages the Theater Mode where games are injected into full-screen iframes to optimize performance and handle interactions without bloating the DOM.

### `user-data.js`
Manages local configuration, customized settings, and privacy preferences (like productivity masks) using `localStorage`.

### `proxy-manager.js`
Responsible for the web proxy frontend interactions. It manages URL encoding/decoding, Service Worker registrations, and coordinates Bare-Mux transport toggling to stream proxy content correctly from the backend.

### `stratovault.js`
Our local storage vault that wraps `IndexedDB`. To ensure STRATO never crashes on low-end hardware, large blobs, game save files, and assets are kept off the main thread RAM and saved here.

## Security Model

STRATO uses a robust authentication and security layer to protect the instance.

- **Authentication Middleware**: All backend endpoints check for a valid `strato_auth` signed cookie. Unauthenticated requests are intercepted and redirected via a 302 response to a login gateway (`/`).
- **Signed Cookies**: Cookies are securely signed using a secret to prevent tampering. They are set with `httpOnly: true` and `sameSite: 'strict'` to defend against cross-site attacks.
- **Strict Headers**: Configured using Helmet, maintaining a tight Content Security Policy (CSP), while explicitly allowing `blob:` URLs in frames/scripts to ensure the proxy and game iframes operate securely but effectively.
- **Sanitization**: All user-facing data inputs and fetched external APIs are strictly escaped before being injected into the DOM.