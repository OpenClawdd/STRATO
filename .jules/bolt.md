## 2026-07-30 - [Bounded Insertion Sort for Top-N Retrieval]
**Learning:** Calling `.sort().slice()` on large arrays for top-N retrieval, particularly when the comparator includes expensive string operations (like `localeCompare`) or object lookups, causes O(N log N) overhead and excessive memory allocation.
**Action:** Use a bounded insertion sort via a manual `for` loop or `.reduce()` to maintain an array of the top N items. This reduces the time complexity from O(N log N) to O(N).
