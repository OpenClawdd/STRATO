# STRATO Capture Imports

STRATO catalog growth is review-first. Do not invent games, thumbnails, URLs, proxy claims, or cloud access. Capture evidence from pages, write review files, then apply only reviewed candidates.

## Sources

- Selenite has a reviewed capture path. `captures/selenite-resources.raw.json` imports source-backed external candidates as yellow/needs-check, not local green games.
- 1key, Frogie, Vapor, Lucide, and GN Math can be captured with a browser console export or a network/DOM export.
- Cherri is screenshot-only inspiration. Do not visit Cherri, scrape it, automate against it, or bypass bot protection.
- Competitor references should inform layout density, search flow, recovery UX, and category organization. They should not be copied as unverified catalog data.
- Adding a Hub/source site to `public/assets/sites.json` is not the same as importing that site's game catalog.

## Review Flow

1. Save browser exports as `captures/*.raw.json`.
2. Run `node scripts/import-captures.mjs`.
3. Review `data/import-review/captured-candidates.json`.
4. Review source, title, URL, thumbnail, and content flags.
5. Run `node scripts/import-captures.mjs --apply` to update `public/assets/games.json`.

The importer writes:

- `data/import-review/captured-candidates.json`
- `data/import-review/captured-report.json`

`--apply` is required before `games.json` changes. Candidates must include evidence: `sourceUrl`, text/title, `href`, image if present, and `capturedAt` if present. Placeholder thumbnails are nulled so STRATO can use fallback art rather than pretending a missing image is verified.

Imported source games should stay:

- `reliability: "yellow"`
- tagged with `external` and `needs-check`
- badged by provider where possible
- excluded from Featured, Daily Picks, and Home promo rows until verified

## Source Status

- Selenite: capture reviewed and import-supported.
- GN Math: Hub/source entry exists; capture still required before importing games.
- Frogie: capture required before importing games.
- Vapor: capture required before importing games.
- Lucide: capture required before importing games.
- Cherri: screenshot-only visual reference.

## Browser Console Extractor

```js
(() => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

  const items = [...document.querySelectorAll("a, button, [role='button'], .card, .game, .app, [class*='game'], [class*='card'], [class*='app']")]
    .map((el, index) => {
      const img = el.querySelector?.("img") || (el.tagName === "IMG" ? el : null);
      const link = el.closest?.("a") || (el.tagName === "A" ? el : null);

      return {
        index,
        text: clean(el.innerText || el.getAttribute("aria-label") || el.getAttribute("title")),
        href: link?.href || el.getAttribute("href") || null,
        image: img?.src || null,
        alt: clean(img?.alt),
        className: el.className?.toString?.() || "",
        tag: el.tagName
      };
    })
    .filter(x => x.text || x.href || x.image)
    .filter((x, i, arr) => {
      const key = `${x.text}|${x.href}|${x.image}`;
      return arr.findIndex(y => `${y.text}|${y.href}|${y.image}` === key) === i;
    });

  const payload = {
    sourceUrl: location.href,
    title: document.title,
    capturedAt: new Date().toISOString(),
    count: items.length,
    items
  };

  copy(JSON.stringify(payload, null, 2));
  console.log(`Copied ${items.length} extracted entries from ${location.href}`);
  console.log(payload);
})();
```

## Selenite-Style Resource Extractor

Some sources expose project assets through predictable resource requests. Use this only on allowed sources and keep the copied output review-first.

```js
(() => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const resources = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((url) => /\/resources\/semag\//i.test(url));

  const items = resources
    .map((url, index) => {
      const parsed = new URL(url, location.href);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const slug = parts[2] || "";
      return {
        index,
        text: clean(slug.replace(/[-_]+/g, " ")),
        slug,
        href: `${location.origin}/projects/${slug}`,
        image: parsed.href,
        sourceEvidence: "performance.resource:/resources/semag/"
      };
    })
    .filter((item) => item.slug)
    .filter((item, index, arr) => arr.findIndex((x) => x.slug === item.slug) === index);

  const payload = {
    sourceUrl: location.href,
    title: document.title,
    capturedAt: new Date().toISOString(),
    count: items.length,
    items
  };

  copy(JSON.stringify(payload, null, 2));
  console.log(`Copied ${items.length} resource-backed entries from ${location.href}`);
  console.log(payload);
})();
```
