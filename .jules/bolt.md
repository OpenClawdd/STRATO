## 2024-07-24 - [Avoid O(N log N) full array sort for Top N items]
**Learning:** In the STRATO repository, memory mentions bounded insertion sort for Top N items (`getTopN` utility). This should be used instead of sorting whole lists via `.sort((a,b) => b - a).slice(0, N)`. When implementing this sort for performance optimization, store the evaluated sort key alongside the item in the bounded array to avoid redundant extraction.
**Action:** Replace usages of `.sort(...).slice(...)` for large arrays (like `store.getAll()`) with `getTopN()` where it extracts only the top N items efficiently.
