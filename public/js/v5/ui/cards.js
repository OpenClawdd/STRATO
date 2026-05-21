import { categoryOf, nameOf } from "../core/catalog.js";
import { health, isPlaceholder } from "../core/health.js";
import { keys, readJson } from "../core/storage.js";

export function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function palette(game) {
  const category = String(game?.category || "arcade").toLowerCase();
  const palettes = {
    puzzle: ["#a7f3d0", "#38bdf8", "#2563eb"],
    action: ["#c4b5fd", "#22d3ee", "#7c3aed"],
    arcade: ["#67e8f9", "#4ade80", "#0f766e"],
    sports: ["#bfdbfe", "#34d399", "#0891b2"],
    racing: ["#fde68a", "#38bdf8", "#f97316"],
    strategy: ["#bbf7d0", "#60a5fa", "#312e81"],
  };
  return palettes[category] || ["#bae6fd", "#5eead4", "#4f46e5"];
}

export function fallbackThumb(game) {
  const initials =
    nameOf(game)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "S";
  const [a, b, c] = palette(game);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 230">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061526"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="#07111e"/></linearGradient>
      <linearGradient id="aero" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>
    </defs>
    <rect width="360" height="230" rx="28" fill="url(#sky)"/>
    <path d="M0 68 C78 22 147 38 210 18 C276 -4 319 6 360 22 L360 0 L0 0 Z" fill="#fff" opacity=".16"/>
    <circle cx="282" cy="58" r="78" fill="url(#aero)" opacity=".22" filter="url(#soft)"/>
    <circle cx="82" cy="184" r="94" fill="url(#aero)" opacity=".16" filter="url(#soft)"/>
    <ellipse cx="180" cy="122" rx="116" ry="34" fill="none" stroke="url(#aero)" stroke-width="3" opacity=".55" transform="rotate(-9 180 122)"/>
    <ellipse cx="180" cy="122" rx="72" ry="20" fill="none" stroke="#fff" stroke-width="2" opacity=".24" transform="rotate(-9 180 122)"/>
    <circle cx="284" cy="105" r="5" fill="${a}" opacity=".88"/>
    <text x="180" y="139" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="900" fill="url(#aero)" letter-spacing="2">${escapeHtml(initials)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function thumb(game) {
  return game?.thumbnail && !isPlaceholder(game.thumbnail)
    ? game.thumbnail
    : fallbackThumb(game);
}

export function statusLabel(game) {
  const labels = {
    "fallback-art": "Fallback art",
    "failed-locally": "Launch paused",
    "missing-url": "Missing URL",
    "needs-config": "Needs config",
    invalid: "Unavailable",
  };
  return labels[health(game).status] || "";
}

function localMeta(game, snapshot = {}) {
  const count = Number(
    (snapshot.playCounts || readJson(keys.playCounts, {}))[game.id] || 0,
  );
  const last = (snapshot.lastPlayed || readJson(keys.lastPlayed, {}))[game.id];
  if (count > 0) return `${count} launch${count === 1 ? "" : "es"}`;
  if (last) return "Seen before";
  return "Ready";
}

export function card(game, variant = "", snapshot = {}) {
  const favorites =
    snapshot.favorites instanceof Set
      ? snapshot.favorites
      : new Set(readJson(keys.favorites, []));
  const favorite = favorites.has(game.id);
  const category = categoryOf(game);
  const isVerified =
    game.reliability === "green" || game.reliability === "yellow";
  const meta = localMeta(game, snapshot);

  const provider = game.source || game.provider || "";
  let providerBadge = "";
  if (provider) {
    let cleanProvider = String(provider).toLowerCase();
    if (cleanProvider.includes("selenite")) cleanProvider = "Selenite";
    else if (cleanProvider.includes("1key") || cleanProvider.includes("onekey"))
      cleanProvider = "1Key";
    else if (
      cleanProvider.includes("frogiee") ||
      cleanProvider.includes("frogie")
    )
      cleanProvider = "Frogie";
    else if (cleanProvider.includes("gn-math")) cleanProvider = "GN Math";
    else if (cleanProvider.includes("lucide")) cleanProvider = "Lucide";
    else if (cleanProvider.includes("truffled")) cleanProvider = "Truffled";
    else if (cleanProvider.includes("ubghub")) cleanProvider = "UBGHub";
    else cleanProvider = provider.charAt(0).toUpperCase() + provider.slice(1);

    providerBadge = `<span class="provider-badge provider-${cleanProvider.toLowerCase().replaceAll(" ", "-")}">${escapeHtml(cleanProvider)}</span>`;
  }

  return `<article class="game-card ${variant}" data-game-id="${escapeHtml(game.id)}" tabindex="0">
    <div class="game-card-thumb">
      <img src="${escapeHtml(thumb(game))}" loading="lazy" data-fallback-src="${escapeHtml(fallbackThumb(game))}" alt="">
      <div class="game-card-overlay">
        <div class="game-card-meta">
          <span class="category-tag">${escapeHtml(category)}</span>
          ${providerBadge}
          ${isVerified ? `<span class="verified-badge">✓ Verified</span>` : ""}
        </div>
        <h3 class="game-card-title">${escapeHtml(nameOf(game))}</h3>
        <div class="game-card-footer">
          <span class="card-status-text">${escapeHtml(meta)}</span>
          <button class="launch-button-mini" data-launch-id="${escapeHtml(game.id)}">Play</button>
        </div>
      </div>
    </div>
    <button class="pin-button ${favorite ? "active" : ""}" data-fav-id="${escapeHtml(game.id)}" type="button" aria-label="Favorite">
      ${favorite ? "★" : "☆"}
    </button>
  </article>`;
}
