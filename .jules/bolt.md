## 2025-07-08 - Leaderboard bounded insertion sort
**Learning:** Chaining `.map()` and `.sort()` on `store.getAll("users")` (which reads the entire database collection into memory) causes O(N log N) time complexity and massive short-lived object allocations (O(N) space) for every leaderboard request, which is a major bottleneck on an Express server without caching.
**Action:** Always use a bounded insertion sort utility (O(N * K) time, O(K) space) for "Top N" route endpoints, and defer heavy transformations like `.map()` until after the set is narrowed down to the final N elements.
