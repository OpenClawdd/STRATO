import { categoryOf, nameOf, similarGames } from "../core/catalog.js";
import { clearFailure } from "../core/launch.js";
import { escapeHtml } from "./cards.js";

export function showRecovery(
  game,
  reason,
  { launch, surprise, focusSearch } = {},
) {
  document.getElementById("launch-failure-overlay")?.remove();
  const similar = similarGames(game, 3);
  const overlay = document.createElement("div");
  overlay.className = "launch-failure-overlay";
  overlay.id = "launch-failure-overlay";
  overlay.innerHTML = `<div class="recovery-card" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
    <div class="recovery-mark">!</div>
    <p class="section-eyebrow">No dead ends.</p>
    <h2 id="recovery-title">Signal lost.</h2>
    <p>${game ? `${escapeHtml(nameOf(game))} could not launch.` : "That launch route is unavailable."} ${escapeHtml(reason || "")}</p>
    <div class="recovery-actions">
      ${game ? '<button class="launch-button" data-recovery="retry" type="button">Retry</button>' : ""}
      <button class="glass-btn" data-recovery="surprise" type="button">Try another</button>
      <button class="glass-btn" data-recovery="search" type="button">Search again</button>
      <button class="glass-btn" data-recovery="home" type="button">Back to STRATO</button>
    </div>
    ${similar.length ? `<div class="nearby-list"><p class="home-result-meta">Similar games</p>${similar.map((item) => `<button class="similar-game-btn" data-similar="${escapeHtml(item.id)}" type="button"><span>${escapeHtml(nameOf(item))}</span><span>${escapeHtml(categoryOf(item))}</span></button>`).join("")}</div>` : ""}
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
