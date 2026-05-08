import { categoryOf, descriptionOf, nameOf, tagsOf } from "../core/catalog.js";
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

export function card(game, variant = "") {
  const favorite = readJson(keys.favorites, []).includes(game.id);
  const tags = tagsOf(game).slice(0, 3);
  const description = descriptionOf(game);
  const label = statusLabel(game);
  return `<article class="hideout-card ${variant}" data-game-id="${escapeHtml(game.id)}" tabindex="0" aria-label="Open ${escapeHtml(nameOf(game))}">
    <button class="pin-button ${favorite ? "active" : ""}" data-fav-id="${escapeHtml(game.id)}" type="button" aria-label="${favorite ? "Unfavorite" : "Favorite"} ${escapeHtml(nameOf(game))}">${favorite ? "★" : "☆"}</button>
    <div class="hideout-thumb-wrap"><img class="hideout-thumb" src="${escapeHtml(thumb(game))}" loading="lazy" data-fallback-src="${escapeHtml(fallbackThumb(game))}" alt=""></div>
    <div class="hideout-card-body">
      <div class="hideout-card-topline"><span>${escapeHtml(categoryOf(game))}</span>${label ? `<span class="status-pill">${escapeHtml(label)}</span>` : ""}</div>
      <h3>${escapeHtml(nameOf(game))}</h3>
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      <div class="hideout-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <button class="launch-button" data-launch-id="${escapeHtml(game.id)}" type="button">Launch</button>
    </div>
  </article>`;
}
