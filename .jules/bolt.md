## 2024-07-26 - Array `.map()` Before Full Array Sorts

**Learning:** Calling `.map()` to transform an entire array dataset (like a full user database) before sorting it (`.sort().slice()`) to retrieve the top N items is a significant performance bottleneck. It forces unnecessary memory allocation and transformation for items that will be discarded.

**Action:** When retrieving the top N items from large datasets, use a bounded insertion sort (like `getTopN`) first. Apply heavy array transformations like `.map()` *after* calling `getTopN`, targeting only the bounded subset. Store the evaluated sort key alongside the item (e.g., `{ item, val }`) in the bounded array to prevent redundant value extraction calls during loop comparisons.
