import { Router } from "express";
import { Readable } from "stream";

const router = Router();

// ── SSRF prevention: reject private IP ranges ──
const PRIVATE_IP_RANGES = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.0\.0\./,
  /^192\.168\./,
  /^198\.1[8-9]\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^22[4-9]\./,
  /^23[0-9]\./,
  /^24[0-9]\./,
  /^25[0-5]\./,
];

function isPrivateIP(hostname) {
  return PRIVATE_IP_RANGES.some((pattern) => pattern.test(hostname));
}

// ── Smuggle rate limiter (10 requests/minute/IP) ──
const smuggleAttempts = new Map();
const SMUGGLE_MAX = 10;
const SMUGGLE_WINDOW_MS = 60_000;

const __stratoInterval673 = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of smuggleAttempts.entries()) {
    if (now - record.lastAttempt > SMUGGLE_WINDOW_MS) {
      smuggleAttempts.delete(ip);
    }
  }
}, 60_000);
__stratoInterval673.unref?.();

function checkSmuggleRateLimit(ip) {
  const now = Date.now();
  const record = smuggleAttempts.get(ip);

  if (!record || now - record.lastAttempt > SMUGGLE_WINDOW_MS) {
    smuggleAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  if (record.count >= SMUGGLE_MAX) {
    return false;
  }

  record.count++;
  record.lastAttempt = now;
  return true;
}

// ── /api/smuggle — Streaming proxy endpoint ──
router.get("/api/smuggle", async (req, res) => {
  // Rate limit check
  const clientIp = req.ip || req.connection.remoteAddress;
  if (!checkSmuggleRateLimit(clientIp)) {
    return res
      .status(429)
      .json({ error: "Too many smuggle requests. Wait 60 seconds." });
  }

  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL parameter is required" });
  }

  // Validate URL scheme
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res
      .status(400)
      .json({ error: "Only HTTP and HTTPS URLs are allowed" });
  }

  // SSRF prevention: reject private IP ranges
  const hostname = parsedUrl.hostname;
  if (isPrivateIP(hostname)) {
    return res
      .status(403)
      .json({ error: "Access to private network addresses is blocked" });
  }

  // Block localhost variants
  if (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0"
  ) {
    return res.status(403).json({ error: "Access to localhost is blocked" });
  }

  try {
    // Fetch with streaming — never buffer
    // Use 'manual' redirect handling to re-validate redirect targets against SSRF rules
    const fetchResponse = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "STRATO/13.0 (Smuggle Proxy)",
        Accept: "*/*",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });

    // Handle redirects manually — validate each redirect target against SSRF rules
    if ([301, 302, 303, 307, 308].includes(fetchResponse.status)) {
      const redirectUrl = fetchResponse.headers.get("location");
      if (!redirectUrl) {
        return res
          .status(502)
          .json({ error: "Redirect with no Location header" });
      }
      // Parse and validate the redirect target
      let parsedRedirect;
      try {
        parsedRedirect = new URL(redirectUrl, url);
      } catch {
        return res.status(400).json({ error: "Invalid redirect URL" });
      }
      if (!["http:", "https:"].includes(parsedRedirect.protocol)) {
        return res
          .status(400)
          .json({ error: "Redirect to non-HTTP protocol blocked" });
      }
      if (
        isPrivateIP(parsedRedirect.hostname) ||
        parsedRedirect.hostname === "localhost" ||
        parsedRedirect.hostname === "[::1]" ||
        parsedRedirect.hostname === "0.0.0.0"
      ) {
        return res
          .status(403)
          .json({ error: "Redirect to private network address is blocked" });
      }
      // Safe redirect — tell client to follow manually or return the redirect URL
      return res.status(fetchResponse.status).json({ redirect: redirectUrl });
    }

    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).json({
        error: `Upstream returned ${fetchResponse.status}: ${fetchResponse.statusText}`,
      });
    }

    // Stream the response — never buffer
    // Set safe CORS headers
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

    // Forward content type if available
    const contentType = fetchResponse.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const contentLength = fetchResponse.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    // Pipe the stream directly
    Readable.fromWeb(fetchResponse.body).pipe(res);
  } catch (err) {
    console.error("[STRATO] Smuggle error:", err.message);
    if (err.name === "TimeoutError") {
      return res.status(504).json({ error: "Upstream request timed out" });
    }
    res.status(502).json({ error: "Failed to fetch resource" });
  }
});

export default router;
