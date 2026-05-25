# STRATO Reliability Audit

Generated from the clean real STRATO repo after the baseline map commit.

Verified baseline before this audit:

```text
pnpm install: passed
pnpm test: passed, 27 files, 368 tests
pnpm run validate:games: passed, 546 games, 0 issues
pnpm run check:proxy: passed with pnpm dev running
pnpm run check:launch: passed with pnpm dev running
entrypoint: src/index.js
default port: 8080
package manager: pnpm
```

## Top 10 Reliability / Product Gaps

1. `check:launch` can pass on auth redirects instead of real play routes.

   Evidence: `scripts/check-launch.mjs` treats any `200 <= status < 400` as success, including 302. `src/middleware/auth.js` redirects unauthenticated HTML requests to `/login` with 302. Grep found no explicit `/play/:id` route in `src/`; the live check reported `/play/:id HTTP 302` for all sampled games.

   Why it matters: STRATO can claim launch route health while only proving the auth gate redirects, not that `/play/:id` resolves to an actual launch surface.

   Smallest safe repair: make `check:launch` reject redirects to `/login` and require either an authenticated check or a direct local game/source route proof. If `/play/:id` is intentionally SPA-routed, document and test the exact behavior.

   Proves fixed: `pnpm run check:launch` with server running must fail on `/login` redirects and pass only when a sampled game reaches a real launch route or direct source route. Add a focused test for redirect handling in `scripts/check-launch.mjs` if the script is refactored for testability.

2. `check:launch` samples only the first 12 catalog entries.

   Evidence: `scripts/check-launch.mjs` uses `STRATO_LAUNCH_LIMIT || 12` and `games.slice(0, LIMIT)`. The first entries in `public/assets/games.json` are local green games, while the full catalog currently contains 16 green local, 134 yellow external, and 396 red external entries.

   Why it matters: the launch smoke can pass while never touching the remote/proxy-heavy part of the catalog, where real reliability risk lives.

   Smallest safe repair: sample by reliability/url kind buckets, for example all green local plus a bounded set of yellow external candidates and no red entries except to prove red stays hidden.

   Proves fixed: `pnpm run check:launch` output should show sampled counts by bucket, and tests should assert the sampler cannot inspect only the first N rows.

3. `check:proxy` mutates tracked report files by default.

   Evidence: `scripts/check-proxy.mjs` always calls `writeProxyProofQueue(proxyQueue)` and writes `.strato-reports/proxy-proof-queue.json` plus `.csv`. Running the check modified those tracked files; they had to be restored.

   Why it matters: a normal verification command dirties the tree and can mix generated proof queue churn into real code commits.

   Smallest safe repair: make report writing opt-in with an env flag or write to an ignored temp path by default; keep stdout summary unchanged.

   Proves fixed: run `pnpm run check:proxy` with server running, then `git status --short` should stay clean unless an explicit write flag is set.

4. Proxy proof queue state is inconsistent between tracked reports and live checks.

   Evidence: tracked `.strato-reports/proxy-proof-queue.json` contains 173 entries. The latest passing `check:proxy` reported `remote_proxy_unverified: 134` and rewrote the queue down by 39 rows before restoration.

   Why it matters: Source Hydra/proxy proof work can start from stale queue data, and developers cannot tell whether report files are source truth or generated snapshots.

   Smallest safe repair: define report ownership. Either keep reports generated and ignored, or commit regenerated reports intentionally with a timestamp/source command in the report header.

   Proves fixed: documented report policy plus `check:proxy` no longer creates surprise diffs; `source:report` or a named report command owns committed report updates.

5. The reliable playable surface is much smaller than the catalog size suggests.

   Evidence: `public/assets/games.json` has 546 entries, but a catalog count shows 16 `green|local`, 134 `yellow|external`, and 396 `red|external`. Current `verifiedRemote` count is 0. `public/js/v5/core/health.js` correctly excludes unverified external games from playable surfaces.

   Why it matters: tests pass and validation is clean, but real first-run playability is effectively the local green set unless remote proof work advances.

   Smallest safe repair: keep UI copy honest and focus repair work on proxy proof queue reduction, not catalog expansion. Avoid showing total catalog size as equivalent to playable inventory.

   Proves fixed: `pnpm run check:proxy` reports fewer `remote_proxy_unverified` entries, and v5 stats/tests continue to distinguish `verified local` from `remote proof pending`.

6. Transport readiness reports Scramjet as unavailable even after registration.

   Evidence: `public/js/transport-init.js` sets `sjReady = true` when Scramjet service worker registration succeeds, but the emitted `detail` object hardcodes `scramjet: false` while `workers.scramjet` uses `sjReady`.

   Why it matters: UI or fallback logic that reads `window.STRATO_PROXY_ENGINES.scramjet` may believe Scramjet is unavailable even when its worker registered.

   Smallest safe repair: set `detail.scramjet` from `sjReady` and any required client-readiness condition, then add a unit/static audit test for the emitted shape.

   Proves fixed: `pnpm test` should include a proxy runtime test asserting Scramjet readiness is not hardcoded false when `sjReady` is true.

7. Local launches mark loaded on a timer, not actual iframe load.

   Evidence: `public/js/v5/core/launch.js` `showBrowser()` sets iframe `src`, then after 650ms removes loading and sets Launch Bay `loaded` regardless of iframe load success. External proxy launches use iframe load/error telemetry, but local launches do not.

   Why it matters: a missing or slow local game can look successfully loaded, weakening the premium reliability feel.

   Smallest safe repair: for local launches, set an intermediate opened/loading state and only mark loaded from the existing iframe `load` listener or a route preflight plus explicit iframe signal.

   Proves fixed: add/update `tests/v5/launch.test.js` so local launch does not become `loaded` solely because a timer elapsed.

8. Failed external proxy launches are not persisted like failed local routes.

   Evidence: `markFailure()` stores local failures in `strato-recentFailures`. Local route failures call `markFailure()`. Proxy timeout/error paths update telemetry and Launch Bay status but do not persist a failure record for the game.

   Why it matters: once verified remote entries exist, a repeatedly failing proxy target may keep reappearing in launchable/recommendation surfaces during the same trust window.

   Smallest safe repair: decide whether verified remote proxy failures should write the same 24-hour local failure record or a proxy-specific failure record, then keep recovery retry clearing behavior explicit.

   Proves fixed: `tests/v5/launch.test.js` should assert proxy timeout/error marks a recent failure when that policy is enabled, and retry clears it.

9. Recovery fallback labels can overstate reliability.

   Evidence: `public/js/v5/ui/recovery.js` labels trending fallback suggestions as `Reliable backups`. `trendingGames()` returns playable entries, which may include future verified remote entries, not necessarily local green entries.

   Why it matters: recovery UX is where users decide whether STRATO feels truthful. “Reliable” should mean a stronger guarantee than merely playable if remote proof quality varies.

   Smallest safe repair: either restrict `Reliable backups` to green local entries or rename the section to a quieter truthful label such as `Try next` / `Launchable backups`.

   Proves fixed: add a v5 recovery test that feeds a verified remote trending item and asserts the label/selection policy is truthful.

10. Some generated audit reports are stale relative to the current catalog.

   Evidence: `.strato-reports/atlas-summary.md` says `Total catalog games: 1248`, while current `public/assets/games.json` has 546 games and `validate:games` also reports 546.

   Why it matters: agents or maintainers can chase stale counts and repair candidates that no longer reflect the active catalog split.

   Smallest safe repair: add generated-at/source command metadata and make stale reports clearly non-authoritative, or regenerate them intentionally as a separate report-only change.

   Proves fixed: docs or report headers identify active catalog version/date; generated reports match `validate:games` counts when intentionally refreshed.

## Recommended First Repair

Fix `check:launch` false positives first.

Reason: launch trust is core STRATO product truth. The current smoke check can report success from unauthenticated `/login` redirects, which means a release gate can pass without proving an actual launch route.

Smallest safe implementation direction:

```text
scripts/check-launch.mjs
- Treat 3xx as not launch-proof unless the Location is a known game/source route.
- Explicitly fail `/login` redirects.
- Continue allowing direct local source routes like `/games/:id/index.html`.
- Print whether each pass came from `/play`, direct source, or another configured template.
```

Proof commands:

```bash
pnpm test
pnpm run validate:games
pnpm dev
pnpm run check:launch
pnpm run check:proxy
git status --short
```

Expected proof: `check:launch` should not pass merely because `/play/:id` returns 302 to `/login`; it should pass only on an actual reachable launch/source path.

## Do Not Touch Yet

- Do not redesign the Home/Launch Bay UI before launch proof semantics are fixed.
- Do not mark remote games verified unless proxy/browser proof scripts or documented manual proof support it.
- Do not expand the catalog until proxy proof queue ownership is settled.
- Do not weaken `validate:games` or v5 health gating to increase visible catalog counts.
- Do not refactor auth, CSRF, proxy routes, or websocket code as part of product polish.
- Do not commit generated `.strato-reports` churn unless the commit is intentionally a report refresh.
