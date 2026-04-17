# Developer Handoff Prompt: Security & Performance Refactor

Hello GLM-5-Turbo, you are tasked with performing a security and performance refactor on the NoRedInk backend. This includes adding `helmet`, `compression`, `express-rate-limit`, secure signed cookies, and `dotenv`.

**CRITICAL WARNING:** This project has highly specific architectural constraints due to the environment it runs in (low-end Chromebooks behind school firewalls). You must strictly follow these instructions, or you will break the frontend application.

## 1. The `/api/smuggle` Endpoint Architecture

The `/api/smuggle` endpoint exists to bypass school firewalls by fetching blocked ROMs/assets on the backend.

- **Streaming Pipeline:** To save RAM on low-end Chromebooks, the server **MUST NOT** buffer the file in memory. You must use Node streams (e.g., `Readable.fromWeb(response.body).pipe(res)`) to pipe the binary data directly to the client.
- **CORS & COEP Headers:** For the `/api/smuggle` route specifically, the backend must strip the original CORS headers from the fetched file and apply:
  - `Cross-Origin-Embedder-Policy: credentialless`
  - `Cross-Origin-Opener-Policy: same-origin`
    This is required so the browser accepts the incoming blob.

## 2. IndexedDB & Iframe Logic Constraints (DO NOT TOUCH)

- **The Flow:** The frontend receives the stream from `/api/smuggle` as a Blob, saves it to the StratoVault IndexedDB, and generates a `blob:` URL. It then dynamically injects a full-screen `<iframe>` and passes that `blob:` URL into the `src` attribute. This maintains the DOM context for the "Escape" Panic Button.
- **Helmet Constraint:** When implementing `helmet`, you **MUST** configure Helmet's Content Security Policy (CSP) to explicitly allow `blob:` URLs for `frame-src` and `script-src`.
  - If you use Helmet's strict defaults, the iframe will crash.
- **Body Parser Constraint:** You **MUST** leave the `app.use(express.json({ limit: "50mb" }));` configuration exactly as it is. Do not lower this limit, or our emulator save states will break.

## 3. Required Upgrades

- **Helmet:** Implement `helmet` for security headers, but ensure the CSP is customized as described above to allow `blob:` in `frame-src` and `script-src`.
- **Compression:** Implement the `compression` middleware to gzip/deflate responses and save bandwidth.
- **Rate-Limiting:** Implement `express-rate-limit` on the API endpoints to prevent abuse.
- **Signed Cookies (Auth System Upgrade):** The application uses a TOS agreement gateway. You must upgrade the auth middleware to use secure, HttpOnly signed cookies.
  - Use `cookie-parser`'s signing feature with a secret loaded from `.env`.
  - When the user accepts the TOS, set this signed session cookie.
  - Update the auth middleware to check for this valid signed cookie instead of checking for plaintext.
- **Dotenv:** Implement `dotenv` to load environment variables, specifically the cookie secret and the `PORT` if applicable.

**Summary of Restrictions:**

- Do not buffer `/api/smuggle` payloads; always pipe the stream.
- Helmet's CSP must allow `blob:` for `frame-src` and `script-src`.
- Do not touch the `50mb` limit on `express.json`.
- Implement signed cookies for the TOS auth, `compression`, `rate-limiting`, and `dotenv`.
