## 2024-06-10 - Bounded Insertion Sort for Leaderboards
**Learning:** When dealing with large datasets from `store.getAll()`, chaining `.filter()`, full-array `.sort()` (O(N log N)), and `.map()` causes performance bottlenecks and memory pressure.
**Action:** Replace these chains with a single-pass bounded insertion sort (O(N) time, O(1) space) to minimize CPU spikes and short-lived object allocations.
