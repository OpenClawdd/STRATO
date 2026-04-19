/**
 * STRATO — omni.js
 * Arsenal Proxy Engine + Terminal Array Aesthetics
 */

const RENDER_LIMIT = 150;
const DEBOUNCE_MS = 60;

let masterGames = [];
let mathDecoy = [];
// Asynchronously pre-fetch the GN Math library in the background so it's ready when toggled
fetch('https://cdn.jsdelivr.net/gh/freebuisness/assets@latest/zones.json').then(res => res.json()).then(data => {
  mathDecoy = data.map(g => ({
    title: g.name,
    t: "GN Math",
    iframe_url: g.url.replace("{HTML_URL}", "https://cdn.jsdelivr.net/gh/freebuisness/html@main"),
    img: g.cover.replace("{COVER_URL}", "https://cdn.jsdelivr.net/gh/freebuisness/covers@main")
  }));
  // Refresh counts if math mode is on
  if (localStorage.getItem('strato_math_decoy') === 'true') applyFilters();
}).catch(e => {
  console.warn("GN Math DB failed to load: ", e);
  mathDecoy = [{ title: "Calculus III", t: "Math", iframe_url: "https://www.google.com/search?q=calculus+3", img: "" }];
});
let filteredGames = [];
let activeCategory = 'All';
let searchQuery = '';
let currentLimit = RENDER_LIMIT;
let uvActive = false;
let navMode = 'dock'; // 'dock' or 'corner'

/* ── VITALS MONITOR ── */
let lastTime = performance.now();
let frames = 0;
function runVitals() {
  const now = performance.now();
  frames++;
  if (now > lastTime + 1000) {
    const fps = Math.round((frames * 1000) / (now - lastTime));
    const fpsEl = $('vital-fps');
    if (fpsEl) fpsEl.querySelector('.vital-label').textContent = `FPS: ${fps}`;
    frames = 0;
    lastTime = now;
  }
  
  // Proxy watchdog
  const dot = document.querySelector('.vital-dot');
  if (dot) {
    const isReady = (window.stratoConnection && window.stratoConnection.transport);
    dot.classList.toggle('ready', !!isReady);
    const proxyItem = $('vital-proxy');
    if (proxyItem) proxyItem.title = isReady ? 'Proxy Connection: ACTIVE (WISP/Bare)' : 'Proxy Connection: PENDING...';
  }
  
  if (!document.hidden) requestAnimationFrame(runVitals);
  else setTimeout(runVitals, 1000);
}

/* ── DOM REFS ── */
const $ = (id) => document.getElementById(id);

/* ═══════════════════════════════
   PROXY TUNNEL (Ultraviolet)
   ═══════════════════════════════ */
async function initProxy() {
  if ('serviceWorker' in navigator && window.BareMux) {
    try {
      // Use standard dist path served by Express
      window.stratoConnection = new BareMux.BareMuxConnection("/surf/baremux/worker.js");
      
      const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
      // Triple-check transport set with increased timeout/retry logic
      await window.stratoConnection.setTransport("/epoxy-transport.mjs", [{ wisp: wispUrl }]);
      console.log('[STRATO] Bare-Mux + Epoxy Transport initialized');
    } catch (err) {
      console.error('[STRATO] Bare-Mux initialization failed:', err);
      // Fallback to second-tier wisp if local fails
      try {
        await window.stratoConnection.setTransport("/surf/epoxy/epoxy-bundled.js", [{ wisp: "wss://wisp.mercurywork.shop/" }]);
      } catch(e) {}
    }
    
    // Scoped registrations to prevent global fetch rejections
    try {
      await navigator.serviceWorker.register('/uv/sw.js', { scope: '/uv/service/' });
      uvActive = true;
      console.log('[STRATO] UV SW Active');
    } catch (err) {
      console.warn('[STRATO] UV SW Registration failed:', err);
    }

    try {
      // Clean up the boot sequence by focusing on Splash's native worker (Scramjet Core)
      await navigator.serviceWorker.register('/scramjet.sw.js', { scope: '/scram/' });
      console.log('[STRATO] Splash v2 (Scramjet) Active');
    } catch (err) {
      console.warn('[STRATO] Splash SW Registration failed:', err);
    }
  }
}

/* ── CONTENT AGGREGATOR (The Hijacker) ── */
async function fetchExternalGames() {
  console.log('[STRATO] Aggregating external libraries...');
  const sources = [
    { name: 'Selenite', url: 'https://raw.githubusercontent.com/skid9000/selenite-v2/main/src/games.json', map: (g) => ({ n: g.name, u: g.link, t: 'SELENITE', img: g.image }) },
    { name: '3kh0-Lite', url: 'https://raw.githubusercontent.com/3kh0/3kh0-assets/main/games.json', map: (g) => ({ n: g.name, u: g.url, t: '3KH0', img: g.img }) }
  ];

  for (const src of sources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(src.url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Fetch status: ${res.status}`);
      const data = await res.json();
      const mapped = data.map(src.map).slice(0, 100);
      
      mapped.forEach(newGame => {
        const exists = masterGames.some(g => (g.title || g.n) === newGame.n);
        if (!exists) masterGames.push({
          title: newGame.n,
          iframe_url: newGame.u,
          t: newGame.t,
          thumbnail: newGame.img
        });
      });
      
      console.log(`[STRATO] Merged ${mapped.length} games from ${src.name}`);
      applyFilters();
    } catch (e) {
      console.warn(`[STRATO] Failed to aggregate ${src.name}:`, e.message);
    }
  }
}

function proxifyUrl(url) {
  // Respect the user's proxy choice from settings
  const engine = localStorage.getItem('strato_proxy') || 'uv';
  
  if (engine === 'uv' && window.__uv$config) {
    return __uv$config.prefix + __uv$config.encodeUrl(url);
  }

  if (engine === 'splash' && window.__scramjet$config) {
    return __scramjet$config.prefix + __scramjet$config.codec.encode(url);
  }
  
  // Fallback to UV if config missing, or original Splash if all else fails
  return `/proxy?url=${encodeURIComponent(url)}`;
}

/* ═══════════════════════════════
   NAVIGATION / DOCK
   ═══════════════════════════════ */
function initDock() {
  const tabs = document.querySelectorAll('.dtab');
  const panels = document.querySelectorAll('.view');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('on'));
      tab.classList.add('on');
      
      const v = tab.dataset.view;
      panels.forEach(p => {
        if (p.id === `view-${v}`) p.classList.add('active');
        else p.classList.remove('active');
      });
    });
  });
}

/* ═══════════════════════════════
   MEDIA CARDS (Watch & Listen)
   ═══════════════════════════════ */
function initMediaCards() {
  // Watch
  document.querySelectorAll('[data-action="watch"]').forEach(el => {
    el.addEventListener('click', () => {
      // Create iframe dynamically so it doesn't try to load unproxied early
      const url = el.dataset.url;
      openOverlay(url, el.querySelector('.mc-label').textContent);
    });
  });

  // Listen
  document.querySelectorAll('[data-action="listen"]').forEach(el => {
    el.addEventListener('click', () => {
      const url = el.dataset.url;
      openOverlay(url, el.querySelector('.mc-label').textContent);
    });
  });
}

/* ═══════════════════════════════
   SEARCH & BROWSE
   ═══════════════════════════════ */
function initSearch() {
  const input = $('searchInput');
  if (!input) return;

  let timer = null;
  input.addEventListener('input', e => {
    const raw = e.target.value.toLowerCase().trim();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      searchQuery = raw;
      applyFilters();
      // Ensure we are on the grid view if typing
      if (!$('view-grid').classList.contains('active') && !raw.includes('.')) {
        document.querySelector('.dtab[data-view="grid"]').click();
      }
    }, DEBOUNCE_MS);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const v = input.value.trim();
      if (!v) return;
      if (v.includes('.') && !v.includes(' ')) {
        // Drop it into the proxy (Browse functionality)
        let t = v;
        if (!/^https?:\/\//i.test(t)) t = "https://" + t;
        openOverlay(t, "Surfing: " + t);
      }
    }
    if (e.key === 'Escape') {
      input.value = '';
      searchQuery = '';
      applyFilters();
      input.blur();
    }
  });
}

/* ═══════════════════════════════
   CLOAK & SETTINGS
   ═══════════════════════════════ */
function initSettings() {
  const saveBtn = $('saveSettingsBtn');
  const clearBtn = $('clearCacheBtn');
  const panicInput = $('panicUrlInput');
  const proxySel = $('proxyEngine');
  
  // Load saved settings
  const savedPanic = localStorage.getItem('strato_panic') || 'https://classroom.google.com';
  const savedProxy = localStorage.getItem('strato_proxy') || 'uv';
  const savedCloak = localStorage.getItem('strato_cloak') || 'false';
  const savedMath = localStorage.getItem('strato_math_decoy') || 'false';
  const savedNav = localStorage.getItem('strato_nav_mode') || 'dock';
  
  if (panicInput) panicInput.value = savedPanic;
  if (proxySel) proxySel.value = savedProxy;
  
  const navSel = $('setting-nav-mode');
  if (navSel) {
    navSel.value = savedNav;
    document.body.dataset.navMode = savedNav;
  }

  // Toggle Cloak UI
  const cloakOn = $('cloak-on');
  const cloakOff = $('cloak-off');
  if (savedCloak === 'true') {
     cloakOn.classList.add('active'); cloakOff.classList.remove('active');
  } else {
     cloakOff.classList.add('active'); cloakOn.classList.remove('active');
  }
  
  cloakOn.addEventListener('click', () => {
     localStorage.setItem('strato_cloak', 'true');
     cloakOn.classList.add('active'); cloakOff.classList.remove('active');
  });
  cloakOff.addEventListener('click', () => {
     localStorage.setItem('strato_cloak', 'false');
     cloakOff.classList.add('active'); cloakOn.classList.remove('active');
     document.title = "STRATO";
     $('favicon').href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>◆</text></svg>";
  });

  // Toggle Math Decoy UI
  const mathOn = $('math-on');
  const mathOff = $('math-off');
  if (mathOn && mathOff) {
    if (savedMath === 'true') {
       mathOn.classList.add('active'); mathOff.classList.remove('active');
    } else {
       mathOff.classList.add('active'); mathOn.classList.remove('active');
    }
    mathOn.addEventListener('click', () => {
       localStorage.setItem('strato_math_decoy', 'true');
       mathOn.classList.add('active'); mathOff.classList.remove('active');
       applyFilters();
    });
    mathOff.addEventListener('click', () => {
       localStorage.setItem('strato_math_decoy', 'false');
       mathOff.classList.add('active'); mathOn.classList.remove('active');
       applyFilters();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      localStorage.setItem('strato_panic', panicInput.value);
      localStorage.setItem('strato_proxy', proxySel.value);
      
      const navMode = $('setting-nav-mode').value;
      localStorage.setItem('strato_nav_mode', navMode);
      document.body.dataset.navMode = navMode;
      
      // Force instant theme/layout update if needed
      initDock(); // Re-sync active states
      
      saveBtn.textContent = 'Saved!';
      setTimeout(() => saveBtn.textContent = 'Apply & Save', 1500);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Clear all settings and cached array data?')) {
        localStorage.clear();
        window.location.reload();
      }
    });
  }
}

/* ═══════════════════════════════
   MOCK AI DECOY CHAT
   ═══════════════════════════════ */
function initAI() {
  const input = $('aiChatInput');
  const btn = $('aiSendBtn');
  const window = $('aiChatWindow');
  if(!input || !btn || !window) return;

  const responses = [
    "According to Newton's second law, F=ma. This implies that the acceleration is directly proportional to the net force acting on the object.",
    "The primary cause of the American Civil War was the long-standing controversy over the enslavement of Black people.",
    "Shakespeare's use of iambic pentameter in this soliloquy creates a heartbeat rhythm, emphasizing Hamlet's emotional state.",
    "To solve for x: subtract 4 from both sides to get 3x = 12, then divide by 3 to find x = 4.",
    "Photosynthesis occurs in the chloroplasts of plant cells, converting light energy into chemical energy."
  ];

  const formulas = [
    "x = [-b ± sqrt(b² - 4ac)] / 2a",
    "a² + b² = c²",
    "E = mc²",
    "PV = nRT",
    "F = G * (m1*m2)/r²",
    "sin²θ + cos²θ = 1"
  ];

  function sendMessage() {
    const txt = input.value.trim();
    if(!txt) return;
    input.value = '';
    
    // Add User Message
    const usrMsg = document.createElement('div');
    usrMsg.className = 'ai-message user';
    usrMsg.textContent = txt;
    window.appendChild(usrMsg);
    
    // Add Typing indicator
    const typeMsg = document.createElement('div');
    typeMsg.className = 'ai-message typing';
    typeMsg.textContent = "Assistant is typing...";
    window.appendChild(typeMsg);
    window.scrollTop = window.scrollHeight;

    // Simulate Network Latency
    setTimeout(() => {
      typeMsg.remove();
      const botMsg = document.createElement('div');
      botMsg.className = 'ai-message bot';
      
      const academicKeywords = {
        "math": ["Let's evaluate the derivative across the x-axis.", "Consider the quadratic formula transformation.", "We can simplify this equation by factoring."],
        "history": ["This event shaped the geopolitical landscape of the era.", "Scholars argue that economic factors were primary.", "The resulting treaty established a new precedent."],
        "science": ["Note how the molecular bonds react under thermal pressure.", "This illustrates the principle of thermodynamic entropy.", "Observe the cellular division process under magnification."],
        "help": ["I can assist with multi-variable calculus, organic chemistry, or historical analysis."]
      };
      
      let category = "help";
      const userText = txt.toLowerCase();
      if (userText.match(/math|calc|algebra|equation|formula|solve|geom/)) category = "math";
      else if (userText.match(/history|war|treaty|century|policy|civil/)) category = "history";
      else if (userText.match(/science|chem|bio|physics|cell|molecule|energy/)) category = "science";
      
      const pool = academicKeywords[category];
      const starter = pool[Math.floor(Math.random() * pool.length)];
      const closer = responses[Math.floor(Math.random() * responses.length)];
      
      let finalResponse = `${starter} Furthermore, ${closer.charAt(0).toLowerCase() + closer.slice(1)}`;
      
      if (category === 'math' || Math.random() > 0.7) {
        finalResponse += ` Specifically, refer to the relation: ${formulas[Math.floor(Math.random() * formulas.length)]}.`;
      }
      
      botMsg.textContent = finalResponse;
      
      window.appendChild(botMsg);
      window.scrollTop = window.scrollHeight;
    }, 800 + Math.random() * 1500);
  }

  btn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if(e.key === 'Enter') sendMessage(); });
}

function initCloak() {
  const panicBtn = $('panicBtn');
  if (panicBtn) {
    panicBtn.addEventListener('click', () => {
      const url = localStorage.getItem('strato_panic') || 'https://classroom.google.com';
      window.location.replace(url);
    });
  }

  // Bind Escape key and Tilde to close overlays / panic wrapper
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "~" || e.key === "`") {
      if (!$('game-overlay').hasAttribute('hidden') && e.key === "Escape") {
        closeOverlay();
      } else {
        const url = localStorage.getItem('strato_panic') || 'https://classroom.google.com';
        window.location.replace(url);
      }
    }
  });

  // Dynamic Tab Cloaking
  document.addEventListener('visibilitychange', () => {
    if (localStorage.getItem('strato_cloak') === 'true') {
      if (document.hidden) {
        document.title = "Google Drive";
        $('favicon').href = "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png";
      } else {
        document.title = "STRATO";
        $('favicon').href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>◆</text></svg>";
      }
    }
  });
}

function initCornerNav() {
  const items = document.querySelectorAll('.cn-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      if (item.id === 'panicBtn') {
        const url = localStorage.getItem('strato_panic') || 'https://classroom.google.com';
        window.location.replace(url);
        return;
      }
      switchView(item.dataset.view);
    });
  });
}

function igniteStratosphere(targetView = 'home') {
  const splash = $('splash');
  const ignite = $('ignite-overlay');
  const bar = $('ignite-bar');
  const dock = $('dock');

  // Fade out splash
  splash.style.opacity = '0';
  splash.style.pointerEvents = 'none';

  setTimeout(() => {
    splash.style.display = 'none';
    ignite.classList.remove('ignite-hidden');

    let progress = 0;
    const interval = setInterval(() => {
      // Logic: Rapid progress at first, then deliberate 'handshake' slowing
      if (progress < 80) progress += Math.random() * 15;
      else progress += Math.random() * 2;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        finalizeIgnition();
      }
      bar.style.width = progress + '%';
    }, 100);

    // Watchdog: If ignition hangs, force entry after 6 seconds
    const watchdog = setTimeout(() => {
      clearInterval(interval);
      finalizeIgnition();
    }, 6000);

    function finalizeIgnition() {
      clearTimeout(watchdog);
      bar.style.width = '100%';
      setTimeout(() => {
        ignite.classList.add('ignite-hidden');
        // Reveal dock with elastic entry
        dock.style.transform = 'translateX(-50%) translateY(0)';
        switchView(targetView);
      }, 400);
    }
  }, 400);
}

function switchView(viewId) {
  const tabs = document.querySelectorAll('.dtab');
  const panels = document.querySelectorAll('.view');
  
  tabs.forEach(t => {
    if (t.dataset.view === viewId) t.classList.add('on');
    else t.classList.remove('on');
  });

  const cnItems = document.querySelectorAll('.cn-item');
  cnItems.forEach(i => {
    if (i.dataset.view === viewId) i.classList.add('active');
    else i.classList.remove('active');
  });

  panels.forEach(p => {
    if (p.id === `view-${viewId}`) p.classList.add('active');
    else p.classList.remove('active');
  });
}

function initBrowser() {
  const go = $('browserGo');
  const input = $('browserUrl');
  const iframe = $('browser-iframe');
  if(!go || !input || !iframe) return;

  const surf = () => {
    let url = input.value.trim();
    if(!url) return;
    if(!url.startsWith('http')) url = 'https://' + url;
    iframe.src = proxifyUrl(url);
  };
  go.addEventListener('click', surf);
  input.addEventListener('keydown', e => { if(e.key==='Enter') surf(); });
}



/* ═══════════════════════════════
   THEME ENGINE & PARTICLES
   ═══════════════════════════════ */
function initTheme() {
  const sel = $('themeSelector');
  if (!sel) return;
  const saved = localStorage.getItem('strato_theme') || 'midnight';
  document.documentElement.dataset.theme = saved;
  sel.value = saved;
  sel.addEventListener('change', e => {
    document.documentElement.dataset.theme = e.target.value;
    localStorage.setItem('strato_theme', e.target.value);
  });
}

function initParticles() {
  const canvas = $('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4
  }));

  window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  function draw() {
    if (document.hidden) {
       requestAnimationFrame(draw);
       return;
    }
    ctx.clearRect(0, 0, w, h);
    const isSky = document.documentElement.dataset.theme === 'sky';
    ctx.fillStyle = isSky ? 'rgba(255, 255, 255, 0.4)' : 'rgba(26, 122, 255, 0.3)';
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* --- LAZY LOADING OBSERVER --- */
const lazyObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.onload = () => img.classList.add('loaded');
        img.removeAttribute('data-src');
      }
      observer.unobserve(img);
    }
  });
}, { rootMargin: '200px' });

/* ═══════════════════════════════
   ARRAY / GRID RENDERER
   ═══════════════════════════════ */
function applyFilters() {
  const isDecoy = localStorage.getItem('strato_math_decoy') === 'true';
  let baseArray = isDecoy ? mathDecoy : masterGames;

  let result = baseArray;
  if (activeCategory !== 'All') {
    result = result.filter(g => (g.t || 'Other') === activeCategory);
  }
  if (searchQuery) {
    result = result.filter(g => (g.title || g.n || '').toLowerCase().includes(searchQuery));
  }
  filteredGames = result;
  currentLimit = RENDER_LIMIT;
  
  const searchInput = $('searchInput');
  if (searchInput) {
    searchInput.placeholder = `Search ${baseArray.length.toLocaleString()} ${isDecoy ? 'academic' : 'array'} items...`;
  }
  
  if (isDecoy) {
     $('gameCount').textContent = result.length + " Titles";
     document.querySelector('.grid-header h2').textContent = "GN MATH LIBRARY";
  } else {
     document.querySelector('.grid-header h2').textContent = "LIBRARY ARRAY";
  }

  renderGrid(filteredGames);
}

function buildCategoryBar() {
  const bar = $('category-bar');
  if (!bar) return;
  const isDecoy = localStorage.getItem('strato_math_decoy') === 'true';
  const baseArray = isDecoy ? mathDecoy : masterGames;

  const counts = {};
  baseArray.forEach(g => { const c = g.t || 'Other'; counts[c] = (counts[c]||0)+1; });

  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).map(e => e[0]);
  const cats = ['All', ...sorted];

  bar.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-pill' + (cat === 'All' ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      bar.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
    bar.appendChild(btn);
  });
}

function createDataTile(game, index = 0) {
  const title = game.title || game.n || 'UnknownData';
  const url = game.iframe_url || game.u;
  const type = game.t || 'BIN';
  const imgUrl = game.thumbnail || game.img || '';
  
  const tile = document.createElement('div');
  tile.className = 'unified-tile';
  tile.style.animationDelay = `${index * 0.04}s`;
  
  // Unified DOM rendering: Includes both Image Thumbnail AND Terminal HUD
  tile.innerHTML = `
    <img class="ut-img" data-src="${imgUrl}" alt="${title}" onerror="this.style.display='none'">
    
    <div class="ut-terminal-hud">
      <div class="tt-head">
        <span class="tt-type">[${type}]</span>
        <span class="tt-status">ONLINE</span>
      </div>
      <div class="tt-body">
        <div class="tt-name">${title}</div>
        <div class="tt-hex">0x${Math.floor(Math.random()*16777215).toString(16).toUpperCase()} // Mount Ready</div>
      </div>
    </div>
    
    <div class="ut-sky-hud">
      <div class="sh-name">${title}</div>
      <div class="sh-tag">${type}</div>
    </div>
  `;

  tile.addEventListener('click', () => {
    if (url) openOverlay(url, title);
  });

  // Start lazy observe
  const img = tile.querySelector('.ut-img');
  if (img) lazyObserver.observe(img);

  return tile;
}

function renderGrid(list) {
  const grid = $('gameGrid');
  const count = $('gameCount');
  
  grid.innerHTML = '';
  const batch = list.slice(0, currentLimit);
  const frag = document.createDocumentFragment();
  batch.forEach((g, i) => frag.appendChild(createDataTile(g, i)));
  grid.appendChild(frag);

  count.textContent = list.length;
}

function appendGrid(list, limit) {
  const grid = $('gameGrid');
  const start = grid.children.length;
  const end = Math.min(limit, list.length);
  if (start >= end) return;

  const frag = document.createDocumentFragment();
  const batch = list.slice(start, end);
  batch.forEach((g, i) => frag.appendChild(createDataTile(g, i)));
  grid.appendChild(frag);

  $('gameCount').textContent = list.length;
}

/* ═══════════════════════════════
   OVERLAY / LAUNCHER (Unified)
   ═══════════════════════════════ */
function openOverlay(url, title) {
  const overlay = $('game-overlay');
  const iframe = $('game-iframe');
  
  if ($('ov-game-title')) $('ov-game-title').textContent = title;

  // Local URLs don't need proxying if they are relative mapped, 
  // but if it's an absolute URL (game or watch/listen), drop it in UV
  iframe.src = url.startsWith('/') ? url : proxifyUrl(url);

  overlay.removeAttribute('hidden');
}

function closeOverlay() {
  const overlay = $('game-overlay');
  const iframe = $('game-iframe');
  overlay.setAttribute('hidden', '');
  iframe.src = 'about:blank';
}

/* ═══════════════════════════════
   BOOT ENGINE
   ═══════════════════════════════ */
async function boot() {
  try {
    await initProxy();
  initBrowser();
  
  const res = await fetch('/assets/games.json');
    if (!res.ok) throw new Error('DB Load Fail');
    const rawGames = await res.json();
    
    // Antispam Filter
    const promoRegex = /badge|listed|hunt|stash|vault|directory|market|logo|featured|powered|dang\.ai|launchlist/i;
    masterGames = rawGames.filter(g => {
      const name = (g.title || g.n || '');
      const url  = (g.iframe_url || g.u || '');
      return name && url && !promoRegex.test(name);
    });

      if ($('searchInput')) {
        $('searchInput').placeholder = `Search ${masterGames.length.toLocaleString()} array items...`;
      }
      
      buildCategoryBar();
      applyFilters();
    
    // Auto-trigger aggregator AFTER local DB load to prevent overwrite race
    setTimeout(fetchExternalGames, 1500); // Wait for boot settling

    // Infinite scroll
    // VISIONOS FIX: The main#content or window is the scroll container
    const scrollContainer = $('content'); 
    let scrollTick = false;
    scrollContainer.addEventListener('scroll', () => {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(() => {
        // We detect how close to bottom the scroll container is
        if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 600) {
          if (currentLimit < filteredGames.length) {
            currentLimit += RENDER_LIMIT;
            appendGrid(filteredGames, currentLimit);
            console.log('[STRATO] Appending game batch. New Limit:', currentLimit);
          }
        }
        scrollTick = false;
      });
    }, { passive: true });

  } catch (err) {
    console.error('[STRATO] Boot failure:', err);
  }

  // Bind Overlay Close
  const backBtn = $('overlay-back-btn');
  if (backBtn) backBtn.addEventListener('click', closeOverlay);
  
  const fsBtn = $('overlay-fs-btn');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      const ifr = $('game-iframe');
      if (ifr) (ifr.requestFullscreen || ifr.webkitRequestFullscreen || function(){}).call(ifr);
    });
  }
  
  // Final UI Check: Ensure version and telemetry are visible
  const versionEl = document.querySelector('.cn-version');
  if (versionEl) versionEl.textContent = 'v22.4-STABLE';
}

document.addEventListener('DOMContentLoaded', () => {
  const savedNav = localStorage.getItem('strato_nav_mode') || 'dock';
  document.body.dataset.navMode = savedNav;

  initTheme();
  initParticles();
  initDock();
  initMediaCards();
  initSearch();
  initSettings();
  initCloak();
  initAI();
  
  // Bind Splash Launchpad tiles for immediate interaction
  document.querySelectorAll('.lp-tile').forEach(tile => {
    tile.addEventListener('click', () => {
       igniteStratosphere(tile.dataset.launch || 'grid');
    });
  });
  
  runVitals();
  boot();
});