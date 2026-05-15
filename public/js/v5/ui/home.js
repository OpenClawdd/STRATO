import { state } from "../core/state.js";
import {
  categoryOf,
  findGame,
  moodClusters,
  nameOf,
  playableCatalog,
  promotableCatalog,
  tagsOf,
  typeLabel,
  visibleCatalog,
} from "../core/catalog.js";
import { health } from "../core/health.js";
import { launchById } from "../core/launch.js";
import { dailyPicks, surpriseCandidate } from "../core/picks.js";
import { searchGames } from "../core/search.js";
import { keys, preferences, readJson, writeJson } from "../core/storage.js";
import {
  card,
  escapeHtml,
  fallbackThumb,
  statusLabel,
  thumb,
} from "./cards.js";
import { showRecovery } from "./recovery.js";
import { openSheet } from "./sheet.js";
import { toast } from "./toast.js";

function setActiveView(viewName) {
  document
    .querySelectorAll(".view")
    .forEach((view) => view.classList.remove("active"));
  document.getElementById(`view-${viewName}`)?.classList.add("active");
  document
    .querySelectorAll(".nav-btn")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.view === viewName),
    );
}

function bindCards(container, controller) {
  container.querySelectorAll("img[data-fallback-src]").forEach((img) => {
    img.onerror = () => {
      if (img.src !== img.dataset.fallbackSrc)
        img.src = img.dataset.fallbackSrc;
    };
  });
  container.querySelectorAll("[data-launch-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      controller.launch(button.dataset.launchId);
    });
  });
  container.querySelectorAll("[data-fav-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      controller.toggleFavorite(button.dataset.favId);
    });
  });
  container.querySelectorAll("[data-game-id]").forEach((item) => {
    item.addEventListener("click", (event) => {
      if (!event.target.closest("button")) controller.open(item.dataset.gameId);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter") controller.open(item.dataset.gameId);
    });
  });
}

function renderCards(id, list, emptyText, controller, variant = "") {
  const container = document.getElementById(id);
  if (!container) return;
  if (!list.length) {
    container.innerHTML = `<div class="hideout-empty"><strong>${escapeHtml(emptyText)}</strong><button class="glass-btn" data-focus-search type="button">Search the catalog</button></div>`;
    container
      .querySelector("[data-focus-search]")
      ?.addEventListener("click", () => controller.focusSearch());
    return;
  }
  container.innerHTML = list.map((game) => card(game, variant)).join("");
  bindCards(container, controller);
}

function shortDate(timestamp) {
  if (!timestamp) return "Ready";
  try {
    return new Intl.DateTimeFormat([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "Ready";
  }
}

function renderHeroStats() {
  const playable = playableCatalog();
  const picks = dailyPicks();
  const moods = moodClusters();
  const recent = readJson(keys.recent, []);
  const lastPlayed = readJson(keys.lastPlayed, {});
  const last = recent[0] ? findGame(recent[0]) : null;
  const lastAction = document.getElementById("home-last-action");

  const games = document.getElementById("home-live-games");
  const pickNode = document.getElementById("home-live-picks");
  const moodNode = document.getElementById("home-live-moods");
  const statusChip = document.getElementById("catalog-status-chip");

  if (games) games.textContent = String(playable.length);
  if (pickNode) pickNode.textContent = String(picks.length);
  if (moodNode) moodNode.textContent = String(moods.length);
  if (statusChip) statusChip.textContent = `${playable.length} games`;
  if (lastAction)
    lastAction.textContent = last
      ? `Last: ${nameOf(last)} · ${shortDate(lastPlayed[last.id])}`
      : "Ready";
}

function renderPulse() {
  const pulse = document.getElementById("signal-health");
  if (!pulse) return;
  const stats = state.games.reduce((acc, game) => {
    const status = health(game).status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const playable = playableCatalog().length;
  pulse.innerHTML = [
    ["Launchable", playable],
    ["Ready", stats.ready || 0],
    ["Fallback art", stats["fallback-art"] || 0],
    ["Paused", stats["failed-locally"] || 0],
  ]
    .map(
      ([label, value]) =>
        `<div class="pulse-tile"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`,
    )
    .join("");
}

function renderMoods(controller) {
  const section = document.getElementById("home-moods-section");
  const container = document.getElementById("home-moods");
  const quick = document.getElementById("home-filter-row");
  const clusters = moodClusters();
  section?.classList.toggle("hidden", clusters.length < 2);
  const buttons = [
    `<button class="mood-chip ${state.activeMood === "all" ? "active" : ""}" data-mood="all" type="button">All <span>${playableCatalog().length}</span></button>`,
  ]
    .concat(
      clusters.map(
        ({ name, count }) =>
          `<button class="mood-chip ${state.activeMood === name ? "active" : ""}" data-mood="${escapeHtml(name)}" type="button">${escapeHtml(name)} <span>${count}</span></button>`,
      ),
    )
    .join("");
  if (container) container.innerHTML = buttons;
  if (quick)
    quick.innerHTML = clusters
      .slice(0, 6)
      .map(
        ({ name }) =>
          `<button class="mood-chip ${state.activeMood === name ? "active" : ""}" data-mood="${escapeHtml(name)}" type="button">${escapeHtml(name)}</button>`,
      )
      .join("");
  [container, quick].filter(Boolean).forEach((node) => {
    node.querySelectorAll("[data-mood]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeMood = button.dataset.mood || "all";
        controller.render();
      });
    });
  });
}

function renderSearchResult(game, index) {
  const favorite = readJson(keys.favorites, []).includes(game.id);
  const tags = tagsOf(game).slice(0, 3).join(" / ");
  return `<article class="search-result ${index === state.searchIndex ? "active" : ""}" data-game-id="${escapeHtml(game.id)}" aria-selected="${index === state.searchIndex ? "true" : "false"}" tabindex="0">
    <img src="${escapeHtml(thumb(game))}" data-fallback-src="${escapeHtml(fallbackThumb(game))}" loading="lazy" alt="">
    <div class="search-result-copy">
      <h3>${escapeHtml(nameOf(game))}</h3>
      <p><span class="result-type-badge">${escapeHtml(typeLabel(game))}</span>${escapeHtml(categoryOf(game))}${tags ? ` / ${escapeHtml(tags)}` : ""}</p>
    </div>
    ${statusLabel(game) ? `<span class="status-pill">${escapeHtml(statusLabel(game))}</span>` : ""}
    <button class="pin-button ${favorite ? "active" : ""}" data-fav-id="${escapeHtml(game.id)}" type="button" aria-label="Favorite ${escapeHtml(nameOf(game))}">${favorite ? "★" : "☆"}</button>
    <button class="launch-button" data-launch-id="${escapeHtml(game.id)}" type="button">Play</button>
  </article>`;
}

export function createHomeController() {
  const controller = {
    render() {
      const list = visibleCatalog();
      const favorites = readJson(keys.favorites, [])
        .map(findGame)
        .filter((game) => game && list.includes(game))
        .slice(0, 6);
      const recent = readJson(keys.recent, [])
        .map(findGame)
        .filter((game) => game && list.includes(game))
        .slice(0, 6);
      const counts = readJson(keys.playCounts, {});
      const most = Object.entries(counts)
        .map(([id, count]) => ({
          game: findGame(id),
          count: Number(count) || 0,
        }))
        .filter(({ game, count }) => game && count > 0 && list.includes(game))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
        .map(({ game }) => game);
      const allGames = promotableCatalog()
        .filter((game) => state.activeMood === "all" || list.includes(game))
        .slice(0, 12);

      renderMoods(controller);
      renderCards(
        "daily-picks",
        dailyPicks(),
        "No daily picks are launchable yet.",
        controller,
        "featured",
      );
      renderCards(
        "home-favorites",
        favorites,
        "Your shelf is empty. Favorite a game you want close by.",
        controller,
      );
      renderCards(
        "home-recent",
        recent,
        "Nothing launched yet. Search anything, then launch instantly.",
        controller,
      );
      document
        .getElementById("home-most-played-section")
        ?.classList.toggle("hidden", most.length === 0);
      renderCards("home-most-played", most, "", controller);
      renderCards(
        "home-all-games",
        allGames,
        "The filtered shelf is empty. Clear the mood filter or search directly.",
        controller,
        "shelf",
      );
      renderPulse();
      renderHeroStats();
      controller.search(document.getElementById("home-search")?.value || "");
    },

    search(query) {
      state.searchQuery = query;
      const container = document.getElementById("home-search-results");
      if (!container) return;
      const results = searchGames(query);
      if (!query.trim()) {
        container.innerHTML = "";
        return;
      }
      if (!results.length) {
        container.innerHTML = `<div class="hideout-empty search-empty"><strong>No signal. Try another title, tag, or mood.</strong><button class="glass-btn" id="empty-surprise" type="button">Surprise Me</button></div>`;
        container
          .querySelector("#empty-surprise")
          ?.addEventListener("click", () => controller.surprise());
        return;
      }
      state.searchIndex = Math.max(
        0,
        Math.min(state.searchIndex, results.length - 1),
      );
      container.innerHTML = `<div class="search-count"><strong>${results.length}</strong> result${results.length === 1 ? "" : "s"} · Enter launches, click opens details</div>${results.map(renderSearchResult).join("")}`;
      bindCards(container, controller);
    },

    moveSearch(delta) {
      const items = document.querySelectorAll(".search-result");
      if (!items.length) return;

      const oldIndex = state.searchIndex;
      state.searchIndex =
        (state.searchIndex + delta + items.length) % items.length;

      if (items[oldIndex]) {
        items[oldIndex].classList.remove("active");
        items[oldIndex].setAttribute("aria-selected", "false");
      }

      if (items[state.searchIndex]) {
        items[state.searchIndex].classList.add("active");
        items[state.searchIndex].setAttribute("aria-selected", "true");
        window.requestAnimationFrame?.(() => {
          items[state.searchIndex].scrollIntoView({ block: "nearest" });
        });
      }
    },

    launchSelected() {
      const items = document.querySelectorAll(".search-result");
      const selected = items[state.searchIndex] || items[0];
      if (selected) controller.launch(selected.dataset.gameId);
    },

    async launch(id) {
      await launchById(id, {
        onFail: (game, reason) =>
          showRecovery(game, reason, {
            launch: controller.launch,
            surprise: controller.surprise,
            focusSearch: controller.focusSearch,
          }),
        onUpdate: () => controller.render(),
      });
      renderHeroStats();
    },

    open(id) {
      openSheet(findGame(id), {
        onLaunch: controller.launch,
        onToggleFavorite: controller.toggleFavorite,
      });
    },

    toggleFavorite(id) {
      const favorites = readJson(keys.favorites, []);
      const index = favorites.indexOf(id);
      if (index >= 0) favorites.splice(index, 1);
      else favorites.unshift(id);
      writeJson(keys.favorites, favorites.slice(0, 80));
      toast(index >= 0 ? "Removed from your shelf." : "Saved to your shelf.");
      controller.render();
    },

    surprise() {
      const game = surpriseCandidate();
      if (!game) {
        toast("No launchable games available yet.");
        return;
      }
      const button = document.getElementById("surprise-me");
      if (
        button &&
        !preferences().lowPower &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        button.classList.remove("shuffle-lock");
        void button.offsetWidth;
        button.classList.add("shuffle-lock");
        window.setTimeout(() => button.classList.remove("shuffle-lock"), 520);
      }
      toast(`Launching ${nameOf(game)}.`);
      controller.launch(game.id);
    },

    focusSearch() {
      setActiveView("home");
      const input = document.getElementById("home-search");
      input?.focus();
      input?.select();
    },
  };

  return controller;
}
