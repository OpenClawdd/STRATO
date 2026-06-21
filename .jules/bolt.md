## 2024-06-21 - Optimize top N extraction from large array sets
**Learning:** In memory databases like store.getAll() return direct references to arrays, chaining multiple array transformations like `.filter()`, `.sort()` and `.map()` creates huge short lived arrays which can cause GC pressure and high memory consumption when the lists gets large.
**Action:** When computing top N from large sets use O(N) bounded insertion sort and extract the transformations later.
