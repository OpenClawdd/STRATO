## 2024-07-12 - Inefficient Array Methods with store.getAll()
**Learning:** Calling `store.getAll()` can return very large arrays (e.g., all users, all scores). Applying `.map()` to these arrays *before* sorting and truncating leads to massive memory allocation overhead and redundant CPU cycles processing items that are immediately discarded.
**Action:** When extracting top N elements from `store.getAll()`, use a bounded insertion sort (e.g., `getTopN`) to extract the exact items needed first, then apply `.map()` only to that small subset.
