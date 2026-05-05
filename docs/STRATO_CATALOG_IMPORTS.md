# STRATO Catalog Imports

STRATO imports are review-first. The importer never dumps new entries directly into `public/assets/games.json`.

## Commands

```bash
node scripts/import-catalog.mjs --source manual --file scripts/manual-games.txt --dry-run
node scripts/import-catalog.mjs --source all --dry-run
node scripts/import-catalog.mjs --source all --quarantine
node scripts/import-catalog.mjs --source all --review
node scripts/import-catalog.mjs --merge-approved
node scripts/validate-games.mjs
```

## Manual Lists

Add candidates to `scripts/manual-games.txt`:

```text
Title | URL | Category | tag-one, tag-two | Optional description | Optional thumbnail
```

Run the dry run first. If the output looks right, run `--review` to write `public/assets/games.imported.review.json`.

## Review Files

Imported entries are staged in `public/assets/games.imported.review.json`.

`--quarantine` writes high-risk/incomplete entries to `public/assets/games.imported.quarantine.json` (for example, missing URL/title, config-required placeholders, or metadata that looks like bypass/directory surfaces).

Set `approved: true` for entries that are ready to merge. Set `rejected: true` for entries that should stay out. `--merge-approved` only merges approved entries that are not rejected.

## Adding Sources

Add a source to `scripts/catalog-sources.json` and point it at one of:

- `manual-list`
- `generic-json`
- `generic-html`

Keep new sources disabled until they are reviewed for licensing, terms, robots rules, and asset usage.

## Licensing Cautions

Only import public metadata from allowed sources. Do not scrape aggressively. Do not hotlink thumbnails unless the source clearly allows it. Keep source names in import/admin logs only; STRATO Home should feel like a launch surface, not an outbound directory.

## Merge Behavior

`--merge-approved` creates a timestamped `.bak` backup of `games.json`, prefers existing STRATO entries, de-dupes by normalized title and URL, and prints added, skipped, rejected, and duplicate counts.
