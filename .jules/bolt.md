## 2024-06-18 - Avoid full array sort for top N
**Learning:** Found multiple places using `.sort()` on the entire users or scores array just to slice the top N items. This takes O(N log N) time which is slow for large datasets.
**Action:** Created `src/utils/sort.js` with a bounded insertion sort `getTopN` utility that runs in O(N) time and O(1) space to replace `.sort().slice()` operations.
