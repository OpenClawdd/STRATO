# STRATO v5 Release Checklist

## v5.01 hotfix gate

- [x] v5 Home owns Home rendering after boot.
- [x] Legacy refresh bridge points into v5.
- [x] Recursive refresh fallback removed.
- [x] Service worker and visible version strings moved to v5.01.
- [x] CI fails on format, lint, tests, and catalog errors.
- [ ] Manual browser QA on desktop, Chromebook width, and mobile width.

See `docs/STRATO_V5_01_HOTFIX.md`.


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
- [x] `node scripts/validate-games.mjs` passes with no trust-critical errors.
- [ ] Human browser QA on desktop, Chromebook width, and mobile width.
- [ ] Push branch and open PR.

## Source Radar addendum

- [x] Source registry added at `scripts/catalog-sources.json`.
- [x] Source health checker added at `scripts/check-sources.mjs`.
- [x] Catalog intelligence report added at `scripts/catalog-report.mjs`.
- [x] Review/quarantine policy documented.
- [x] Source Radar tests added.

## v1.0 verified launch gate

- [x] Active `generic_only` launch candidates are blocked by validation.
- [x] Red/quarantined entries are hidden from launch surfaces.
- [x] Source Doctor cleanly reports active checked vs red skipped.
- [x] CI runs format, lint, tests, `validate-games`, and `catalog-atlas`.
- [ ] Manual release gate: run `node scripts/strato-source-doctor.mjs check` before merge/tag.
