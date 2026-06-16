## 2025-06-16 - ⚡ TURBO: Optimize Leaderboard Top-N Sorting
**Learning:** Full-array `.sort((a, b) => b.score - a.score)` operations on large cache results from `store.getAll()` were causing CPU spikes and unnecessary allocations (O(N log N)), particularly in routes generating leaderboards (`/api/leaderboard`, `/api/admin/analytics`, `/api/analytics/global`). Combining these sorts with `.map()` and `.slice()` created unneeded intermediate arrays.

**Action:** Created `src/utils/sort.js` with `getTopN(array, n, getValue)`, a bounded insertion sort that runs in O(N) time and O(1) space. Replaced instances of `.sort().slice()` with `getTopN()` across `leaderboard.js`, `admin.js`, and `notifications.js` to eliminate O(N log N) bottlenecks when processing full database collections.
