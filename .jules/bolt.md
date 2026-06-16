## 2024-05-18 - Avoid full array sort for top N
**Learning:** Using full array `.sort((a,b) => ...)` and then `.slice(0, N)` on large datasets (like `store.getAll()`) results in O(N log N) time complexity.
**Action:** Use a custom `getTopN` utility with a bounded insertion sort for O(N) performance.
