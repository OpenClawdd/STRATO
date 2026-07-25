## 2024-03-24 - Bounded Insertion Sort (Top K Retrieval)
**Learning:** Calling full array `.sort().slice()` on large in-memory data structures (like leaderboard processing or admin statistics) causes significant CPU overhead and memory allocation spikes because it sorts the entire array and executes the mapping function redundantly during O(N log N) traversal.
**Action:** Extract the top K elements in O(N) time using a bounded insertion sort (maintaining a capped array). We implemented `getTopN` in `src/utils/sort.js` to do exactly this, and we only map after extracting the small subset.
