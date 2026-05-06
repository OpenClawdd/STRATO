# STRATO v5 Release Checklist

- [x] Branch created: `strato-v5-living-hideout`.
- [x] Package version updated to `5.0.0`.
- [x] Manifest updated for STRATO v5 — The Living Hideout.
- [x] Server banner updated to STRATO v5.0.0 — The Living Hideout.
- [x] v5 runtime folder created with real modules.
- [x] `open-home-runtime.js` loads v5.
- [x] Launchability gates user-facing launch surfaces.
- [x] Search, picks, surprise, card, detail, recovery, settings modules implemented.
- [x] v5 product tests added.
- [x] `npm test` passes.
- [x] `node scripts/validate-games.mjs` passes with warnings only.
- [ ] Human browser QA on desktop, Chromebook width, and mobile width.
- [ ] Push branch and open PR.

## Source Radar addendum

- [x] Source registry added at `scripts/catalog-sources.json`.
- [x] Source health checker added at `scripts/check-sources.mjs`.
- [x] Catalog intelligence report added at `scripts/catalog-report.mjs`.
- [x] Review/quarantine policy documented.
- [x] Source Radar tests added.
