# STRATO Capture Imports

STRATO catalog growth is review-first. Do not invent games, thumbnails, URLs, proxy claims, or cloud access. Capture evidence from pages, write review files, then apply only approved candidates.

## Sources

- 1key, Frogie, Vapor, and Lucide can be captured with a browser console export or a network/DOM export.
- Cherri is screenshot-only inspiration. Do not visit Cherri, scrape it, automate against it, or bypass bot protection.
- Competitor references should inform layout density, search flow, recovery UX, and category organization. They should not be copied as unverified catalog data.

## Review Flow

1. Save browser exports as `captures/*.raw.json`.
2. Run `node scripts/import-captures.mjs`.
3. Review `data/import-review/captured-candidates.json`.
4. Mark only verified game candidates as approved in the review data.
5. Run `node scripts/import-captures.mjs --apply` to update `public/assets/games.json`.

The importer writes:

- `data/import-review/captured-candidates.json`
- `data/import-review/captured-report.json`

`--apply` is required before `games.json` changes. Candidates must include evidence: `sourceUrl`, text/title, `href`, image if present, and `capturedAt` if present.

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
