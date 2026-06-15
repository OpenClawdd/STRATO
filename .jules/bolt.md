## 2025-02-18 - Avoid Shared Cache Mutation in store.getAll()
**Learning:** Arrays returned by `store.getAll()` in `src/db/store.js` are direct references to the in-memory cache. Performing mutating operations like `.sort()` on them without creating a shallow copy (e.g. `[...data].sort()`) corrupts the cache and introduces subtle sorting bugs and performance drops across the application.
**Action:** Always create a shallow copy (`[...data]`) before sorting or mutating arrays retrieved from `store.getAll()`.

## 2025-02-18 - Defer Map Allocations for O(N) Data
**Learning:** Transforming large dataset arrays (like global leaderboards in `src/routes/leaderboard.js` or `src/routes/admin.js`) using `.map()` *before* `.sort()` and `.slice()` causes massive memory overhead by mapping the entire N-sized dataset into short-lived garbage objects.
**Action:** Always defer `.map()` operations until *after* `.sort()` and `.slice()` to reduce memory allocation from O(N) down to O(K) (where K is the slice size).
