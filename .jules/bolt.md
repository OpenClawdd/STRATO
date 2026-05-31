## 2024-05-24 - Defer .map() in large datasets to reduce O(N) allocations
**Learning:** `store.getAll()` returns direct references to the in-memory cache. Calling `.map()` on the entire collection before filtering or sorting creates an O(N) overhead of short-lived garbage objects, which degrades performance as the dataset grows.
**Action:** When transforming large dataset arrays (like global leaderboards), defer `.map()` operations until after `.filter()`, `.sort()`, and `.slice()` have been applied. Always create a shallow copy (`[...arr]`) before sorting to avoid mutating cached data.
