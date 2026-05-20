# STRATO Verified Launch Universe

This document explains the technical standards and operational procedures for the STRATO verified catalog.

## Product Law
**STRATO surfaces only verified playable launches.** Broken, generic, blocked, or unsafe entries are quarantined (marked Red) and excluded from the primary user experience.

## Reliability States
- **Green (Verified Local)**: Local/self-hosted launch target under STRATO control.
- **Yellow (Active Remote)**: Active external launch candidate that passed catalog and trust gates.
- **Red (Quarantined)**: Broken, generic-only, blocked, or unsafe entries. Red entries are hidden from Home, Search, Picks, and active launch surfaces.

## Non-Negotiable Rule
**Active `generic_only` launch candidates are forbidden.**

If a non-red entry is classified like Source Doctor `generic_only` (generic/homepage URL with no direct launch candidate), validation fails with:

`Active generic_only launch candidates are not allowed. Quarantine or repair these entries.`

This gate is enforced in `scripts/validate-games.mjs` and covered by `tests/validate-games-generic-only.test.js`.

## The Truth Filter (Source Doctor)
The `scripts/strato-source-doctor.mjs` engine is the source of truth for catalog health. It performs:
1. **Launch candidate probing** for active non-red entries.
2. **Generic hub rejection** for entries that only point to landing pages/directories.
3. **Health classification** (`ok`, `dead_launch`, `generic_only`, etc.).

Output semantics:
- **Active checked**: non-red entries evaluated live.
- **Red skipped**: quarantined entries excluded from active checks.
- v1.0 target: active checked entries should be `ok` only.

## Repair Pipeline
1. **Identify**: `node scripts/strato-source-doctor.mjs check`
2. **Validate**: `node scripts/validate-games.mjs`
3. **Review backlog**: `.strato-reports/broken-games.csv`
4. **Repair or quarantine**:
   - Repair only with direct, playable launch targets.
   - Quarantine by setting `reliability: "red"` when truth cannot be proven.
5. **Re-run gates**: tests + validator + atlas + source doctor.

## CI and Manual Gates
CI runs deterministic checks:
- `pnpm format:check`
- `pnpm lint`
- `pnpm test`
- `node scripts/validate-games.mjs`
- `node scripts/catalog-atlas.mjs`

Source Doctor remains a manual release gate (`node scripts/strato-source-doctor.mjs check`) because it performs live network checks.

## Safety & Trust
- **No Global Bypasses**: STRATO does not globally strip XFO or CSP headers.
- **Containment Shield**: A frontend guard intercepts unauthorized redirects and new window requests.
- **Truthful Labeling**: Local data (play counts) is clearly labeled as "Your" or "Local" to avoid misleading users.

## Agent Guardrails
Future agents must not:
- Add games to claim coverage.
- Promote red entries to green/yellow without evidence.
- Downgrade or bypass validation gates.
- Mark external launches as successful without a real signal.
