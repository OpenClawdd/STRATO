import {
  categoryOf,
  nameOf,
  similarGames,
  trendingGames,
} from "../core/catalog.js";
import { clearFailure } from "../core/launch.js";
import { escapeHtml } from "./cards.js";

export function showRecovery(
  game,
  reason,
  { launch, surprise, focusSearch } = {},
) {
  document.getElementById("launch-failure-overlay")?.remove();
  let similar = similarGames(game, 3);
  let label = "Similar games";

  if (!similar.length) {
    similar = trendingGames(3);
    label = "Reliable backups";
  }

  const overlay = document.createElement("div");
  overlay.className = "launch-failure-overlay";
  overlay.id = "launch-failure-overlay";
  overlay.innerHTML = `<div class="recovery-universe" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
    <div class="recovery-status">SIGNAL WEAK</div>
    <div class="recovery-copy">
      <h2 id="recovery-title">Launch Route Blocked</h2>
      <p>${game ? `<strong>${escapeHtml(nameOf(game))}</strong> failed to establish a secure link.` : "The requested launch route is currently unavailable."}</p>
      <div class="recovery-reason">${escapeHtml(reason || "Verification error.")}</div>
    </div>

    <div class="recovery-actions">
      ${game ? '<button class="btn-universe primary" data-recovery="retry" type="button">Retry Link</button>' : ""}
      <button class="btn-universe secondary" data-recovery="surprise" type="button">Surprise Me</button>
      <button class="btn-universe secondary" data-recovery="search" type="button">New Search</button>
    </div>

    ${
      similar.length
        ? `
    <div class="recovery-alternatives">
      <p class="section-label">${escapeHtml(label)}</p>
      <div class="alternative-grid">
        ${similar
          .map(
            (item) => `
          <button class="alt-game-card" data-similar="${escapeHtml(item.id)}" type="button">
            <span>${escapeHtml(nameOf(item))}</span>
            <span class="alt-category">${escapeHtml(categoryOf(item))}</span>
          </button>
        `,
          )
          .join("")}
      </div>
    </div>`
        : ""
    }
  </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (event) => {
    const action = event.target.closest("[data-recovery]")?.dataset.recovery;
    const similarId = event.target.closest("[data-similar]")?.dataset.similar;
    if (event.target === overlay || action === "home") {
      overlay.remove();
      document
        .querySelectorAll(".view")
        .forEach((view) => view.classList.remove("active"));
      document.getElementById("view-home")?.classList.add("active");
    } else if (action === "retry" && game) {
      clearFailure(game);
      overlay.remove();
      launch?.(game.id);
    } else if (action === "surprise") {
      overlay.remove();
      surprise?.();
    } else if (action === "search") {
      overlay.remove();
      focusSearch?.();
    } else if (similarId) {
      overlay.remove();
      launch?.(similarId);
    }
  });
}
