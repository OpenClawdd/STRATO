## 2026-07-18 - Optimize top N extractions with bounded insertion sort
**Learning:** Expensive O(N log N) sorts were used across the codebase just to extract the top N elements (e.g. top 10 users) from large in-memory collections, causing unnecessary CPU overhead and memory allocation before heavy mapping operations.
**Action:** Created `getTopN` utility in `src/utils/sort.js` using a bounded insertion sort with O(N * k) complexity and applied it to leaderboard and admin routes, preventing full array sorts and deferring data transformation until after the array is truncated.
