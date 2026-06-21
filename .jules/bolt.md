## 2026-06-21 - Ignore unrelated test failures
**Learning:** `tests/source-registry-domains.test.js` and `tests/v5/catalog-launch-containment.test.js` rely on external dynamic files like `data/import-review/captured-candidates.json` and external URLs. They often fail in CI due to missing files or proxy blockages.
**Action:** When working on generic refactors like dead-code removal, ignore test failures in these two specific files if local verification for the modified components passes. Do not attempt to fix test environment mock data for these unless instructed.
