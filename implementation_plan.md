# Phase 6: Source Health Dashboard

Expose aggregate health per source family from `.strato-reports/source-domains.csv` (falling back to `games.json` if missing or empty) via a server-only API `/api/health/summary`. Update the admin page `public/admin.html` to render this health data in a table.

## User Review Required

> [!IMPORTANT]
> - The new route is placed in `src/routes/health-dashboard.js`.
> - It is registered in `src/index.js` before the `express.static` handler.
> - The logic correctly parses `.strato-reports/source-domains.csv` if it exists. If it does not exist or fails to load, it falls back to parsing `public/assets/games.json` directly.
> - The API and script are server-only and do not import any client code.

## Proposed Changes

### Backend Routers

#### [NEW] [health-dashboard.js](file:///Users/noahmendieta/STRATO/src/routes/health-dashboard.js)
- Implements `/api/health/summary` router.
- Implements `isPlayable(g)` to filter games.
- Implements `parseCsv(text)` to read the `.strato-reports/source-domains.csv` data.
- Groups games/sources by family and calculates `total`, `playable`, `deadPct` (percent of dead/unplayable games), and `lastChecked`.
- Sorts results by `deadPct` descending, then by `total` descending.

#### [MODIFY] [index.js](file:///Users/noahmendieta/STRATO/src/index.js)
- Import `healthDashboard` route from `./routes/health-dashboard.js`.
- Mount it with other routers before static file serving.

---

### Admin Panel UI

#### [MODIFY] [admin.html](file:///Users/noahmendieta/STRATO/public/admin.html)
- Append "Source Health" HTML table container and styling at the bottom of the main content area (before `</body>`).
- Add a script block fetching `/api/health/summary` and rendering rows dynamically.

---

## Verification Plan

### Automated Tests
- Run vitest suite: `pnpm test`
- Validate file syntax: `node -c src/routes/health-dashboard.js`
- Run catalog checks: `node scripts/validate-games.mjs`

### Manual Verification
- Verify `/api/health/summary` yields 200 response with correct structure.
- Rename `.strato-reports/source-domains.csv` temporarily and ensure endpoint falls back gracefully to `games.json` and still returns 200.
- Check `/admin.html` page load and verify the "Source Health" table shows correctly without console errors.
