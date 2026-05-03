/**
 * STRATO v21 — Input Sanitization Middleware
 * Prevents XSS, injection, and malformed data across all API routes
 */

// ── HTML entities map for escaping ──
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const HTML_ENTITY_RE = /[&<>"'`/]/g;

/**
 * Escape HTML entities in a string — prevents XSS in rendered output
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(HTML_ENTITY_RE, (ch) => HTML_ENTITIES[ch] || ch);
}

/**
 * Strip HTML tags from a string
 */
export function stripHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize a string for safe storage — removes null bytes, normalizes unicode
 */
export function sanitizeString(str, opts = {}) {
  if (typeof str !== 'string') return str;

  let result = str;

  // Remove null bytes (can cause truncation in some DBs)
  result = result.replace(/\0/g, '');

  // Normalize unicode to NFC form
  if (result.normalize) {
    result = result.normalize('NFC');
  }

  // Strip HTML tags if requested
  if (opts.stripHtml) {
    result = stripHtml(result);
  }

  // Trim whitespace
  if (opts.trim !== false) {
    result = result.trim();
  }

  // Enforce max length
  if (opts.maxLength && result.length > opts.maxLength) {
    result = result.substring(0, opts.maxLength);
  }

  return result;
}

/**
 * Validate and sanitize a username
 * - 1-24 chars
 * - Alphanumeric + underscore only
 */
export function sanitizeUsername(username) {
  if (typeof username !== 'string') return null;
  const cleaned = username.trim();
  if (cleaned.length < 1 || cleaned.length > 24) return null;
  if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) return null;
  return cleaned;
}

/**
 * Validate a URL is safe (no SSRF, no javascript: protocol)
 */
export function validateUrl(url) {
  if (typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:', 'data:', 'vbscript:', 'file:',
    'blob:', // blob: is allowed only for same-origin
  ];

  const lowerUrl = trimmed.toLowerCase();
  for (const proto of dangerousProtocols) {
    if (lowerUrl.startsWith(proto)) return null;
  }

  // Must have a valid protocol or be a relative path
  if (!/^https?:\/\//i.test(trimmed) && !/^\//.test(trimmed)) {
    return null;
  }

  // Block private/internal IPs for SSRF prevention
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname;

    // Block localhost, 127.x, 10.x, 172.16-31.x, 192.168.x, 0.0.0.0, ::1
    const privateIpPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^0\.0\.0\.0$/,
      /^\[::1\]$/,
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i,
    ];

    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) return null;
    }
  } catch {
    // Invalid URL
    return null;
  }

  return trimmed;
}

/**
 * Validate MongoDB-style query input — prevent NoSQL injection
 */
export function sanitizeQuery(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;

  const cleaned = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    // Block keys starting with $ (NoSQL operators)
    if (key.startsWith('$')) continue;

    if (typeof value === 'string') {
      cleaned[key] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      cleaned[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeQuery(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Express middleware: sanitize all request body fields
 * Applied after JSON parsing, before route handlers
 */
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeQuery(req.body);
  }
  next();
}

/**
 * Validate message content for chat/AI — block XSS payloads
 */
export function validateMessage(message, maxLength = 2000) {
  if (typeof message !== 'string') return { valid: false, error: 'Message must be a string' };
  if (message.trim().length === 0) return { valid: false, error: 'Message cannot be empty' };
  if (message.length > maxLength) return { valid: false, error: `Message exceeds ${maxLength} characters` };

  // Block script injection patterns
  const injectionPatterns = [
    /<script\b/i,
    /javascript\s*:/i,
    /on\w+\s*=/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<link\b/i,
    /<meta\b/i,
    /data\s*:\s*text\/html/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(message)) {
      return { valid: false, error: 'Message contains disallowed content' };
    }
  }

  return { valid: true, sanitized: sanitizeString(message.trim()) };
}

export default {
  escapeHtml,
  stripHtml,
  sanitizeString,
  sanitizeUsername,
  validateUrl,
  sanitizeQuery,
  sanitizeBody,
  validateMessage,
};
