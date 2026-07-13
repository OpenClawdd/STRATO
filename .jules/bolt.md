## 2024-07-13 - Avoid sorting large arrays for Top-N operations
**Learning:** Mapping large arrays *before* sorting and slicing allocates memory unnecessarily, and using `array.sort().slice(0, N)` on large datasets scales at O(N log N).
**Action:** Implement a bounded insertion sort utility (`getTopN`) for Top-N operations, which scales at O(N) and keeps memory pressure low by only storing the top N elements. Apply heavy `.map()` transformations *after* extracting the top N elements to avoid redundant object allocations.
