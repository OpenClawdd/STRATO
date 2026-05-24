# Checklist for Phase 6: Source Health Dashboard

- [x] Create `src/routes/health-dashboard.js`
- [x] Wire in `src/index.js`
- [x] Update `public/admin.html`
- [x] Verify endpoint `/api/health/summary` yields 200 JSON format
- [x] Verify endpoint fallback works when renaming `.strato-reports/source-domains.csv`
- [x] Verify `/admin.html` renders table correctly without console errors
- [x] Run `pnpm test` (368 passing)
- [x] Run `node scripts/validate-games.mjs` (0 errors)
- [x] Run overall audit: `pnpm format:check && pnpm lint && pnpm test && node scripts/validate-games.mjs && pnpm source:validate`
- [x] Create walkthrough of changes
- [/] Commit and push changes
