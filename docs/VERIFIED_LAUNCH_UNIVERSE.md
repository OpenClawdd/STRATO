# STRATO Verified Launch Universe

This document explains the technical standards and operational procedures for the STRATO verified catalog.

## Product Law
**STRATO surfaces only verified playable launches.** Broken, generic, blocked, or unsafe entries are quarantined (marked Red) and excluded from the primary user experience.

## Reliability States
- **Green (Verified)**: Manually or automatically verified as a direct, playable game launch.
- **Yellow (Unknown)**: Unverified or recently imported. Surfaces only in "All" moods or with a warning.
- **Red (Quarantined)**: Verified as broken, dead, or a generic landing page. Excluded from Home, Search, and Picks.

## The Truth Filter (Source Doctor)
The `scripts/strato-source-doctor.mjs` engine is the source of truth for catalog health. It performs:
1. **Direct Launch Detection**: Probes for JS/WASM/Unity signals.
2. **Generic Hub Rejection**: Detects landing pages and game directories (generic hubs) that don't lead to a game.
3. **Dead Link Identification**: Categorizes `dead_launch` targets for repair.

## Repair Pipeline
1. **Identify**: Run `node scripts/strato-source-doctor.mjs check`.
2. **Backlog**: Review `.strato-reports/broken-games.csv`.
3. **Mirror**: Locate clean mirrors from trusted sources like `adfree` or `3kh0`.
4. **Repair**: Apply targeted updates via `scripts/repair-batch-X.mjs`.

## Safety & Trust
- **No Global Bypasses**: STRATO does not globally strip XFO or CSP headers.
- **Containment Shield**: A frontend guard intercepts unauthorized redirects and new window requests.
- **Truthful Labeling**: Local data (play counts) is clearly labeled as "Your" or "Local" to avoid misleading users.
