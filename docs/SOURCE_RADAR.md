# STRATO Source Radar

Source Radar is STRATO's catalog-intelligence layer. It treats external game/app sites as **source signals**, not as trusted catalogs to clone. The public STRATO Home remains STRATO-branded; source names are not promoted to users and source lists are not exposed in normal launch UI.

## What Source Radar does

- Tracks review-only source seeds in `scripts/catalog-sources.json`.
- Checks whether sources are active, dead, redirected, blocked, or timed out with `node scripts/check-sources.mjs`.
- Produces metadata candidates for manual review only.
- Quarantines risky candidates before they can reach `public/assets/games.json`.
- Reports source/candidate/quarantine health with `node scripts/catalog-report.mjs`.

## What Source Radar does not do

- It does not auto-merge competitor catalogs.
- It does not hotlink thumbnails unless license status is explicitly allowed.
- It does not build a proxy/bypass directory.
- It does not show competitor/source names on the public Home.
- It does not fake games, stats, popularity, or online counts.

## Source registry

Sources live in `scripts/catalog-sources.json`. Each source supports:

- `name`
- `url`
- `aliases`
- `type`: `game-directory`, `app-directory`, `proxy-hub`, `inspiration-only`, `manual-only`, `blocked`
- `priority`: `high`, `medium`, `low`
- `status`: `active`, `dead`, `redirected`, `blocked`, `review`, `disabled`
- `importMode`: `metadata-only`, `manual-only`, `disabled`
- `allowAutoMerge`: always `false`
- `licenseStatus`: `allowed`, `review`, `unknown`, `blocked`
- `notes`
- `lastChecked`
- `health`

Competitor and proxy-style sources default to `unknown` license and review-only or disabled import behavior. Unknown-license entries quarantine until a maintainer verifies rights and launch behavior.

## Commands

```bash
node scripts/check-sources.mjs
node scripts/check-sources.mjs --json
node scripts/check-sources.mjs --mark-dead
node scripts/import-catalog.mjs --source all --dry-run
node scripts/import-catalog.mjs --source all --review
node scripts/import-catalog.mjs --source all --quarantine
node scripts/catalog-report.mjs
```

`--mark-dead` is intentionally explicit. Health checks never remove sources automatically.
