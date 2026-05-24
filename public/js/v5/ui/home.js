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

const INITIAL_ALL_GAMES_LIMIT = 8;
const SEARCH_RESULTS_LIMIT = 24;

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

function renderCards(
  id,
  list,
  emptyText,
  controller,
  variant = "",
  snapshot = {},
) {
  const container = document.getElementById(id);
  if (!container) return;
  const section = container.closest(".hideout-section");
  if (!list.length) {
    if (section) section.classList.add("hidden");
    container.innerHTML = "";
    return;
  }
  if (section) section.classList.remove("hidden");
  container.innerHTML = list
    .map((game) => card(game, variant, snapshot))
    .join("");
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

function renderHeroStats(renderState = null) {
  const playable = renderState?.playable || playableCatalog();
  const els = {
    "home-live-games": playable.length,
    "home-live-picks": (renderState?.picks || dailyPicks()).length,
    "home-live-moods": (renderState?.clusters || moodClusters()).length,
  };
  Object.entries(els).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  const signalEl = document.getElementById("catalog-signal");
  if (signalEl) {
    const stats = state.games.reduce((acc, game) => {
      const status = health(game).status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const localVerified = stats.local || 0;
    const remotePending = stats["remote-proxy-unverified"] || 0;
    signalEl.textContent = localVerified > 0 ? "Local Mode" : "Limited Local";
    signalEl.style.color =
      localVerified > 0 ? "var(--accent-green)" : "var(--accent-yellow)";
    signalEl.title = `${localVerified} verified local · ${remotePending} remote proof pending`;
  }

  const recent = renderState?.recentIds || readJson(keys.recent, []);
  const lastPlayed = renderState?.lastPlayed || readJson(keys.lastPlayed, {});
  const last = recent[0] ? findGame(recent[0]) : null;
  const lastAction = document.getElementById("home-last-action");
  const resumeBtn = document.getElementById("resume-last");

  if (lastAction)
    lastAction.textContent = last
      ? `Last: ${nameOf(last)} · ${shortDate(lastPlayed[last.id])}`
      : "Ready";

  if (resumeBtn) {
    if (last) {
      resumeBtn.classList.remove("hidden");
      resumeBtn.onclick = () => launchById(last.id);
    } else {
      resumeBtn.classList.add("hidden");
    }
  }
}

function renderPulse(renderState) {
  const pulse = document.getElementById("signal-health");
  if (!pulse) return;
  const stats = state.games.reduce((acc, game) => {
    const status = health(game).status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const playable = renderState.playable.length;
  pulse.innerHTML = [
    ["Launchable", playable],
    ["Local verified", stats.local || 0],
    ["Remote proxy verified", stats["remote-proxy-verified"] || 0],
    ["Remote proof pending", stats["remote-proxy-unverified"] || 0],
    ["Fallback art", stats["fallback-art"] || 0],
    ["Recently failed", stats["failed-locally"] || 0],
  ]
    .map(
      ([label, value]) =>
        `<div class="pulse-tile"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`,
    )
    .join("");
}

function renderMoods(controller, renderState) {
  const section = document.getElementById("home-moods-section");
  const container = document.getElementById("home-moods");
  const quick = document.getElementById("home-filter-row");
  const clusters = renderState.clusters;
  section?.classList.toggle("hidden", clusters.length < 2);
  const buttons = [
    `<button class="mood-chip ${state.activeMood === "all" ? "active" : ""}" data-mood="all" type="button">All <span>${renderState.playable.length}</span></button>`,
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

function renderSearchResult(game, index, favorites) {
  const favorite = favorites.has(game.id);
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
      const favoritesList = readJson(keys.favorites, []);
      const favoritesSet = new Set(favoritesList);
      const recentIds = readJson(keys.recent, []);
      const counts = readJson(keys.playCounts, {});
      const lastPlayed = readJson(keys.lastPlayed, {});
      const playable = playableCatalog();
      const visible = visibleCatalog();
      const visibleSet = new Set(visible);
      const picks = dailyPicks();
      const clusters = moodClusters();
      const cardSnapshot = {
        favorites: favoritesSet,
        playCounts: counts,
        lastPlayed,
      };
      const renderState = {
        playable,
        picks,
        clusters,
        recentIds,
        lastPlayed,
      };
      const favorites = favoritesList
        .map(findGame)
        .filter((game) => game && visibleSet.has(game))
        .slice(0, 6);
      const recent = recentIds
        .map(findGame)
        .filter((game) => game && visibleSet.has(game))
        .slice(0, 6);
      const most = Object.entries(counts)
        .map(([id, count]) => ({
          game: findGame(id),
          count: Number(count) || 0,
        }))
        .filter(({ game, count }) => game && count > 0 && visibleSet.has(game))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
        .map(({ game }) => game);
      const allGames = promotableCatalog()
        .filter((game) => state.activeMood === "all" || visibleSet.has(game))
        .slice(0, INITIAL_ALL_GAMES_LIMIT);

      renderMoods(controller, renderState);

      // 1. Daily Picks
      renderCards(
        "daily-picks",
        picks,
        "",
        controller,
        "featured",
        cardSnapshot,
      );

      // 2. Continue Playing (Recent)
      const recentSection = document.getElementById("home-recent-section");
      if (recentSection)
        recentSection.classList.toggle("hidden", recent.length === 0);
      renderCards("home-recent", recent, "", controller, "", cardSnapshot);

      // 3. Your Reliable Hits (Most Played)
      const mostSection = document.getElementById("home-shelf-section");
      if (mostSection)
        mostSection.classList.toggle("hidden", most.length === 0);
      renderCards("home-shelf", most, "", controller, "", cardSnapshot);

      // 4. Saved on Shelf (Favorites)
      const favSection = document.getElementById("home-favorites-section");
      if (favSection)
        favSection.classList.toggle("hidden", favorites.length === 0);
      renderCards(
        "home-favorites",
        favorites,
        "",
        controller,
        "",
        cardSnapshot,
      );

      // 5. Verified Universe (All / Filtered)
      renderCards(
        "home-all-games",
        allGames,
        "No verified games found in this quadrant.",
        controller,
        "shelf",
        cardSnapshot,
      );

      renderPulse(renderState);
      renderHeroStats(renderState);
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
        container.innerHTML = "";
        return;
      }
      state.searchIndex = Math.max(
        0,
        Math.min(state.searchIndex, results.length - 1),
      );
      const favorites = new Set(readJson(keys.favorites, []));
      const visibleResults = results.slice(0, SEARCH_RESULTS_LIMIT);
      const capped =
        results.length > visibleResults.length
          ? ` · showing first ${visibleResults.length}`
          : "";
      container.innerHTML = `<div class="search-count"><strong>${results.length}</strong> result${results.length === 1 ? "" : "s"}${capped} · Enter launches, click opens details</div>${visibleResults.map((game, index) => renderSearchResult(game, index, favorites)).join("")}`;
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
