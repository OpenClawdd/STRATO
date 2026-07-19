
## 2024-07-19 - Avoid full array sorting and map allocations before slicing
**Learning:** In endpoints fetching full collections via `store.getAll()`, calling `.map()` on the entire dataset to build response objects, followed by a full `.sort()` and `.slice()`, creates excessive `O(N log N)` overhead and massive memory allocation for items that are immediately discarded.
**Action:** Implement and use bounded insertion sort (`getTopN`) directly on raw collections to find the top items in `O(N * K)` time, and explicitly apply data transformations (`.map()`) *only* to the bounded result array.
