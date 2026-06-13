## 2024-05-30 - [Bounded Insertion Sort for Datastore Top N]
**Learning:** Using chained `.map()`, `.sort()`, and `.slice()` on global datasets retrieved from `store.getAll()` allocates thousands of intermediate objects and triggers a costly O(N log N) full array sort, causing CPU spikes.
**Action:** Replace chaining with a single-pass O(N) loop and bounded insertion sort (O(1) space) to maintain only the 'Top N' elements. Always provide numerical fallbacks (e.g. `|| 0`) to prevent functional regressions during relational comparisons.
