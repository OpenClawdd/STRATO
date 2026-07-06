## 2024-07-06 - [TURBO: Optimized bounded insertion sort]
**Learning:** Replaced O(N log N) `sort().slice()` patterns with an O(N) bounded insertion sort for `getTopN` elements. This is especially useful in leaderboards and stats routes where we only need the top 10-25 elements out of potentially thousands of records. It limits memory churn and CPU spikes compared to sorting the entire array.
**Action:** Extract reusable sorting utilities to avoid duplicating complex insertion sort logic, and ensure they properly handle `undefined` values during comparisons.
