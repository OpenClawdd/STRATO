## 2024-05-24 - Optimization: Memory Allocation during Sorting
**Learning:** When retrieving the top N items from large datasets, applying `.map()` before bounded insertion sort or `.sort().slice()` creates unnecessary object allocations for items that won't even be returned.
**Action:** Always apply heavy array transformations like `.map()` *after* selecting the top N items using `getTopN`.
