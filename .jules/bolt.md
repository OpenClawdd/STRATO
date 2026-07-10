## 2026-07-10 - Optimize top-N sort
**Learning:** We are consistently mapping large collections and sorting the full array when we only need the top 10/20 elements. This happens in several places (e.g. `leaderboard.js`, `admin.js`, `notifications.js`). Bounded insertion sort is O(N) rather than O(N log N) and prevents unnecessary map/cloning allocations on big sets.
**Action:** Extract a bounded insertion sort utility function `getTopN` to replace `[...array].sort(...).slice(0, N)` where possible.
