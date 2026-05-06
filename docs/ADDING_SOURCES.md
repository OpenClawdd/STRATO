# Adding Source Radar Sources

Add sources to `scripts/catalog-sources.json`. Sources are discovery signals, not public STRATO links.

## Safe defaults

Use these defaults unless the source is owned/trusted and license terms are clear:

```json
{
  "name": "Example Source",
  "url": "https://example.com",
  "aliases": ["example"],
  "adapter": "generic-html",
  "type": "game-directory",
  "priority": "medium",
  "status": "review",
  "importMode": "metadata-only",
  "allowAutoMerge": false,
  "licenseStatus": "unknown",
  "notes": "Discovery-only. Verify licenses before approving candidates.",
  "lastChecked": "",
  "health": {}
}
```

## Source types

- `game-directory`: game catalog or game listing site.
- `app-directory`: app/tool listing site.
- `proxy-hub`: health/intel only by default; do not import as playable catalog.
- `inspiration-only`: design/category/search inspiration only; candidates quarantine.
- `manual-only`: hand-entered candidates.
- `blocked`: known unsafe or inappropriate source.

## Review rules

- Set `allowAutoMerge` to `false` for every source.
- Use `importMode: disabled` for proxy hubs, inspiration-only sources, and unclear sources.
- Do not add competitor names or source lists to public Home.
- Do not hotlink thumbnails unless rights are clear.
- Run `node scripts/catalog-report.mjs` after imports to understand review workload.
