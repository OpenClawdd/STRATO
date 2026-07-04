## 2024-07-04 - Global Leaderboard Optimization
**Learning:** Found O(N log N) full-array sorts chained with large object allocations (mapping entire `allUsers` array before sorting and slicing).
**Action:** Implemented a bounded insertion sort `getTopN` utility in `src/utils/sort.js` that reduces time complexity to O(N) and space complexity to O(1) for large datasets. Apply this pattern to endpoints that fetch large arrays (like `store.getAll()`) and extract a top N subset (like `getTopN(allUsers, 25, u => u.xp || 0)`). Ensure to handle `|| 0` for robust numeric properties.
