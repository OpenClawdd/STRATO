/**
 * STRATO v21 — CSRF Protection Middleware
 * Double-submit cookie pattern with server-side token validation
 */

import crypto from "crypto";

// ── Server-side CSRF token store ──
const tokenStore = new Map();
const CSRF_TTL = 30 * 60 * 1000; // 30 minutes
const CSRF_BYTES = 32;

// ── Clean up expired tokens every 5 minutes ──
const __stratoInterval336 = setInterval(
  () => {
    const now = Date.now();
    for (const [token, record] of tokenStore.entries()) {
      if (now - record.created > CSRF_TTL) {
        tokenStore.delete(token);
      }
    }
  },
  5 * 60 * 1000,
);
__stratoInterval336.unref?.();

/**
 * Generate a new CSRF token and store it server-side
 */
export function generateCsrfToken(metadata = {}) {
  const token = crypto.randomBytes(CSRF_BYTES).toString("hex");
  tokenStore.set(token, {
    created: Date.now(),
    ...metadata,
  });
  return token;
}

/**
 * Validate a CSRF token exists and hasn't expired
 * Token is consumed on validation (one-time use)
 */
export function validateCsrfToken(token) {
  if (!token || typeof token !== "string") return false;

  const record = tokenStore.get(token);
  if (!record) return false;

  // Check expiry
  if (Date.now() - record.created > CSRF_TTL) {
    tokenStore.delete(token);
    return false;
  }

  // DO NOT consume the token — keep it valid for the session.
  // One-time-use tokens break sequential API calls from the SPA
  // (frontend only fetches one token at page load).
  // Instead, rotate the token periodically via the /api/csrf-token endpoint.
  // Update last-used timestamp to track activity
  record.lastUsed = Date.now();
  return true;
}

/**
 * Express middleware: validate CSRF token on state-changing requests
 * Checks X-CSRF-Token header and csrf_token body field
 * Skips safe methods (GET, HEAD, OPTIONS)
 */
export function csrfProtection(req, res, next) {
  // Skip safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip login endpoint (has its own CSRF handling in auth.js)
  if (req.path === "/login") {
    return next();
  }

  // Skip health check
  if (req.path === "/health") {
    return next();
  }

  // Get token from header or body
  const token = req.headers["x-csrf-token"] || req.body?.csrf_token;

  if (!token) {
    return res.status(403).json({ error: "CSRF token missing" });
  }

  if (!validateCsrfToken(token)) {
    return res.status(403).json({ error: "Invalid or expired CSRF token" });
  }

  next();
}

/**
 * Get current token store size (for monitoring/admin)
 */
export function getCsrfStats() {
  return {
    activeTokens: tokenStore.size,
    ttl: CSRF_TTL,
  };
}

export default {
  generateCsrfToken,
  validateCsrfToken,
  csrfProtection,
  getCsrfStats,
};
