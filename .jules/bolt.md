## 2024-03-24 - Optimize getTopN for Leaderboard
**Learning:** Mapping over an entire database of objects and sorting them just to get the top N items is computationally expensive (O(N log N)) and creates heavy memory pressure via `.map()`.
**Action:** Created and used `getTopN` utility (`src/utils/sort.js`) to perform a bounded insertion sort (O(N)), keeping the array size at N and only `.map()`ing the final items. Always apply heavy array transformations like `.map()` after calling `getTopN`, not before. Stored the evaluated sort key to avoid redundant evaluation.
