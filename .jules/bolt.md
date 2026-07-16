
## 2026-07-16 - Optimize bounded array sorts
**Learning:** In highly trafficked routes handling large datasets, chaining `.map().sort().slice()` creates unnecessary memory overhead and O(N log N) computational cost.
**Action:** Use bounded insertion sort utilities like `getTopN` to extract top items efficiently in O(N * k) time.
