## 2024-06-21 - Optimize global leaderboard and analytics queries

**Learning:** When computing "top N" elements from large dataset arrays returned by `store.getAll()`, chaining `.sort()` incurs an O(N log N) penalty because it sorts the entire dataset, even if only a small fraction is retained via a `.slice(0, N)`. In Node.js, sorting tens or hundreds of thousands of objects can cause a measurable CPU spike and short-lived object allocations (especially if `.map()` is called beforehand).

**Action:** Replaced full array sorts with a bounded insertion sort utility (`src/utils/sort.js` -> `getTopN()`). This function runs in O(N) time and O(1) space. I also applied heavy array transformations like `.map()` *after* extracting the top N elements, preventing unnecessary allocations for discarded objects. This ensures fast load times for admin, leaderboard, and notification routes without requiring external database indices.
