## 2024-07-25 - Leaderboard API Performance bottleneck
**Learning:** Leaderboards sort entire database tables for both game-specific and global leaderboards. `.sort()` has O(N log N) complexity, but we only need the top 10 (or top 25) elements.
**Action:** Created `getTopN` function in `src/utils/sort.js` that keeps a bounded insertion sort array to get top N in O(N * k) time (where k is small and constant), avoiding a full array sort and avoiding allocating an entirely new sorted array.
