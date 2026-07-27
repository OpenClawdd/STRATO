## 2025-07-27 - Bounded Insertion Sort Performance Win
**Learning:** Using `getTopN` with bounded insertion sort instead of array `.sort().slice()` provides substantial memory and CPU optimization in Express data fetch routes handling large user arrays. Calling `.map()` after bounding significantly reduces GC pressure.
**Action:** When asked to fetch top N objects (e.g. Leaderboards, Top themes), check if `.sort().slice()` is being used over large unsorted arrays and use bounded insertion sort.
