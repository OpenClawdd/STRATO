import { keys, preferences, removeKeys, writeJson } from "../core/storage.js";
import {
  applySourceUiPreference,
  normalizeSourceUi,
  sourceUiOptions,
} from "../core/source-ui.js";
import { toast } from "./toast.js";

const DEFAULT_ENGINE = "auto";
const DEFAULT_AUTOFALLBACK = true;
const DEFAULT_PANIC_KEY = "`";

function ensureGeneralDefaults() {
  const prefs = preferences();
  if (!["uv", "scramjet", "auto"].includes(String(prefs.proxyEngine || ""))) {
    prefs.proxyEngine = DEFAULT_ENGINE;
  }
  if (typeof prefs.autoFallback !== "boolean") {
    prefs.autoFallback = DEFAULT_AUTOFALLBACK;
  }
  if (
    typeof prefs.animations !== "boolean" &&
    typeof prefs.animations !== "undefined"
  ) {
    prefs.animations = true;
  }
  writeJson(keys.preferences, prefs);
  return prefs;
}

function applyPanicKeyDisplay(key) {
  const value = String(key || DEFAULT_PANIC_KEY).slice(0, 1);
  const top = document.getElementById("panic-key-display");
  const general = document.getElementById("setting-panic-key");
  const stealth = document.getElementById("stealth-panic-key");
  if (top) top.textContent = value;
  if (general) general.value = value;
  if (stealth) stealth.value = value;
}

function applyGeneralControls() {
  const prefs = ensureGeneralDefaults();
  const engine = document.getElementById("setting-engine");
  const fallback = document.getElementById("setting-autofallback");
  const particles = document.getElementById("setting-particles");
  const animations = document.getElementById("setting-animations");
  if (engine) engine.value = prefs.proxyEngine || DEFAULT_ENGINE;
  if (fallback) fallback.checked = prefs.autoFallback !== false;
  if (particles) {
    particles.checked =
      globalThis.localStorage?.getItem("strato-particles") === "true";
  }
  if (animations) {
    animations.checked = prefs.animations !== false;
  }
  applyPanicKeyDisplay(globalThis.localStorage?.getItem("strato-panic-key"));
  document.body.classList.toggle("reduced-motion", prefs.animations === false);
}

export function applyPreferences() {
  const prefs = preferences();
  const sourceUi = applySourceUiPreference(prefs.sourceUi);
  document.body.classList.toggle("low-power", Boolean(prefs.lowPower));
  document.body.classList.toggle("compact-cards", Boolean(prefs.compact));
  document
    .getElementById("low-power-toggle")
    ?.setAttribute("aria-pressed", String(Boolean(prefs.lowPower)));
  document
    .getElementById("compact-toggle")
    ?.setAttribute("aria-pressed", String(Boolean(prefs.compact)));
  const sourceUiSelect = document.getElementById("setting-source-ui");
  if (sourceUiSelect) sourceUiSelect.value = sourceUi;
  applyGeneralControls();
}

function renderSourceUiOptions() {
  const select = document.getElementById("setting-source-ui");
  if (!select || select.dataset.boundOptions === "true") return;
  select.dataset.boundOptions = "true";
  select.innerHTML = sourceUiOptions()
    .map(
      (option) =>
        `<option value="${option.id}">${option.label} - ${option.domain}</option>`,
    )
    .join("");
}

function setActiveSettingsTab(tab) {
  const next = String(tab || "general").trim() || "general";
  document.querySelectorAll(".settings-nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.settingsTab === next);
  });
  document.querySelectorAll(".settings-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `settings-${next}`);
  });
}

function bindSettingsTabs() {
  document.querySelectorAll(".settings-nav-btn").forEach((button) => {
    if (button.dataset.settingsBound === "true") return;
    button.dataset.settingsBound = "true";
    button.addEventListener("click", () =>
      setActiveSettingsTab(button.dataset.settingsTab),
    );
  });
}

export function bindSettings({ onUpdate } = {}) {
  bindSettingsTabs();
  renderSourceUiOptions();
  applyPreferences();

  document.getElementById("low-power-toggle")?.addEventListener("click", () => {
    const prefs = preferences();
    prefs.lowPower = !prefs.lowPower;
    writeJson(keys.preferences, prefs);
    applyPreferences();
    toast(prefs.lowPower ? "Low Power Mode on." : "Low Power Mode off.");
    onUpdate?.();
  });

  document.getElementById("compact-toggle")?.addEventListener("click", () => {
    const prefs = preferences();
    prefs.compact = !prefs.compact;
    writeJson(keys.preferences, prefs);
    applyPreferences();
    toast(prefs.compact ? "Compact cards on." : "Compact cards off.");
    onUpdate?.();
  });

  document
    .getElementById("setting-source-ui")
    ?.addEventListener("change", (event) => {
      const prefs = preferences();
      prefs.sourceUi = normalizeSourceUi(event.target.value);
      writeJson(keys.preferences, prefs);
      applyPreferences();
      toast("Source UI applied.");
      onUpdate?.();
    });

  document
    .getElementById("setting-engine")
    ?.addEventListener("change", (event) => {
      const prefs = ensureGeneralDefaults();
      prefs.proxyEngine = String(event.target.value || DEFAULT_ENGINE);
      writeJson(keys.preferences, prefs);
      toast(`Proxy engine: ${prefs.proxyEngine}.`);
      onUpdate?.();
    });

  document
    .getElementById("setting-autofallback")
    ?.addEventListener("change", (event) => {
      const prefs = ensureGeneralDefaults();
      prefs.autoFallback = Boolean(event.target.checked);
      writeJson(keys.preferences, prefs);
      toast(
        prefs.autoFallback
          ? "Auto fallback enabled."
          : "Auto fallback disabled.",
      );
      onUpdate?.();
    });

  document
    .getElementById("setting-particles")
    ?.addEventListener("change", (event) => {
      const enabled = Boolean(event.target.checked);
      globalThis.localStorage?.setItem(
        "strato-particles",
        enabled ? "true" : "false",
      );
      toast(enabled ? "Particles enabled." : "Particles disabled.");
      onUpdate?.();
    });

  document
    .getElementById("setting-animations")
    ?.addEventListener("change", (event) => {
      const prefs = ensureGeneralDefaults();
      prefs.animations = Boolean(event.target.checked);
      writeJson(keys.preferences, prefs);
      document.body.classList.toggle(
        "reduced-motion",
        prefs.animations === false,
      );
      toast(prefs.animations ? "Animations enabled." : "Animations reduced.");
      onUpdate?.();
    });

  document.getElementById("btn-change-panic")?.addEventListener("click", () => {
    const current =
      globalThis.localStorage?.getItem("strato-panic-key") || DEFAULT_PANIC_KEY;
    const next = window.prompt("Set panic key (single character):", current);
    if (!next) return;
    const value = String(next).trim().slice(0, 1);
    if (!value) return;
    globalThis.localStorage?.setItem("strato-panic-key", value);
    applyPanicKeyDisplay(value);
    toast(`Panic key set to "${value}".`);
    onUpdate?.();
  });

  document.getElementById("clear-recents")?.addEventListener("click", () => {
    removeKeys([keys.recent, keys.lastPlayed]);
    toast("Flight path cleared.");
    onUpdate?.();
  });

  document.getElementById("clear-favorites")?.addEventListener("click", () => {
    removeKeys([keys.favorites]);
    toast("Favorites cleared.");
    onUpdate?.();
  });

  document.getElementById("reset-local-data")?.addEventListener("click", () => {
    removeKeys([
      keys.favorites,
      keys.recent,
      keys.playCounts,
      keys.lastPlayed,
      keys.failures,
      keys.preferences,
    ]);
    applyPreferences();
    toast("Local STRATO data reset.");
    onUpdate?.();
  });
}
