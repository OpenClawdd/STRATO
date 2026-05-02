import { Router } from 'express';

const router = Router();

// ── Ultraviolet config endpoint ──
router.get('/frog/uv.config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`self.__uv$config = {
  prefix: '/frog/service/',
  bare: '/bare/',
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: '/frog/uv.handler.js',
  bundle: '/frog/uv.bundle.js',
  config: '/frog/uv.config.js',
  sw: '/frog/sw.js',
};`);
});

// ── Scramjet config endpoint ──
router.get('/scramjet/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`self.__scramjet$config = {
  prefix: '/scramjet/service/',
  bare: '/bare/',
  encodeUrl: Scramjet.codec.xor.encode,
  decodeUrl: Scramjet.codec.xor.decode,
  handler: '/scramjet/sj.handler.js',
  bundle: '/scramjet/sj.bundle.js',
  config: '/scramjet/config.js',
  sw: '/scramjet/sw.js',
};`);
});

// ── Proxy error page generator ──
function renderProxyError(errorCode, userMessage, buttons) {
  const buttonHtml = buttons.map(b =>
    `<a href="#" onclick="${b.action}; return false;" class="btn">${b.label}</a>`
  ).join(' ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STRATO — Proxy Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #06060e;
      color: #e2e8f0;
      font-family: 'Manrope', -apple-system, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(24px) saturate(1.3);
      -webkit-backdrop-filter: blur(24px) saturate(1.3);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      width: 90%;
      text-align: center;
    }
    .code {
      font-family: 'JetBrains Mono', monospace;
      color: #f87171;
      font-size: 13px;
      background: rgba(248,113,113,0.15);
      border: 1px solid rgba(248,113,113,0.25);
      border-radius: 8px;
      padding: 6px 14px;
      display: inline-block;
      margin-bottom: 16px;
    }
    h1 { font-size: 20px; margin-bottom: 12px; color: #e2e8f0; }
    p { color: rgba(255,255,255,0.5); font-size: 14px; margin-bottom: 24px; line-height: 1.6; }
    .actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .btn {
      display: inline-block;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.07);
      color: #e2e8f0;
      padding: 8px 20px;
      border-radius: 12px;
      text-decoration: none;
      font-size: 14px;
      font-family: 'Manrope', sans-serif;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .btn:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.14);
    }
    .btn.primary {
      border-color: rgba(0,229,255,0.25);
      color: #00e5ff;
    }
    .btn.primary:hover {
      background: rgba(0,229,255,0.15);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="code">${errorCode}</div>
    <h1>Unable to Reach Site</h1>
    <p>${userMessage}</p>
    <div class="actions">${buttonHtml}</div>
  </div>
</body>
</html>`;
}

// ── Error mapping ──
const ERROR_MAP = {
  ECONNREFUSED: {
    message: 'This site is currently unreachable.',
    buttons: [
      { label: 'Retry', action: 'window.location.reload()' },
      { label: 'Try other engine', action: 'window.postMessage({type:"proxy-switch-engine"}, "*")' },
    ],
  },
  ETIMEDOUT: {
    message: 'Connection timed out. Site may be slow or blocked.',
    buttons: [
      { label: 'Retry', action: 'window.location.reload()' },
      { label: 'Try other engine', action: 'window.postMessage({type:"proxy-switch-engine"}, "*")' },
    ],
  },
  ENOTFOUND: {
    message: 'Could not find this website. Check the URL.',
    buttons: [
      { label: 'Retry', action: 'window.location.reload()' },
    ],
  },
  ERR_SSL_PROTOCOL: {
    message: 'This site has a security issue.',
    buttons: [
      { label: 'Proceed anyway', action: 'window.location.reload()' },
      { label: 'Try other engine', action: 'window.postMessage({type:"proxy-switch-engine"}, "*")' },
    ],
  },
  502: {
    message: 'Proxy error: Bad Gateway',
    buttons: [
      { label: 'Retry', action: 'window.location.reload()' },
      { label: 'Try other engine', action: 'window.postMessage({type:"proxy-switch-engine"}, "*")' },
    ],
  },
};

// ── Proxy error endpoint ──
router.get('/proxy-error', (req, res) => {
  const code = req.query.code || 'UNKNOWN';
  const errorDef = ERROR_MAP[code] || {
    message: `An unexpected error occurred (${code}).`,
    buttons: [
      { label: 'Retry', action: 'window.location.reload()' },
    ],
  };
  res.status(502).send(renderProxyError(code, errorDef.message, errorDef.buttons));
});

export default router;
