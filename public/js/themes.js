/* ══════════════════════════════════════════════════════════
   STRATO v21 — Theme Studio Module
   Custom theme builder, presets, import/export, live preview,
   accent color management, CSS custom property updates
   Works with existing HTML elements
   ══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ── Accent color definitions ──
  const ACCENT_COLORS = {
    cyan: {
      primary: "#00e5ff",
      secondary: "#a855f7",
      glow: "rgba(0,229,255,0.20)",
    },
    purple: {
      primary: "#b388ff",
      secondary: "#6366f1",
      glow: "rgba(179,136,255,0.20)",
    },
    pink: {
      primary: "#ff80ab",
      secondary: "#ec4899",
      glow: "rgba(255,128,171,0.20)",
    },
    green: {
      primary: "#69f0ae",
      secondary: "#10b981",
      glow: "rgba(105,240,174,0.20)",
    },
    orange: {
      primary: "#ffab40",
      secondary: "#f97316",
      glow: "rgba(255,171,64,0.20)",
    },
    red: {
      primary: "#ff5252",
      secondary: "#dc2626",
      glow: "rgba(255,82,82,0.20)",
    },
    gold: {
      primary: "#ffd740",
      secondary: "#f59e0b",
      glow: "rgba(255,215,64,0.20)",
    },
  };

  // ── Theme presets ──
  const PRESETS = {
    default: {
      accent: "#00e5ff",
      accentSecondary: "#a855f7",
      bg: "#06060e",
      glass: 6,
      blur: 24,
      bgAnimation: "particles",
      accentName: "cyan",
    },
    midnight: {
      accent: "#b388ff",
      accentSecondary: "#1e1b4b",
      bg: "#030712",
      glass: 8,
      blur: 30,
      bgAnimation: "none",
      accentName: "purple",
    },
    ember: {
      accent: "#ffab40",
      accentSecondary: "#ef4444",
      bg: "#0c0606",
      glass: 6,
      blur: 24,
      bgAnimation: "particles",
      accentName: "orange",
    },
    matrix: {
      accent: "#69f0ae",
      accentSecondary: "#064e3b",
      bg: "#020c02",
      glass: 5,
      blur: 20,
      bgAnimation: "matrix",
      accentName: "green",
    },
    sakura: {
      accent: "#ff80ab",
      accentSecondary: "#a855f7",
      bg: "#0c060a",
      glass: 7,
      blur: 28,
      bgAnimation: "particles",
      accentName: "pink",
    },
    solar: {
      accent: "#ffd740",
      accentSecondary: "#ffab40",
      bg: "#0c0a04",
      glass: 6,
      blur: 24,
      bgAnimation: "none",
      accentName: "gold",
    },
    crimson: {
      accent: "#ff5252",
      accentSecondary: "#dc2626",
      bg: "#0c0404",
      glass: 6,
      blur: 24,
      bgAnimation: "particles",
      accentName: "red",
    },
    void: {
      accent: "#b388ff",
      accentSecondary: "#6366f1",
      bg: "#000000",
      glass: 3,
      blur: 16,
      bgAnimation: "none",
      accentName: "purple",
    },
  };

  let currentTheme = { ...PRESETS.default };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── Apply a theme config object to CSS custom properties ──
  function applyTheme(theme) {
    const root = document.documentElement;

    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-secondary", theme.accentSecondary);
    root.style.setProperty("--accent-dim", hexToRgba(theme.accent, 0.1));
    root.style.setProperty("--accent-glow", hexToRgba(theme.accent, 0.2));
    root.style.setProperty("--accent-border", hexToRgba(theme.accent, 0.3));
    root.style.setProperty("--accent-text", hexToRgba(theme.accent, 0.9));
    root.style.setProperty(
      "--gradient-accent",
      `linear-gradient(135deg, ${theme.accent}, ${theme.accentSecondary})`,
    );
    root.style.setProperty("--bg-void", theme.bg);
    root.style.setProperty(
      "--glass-heavy",
      `rgba(255,255,255,${theme.glass / 100})`,
    );
    root.style.setProperty("--blur", `blur(${theme.blur}px) saturate(1.4)`);

    if (theme.accentName) {
      root.setAttribute("data-accent", theme.accentName);
      root.setAttribute("data-theme", theme.accentName);
      localStorage.setItem("strato-accent", theme.accentName);
    }

    currentTheme = { ...theme };
    localStorage.setItem("strato-custom-theme", JSON.stringify(theme));
    updateAccentButtons();
    updateSliders();
  }

  // ── Apply accent color by name ──
  function applyAccentByName(name) {
    const color = ACCENT_COLORS[name];
    if (!color) return;

    const root = document.documentElement;
    root.setAttribute("data-accent", name);
    root.setAttribute("data-theme", name);
    localStorage.setItem("strato-accent", name);

    currentTheme.accent = color.primary;
    currentTheme.accentSecondary = color.secondary;
    currentTheme.accentName = name;

    root.style.setProperty("--accent", color.primary);
    root.style.setProperty("--accent-secondary", color.secondary);
    root.style.setProperty("--accent-dim", hexToRgba(color.primary, 0.1));
    root.style.setProperty("--accent-glow", hexToRgba(color.primary, 0.2));
    root.style.setProperty("--accent-border", hexToRgba(color.primary, 0.3));
    root.style.setProperty("--accent-text", hexToRgba(color.primary, 0.9));
    root.style.setProperty(
      "--gradient-accent",
      `linear-gradient(135deg, ${color.primary}, ${color.secondary})`,
    );

    localStorage.setItem("strato-custom-theme", JSON.stringify(currentTheme));
    updateAccentButtons();
  }

  // ── Update accent color button active states ──
  function updateAccentButtons() {
    document
      .querySelectorAll(
        ".swatch[data-color], #accent-color-options .glass-pill[data-accent]",
      )
      .forEach((btn) => {
        const colorName = btn.dataset.color || btn.dataset.accent;
        btn.classList.toggle("active", colorName === currentTheme.accentName);
      });
  }

  // ── Update slider positions ──
  function updateSliders() {
    const glassSlider =
      document.getElementById("setting-glass-opacity") ||
      document.getElementById("theme-glass-opacity");
    const blurSlider =
      document.getElementById("setting-blur") ||
      document.getElementById("theme-blur-amount");
    const bgAnimSelect =
      document.getElementById("setting-bg-animation") ||
      document.getElementById("theme-bg-animation");

    if (glassSlider) glassSlider.value = currentTheme.glass / 100;
    if (blurSlider) blurSlider.value = currentTheme.blur;
    if (bgAnimSelect && currentTheme.bgAnimation)
      bgAnimSelect.value = currentTheme.bgAnimation;
  }

  // ── Export theme as base64-encoded JSON ──
  function exportTheme() {
    const code = btoa(
      unescape(encodeURIComponent(JSON.stringify(currentTheme))),
    );
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    if (window.showToast)
      window.showToast("Theme code copied to clipboard", "accent");
    return code;
  }

  // ── Import theme from base64-encoded JSON ──
  function importTheme() {
    const code = prompt("Paste your theme code:");
    if (!code || !code.trim()) return false;
    try {
      const theme = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (theme.accent && theme.bg) {
        applyTheme(theme);
        if (window.showToast)
          window.showToast("Theme imported successfully", "accent");
        return true;
      }
    } catch (e) {
      if (window.showToast) window.showToast("Invalid theme code", "error");
    }
    return false;
  }

  // ── Load gallery themes from API ──
  async function loadGallery() {
    try {
      const resp = await fetch("/api/themes");
      if (!resp.ok) return [];
      const data = await resp.json();
      renderGallery(data.themes || data);
      return data.themes || data;
    } catch (e) {
      console.error("[Themes] Load gallery error:", e);
      return [];
    }
  }

  // ── Render gallery themes ──
  function renderGallery(themes) {
    const container =
      document.getElementById("themes-gallery") ||
      document.getElementById("theme-gallery");
    if (!container) return;
    container.innerHTML = "";
    themes.forEach((theme) => {
      const card = document.createElement("div");
      card.className = "theme-gallery-card glass-card";
      card.style.cssText = `cursor:pointer;padding:12px;border-left:3px solid ${theme.accent || "#00e5ff"}`;
      card.innerHTML = `
        <div style="font-weight:600;margin-bottom:4px">${escapeHtml(theme.name || "Custom")}</div>
        <div style="font-size:var(--text-xs);color:var(--fg-faint)">by ${escapeHtml(theme.author || "Unknown")}</div>
      `;
      card.addEventListener("click", () => applyTheme(theme));
      container.appendChild(card);
    });
  }

  // ── Share theme to gallery ──
  async function shareTheme(name) {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrf = csrfMeta ? csrfMeta.content : "";
    try {
      const resp = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ name: name || "My Theme", ...currentTheme }),
      });
      if (resp.ok) {
        if (window.showToast)
          window.showToast("Theme shared to gallery", "accent");
        loadGallery();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ── Initialize event listeners ──
  function init() {
    // Accent color swatches
    document.querySelectorAll(".swatch[data-color]").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyAccentByName(btn.dataset.color);
      });
    });

    // Also handle the #accent-color-options format
    document
      .querySelectorAll("#accent-color-options .glass-pill[data-accent]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          applyAccentByName(btn.dataset.accent);
        });
      });

    // Glass opacity slider
    const glassSlider =
      document.getElementById("setting-glass-opacity") ||
      document.getElementById("theme-glass-opacity");
    if (glassSlider) {
      glassSlider.addEventListener("input", () => {
        currentTheme.glass = Math.round(parseFloat(glassSlider.value) * 100);
        applyTheme(currentTheme);
      });
    }

    // Blur slider
    const blurSlider =
      document.getElementById("setting-blur") ||
      document.getElementById("theme-blur-amount");
    if (blurSlider) {
      blurSlider.addEventListener("input", () => {
        currentTheme.blur = parseInt(blurSlider.value);
        applyTheme(currentTheme);
      });
    }

    // BG animation select
    const bgAnimSelect =
      document.getElementById("setting-bg-animation") ||
      document.getElementById("theme-bg-animation");
    if (bgAnimSelect) {
      bgAnimSelect.addEventListener("change", () => {
        currentTheme.bgAnimation = bgAnimSelect.value;
        applyTheme(currentTheme);
      });
    }

    // Preset cards
    document.querySelectorAll(".theme-preset-card").forEach((card) => {
      card.addEventListener("click", () => {
        const preset = card.dataset.preset;
        if (PRESETS[preset]) {
          document
            .querySelectorAll(".theme-preset-card")
            .forEach((c) => c.classList.remove("active"));
          card.classList.add("active");
          applyTheme(PRESETS[preset]);
        }
      });
    });

    // Export/import/share buttons
    document
      .getElementById("btn-export-theme")
      ?.addEventListener("click", () => exportTheme());
    document
      .getElementById("btn-import-theme")
      ?.addEventListener("click", () => importTheme());
    document
      .getElementById("btn-share-theme")
      ?.addEventListener("click", () => {
        const name = prompt("Enter a name for your theme:");
        if (name) shareTheme(name);
      });

    // Load saved custom theme
    const savedTheme = localStorage.getItem("strato-custom-theme");
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme);
        if (theme.accent && theme.bg) applyTheme(theme);
      } catch (e) {}
    } else {
      const savedAccent = localStorage.getItem("strato-accent");
      if (savedAccent && ACCENT_COLORS[savedAccent])
        applyAccentByName(savedAccent);
    }

    // Load gallery on init
    loadGallery();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.StratoThemes = {
    applyTheme,
    applyAccentByName,
    exportTheme,
    importTheme,
    loadGallery,
    shareTheme,
    PRESETS,
    ACCENT_COLORS,
    getCurrent: () => ({ ...currentTheme }),
  };
})();
