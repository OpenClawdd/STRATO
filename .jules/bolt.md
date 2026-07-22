## 2024-05-24 - Initial
**Learning:** Initial setup
**Action:** Learn
## 2024-05-24 - Bounded Insertion Sort (Top N Optimization)
**Learning:** For retrieving the top N elements from a large dataset, `.sort().slice()` allocates and sorts the entire array, which can be a bottleneck.
**Action:** Use a bounded insertion sort like `getTopN` to maintain only the top N items while scanning the array in `O(N)` time. Always ensure the value extraction callback only fires once per element by caching the result alongside the item during insertion to prevent redundant execution overhead.
