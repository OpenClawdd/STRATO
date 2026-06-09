## 2026-06-09 - Avoid Chain Filtering/Sorting for Top N Computations

**Learning:** When retrieving top N items from large datasets (like `store.getAll("scores")` or `store.getAll("users")`), chaining methods like `.filter()`, `.map()`, `.sort()` (O(N log N)), and `.slice()` causes unnecessary CPU spikes and short-lived object allocations.

**Action:** Replace array method chains with a single-pass loop utilizing bounded insertion sort (O(N) time, O(1) space) to process datasets efficiently and prevent performance throttling during high load.
