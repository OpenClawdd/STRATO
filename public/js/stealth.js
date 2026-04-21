"use strict";
/* ═══════════════════════════════════════════════════════════════
   STRATO Stealth Mode v3.0 — One-Click Disguise System
   Adapted for the Technozen UI shell (v3.0)

   Transforms the entire STRATO dashboard into Google Classroom
   or Google Drive appearance for plausible deniability.

   Activation: Ctrl+Shift+D or click the Stealth button in topbar.
   ═══════════════════════════════════════════════════════════════ */

(function () {

        /* ─────────────────────────────────────
           CONSTANTS
           ───────────────────────────────────── */
        const STORAGE_KEY = "strato_stealth";
        const ORIGINAL_TITLE_KEY = "strato_original_title";
        const CLASSROOM_CSS = "stealth-classroom.css";
        const DRIVE_CSS = "stealth-drive.css";

        const FAVICON_CLASSROOM =
                "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 87.3 78'><path fill='%234285F4' d='m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z'/><path fill='%230F9D58' d='m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z'/><path fill='%23F4B400' d='m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 13.8z'/><path fill='%23DB4437' d='m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z'/><path fill='%230F9D58' d='m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z'/></svg>";
        const FAVICON_DRIVE =
                "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 87.3 78'><path fill='%234285F4' d='m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z'/><path fill='%230F9D58' d='m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z'/><path fill='%23F4B400' d='m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 13.8z'/><path fill='%23DB4437' d='m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z'/><path fill='%230F9D58' d='m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z'/></svg>";

        const GOOGLE_FONTS =
                "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500&family=Roboto:wght@400;500&display=swap";

        /* Navigation label mapping — v3.0 uses .nav-item[data-view] .nav-label */
        const NAV_LABELS = {
                home:      { classroom: { text: "Stream", icon: "📰" }, drive: { text: "My Drive", icon: "📁" } },
                grid:      { classroom: { text: "Classwork", icon: "📋" }, drive: { text: "Shared with me", icon: "👥" } },
                watch:     { classroom: { text: "People", icon: "👥" }, drive: { text: "Recent", icon: "🕐" } },
                listen:    { classroom: { text: "Grades", icon: "📊" }, drive: { text: "Starred", icon: "⭐" } },
                browser:   { classroom: { text: "Calendar", icon: "📅" }, drive: { text: "Computers", icon: "💻" } },
                ai:        { classroom: { text: "Assignments", icon: "📝" }, drive: { text: "Google Docs", icon: "📄" } },
                settings:  { classroom: { text: "Settings", icon: "⚙️" }, drive: { text: "Settings", icon: "⚙️" } },
        };

        /* Section title mapping — v3.0 uses .section-header h2 */
        const SECTION_TITLES = {
                classroom: { grid: "Classwork", watch: "Resources", listen: "Resources", ai: "Assignments" },
                drive:     { grid: "My Drive", watch: "Shared Files", listen: "Shared Files", ai: "Documents" },
        };

        /* Home hero text — v3.0 uses .hero-section h1 and .hero-sub */
        const HERO_TEXT = {
                classroom: {
                        title: "Stream",
                        desc: "Welcome back! Check the latest announcements and updates below.",
                },
                drive: {
                        title: "New",
                        desc: "Create new files or upload existing ones to your Google Drive.",
                },
        };

        /* Quick card replacements — v3.0 uses .quick-card > .card-icon + .card-info > h3/p */
        const QUICK_CARDS = {
                classroom: [
                        { icon: "📚", title: "Course Materials", desc: "View all posted materials" },
                        { icon: "📝", title: "Assignments", desc: "Due this week" },
                        { icon: "📊", title: "Grades", desc: "Check your scores" },
                        { icon: "💻", title: "Resources", desc: "Helpful links" },
                ],
                drive: [
                        { icon: "📂", title: "New folder", desc: "Organize your files" },
                        { icon: "📤", title: "Upload files", desc: "Add files to Drive" },
                        { icon: "📝", title: "Google Docs", desc: "Create a document" },
                        { icon: "📊", title: "Google Sheets", desc: "Create a spreadsheet" },
                ],
        };

        /* Pseudo-date tags for game tiles — v3.0 uses .tile-category */
        const DUE_DATES = [
                "Due Jan 15", "Due Jan 18", "Due Jan 22", "Due Jan 25",
                "Due Feb 1", "Due Feb 5", "Assigned", "Due Feb 12",
                "Due Feb 15", "Submitted", "Due Feb 20", "Assigned",
        ];
        const DRIVE_DATES = [
                "Modified Jan 15", "Modified Jan 18", "Modified Jan 22", "Modified Jan 25",
                "Modified Feb 1", "Modified Feb 5", "Owner", "Modified Feb 12",
                "Modified Feb 15", "Shared", "Modified Feb 20", "Owner",
        ];

        /* Media card tag replacements — v3.0 uses .media-info p */
        const MEDIA_TAGS_CLASSROOM = ["Resource", "Attachment", "Material", "Handout", "Reading", "Resource"];
        const MEDIA_TAGS_DRIVE = ["PDF", "Google Doc", "Spreadsheet", "Image", "Video", "Folder"];

        const SEARCH_PLACEHOLDERS = { classroom: "Search classes...", drive: "Search in Drive..." };
        const TAB_TITLES = { classroom: "Stream — Google Classroom", drive: "My Drive — Google Drive" };

        /* ─────────────────────────────────────
           STATE
           ───────────────────────────────────── */
        let currentMode = "off";
        let classroomLink = null;
        let driveLink = null;
        let googleFontsLink = null;
        let originalFaviconHref = "";

        const originals = new WeakMap();


        /* ─────────────────────────────────────
           FEATURE 1 — ABOUT:BLANK CLOAKING
           ───────────────────────────────────── */
        function initCloaking() {
                if (window.top === window) {
                        const enterBtn = document.getElementById("splash-enter");
                        if (enterBtn) {
                                enterBtn.style.display = "inline-block";
                                enterBtn.addEventListener("click", () => {
                                        let win = window.open('about:blank', '_blank');
                                        if (!win) {
                                                alert("Pop-ups must be allowed to use Cloaked Mode.");
                                                return;
                                        }
                                        let doc = win.document;
                                        doc.open();
                                        doc.write(`<!DOCTYPE html><html><head><title>Google Classroom</title><link rel="icon" href="${FAVICON_CLASSROOM}"><style>body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; } iframe { border: none; width: 100%; height: 100%; }</style></head><body><iframe src="${window.location.href}"></iframe></body></html>`);
                                        doc.close();
                                        window.location.replace('https://classroom.google.com');
                                });
                        }
                }
        }

        /* ─────────────────────────────────────
           FEATURE 2 — PANIC BUTTON
           ───────────────────────────────────── */
        function executePanic() {
                let panicUrl = "https://classroom.google.com";
                try {
                        const saved = localStorage.getItem("strato_panic_url");
                        if (saved) panicUrl = saved;
                } catch (e) {}

                window.top.location.replace(panicUrl);
        }

        function initPanicButton() {
                window.addEventListener("keydown", function(e) {
                        if (e.key === "Escape") executePanic();
                }, true);

                let lastTap = 0;
                window.addEventListener("touchend", function(e) {
                        let currentTime = new Date().getTime();
                        let tapLength = currentTime - lastTap;
                        if (tapLength < 300 && tapLength > 0) {
                                executePanic();
                                e.preventDefault();
                        }
                        lastTap = currentTime;
                }, { passive: false, capture: true });

                const pBtn = document.getElementById("panic-btn");
                if (pBtn) pBtn.addEventListener("click", executePanic);
        }

        /* ─────────────────────────────────────
           FEATURE 3 — TAB DISGUISE AUTO-ENABLE
           ───────────────────────────────────── */
        function initAutoDisguise() {
                const observer = new MutationObserver((mutations) => {
                        let isAutoCloakEnabled = false;
                        try { isAutoCloakEnabled = localStorage.getItem("strato_auto_cloak_game") === "true"; } catch (e) {}

                        if (!isAutoCloakEnabled) return;

                        mutations.forEach(m => {
                                if (m.target.id === 'game-overlay') {
                                        const isGameActive = m.target.style.display === 'flex' || m.target.classList.contains('active');
                                        if (isGameActive && currentMode === "off") {
                                                applyStealthMode("classroom");
                                                try { sessionStorage.setItem("strato_auto_cloaked", "true"); } catch(e){}
                                        } else if (!isGameActive) {
                                                let didAutoCloak = false;
                                                try { didAutoCloak = sessionStorage.getItem("strato_auto_cloaked") === "true"; } catch(e){}
                                                if (didAutoCloak && currentMode !== "off") {
                                                        applyStealthMode("off");
                                                        try { sessionStorage.removeItem("strato_auto_cloaked"); } catch(e){}
                                                }
                                        }
                                }
                        });
                });

                document.addEventListener("DOMContentLoaded", () => {
                        const overlay = document.getElementById("game-overlay");
                        if (overlay) observer.observe(overlay, { attributes: true, attributeFilter: ['style', 'class'] });
                        else observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
                });
        }

        /* ─────────────────────────────────────
           FEATURE 4 — HISTORY POISONING
           ───────────────────────────────────── */
        function initHistoryPoisoning() {
                let isHistoryPoisoningEnabled = false;
                try { isHistoryPoisoningEnabled = localStorage.getItem("strato_history_poison") === "true"; } catch (e) {}

                if (!isHistoryPoisoningEnabled) return;

                for (let i = 0; i < 5; i++) {
                        history.pushState({ stratoPoison: true }, "Google Classroom", location.href);
                }

                window.addEventListener("popstate", (e) => {
                        if (e.state && e.state.stratoPoison) executePanic();
                });
        }

        /* ─────────────────────────────────────
           FEATURE 5 — IDLE DETECTION
           ───────────────────────────────────── */
        function initIdleDetection() {
                let isIdleEnabled = false;
                try { isIdleEnabled = localStorage.getItem("strato_idle_detection") === "true"; } catch (e) {}

                if (!isIdleEnabled) return;

                let idleTimer;
                let warningTimer;
                const IDLE_LIMIT = 90 * 1000;
                const WARNING_LIMIT = 80 * 1000;
                let warningToast = null;

                function showWarning() {
                        if (!warningToast) {
                                warningToast = document.createElement("div");
                                warningToast.style.cssText = "position:fixed; bottom:20px; right:20px; background:rgba(0,0,0,0.8); color:#fff; padding:12px 16px; border-radius:8px; z-index:99999; display:flex; align-items:center; gap:12px; font-family:monospace; font-size:12px; border:1px solid #333;";
                                const msg = document.createElement("span"); msg.textContent = "Auto-hiding in 10s...";
                                const btn = document.createElement("button"); btn.textContent = "Cancel"; btn.style.cssText = "background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-family:inherit;";
                                btn.addEventListener("click", resetIdle);
                                warningToast.appendChild(msg); warningToast.appendChild(btn); document.body.appendChild(warningToast);
                        }
                        warningToast.style.display = "flex";
                }

                function hideWarning() {
                        if (warningToast) warningToast.style.display = "none";
                }

                function resetIdle() {
                        clearTimeout(idleTimer); clearTimeout(warningTimer); hideWarning();
                        warningTimer = setTimeout(showWarning, WARNING_LIMIT);
                        idleTimer = setTimeout(() => executePanic(), IDLE_LIMIT);
                }

                ["mousemove", "keydown", "touchstart", "scroll", "click"].forEach(evt => {
                        window.addEventListener(evt, resetIdle, { passive: true, capture: true });
                });
                resetIdle();
        }

        /* ─────────────────────────────────────
           SETTINGS UI LISTENERS
           ───────────────────────────────────── */
        function initSettingsListeners() {
                function bindToggle(id, key, defaultVal) {
                        const el = document.getElementById(id);
                        if (!el) return;
                        let stored = null;
                        try { stored = localStorage.getItem(key); } catch(e){}
                        const isOn = stored !== null ? stored === 'true' : defaultVal;
                        if (isOn) el.classList.add('on');
                        else el.classList.remove('on');

                        el.addEventListener('click', () => {
                                el.classList.toggle('on');
                                try { localStorage.setItem(key, el.classList.contains('on')); } catch(e){}
                        });
                }

                bindToggle('setting-history', 'strato_history_poison', false);
                bindToggle('setting-idle', 'strato_idle_detection', false);
                bindToggle('setting-auto-cloak-game', 'strato_auto_cloak_game', false);
                bindToggle('setting-auto-cloak', 'strato_auto_cloak', true);

                const cloakSelect = document.getElementById('setting-cloak');
                if (cloakSelect) {
                        try { cloakSelect.value = localStorage.getItem('strato_cloak') || 'default'; } catch(e){}
                        cloakSelect.addEventListener('change', (e) => {
                                try { localStorage.setItem('strato_cloak', e.target.value); } catch(e){}
                                applyTabCloak(e.target.value);
                        });
                }

                const stealthSelect = document.getElementById('setting-stealth');
                if (stealthSelect) {
                        try { stealthSelect.value = localStorage.getItem(STORAGE_KEY) || 'off'; } catch(e){}
                        stealthSelect.addEventListener('change', (e) => {
                                applyStealthMode(e.target.value);
                        });
                }

                const panicUrl = document.getElementById('setting-panic-url');
                if (panicUrl) {
                        try { panicUrl.value = localStorage.getItem('strato_panic_url') || 'https://classroom.google.com'; } catch(e){}
                        panicUrl.addEventListener('change', (e) => {
                                try { localStorage.setItem('strato_panic_url', e.target.value); } catch(e){}
                        });
                }
        }

        /* ─────────────────────────────────────
           TAB CLOAK ENGINE
           ───────────────────────────────────── */
        function applyTabCloak(preset) {
                if (currentMode !== 'off') return;

                const favicon = document.querySelector('link[rel="icon"]');
                switch (preset) {
                        case 'drive':
                                document.title = 'My Drive - Google Drive';
                                if (favicon) favicon.href = FAVICON_DRIVE;
                                break;
                        case 'classroom':
                                document.title = 'Home - Google Classroom';
                                if (favicon) favicon.href = FAVICON_CLASSROOM;
                                break;
                        default:
                                document.title = 'STRATO';
                                if (favicon && originalFaviconHref) favicon.href = originalFaviconHref;
                }
        }

        function initVisibilityCloak() {
                document.addEventListener('visibilitychange', () => {
                        let autoCloak = true;
                        try { autoCloak = localStorage.getItem('strato_auto_cloak') !== 'false'; } catch(e){}

                        if (autoCloak && document.hidden) {
                                if (currentMode !== 'off') return;
                                document.title = 'Google Classroom';
                                const favicon = document.querySelector('link[rel="icon"]');
                                if (favicon) favicon.href = FAVICON_CLASSROOM;
                        } else if (!document.hidden) {
                                if (currentMode !== 'off') return;
                                let preset = 'default';
                                try { preset = localStorage.getItem('strato_cloak') || 'default'; } catch(e){}
                                applyTabCloak(preset);
                        }
                });
        }

        /* ─────────────────────────────────────
           HELPERS
           ───────────────────────────────────── */

        function $(sel, ctx) { return (ctx || document).querySelector(sel); }
        function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

        function storeOriginal(el) {
                if (el && !originals.has(el)) {
                        originals.set(el, el.textContent.trim());
                        el.setAttribute("data-stealth-original", el.textContent.trim());
                }
        }

        function restoreOriginal(el) {
                if (!el) return;
                const orig = originals.get(el);
                if (orig !== undefined) el.textContent = orig;
        }

        function pickByIndex(arr, index) { return arr[index % arr.length]; }

        function loadCSS(href) {
                let link = $('link[data-stealth-css="' + href + '"]');
                if (!link) {
                        link = document.createElement("link");
                        link.rel = "stylesheet";
                        link.href = href;
                        link.setAttribute("data-stealth-css", href);
                        link.disabled = true;
                        document.head.appendChild(link);
                }
                return link;
        }

        function loadGoogleFonts() {
                if ($('link[data-stealth-google-fonts]')) return;
                googleFontsLink = document.createElement("link");
                googleFontsLink.rel = "stylesheet";
                googleFontsLink.href = GOOGLE_FONTS;
                googleFontsLink.setAttribute("data-stealth-google-fonts", "true");
                document.head.appendChild(googleFontsLink);
        }

        function unloadGoogleFonts() {
                if (googleFontsLink) { googleFontsLink.remove(); googleFontsLink = null; }
        }

        /* ─────────────────────────────────────
           CYCLE MODE
           ───────────────────────────────────── */

        function cycleMode() {
                if (currentMode === "off") applyStealthMode("classroom");
                else if (currentMode === "classroom") applyStealthMode("drive");
                else applyStealthMode("off");
        }

        /* ─────────────────────────────────────
           APPLY STEALTH MODE (CORE)
           ───────────────────────────────────── */

        function applyStealthMode(mode) {
                currentMode = mode;

                /* Toggle CSS */
                classroomLink = loadCSS(CLASSROOM_CSS);
                driveLink = loadCSS(DRIVE_CSS);
                classroomLink.disabled = mode !== "classroom";
                driveLink.disabled = mode !== "drive";

                /* Body data attribute */
                if (mode === "off") document.body.removeAttribute("data-stealth");
                else document.body.setAttribute("data-stealth", mode);

                /* Fonts */
                if (mode !== "off") loadGoogleFonts();
                else unloadGoogleFonts();

                /* Apply all transformations */
                updateTabTitle(mode);
                updateFavicon(mode);
                updateNavLabels(mode);
                updateHomeView(mode);
                updateSectionTitles(mode);
                updateQuickCards(mode);
                updateSearchPlaceholder(mode);
                updateGameTileTags(mode);
                updateMediaCardTags(mode);
                updateStealthButton(mode);

                /* Persist */
                try { localStorage.setItem(STORAGE_KEY, mode); } catch (e) {}
        }

        /* ─────────────────────────────────────
           TAB TITLE
           ───────────────────────────────────── */

        function updateTabTitle(mode, viewName) {
                if (mode === "off") {
                        let saved = "STRATO";
                        try { saved = localStorage.getItem(ORIGINAL_TITLE_KEY) || "STRATO"; } catch (e) {}
                        document.title = saved;
                } else {
                        let current = document.title;
                        if (current && current !== "STRATO") {
                                try { localStorage.setItem(ORIGINAL_TITLE_KEY, current); } catch (e) {}
                        }
                        document.title = TAB_TITLES[mode] || "STRATO";
                }
        }

        /* ─────────────────────────────────────
           FAVICON
           ───────────────────────────────────── */

        function updateFavicon(mode) {
                var favicon = $('link[rel="icon"]');
                if (!favicon) return;
                if (mode === "off") {
                        if (originalFaviconHref) favicon.href = originalFaviconHref;
                } else {
                        if (!originalFaviconHref && favicon.href) originalFaviconHref = favicon.href;
                        favicon.href = mode === "classroom" ? FAVICON_CLASSROOM : FAVICON_DRIVE;
                }
        }

        /* ─────────────────────────────────────
           NAVIGATION LABELS (v3.0: .nav-item .nav-icon + .nav-label)
           ───────────────────────────────────── */

        function updateNavLabels(mode) {
                var items = $$('.nav-item[data-view]');
                items.forEach(function (item) {
                        var view = item.getAttribute("data-view");
                        if (!view) return;

                        var iconEl = item.querySelector('.nav-icon');
                        var labelEl = item.querySelector('.nav-label');
                        if (labelEl) storeOriginal(labelEl);

                        if (mode === "off") {
                                if (labelEl) restoreOriginal(labelEl);
                        } else {
                                var labelData = NAV_LABELS[view] && NAV_LABELS[view][mode];
                                if (labelData) {
                                        if (iconEl) iconEl.textContent = labelData.icon;
                                        if (labelEl) labelEl.textContent = labelData.text;
                                }
                        }
                });
        }

        /* ─────────────────────────────────────
           HOME VIEW (v3.0: .hero-section h1, .hero-sub, .hero-stats)
           ───────────────────────────────────── */

        function updateHomeView(mode) {
                /* Hide stats in stealth mode */
                var stats = $('.hero-stats');
                if (stats) {
                        if (mode !== "off") {
                                stats.style.display = 'none';
                        } else {
                                stats.style.display = '';
                        }
                }

                /* Hero title */
                var title = document.querySelector('.hero-section h1');
                if (title) {
                        storeOriginal(title);
                        if (mode === "off") restoreOriginal(title);
                        else title.textContent = HERO_TEXT[mode].title;
                }

                /* Hero sub/description */
                var desc = $('.hero-sub');
                if (desc) {
                        storeOriginal(desc);
                        if (mode === "off") restoreOriginal(desc);
                        else desc.textContent = HERO_TEXT[mode].desc;
                }
        }

        /* ─────────────────────────────────────
           SECTION TITLES (v3.0: .section-header h2)
           ───────────────────────────────────── */

        function updateSectionTitles(mode) {
                var titles = $$('.section-header h2');
                titles.forEach(function (el) {
                        storeOriginal(el);
                        if (mode === "off") { restoreOriginal(el); return; }

                        var view = el.closest('.view');
                        if (!view) return;
                        var viewKey = (view.id || '').replace('view-', '');

                        if (SECTION_TITLES[mode] && SECTION_TITLES[mode][viewKey]) {
                                el.textContent = SECTION_TITLES[mode][viewKey];
                        }
                });
        }

        /* ─────────────────────────────────────
           QUICK CARDS (v3.0: .quick-card > .card-icon + .card-info > h3/p)
           ───────────────────────────────────── */

        function updateQuickCards(mode) {
                var cards = $$('.quick-card');
                if (!cards.length) return;

                cards.forEach(function (card, index) {
                        var icon = card.querySelector('.card-icon');
                        var title = card.querySelector('.card-info h3');
                        var desc = card.querySelector('.card-info p');

                        if (icon) storeOriginal(icon);
                        if (title) storeOriginal(title);
                        if (desc) storeOriginal(desc);

                        if (mode === "off") {
                                if (icon) restoreOriginal(icon);
                                if (title) restoreOriginal(title);
                                if (desc) restoreOriginal(desc);
                                return;
                        }

                        var cardData = QUICK_CARDS[mode] && QUICK_CARDS[mode][index];
                        if (!cardData) return;

                        if (icon) icon.textContent = cardData.icon;
                        if (title) title.textContent = cardData.title;
                        if (desc) desc.textContent = cardData.desc;
                });
        }

        /* ─────────────────────────────────────
           SEARCH PLACEHOLDER (v3.0: #palette-search)
           ───────────────────────────────────── */

        function updateSearchPlaceholder(mode) {
                var input = $('#palette-search');
                if (!input) return;
                if (mode === "off") {
                        input.setAttribute("placeholder", "Search games, navigate, or run commands...");
                } else {
                        input.setAttribute("placeholder", SEARCH_PLACEHOLDERS[mode] || "Search...");
                }
        }

        /* ─────────────────────────────────────
           GAME TILE CATEGORY → DATE TAGS (v3.0: .tile-category)
           ───────────────────────────────────── */

        function updateGameTileTags(mode) {
                var tags = $$('.tile-category');
                tags.forEach(function (el, index) {
                        storeOriginal(el);
                        if (mode === "off") { restoreOriginal(el); return; }
                        el.textContent = mode === "classroom"
                                ? pickByIndex(DUE_DATES, index)
                                : pickByIndex(DRIVE_DATES, index);
                });
        }

        /* ─────────────────────────────────────
           MEDIA CARD TAGS (v3.0: .media-info p)
           ───────────────────────────────────── */

        function updateMediaCardTags(mode) {
                var tags = $$('.media-info p');
                tags.forEach(function (el, index) {
                        storeOriginal(el);
                        if (mode === "off") { restoreOriginal(el); return; }
                        el.textContent = mode === "classroom"
                                ? pickByIndex(MEDIA_TAGS_CLASSROOM, index)
                                : pickByIndex(MEDIA_TAGS_DRIVE, index);
                });
        }

        /* ─────────────────────────────────────
           STEALTH BUTTON (v3.0: #stealth-btn)
           ───────────────────────────────────── */

        function updateStealthButton(mode) {
                var dot = $('#stealth-btn .dot');
                var label = $('#stealth-btn .pill-label');
                if (!dot) return;

                if (mode === "off") {
                        dot.style.background = '#8b5cf6';
                        dot.style.boxShadow = '0 0 6px rgba(139,92,246,0.5)';
                        if (label) label.textContent = 'Stealth';
                } else if (mode === "classroom") {
                        dot.style.background = '#10b981';
                        dot.style.boxShadow = '0 0 6px rgba(16,185,129,0.5)';
                        if (label) label.textContent = 'Classroom';
                } else if (mode === "drive") {
                        dot.style.background = '#3b82f6';
                        dot.style.boxShadow = '0 0 6px rgba(59,130,246,0.5)';
                        if (label) label.textContent = 'Drive';
                }
        }

        /* ─────────────────────────────────────
           INITIALIZATION
           ───────────────────────────────────── */

        function initStealth() {
                                initCloaking();
                initPanicButton();
                initAutoDisguise();
                initHistoryPoisoning();
                initIdleDetection();
                initSettingsListeners();
                initVisibilityCloak();

                const stealthBtn = document.getElementById('stealth-btn');
                if (stealthBtn) stealthBtn.addEventListener('click', cycleMode);

                /* Register keyboard shortcut */
                document.addEventListener("keydown", function (e) {
                        if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
                                e.preventDefault();
                                e.stopPropagation();
                                cycleMode();
                        }
                });

                /* Restore saved state */
                var savedMode = "off";
                try { savedMode = localStorage.getItem(STORAGE_KEY) || "off"; } catch (e) {}
                if (savedMode !== "off") applyStealthMode(savedMode);
                if (savedMode === "off") {
                        let savedCloak = 'default';
                        try { savedCloak = localStorage.getItem('strato_cloak') || 'default'; } catch(e){}
                        applyTabCloak(savedCloak);
                }
        }

        /* Expose for external use (app.js, command palette) */
        window.cycleStealthMode = cycleMode;
        window.applyStealthMode = applyStealthMode;
        window.updateStealthTabTitle = updateTabTitle;
        window.executePanic = executePanic;

        /* ─────────────────────────────────────
           BOOT
           ───────────────────────────────────── */

        if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", initStealth);
        } else {
                initStealth();
        }
})();
