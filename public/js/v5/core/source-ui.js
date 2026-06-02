export const DEFAULT_SOURCE_UI = "strato";

export const SOURCE_UI_PRESETS = {
  strato: {
    label: "STRATO",
    domain: "local",
    className: "",
    vars: {},
  },
  "frogiesarcade-win": {
    label: "Frogie's Arcade",
    domain: "frogiesarcade.win",
    className: "source-ui-frogiesarcade",
    vars: {
      "--source-ui-accent": "#8be36f",
      "--source-ui-secondary": "#f5d76e",
      "--source-ui-bg": "#07130b",
      "--source-ui-panel": "rgba(139, 227, 111, 0.08)",
      "--source-ui-border": "rgba(245, 215, 110, 0.28)",
    },
  },
  "lucideon-top": {
    label: "Lucideon",
    domain: "lucideon.top",
    className: "source-ui-lucideon",
    vars: {
      "--source-ui-accent": "#f4f1e8",
      "--source-ui-secondary": "#f59e0b",
      "--source-ui-bg": "#0b0b0d",
      "--source-ui-panel": "rgba(244, 241, 232, 0.07)",
      "--source-ui-border": "rgba(244, 241, 232, 0.2)",
    },
  },
  "1key-lol": {
    label: "1Key",
    domain: "1key.lol",
    className: "source-ui-1key",
    vars: {
      "--source-ui-accent": "#ffffff",
      "--source-ui-secondary": "#3b82f6",
      "--source-ui-bg": "#020204",
      "--source-ui-panel": "rgba(255, 255, 255, 0.055)",
      "--source-ui-border": "rgba(255, 255, 255, 0.22)",
    },
  },
  "deepseek-chat": {
    label: "DeepSeek Chat",
    domain: "chat.deepseek.com",
    className: "source-ui-deepseek",
    vars: {
      "--source-ui-accent": "#4d6bfe",
      "--source-ui-secondary": "#8fd3ff",
      "--source-ui-bg": "#070b18",
      "--source-ui-panel": "rgba(77, 107, 254, 0.08)",
      "--source-ui-border": "rgba(143, 211, 255, 0.22)",
    },
  },
  "selenite-cc": {
    label: "Selenite",
    domain: "selenite.cc",
    className: "source-ui-selenite",
    vars: {
      "--source-ui-accent": "#b6ff68",
      "--source-ui-secondary": "#9b5cff",
      "--source-ui-bg": "#060912",
      "--source-ui-panel": "rgba(182, 255, 104, 0.075)",
      "--source-ui-border": "rgba(155, 92, 255, 0.25)",
    },
  },
};

const SOURCE_UI_CLASSES = Object.values(SOURCE_UI_PRESETS)
  .map((preset) => preset.className)
  .filter(Boolean);

export function sourceUiOptions() {
  return Object.entries(SOURCE_UI_PRESETS).map(([id, preset]) => ({
    id,
    label: preset.label,
    domain: preset.domain,
  }));
}

export function normalizeSourceUi(value) {
  const id = String(value || "").trim();
  return SOURCE_UI_PRESETS[id] ? id : DEFAULT_SOURCE_UI;
}

export function applySourceUiPreference(
  value,
  body = globalThis.document?.body,
) {
  const id = normalizeSourceUi(value);
  const preset = SOURCE_UI_PRESETS[id];
  if (!body) return id;

  body.classList.remove(...SOURCE_UI_CLASSES);
  Object.keys(SOURCE_UI_PRESETS)
    .flatMap((key) => Object.keys(SOURCE_UI_PRESETS[key].vars))
    .forEach((name) => body.style.removeProperty(name));

  body.dataset.sourceUi = id;
  if (preset.className) body.classList.add(preset.className);
  Object.entries(preset.vars).forEach(([name, value]) => {
    body.style.setProperty(name, value);
  });
  return id;
}
