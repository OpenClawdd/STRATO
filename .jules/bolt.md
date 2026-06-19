## 2026-05-27 - O(N) Top N Extraction Optimization
**Learning:** Chaining `.map()`, `.sort()` and `.slice()` on large array collections returned by the database (like `allUsers` or `allScores`) causes significant performance overhead and GC spikes. The sorting is $O(N \log N)$ over the whole array when only the top 10-25 items are needed.
**Action:** Created and applied `getTopN` using bounded insertion sort (O(N) time and O(K) space) for endpoints returning partial leaderboards.
