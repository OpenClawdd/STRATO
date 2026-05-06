# STRATO v5 QA Matrix

| Area | Checks | Status | Notes |
| --- | --- | --- | --- |
| Login/TOS | v5 copy, responsible-use framing, reduced particle count | Code-checked | Needs human visual QA |
| Home first view | identity, search, quick actions, catalog pulse | Code-checked | Needs browser viewport review |
| Search | instant results, ArrowUp/Down, Enter, Escape, no-results actions | Code-checked | Manual keyboard pass recommended |
| Daily Picks | deterministic, launchable only, category balance | Unit-tested | See v5 product tests |
| Surprise Me | launchable only, avoids recents/failures | Unit-tested | Random path needs browser click QA |
| Detail Sheet | real metadata, launch/favorite, nearby picks, mobile scroll | Code-checked | Needs touch QA |
| Recovery | retry, try another, search, back, similar games | Code-checked | Needs induced-failure QA |
| Launch Bay | empty/loading/loaded/failed copy and frame state | Code-checked | Needs browser frame QA |
| Mobile | no horizontal overflow, usable cards/sheets | CSS-checked | Needs device QA |
| Catalog tooling | validator warnings, import quarantine | Existing tests/checks | Warnings remain honest |
