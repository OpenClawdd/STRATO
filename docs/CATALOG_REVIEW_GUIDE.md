# STRATO Catalog Review Guide

STRATO's catalog is review-first. Source Radar may discover metadata candidates, but only approved, launchable, non-quarantined games should reach user-facing launch surfaces.

## Candidate flow

1. Run source health checks:
   ```bash
   node scripts/check-sources.mjs
   ```
2. Generate review candidates:
   ```bash
   node scripts/import-catalog.mjs --source all --review
   ```
3. Inspect:
   - `public/assets/games.imported.review.json`
   - `public/assets/games.imported.quarantine.json`
4. Approve only entries that have:
   - clear title
   - working launch URL
   - allowed or reviewed license status
   - no proxy/bypass framing
   - no adult/gambling/drug/weapon signals
   - safe local thumbnail or explicitly allowed thumbnail use
5. Mark approved entries with `approved: true` and rejected entries with `rejected: true`.
6. Merge only approved entries:
   ```bash
   node scripts/import-catalog.mjs --merge-approved
   ```

## License policy

`licenseStatus` can be:

- `allowed`: license is clear and acceptable.
- `review`: maintainer has reviewed and documented why candidate may proceed.
- `unknown`: quarantine by default.
- `blocked`: reject.

Competitor directories default to `unknown` or `review`; never auto-merge unknown-license games.

## Quarantine reasons

Candidates quarantine for missing title/URL, duplicates, unclear license, proxy-only pages, hidden-trigger/bypass-looking metadata, unsafe content terms, suspicious redirects, hotlinked thumbnails without permission, broken/placeholder URLs, disabled sources, and inspiration-only sources.
