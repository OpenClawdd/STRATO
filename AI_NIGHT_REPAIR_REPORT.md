# AI Night Repair Report

Date: 2026-05-27
Branch: current working branch (no push to `main`)

## 1) What changed

- Repo/runtime health
  - Added core route smoke coverage in `tests/smoke/core-routes.test.js` for `/health`, auth gate behavior on `/api/config/status`, and `/play/:id` mapping.
  - Added deep-link launch route in `src/index.js`: `GET /play/:id` now redirects to `/?play=<id>`.

- Launch reliability
  - `public/js/v5/core/launch.js`
    - Blocks `about:blank`/empty launch targets from being treated as normal launches.
    - Fails external launches truthfully when proxy bridge is missing (`Proxy transport unavailable in this runtime`) instead of silently dead-ending.
  - `public/js/v5/main.js`
    - Added launch-intent consumption from URL query (`?play=<id>`), launches once, then cleans URL.
    - Tightened Launch Bay `has-launch` detection so `about:blank` does not look like a valid active launch.
  - `public/js/v5/ui/recovery.js`
    - Added explicit `Back to STRATO` action in failure modal.

- Catalog truth/reporting
  - `scripts/validate-games.mjs`
    - Added machine-readable truth report output at `.strato-reports/catalog-truth-report.json`.
    - Report includes reliability/trust breakdown, generic root-link counts, duplicate URL clusters, and issue-type counts.
    - Existing strict validator behavior preserved (still fails on errors).

- UX/trust visibility (without fake badges)
  - `public/js/v5/ui/cards.js`
    - Replaced generic verified indicator with explicit trust labels derived from runtime health/reliability:
      - `Verified local`, `Proxy verified`, `Review only`, `Broken locally`, `Needs config`, `Unknown`, `Quarantined`.
  - `public/js/v5/ui/home.js`
    - Added honest no-result search state (query-aware message).
    - Expanded Signal Health tiles with `Quarantined` and `Unknown or config` counts.
  - `public/css/style.css`
    - Added styling for trust-state badge tones and search-empty state.

- Tests
  - `tests/v5/launch.test.js`
    - Added regression test for external launch failure when proxy bridge is unavailable.

## 2) What is fixed

- `pnpm install` works.
- `pnpm test` works and passes with new/updated coverage.
- Launch deep links are now first-class (`/play/:id` -> home launch intent).
- Launch flow now avoids false-positive "running" states on `about:blank`.
- External launch behavior is now explicit and truthful when transport bridge is missing.
- Failure modal includes clear recovery navigation back to home/search.
- Catalog validation now produces a structured truth report for auditing without blindly rewriting catalog data.

## 3) What still sucks

- Catalog remains heavily quarantined by design (`red` entries are large in count); this patch improves truth visibility/reporting but does not mass-edit catalog records.
- `trust_state` is not persisted in catalog JSON today; trust is derived at runtime from reliability/proxy-proof fields.
- No live network source-doctor run was used here to auto-relabel entries (avoids faking verification).

## 4) What needs a human decision

- Whether to run a supervised catalog cleanup wave (quarantine/relabel/promote) using source-doctor evidence and domain policy.
- Whether to promote any `yellow` remote entries to stricter UX surfaces after manual route/proxy verification criteria are agreed.
- Whether to standardize a persisted `trust_state` field in `games.json` (schema + ownership policy), instead of runtime-only derivation.

## 5) Safe to merge?

- Status: **Mostly safe for merge** for runtime reliability, honest UX states, and test/reporting improvements.
- Caveat: includes prior `AGENTS.md` update from earlier session work. Keep or drop that file in this PR depending on scope.

## Validation run

- `pnpm install`
- `pnpm test`
- `node scripts/validate-games.mjs`
- Route smoke included via `pnpm test` (`tests/smoke/core-routes.test.js`)

## git diff --stat

```text
AGENTS.md                   | 148 +++++++++++++-------------------------------
public/css/style.css        |  38 ++++++++++++
public/js/v5/core/launch.js |  19 ++++--
public/js/v5/main.js        |  21 ++++++-
public/js/v5/ui/cards.js    |  35 +++++++++--
public/js/v5/ui/home.js     |   9 ++-
public/js/v5/ui/recovery.js |   1 +
scripts/validate-games.mjs  |  96 ++++++++++++++++++++++++++++
src/index.js                |  10 +++
tests/v5/launch.test.js     |  25 ++++++++
10 files changed, 286 insertions(+), 116 deletions(-)
```

Untracked new files relevant to this mission:
- `tests/smoke/core-routes.test.js`
- `.strato-reports/catalog-truth-report.json`

## Next recommended patch

1. Add an opt-in `pnpm catalog:truth` script that runs `validate-games` and `catalog-atlas` together and writes a consolidated report.
2. Add UI affordance to open the first 10 quarantined/review-only entries in admin review tools (without showing them as playable).
3. Add explicit `/play/:id` integration test at route level with authenticated + unauthenticated redirect behavior split.
