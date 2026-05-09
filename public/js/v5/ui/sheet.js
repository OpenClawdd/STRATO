import {
  categoryOf,
  descriptionOf,
  findGame,
  nameOf,
  similarGames,
  tagsOf,
} from "../core/catalog.js";
import { keys, readJson } from "../core/storage.js";
import { escapeHtml, fallbackThumb, statusLabel, thumb } from "./cards.js";

function formatLastPlayed(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function openSheet(game, { onLaunch, onToggleFavorite } = {}) {
  if (!game) return;
  document.getElementById("game-sheet-overlay")?.remove();

  const favorites = readJson(keys.favorites, []);
  const isFavorite = favorites.includes(game.id);
  const lastPlayed = readJson(keys.lastPlayed, {})[game.id];
  const playCount = Number(readJson(keys.playCounts, {})[game.id] || 0);
  const similar = similarGames(game, 4);
  const description = descriptionOf(game);
  const label = statusLabel(game);

  const overlay = document.createElement("div");
  overlay.className = "sheet-overlay";
  overlay.id = "game-sheet-overlay";
  overlay.innerHTML = `<div class="game-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
    <button class="sheet-close" data-close-sheet type="button" aria-label="Close detail sheet">×</button>
    <div class="game-sheet-grid">
      <div class="sheet-art"><img src="${escapeHtml(thumb(game))}" data-fallback-src="${escapeHtml(fallbackThumb(game))}" alt=""></div>
      <div class="sheet-copy">
        <p class="section-eyebrow">Launch Sheet · v5.03</p>
        <h2 id="sheet-title">${escapeHtml(nameOf(game))}</h2>
        <p class="home-result-meta">${escapeHtml(categoryOf(game))}${label ? ` · ${escapeHtml(label)}` : ""}</p>
        ${description ? `<p class="sheet-description">${escapeHtml(description)}</p>` : ""}
        <div class="hideout-tags">${tagsOf(game)
          .slice(0, 5)
          .map((tag) => `<span>${escapeHtml(tag)}</span>`)
          .join("")}</div>
        <div class="sheet-stats" aria-label="Local launch stats">
          ${playCount > 0 ? `<span>${playCount} local launch${playCount === 1 ? "" : "es"}</span>` : ""}
          ${lastPlayed ? `<span>Last played ${escapeHtml(formatLastPlayed(lastPlayed))}</span>` : ""}
        </div>
        <div class="sheet-actions">
          <button class="launch-button" data-launch-id="${escapeHtml(game.id)}" type="button">Launch now</button>
          <button class="glass-btn ${isFavorite ? "active" : ""}" data-fav-id="${escapeHtml(game.id)}" type="button">${isFavorite ? "Unfavorite" : "Favorite"}</button>
        </div>
        ${similar.length ? `<div class="nearby-list"><p class="home-result-meta">Nearby picks</p>${similar.map((item) => `<button class="similar-game-btn" data-open-id="${escapeHtml(item.id)}" type="button"><span>${escapeHtml(nameOf(item))}</span><span>${escapeHtml(categoryOf(item))}</span></button>`).join("")}</div>` : ""}
      </div>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector("[data-launch-id]")?.focus();
  overlay.querySelectorAll("img[data-fallback-src]").forEach((img) => {
    img.onerror = () => {
      if (img.src !== img.dataset.fallbackSrc)
        img.src = img.dataset.fallbackSrc;
    };
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-close-sheet]"))
      overlay.remove();
    const launchId = event.target.closest("[data-launch-id]")?.dataset.launchId;
    if (launchId) {
      overlay.remove();
      onLaunch?.(launchId);
    }
    const favoriteId = event.target.closest("[data-fav-id]")?.dataset.favId;
    if (favoriteId) {
      onToggleFavorite?.(favoriteId);
      overlay.remove();
      openSheet(findGame(favoriteId) || game, { onLaunch, onToggleFavorite });
    }
    const nextId = event.target.closest("[data-open-id]")?.dataset.openId;
    if (nextId) {
      overlay.remove();
      openSheet(findGame(nextId), { onLaunch, onToggleFavorite });
    }
  });
}
