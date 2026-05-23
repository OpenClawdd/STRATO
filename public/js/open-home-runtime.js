(function () {
  "use strict";
  window.STRATO_OPEN_HOME_RUNTIME_ACTIVE = true;
  const VIEWS = ["home", "arcade", "browser", "hub", "chat", "ai", "settings"];

  function switchView(viewName) {
    if (!VIEWS.includes(viewName)) return;
    document
      .querySelectorAll(".view")
      .forEach((view) => view.classList.remove("active"));
    document.getElementById(`view-${viewName}`)?.classList.add("active");
    document
      .querySelectorAll(".nav-btn")
      .forEach((button) =>
        button.classList.toggle("active", button.dataset.view === viewName),
      );
    if (viewName === "chat") window.StratoChat?.init?.();
  }

  function showToast(message, type = "default") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    container.appendChild(node);
    window.setTimeout(() => {
      node.classList.add("fade-out");
      window.setTimeout(() => node.remove(), 300);
    }, 3000);
  }

  function revealShell() {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("fade-out");
      window.setTimeout(() => splash.remove(), 500);
    }
    document.getElementById("app")?.classList.remove("hidden");
  }

  function bindShell() {
    window.showToast = window.showToast || showToast;
    window.STRATO_TOAST = window.STRATO_TOAST || showToast;
    window.STRATO_NOTIFY =
      window.STRATO_NOTIFY ||
      ((message, type = "info") => showToast(message, type));
    window.STRATO_XP =
      window.STRATO_XP ||
      ((actionType) => window.StratoProfile?.addXPAction?.(actionType));
    window.STRATO_NAVIGATE =
      window.STRATO_NAVIGATE ||
      ((url) => {
        const targetUrl = String(url || "").trim();
        if (!targetUrl) return;
        const input = document.getElementById("url-input");
        if (input) input.value = targetUrl;
        switchView("browser");
        if (typeof window.STRATO_NAVIGATE_PROXY === "function") {
          window.STRATO_NAVIGATE_PROXY(targetUrl);
        }
      });
    window.STRATO_CLOAK =
      window.STRATO_CLOAK ||
      ((key) => {
        const select = document.getElementById("cloak-select");
        if (select) select.value = key;
      });
    window.STRATO_SWITCH_VIEW = switchView;

    document.querySelectorAll(".nav-btn").forEach((button) => {
      if (button.dataset.shellBound === "true") return;
      button.dataset.shellBound = "true";
      button.addEventListener("click", () => {
        if (button.dataset.view) switchView(button.dataset.view);
      });
    });
    document.addEventListener("keydown", (event) => {
      if (
        event.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        switchView("home");
        document.getElementById("home-search")?.focus();
      }
    });
  }

  function showBootFailure(error) {
    console.error("[STRATO v5.01] Home runtime failed to boot:", error);
    window.STRATO_OPEN_HOME_RUNTIME_FAILED = true;
    const chip = document.getElementById("catalog-status-chip");
    if (chip) chip.textContent = "Home runtime needs attention";
    const results = document.getElementById("home-search-results");
    if (results)
      results.innerHTML =
        '<div class="hideout-empty"><strong>Home runtime did not finish booting.</strong><button class="glass-btn" type="button" onclick="window.location.reload()">Reload STRATO</button></div>';
    window.dispatchEvent(
      new CustomEvent("strato-open-home-failed", {
        detail: { message: error?.message || String(error) },
      }),
    );
  }

  async function boot() {
    try {
      bindShell();
      const { initOpenHome } = await import("/js/v5/main.js");
      await initOpenHome();
      revealShell();
    } catch (error) {
      showBootFailure(error);
      revealShell();
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
