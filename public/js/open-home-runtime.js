(function () {
  "use strict";
  window.STRATO_OPEN_HOME_RUNTIME_ACTIVE = true;

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
      const { initOpenHome } = await import("/js/v5/main.js");
      await initOpenHome();
    } catch (error) {
      showBootFailure(error);
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
