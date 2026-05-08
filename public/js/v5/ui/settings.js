import { keys, preferences, removeKeys, writeJson } from "../core/storage.js";
import { toast } from "./toast.js";

export function applyPreferences() {
  const prefs = preferences();
  document.body.classList.toggle("low-power", Boolean(prefs.lowPower));
  document.body.classList.toggle("compact-cards", Boolean(prefs.compact));
  document
    .getElementById("low-power-toggle")
    ?.setAttribute("aria-pressed", String(Boolean(prefs.lowPower)));
  document
    .getElementById("compact-toggle")
    ?.setAttribute("aria-pressed", String(Boolean(prefs.compact)));
}

export function bindSettings({ onUpdate } = {}) {
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
