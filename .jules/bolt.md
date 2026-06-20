## 2024-05-19 - Optimize leaderboard top N retrieval
**Learning:** Chaining `.filter()`, `.map()`, and `.sort()` on large arrays for top N retrieval results in O(N log N) full sorting and unnecessary object allocations.
**Action:** Extract a bounded insertion sort utility (`getTopNDescending`) to do O(N) single-pass loops without intermediate mapping or arrays, minimizing CPU spikes.
