# STRATO v5 — The Living Hideout

STRATO v5 is a product-layer release focused on making STRATO feel like the place users open first: a clean digital hideout for games, tools, music, discoveries, and launchable web experiences.

## Principles

- Launch-first: search, pick, continue, and launch should be obvious in the first few seconds.
- Honest catalog: unresolved, placeholder, config-required, and recently failed entries are not promoted as playable.
- Local personality: favorites, recents, play counts, last played, preferences, failures, and dismissed hints stay in `localStorage`.
- Human-made feel: fewer stronger zones, tactile cards, calm recovery, handcrafted fallback art, useful empty states.
- Chromebook-safe: no heavy libraries, no particle-heavy Home, reduced motion and low power remain respected.

## UX rules

- Search is the front door and supports mouse, touch, and keyboard flows.
- Every launch path uses the v5 launch controller.
- Daily Picks are deterministic and launchable only.
- Surprise Me avoids recents and recent local failures when possible.
- Similar games are based on real category/tag overlap and launchability gating.
- Empty states must offer a real action; no decorative filler sections.

## Visual direction

Midnight Frutiger Aero internet hideout: dark upper-atmosphere navy, soft aqua/cyan/green highlights, breathable glass, natural gradients, glossy but not plastic, playful but not childish.

## Non-goals

- No fake stats, rewards, online counts, popularity, or placeholder sections.
- No competitor names on user-facing Home.
- No bypass, evasion, stealth, or school-circumvention framing.
- No outbound-directory positioning.

## Source Radar

Source Radar makes v5 source-aware without turning STRATO into an outbound directory. External sites are source seeds for health checks, metadata candidates, dedupe, license review, and quarantine. Unknown-license or risky candidates never auto-merge and never appear on the public Home.
