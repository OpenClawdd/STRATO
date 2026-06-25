## 2024-06-25 - Leaderboard Array Transformation O(N log N) to O(N) Bounded Insertion Sort
**Learning:** Calling `.sort()` on the full dataset (e.g., `allScores` or `allUsers` returned from `store.getAll()`) results in `O(N log N)` sorting latency and unnecessary intermediate array allocations, which is inefficient for 'top N' computations.
**Action:** Implemented a reusable bounded insertion sort utility (`src/utils/sort.js`) to extract 'top N' elements in `O(N)` time and `O(1)` space without mutating or duplicating the entire cache array.
