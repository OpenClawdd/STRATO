## 2024-06-01 - [Bolt] Global Leaderboard Sort Optimization
**Learning:** Using `.map().sort().slice()` on large arrays results in allocating a large number of garbage collection objects when mapping before slicing. This puts huge pressure on memory allocations when the length of `allUsers` array is very large.
**Action:** Order of operations matters on large datasets! Always perform a shallow copy, then `.sort()`, `.slice()`, and *finally* `.map()` over the resulting much smaller array slice. This reduces memory footprint from O(N) objects to O(k) objects where k is the slice size.
