
## 2024-06-05 - Optimize Leaderboard Object Allocations & Array Passes
**Learning:** Chaining `.filter()` calls or mapping entire datasets before sorting and slicing introduces O(N) object allocations and multiple array passes that increase latency and garbage collection pressure, especially in busy list endpoints.
**Action:** Defer `.map()` until after `.slice()` to only map what is needed. Consolidate chained array `.filter()` loops into single passes when processing lists from the custom data store.
