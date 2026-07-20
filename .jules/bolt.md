## 2025-07-20 - [Performance] Optimization on full array sorts
**Learning:** Using `.map().sort().slice()` over large datasets like `store.getAll("users")` causes O(N log N) computational overhead and excessive memory allocation by unnecessarily mapping non-top results.
**Action:** Use bounded insertion sort `getTopN` directly on the large dataset to get top N results before applying heavy transformations like `.map()`.
