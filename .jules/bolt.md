## 2024-06-03 - Defer Array.map() in global leaderboard

**Learning:** When retrieving the global leaderboard (`/api/leaderboard`), calling `.map()` on the entire `allUsers` array before sorting and slicing causes O(N) object allocations and increases memory pressure and garbage collection overhead, especially as the user base grows.
**Action:** Always filter, sort, and slice large dataset arrays before transforming them with `.map()`. Ensure you create a shallow copy (`[...array]`) before calling `.sort()` to prevent mutating the underlying cached data in `store.getAll()`.
