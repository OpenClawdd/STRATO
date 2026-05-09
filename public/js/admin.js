/**
 * STRATO v6 — Mission Control (Admin UI)
 * Vanilla JS logic for Quarantine Bay and Source Hydra validation
 */

const authOverlay = document.getElementById("admin-auth");
const appContainer = document.getElementById("app");
const secretInput = document.getElementById("admin-secret-input");
const btnLogin = document.getElementById("btn-admin-login");
const authError = document.getElementById("admin-auth-error");
const btnLogout = document.getElementById("btn-logout");
const btnRefresh = document.getElementById("btn-refresh-bay");
const toastContainer = document.getElementById("toast-container");

let adminSecret = sessionStorage.getItem("admin_secret") || "";

// ── TOAST NOTIFICATIONS ──
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Trigger reflow
  toast.offsetHeight;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── AUTHENTICATION ──
function checkAuth() {
  if (adminSecret) {
    authOverlay.style.display = "none";
    appContainer.style.opacity = "1";
    appContainer.style.pointerEvents = "auto";
    loadDashboard();
  } else {
    authOverlay.style.display = "flex";
    appContainer.style.opacity = "0";
    appContainer.style.pointerEvents = "none";
  }
}

btnLogin.addEventListener("click", () => {
  const val = secretInput.value.trim();
  if (!val) return;
  adminSecret = val;
  sessionStorage.setItem("admin_secret", adminSecret);
  checkAuth();
});

secretInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnLogin.click();
});

btnLogout.addEventListener("click", () => {
  adminSecret = "";
  sessionStorage.removeItem("admin_secret");
  secretInput.value = "";
  checkAuth();
});

// ── API HELPERS ──
async function fetchAdmin(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
  });

  if (res.status === 401 || res.status === 403) {
    authError.style.display = "block";
    adminSecret = "";
    sessionStorage.removeItem("admin_secret");
    checkAuth();
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "API request failed");
  }
  return data;
}

// ── DATA LOADING ──
async function loadDashboard() {
  authError.style.display = "none";
  try {
    await Promise.all([loadPulse(), loadQuarantine()]);
  } catch (err) {
    if (err.message !== "Unauthorized") {
      showToast(err.message, "error");
    }
  }
}

async function loadPulse() {
  const data = await fetchAdmin("/api/admin/sources/pulse");
  document.getElementById("pulse-healthy").textContent =
    data.pulse.totalHealthy;
  document.getElementById("pulse-quarantine").textContent =
    data.pulse.totalQuarantined;
  document.getElementById("pulse-mirrors").textContent =
    data.pulse.totalMirrors;
}

async function loadQuarantine() {
  const grid = document.getElementById("quarantine-grid");
  const emptyState = document.getElementById("quarantine-empty");

  grid.innerHTML =
    "<div style='grid-column: 1/-1; text-align:center;'>Scanning bay...</div>";

  const data = await fetchAdmin("/api/admin/quarantine");
  grid.innerHTML = "";

  if (!data.items || data.items.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  data.items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "glass-card quarantine-card";

    // Attempt to parse out canonical info from comment if present, or just display raw
    let reasonHtml = "";
    if (item.comment) {
      reasonHtml = `<div class="q-reason">${item.comment}</div>`;
    }

    card.innerHTML = `
      <div class="q-meta">
        <span class="badge" style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${item.sourceType || "unknown"}</span>
        <span>${new Date(item.created_at || Date.now()).toLocaleDateString()}</span>
      </div>
      <h3 class="q-title">${item.title || "Untitled"}</h3>
      <div class="q-url">${item.normalizedUrl || item.rawUrl}</div>
      ${reasonHtml}
      <div class="q-actions">
        <button class="glass-btn btn-approve" data-id="${item.id}">Approve</button>
        <button class="glass-btn btn-mirror" data-id="${item.id}" style="background: rgba(255, 255, 255, 0.05);">Mark Mirror</button>
      </div>
    `;

    grid.appendChild(card);
  });

  // Bind actions
  grid.querySelectorAll(".btn-approve").forEach((btn) => {
    btn.addEventListener("click", () => approveSource(btn.dataset.id));
  });
  grid.querySelectorAll(".btn-mirror").forEach((btn) => {
    btn.addEventListener("click", () => markMirror(btn.dataset.id));
  });
}

// ── ACTIONS ──
async function approveSource(id) {
  try {
    await fetchAdmin(`/api/admin/quarantine/${id}/approve`, { method: "POST" });
    showToast("Trust Signal verified. Source promoted.", "success");
    loadDashboard(); // Refresh
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function markMirror(id) {
  const canonicalId = prompt("Enter Canonical Source ID for this mirror:");
  if (!canonicalId) return;

  try {
    await fetchAdmin(`/api/admin/quarantine/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ canonicalId }),
    });
    showToast("Mirror cluster updated.", "success");
    loadDashboard(); // Refresh
  } catch (err) {
    showToast(err.message, "error");
  }
}

btnRefresh.addEventListener("click", loadDashboard);

// ── INIT ──
checkAuth();
