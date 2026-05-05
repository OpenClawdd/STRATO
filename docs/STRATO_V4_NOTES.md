# STRATO v4 — The Launch Universe

STRATO v4 is the frontend/product release that turns the app into a clean digital hideout for the fun side of the internet. The backend server, proxy stack, tests, catalog data, and catalog tools remain intact; the v4 layer focuses on the Home/launch experience.

## Product frame

- North star: STRATO is the place you open first.
- Core sentence: STRATO is a clean digital hideout for the fun side of the internet.
- Visual direction: midnight Frutiger Aero internet arcade — breathable, glossy, natural-tech, and fast without heavy particles or fake metrics.

## Real Home sections

- Identity strip: shows STRATO v4, “Open here first,” and a real launchable catalog count.
- Launch Deck search: instant local search over the launchable catalog.
- Quick actions: Surprise Me, Continue Playing, Favorites, Arcade, and Launch Bay navigation.
- Today’s Picks: deterministic daily picks from launchable catalog entries only.
- Recent Launches: powered by `strato-recent`.
- Favorites: powered by `strato-favorites`.
- Most Played: powered by `strato-playCounts` and hidden until real counts exist.
- Mood Filters: generated from real categories/tags and hidden when clusters are weak.
- Catalog Pulse: generated from runtime health classification.
- Control Center: low power, compact cards, clear recents, clear favorites, and reset local data.

## LocalStorage keys

- `strato-favorites`
- `strato-recent`
- `strato-playCounts`
- `strato-lastPlayed`
- `strato-preferences`
- `strato-recentFailures`

## Launch quality rules

Normal launch surfaces exclude unresolved, placeholder, config-required, blocked-category, and recently-failed entries. The validator still reports warnings honestly; the frontend does not fake URLs or promote unlaunchable entries.

## Manual QA checklist

- Search keyboard navigation: ArrowUp, ArrowDown, Enter, Escape.
- Detail sheet: open, close, Escape, overlay close, favorite toggle, launch.
- Recovery panel: retry, try another, search again, back to STRATO, similar games.
- Mobile and Chromebook widths: no horizontal overflow, readable cards, usable tap targets.
- Low Power and Compact Cards: state persists and layout remains usable.
- Launch Bay: empty and loaded states both look intentional.
