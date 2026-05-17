import {
  capsuleKeys,
  exportCapsule,
  importCapsule,
  keys,
  preferences,
  removeKeys,
  writeJson,
} from "../core/storage.js";
import { toast } from "./toast.js";

export function applyPreferences() {
  const prefs = preferences();
  document.body.classList.toggle("low-power", Boolean(prefs.lowPower));
  document.body.classList.toggle(
    "compact-cards",
    Boolean(prefs.compact) || prefs.density === "compact",
  );
  document.body.classList.toggle("reduce-motion", Boolean(prefs.reduceMotion));
  document.documentElement.dataset.bgIntensity = String(
    prefs.backgroundIntensity ?? 1,
  );
  document
    .getElementById("low-power-toggle")
    ?.setAttribute("aria-pressed", String(Boolean(prefs.lowPower)));
  document
    .getElementById("compact-toggle")
    ?.setAttribute("aria-pressed", String(Boolean(prefs.compact)));
  const lowPower = document.getElementById("setting-low-power");
  if (lowPower) lowPower.checked = Boolean(prefs.lowPower);
  const compact = document.getElementById("setting-compact-cards");
  if (compact) compact.checked = Boolean(prefs.compact);
  const reduceMotion = document.getElementById("setting-reduce-motion");
  if (reduceMotion) reduceMotion.checked = Boolean(prefs.reduceMotion);
  const density = document.getElementById("setting-density");
  if (density) density.value = prefs.density || "comfortable";
  const intensity = document.getElementById("setting-bg-intensity");
  if (intensity) intensity.value = String(prefs.backgroundIntensity ?? 1);
}

function updatePreference(patch) {
  writeJson(keys.preferences, { ...preferences(), ...patch });
  applyPreferences();
}

function setCapsuleStatus(message) {
  const status = document.getElementById("save-capsule-status");
  if (status) status.textContent = message;
}

function exportStratoData() {
  const blob = new globalThis.Blob([JSON.stringify(exportCapsule(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `strato-save-capsule-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setCapsuleStatus("Capsule exported.");
  toast("Save Capsule exported.");
}

export function bindSettings({ onUpdate } = {}) {
  applyPreferences();

  document.querySelectorAll(".settings-nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".settings-nav-btn")
        .forEach((item) => item.classList.remove("active"));
      document
        .querySelectorAll(".settings-panel")
        .forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document
        .getElementById(`settings-${button.dataset.settingsTab}`)
        ?.classList.add("active");
    });
  });

  document.getElementById("low-power-toggle")?.addEventListener("click", () => {
    const prefs = preferences();
    updatePreference({ lowPower: !prefs.lowPower });
    toast(!prefs.lowPower ? "Low Power Mode on." : "Low Power Mode off.");
    onUpdate?.();
  });

  document.getElementById("compact-toggle")?.addEventListener("click", () => {
    const prefs = preferences();
    updatePreference({ compact: !prefs.compact });
    toast(!prefs.compact ? "Compact cards on." : "Compact cards off.");
    onUpdate?.();
  });

  document
    .getElementById("setting-low-power")
    ?.addEventListener("change", (event) => {
      updatePreference({ lowPower: event.target.checked });
      onUpdate?.();
    });

  document
    .getElementById("setting-compact-cards")
    ?.addEventListener("change", (event) => {
      updatePreference({ compact: event.target.checked });
      onUpdate?.();
    });

  document
    .getElementById("setting-reduce-motion")
    ?.addEventListener("change", (event) => {
      updatePreference({ reduceMotion: event.target.checked });
    });

  document
    .getElementById("setting-density")
    ?.addEventListener("change", (event) => {
      updatePreference({
        density: event.target.value === "compact" ? "compact" : "comfortable",
        compact: event.target.value === "compact",
      });
      onUpdate?.();
    });

  document
    .getElementById("setting-bg-intensity")
    ?.addEventListener("input", (event) => {
      updatePreference({ backgroundIntensity: Number(event.target.value) });
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
    removeKeys(capsuleKeys);
    applyPreferences();
    toast("Local STRATO data reset.");
    onUpdate?.();
  });

  document
    .getElementById("btn-export-strato-data")
    ?.addEventListener("click", exportStratoData);

  document
    .getElementById("btn-import-strato-data")
    ?.addEventListener("click", () => {
      document.getElementById("import-strato-data-file")?.click();
    });

  document
    .getElementById("import-strato-data-file")
    ?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const result = importCapsule(parsed);
        if (!result.ok) {
          setCapsuleStatus(result.reason);
          toast("Import rejected.");
          return;
        }
        applyPreferences();
        setCapsuleStatus("Capsule imported.");
        toast("Save Capsule imported.");
        onUpdate?.();
      } catch {
        setCapsuleStatus("Import rejected. JSON could not be read.");
        toast("Import rejected.");
      }
    });

  document
    .getElementById("btn-reset-settings")
    ?.addEventListener("click", () => {
      removeKeys([keys.preferences]);
      applyPreferences();
      setCapsuleStatus("Settings reset.");
      toast("Settings reset.");
      onUpdate?.();
    });

  document
    .getElementById("btn-clear-strato-data")
    ?.addEventListener("click", () => {
      removeKeys(capsuleKeys);
      applyPreferences();
      setCapsuleStatus("Local STRATO data cleared.");
      toast("Local STRATO data cleared.");
      onUpdate?.();
    });
}
