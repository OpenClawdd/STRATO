
## 2024-07-02 - Array Map & Sort Bottleneck on Custom Datastore
**Learning:** Using `store.getAll()` followed by `.map()` on the entire dataset and then `.sort()` for leaderboards causes a severe O(N log N) performance bottleneck and short-lived object allocations, especially since the entire user base is mapped before taking the top 25.
**Action:** Use a bounded insertion sort (O(N) time, O(1) space) via a `getTopN` utility to extract the top items directly from the retrieved array first, and only `.map()` the final small result set.
