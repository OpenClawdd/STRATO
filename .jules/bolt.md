## 2024-05-01 - Prevent O(N) object allocations in leaderboard sorting
**Learning:** Mapping a large dataset to large objects before sorting and slicing causes massive unnecessary O(N) memory allocation and garbage collection overhead.
**Action:** Use a Schwartzian transform to map to lightweight `{ item, key }` wrappers before sorting, slice to the top N, and only then apply the expensive mapping to the resulting small subset.
