## 2024-07-06 - Initial setup
**Learning:** Initial setup of Bolt's learning journal.
**Action:** Ready to log critical learnings.

## 2024-07-06 - Bounded Insertion Sort
**Learning:** Found O(N log N) `sort()` calls on large collections (`store.getAll("users")` and `store.getAll("scores")`) combined with `.map()` being called *before* extracting the top 10/25 elements, creating an O(N) allocation bottleneck.
**Action:** Replace full array sorting and pre-mapping with a bounded insertion sort (O(N) time, O(1) space) and map *only* the final `N` elements. Storing evaluated values alongside items in the bounded array prevents redundant evaluations.