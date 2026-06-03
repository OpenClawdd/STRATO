## 2025-02-12 - Defer map operations on large cached datasets
**Learning:** In the global leaderboard endpoint, mapping an entire large array from the cache before slicing it causes unnecessary short-lived garbage allocations. Mutating a reference to a cached array directly (e.g. by sorting) can corrupt the cache.
**Action:** When transforming large dataset arrays, always create a shallow copy before sorting, and defer `.map()` operations until after `.sort()`, `.filter()`, and `.slice()` have been applied.
