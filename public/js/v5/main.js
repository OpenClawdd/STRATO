import { setGames } from "./core/state.js";
import { state } from "./core/state.js";
import { findGame, nameOf } from "./core/catalog.js";
import { normalizeGame } from "./core/catalog.js";
import { dismissHint, isHintDismissed } from "./core/storage.js";
import { createHomeController } from "./ui/home.js";
import { bindSettings } from "./ui/settings.js";

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

function renderFirstRunHint(home) {
  if (isHintDismissed("v5-search-anything")) return;
  const target = document.querySelector(".hideout-search");
  if (!target || document.getElementById("v5-first-run-hint")) return;
  const hint = document.createElement("div");
  hint.className = "first-run-hint";
  hint.id = "v5-first-run-hint";
  hint.innerHTML =
    '<span>Search anything. Launch instantly.</span><button type="button">Got it</button>';
  target.appendChild(hint);
  hint.querySelector("button")?.addEventListener("click", () => {
    dismissHint("v5-search-anything");
    hint.remove();
    home.render();
  });
}

function renderLaunchBay() {
  const bay = document.getElementById("launch-bay-empty");
  if (!bay) return;
  const game = findGame(state.launchBay.gameId);
  const title = game ? nameOf(game) : "The Launch Bay is ready.";
  const copy =
    state.launchBay.status === "loading"
      ? `Loading ${title}…`
      : state.launchBay.status === "failed"
        ? `Launch paused: ${state.launchBay.reason || "route unavailable"}.`
        : state.launchBay.status === "loaded"
          ? `${title} is running in the Launch Bay.`
          : "Search from Home, pick something, and launch.";
  bay.dataset.state = state.launchBay.status;
  bay.querySelector("h3").textContent = title;
  bay.querySelector("p").textContent = copy;
}

function bindNavigation(home) {
  document.querySelectorAll("[data-home-nav]").forEach((button) => {
    button.addEventListener("click", () =>
      setActiveView(button.dataset.homeNav),
    );
  });

  const search = document.getElementById("home-search");
  search?.addEventListener("input", (event) => {
    state.searchIndex = 0;
    home.search(event.target.value);
  });
  search?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      home.moveSearch(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      home.moveSearch(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      home.launchSelected();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.target.value = "";
      state.searchIndex = 0;
      home.search("");
    }
  });

  document
    .getElementById("surprise-me")
    ?.addEventListener("click", () => home.surprise());
  document
    .getElementById("home-favorites-action")
    ?.addEventListener("click", () =>
      document
        .getElementById("home-favorites-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  document
    .getElementById("home-recent-action")
    ?.addEventListener("click", () =>
      document
        .getElementById("home-recent-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.getElementById("game-sheet-overlay")?.remove();
      document.getElementById("launch-failure-overlay")?.remove();
    }
  });
}

function bindLaunchBay() {
  const iframe = document.getElementById("proxy-iframe");
  const body = document.querySelector(".browser-body");
  const sync = () => {
    body?.classList.toggle(
      "has-launch",
      Boolean(iframe?.src && iframe.src !== window.location.href),
    );
    body?.classList.remove("is-loading");
    renderLaunchBay();
  };
  iframe?.addEventListener("load", sync);
  sync();
}

export async function initOpenHome() {
  const response = await fetch("/assets/games.json", { cache: "no-store" });
  setGames(await response.json(), normalizeGame);
  const home = createHomeController();
  bindSettings({ onUpdate: () => home.render() });
  bindNavigation(home);
  bindLaunchBay();
  home.render();
  renderFirstRunHint(home);
  renderLaunchBay();
  window.addEventListener("strato-open-home-refresh", () => {
    home.render();
    renderLaunchBay();
  });
  window.STRATO_OPEN_HOME_RUNTIME_ACTIVE = true;
  window.STRATO_V5_HOME = home;
}
