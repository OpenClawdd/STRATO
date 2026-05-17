# STRATO Launch OS v1

STRATO Launch OS is the game-first product layer for STRATO. It keeps the first screen focused on search, launch, saved games, recent games, deterministic picks, recovery, settings, and catalog trust.

## Product Contract

- Home, Games, Favorites, Recent, Random, Signal Health, and Settings are the primary dock surfaces.
- Browser transport remains a launch implementation detail, not the product center.
- Empty personalized sections stay hidden until real local data exists.
- No fake popularity, online counts, trending labels, or fabricated catalog metadata.
- No piracy, unauthorized media streaming, mirror routing for media, cloak/evasion controls, or school-bypass framing.

## Local Data

STRATO personalization is local and migration-safe:

- `strato-favorites`: ordered array of game ids.
- `strato-recent`: ordered array of recently launched game ids.
- `strato-playCounts`: object keyed by game id with numeric local launch counts.
- `strato-lastPlayed`: object keyed by game id with millisecond timestamps.
- `strato-preferences`: object for low power, density, reduce motion, and background intensity.
- `strato-recentFailures`: object keyed by game id with `{ reason, timestamp }`.

Malformed local data must never crash the UI. Readers fall back to empty arrays or objects and import validates before writing.

## Save Capsule

Save Capsule exports and imports only the local STRATO keys above. Import accepts `strato-save-capsule/v1` JSON, validates each known key, and rejects malformed payloads before any current data is overwritten.

## Daily Picks

Daily Picks are deterministic by date and selected only from launchable catalog entries. They avoid risky placeholder/config-required surfaces and spread categories where possible.

## Popular Signals

Popular Signals are local signals only:

- Saved favorite.
- You played this recently.
- Most launched here.
- Daily signal.
- Same mood or similar tag where a detail sheet can infer it from real metadata.

STRATO does not present server-wide popularity unless a real backend metric exists.

## Signal Health

Signal Health reports real diagnostics:

- catalog loaded state
- total games
- playable games
- local launchable games
- external launchable games
- fallback-art count
- missing/broken count if detectable
- config-required count
- recent local failure count
- local data readability

Audit status is shown as a local action to run the validator, not as a fabricated pass/fail value.

## Launch Recovery

When a launch path fails, STRATO records the recent failure locally, stops promoting that path for the cooldown window, and shows a calm recovery pane:

- Retry
- Surprise Me
- Search
- Similar games when real tags/categories support them
- Back Home

## Performance Mode

Low Power Mode and reduced motion reduce decorative work, transitions, and background intensity. The UI must remain responsive on low-end Chromebooks and avoid large unnecessary DOM churn.
