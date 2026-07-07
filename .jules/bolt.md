## 2024-07-07 - Bounded Insertion Sort for Top-N Elements
**Learning:** Chaining `.filter()`, `.map()`, and `.sort()` on large arrays for top-N elements is O(N log N) time and allocates unnecessary objects.
**Action:** Use a bounded insertion sort (like the `getTopN` utility function) to get O(N) time and O(1) space, avoiding large memory spikes and expensive sorting over the entire array. When writing bounded insertion sorts for objects from the custom datastore, always handle potential `undefined` numerical properties (like `xp` or `score`) by providing fallbacks (e.g., `|| 0`) in relational comparisons (e.g., `xp > (list[list.length - 1].xp || 0)`) to prevent functional regressions in JavaScript.

## 2024-07-07 - Performance on STRATO
**Learning:** Performance optimization on STRATO key focus areas include game catalog load speed, search responsiveness, launch route latency, proxy route overhead, thumbnail/card rendering, and startup memory pressure.
**Action:** Keep changes focused (ideally under 100 lines unless the win clearly justifies more), avoid adding heavy dependencies or rewriting major systems, do not sacrifice correctness for speed, and include expected impact and verification methods in the PR summary.
